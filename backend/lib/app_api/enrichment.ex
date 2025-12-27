defmodule AppApi.Enrichment do
  @moduledoc """
  Granular metadata enrichment for imported listens.
  
  Provides field-specific scanning and enrichment:
  - Genres (genres/genre)
  - Release Year (year/release_year)
  - Navidrome ID (navidrome_id)

  Strategy:
  1. Try Navidrome first (primary source) via NavidromeIntegration
  2. Fallback to MusicBrainz search if Navidrome fails
  """

  require Logger
  import Ecto.Query
  alias AppApi.{Repo, Listen, GenreEnrichment, NavidromeIntegration}

  @doc """
  Scan database for listens with granular missing metadata breakdown.
  Returns detailed stats per field.

  ## Returns
  ```elixir
  {:ok, %{
    total_listens: 1234,
    missing_genres: 42,
    missing_year: 18,
    missing_navidrome_id: 156,
    missing_any: 180  # Union of all missing fields
  }}
  ```
  """
  def scan_missing_metadata(user_name) do
    total_query =
      from l in Listen,
        where: l.user_name == ^user_name,
        select: count(l.id)

    total_listens = Repo.one(total_query)

    %{
      total_listens: total_listens,
      missing_genres: count_missing_genres(user_name),
      missing_year: count_missing_year(user_name),
      missing_navidrome_id: count_missing_navidrome_id(user_name),
      missing_any: count_missing_any(user_name)
    }
    |> then(&{:ok, &1})
  end

  @doc """
  Get IDs of listens missing specific field.
  
  ## Examples
      iex> get_listens_missing(:genres, "viking_user", 100)
      [%Listen{id: 1, ...}, ...]
  """
  def get_listens_missing(field, user_name, limit \\ 1000) when field in [:genres, :year, :navidrome_id] do
    case field do
      :genres -> get_listens_missing_genres(user_name, limit)
      :year -> get_listens_missing_year(user_name, limit)
      :navidrome_id -> get_listens_missing_navidrome_id(user_name, limit)
    end
  end

  @doc """
  Enrich specific metadata field for user's listens.

  ## Options
    - field: :genres | :year | :navidrome_id | :all (default: :all)
    - batch_size: Number of tracks per batch (default: 50)
    - limit: Max total tracks to process (default: 1000)

  ## Examples
      iex> enrich_metadata("viking_user", field: :genres, limit: 100)
      {:ok, %{processed: 42, enriched: 38, failed: 4, skipped: 0}}
  """
  def enrich_metadata(user_name, opts \\ []) do
    field = Keyword.get(opts, :field, :all)
    batch_size = Keyword.get(opts, :batch_size, 50)
    limit = Keyword.get(opts, :limit, 1000)

    listens =
      case field do
        :all -> get_listens_needing_enrichment(user_name, limit)
        specific -> get_listens_missing(specific, user_name, limit)
      end

    if Enum.empty?(listens) do
      {:ok, %{processed: 0, enriched: 0, failed: 0, skipped: 0}}
    else
      results =
        listens
        |> Enum.chunk_every(batch_size)
        |> Enum.reduce(%{processed: 0, enriched: 0, failed: 0, skipped: 0}, fn batch, acc ->
          batch_result = process_batch(batch, field)
          Process.sleep(1000)

          %{
            processed: acc.processed + batch_result.processed,
            enriched: acc.enriched + batch_result.enriched,
            failed: acc.failed + batch_result.failed,
            skipped: acc.skipped + batch_result.skipped
          }
        end)

      {:ok, results}
    end
  end

  # === DEPRECATED: Backward compatibility ===
  def enrich_missing_metadata(user_name, opts \\ []) do
    Logger.warning("enrich_missing_metadata/2 is deprecated, use enrich_metadata/2 instead")
    enrich_metadata(user_name, opts)
  end

  # === PRIVATE: GRANULAR COUNTERS ===

  defp count_missing_genres(user_name) do
    query =
      from l in Listen,
        where: l.user_name == ^user_name,
        where:
          (fragment("json_extract(?, '$.genres') IS NULL", l.metadata) and
             fragment("json_extract(?, '$.genre') IS NULL", l.metadata)) or
            fragment(
              "(json_type(json_extract(?, '$.genres')) = 'array' AND json_array_length(json_extract(?, '$.genres')) = 0)",
              l.metadata,
              l.metadata
            ),
        select: count(l.id)

    Repo.one(query)
  end

  defp count_missing_year(user_name) do
    query =
      from l in Listen,
        where: l.user_name == ^user_name,
        where:
          fragment("json_extract(?, '$.year') IS NULL", l.metadata) and
            fragment("json_extract(?, '$.release_year') IS NULL", l.metadata),
        select: count(l.id)

    Repo.one(query)
  end

  defp count_missing_navidrome_id(user_name) do
    query =
      from l in Listen,
        where: l.user_name == ^user_name,
        where: fragment("json_extract(?, '$.navidrome_id') IS NULL", l.metadata),
        select: count(l.id)

    Repo.one(query)
  end

  defp count_missing_any(user_name) do
    query =
      from l in Listen,
        where: l.user_name == ^user_name,
        where:
          # Missing genres
          ((fragment("json_extract(?, '$.genres') IS NULL", l.metadata) and
              fragment("json_extract(?, '$.genre') IS NULL", l.metadata)) or
             fragment(
               "(json_type(json_extract(?, '$.genres')) = 'array' AND json_array_length(json_extract(?, '$.genres')) = 0)",
               l.metadata,
               l.metadata
             )) or
            # Missing year
            (fragment("json_extract(?, '$.year') IS NULL", l.metadata) and
               fragment("json_extract(?, '$.release_year') IS NULL", l.metadata)) or
            # Missing navidrome_id
            fragment("json_extract(?, '$.navidrome_id') IS NULL", l.metadata),
        select: count(l.id)

    Repo.one(query)
  end

  # === PRIVATE: GRANULAR GETTERS ===

  defp get_listens_missing_genres(user_name, limit) do
    query =
      from l in Listen,
        where: l.user_name == ^user_name,
        where:
          (fragment("json_extract(?, '$.genres') IS NULL", l.metadata) and
             fragment("json_extract(?, '$.genre') IS NULL", l.metadata)) or
            fragment(
              "(json_type(json_extract(?, '$.genres')) = 'array' AND json_array_length(json_extract(?, '$.genres')) = 0)",
              l.metadata,
              l.metadata
            ),
        order_by: [desc: l.listened_at],
        limit: ^limit

    Repo.all(query)
  end

  defp get_listens_missing_year(user_name, limit) do
    query =
      from l in Listen,
        where: l.user_name == ^user_name,
        where:
          fragment("json_extract(?, '$.year') IS NULL", l.metadata) and
            fragment("json_extract(?, '$.release_year') IS NULL", l.metadata),
        order_by: [desc: l.listened_at],
        limit: ^limit

    Repo.all(query)
  end

  defp get_listens_missing_navidrome_id(user_name, limit) do
    query =
      from l in Listen,
        where: l.user_name == ^user_name,
        where: fragment("json_extract(?, '$.navidrome_id') IS NULL", l.metadata),
        order_by: [desc: l.listened_at],
        limit: ^limit

    Repo.all(query)
  end

  defp get_listens_needing_enrichment(user_name, limit) do
    query =
      from l in Listen,
        where: l.user_name == ^user_name,
        where:
          fragment("? = ?", l.metadata, "{}") or
            fragment("? = ?", l.metadata, "null") or
            l.metadata == "" or
            is_nil(l.metadata) or
            # Missing genres
            ((fragment("json_extract(?, '$.genres') IS NULL", l.metadata) and
                fragment("json_extract(?, '$.genre') IS NULL", l.metadata)) or
               fragment(
                 "(json_type(json_extract(?, '$.genres')) = 'array' AND json_array_length(json_extract(?, '$.genres')) = 0)",
                 l.metadata,
                 l.metadata
               )) or
            # Missing year
            (fragment("json_extract(?, '$.year') IS NULL", l.metadata) and
               fragment("json_extract(?, '$.release_year') IS NULL", l.metadata)) or
            # Missing navidrome_id
            fragment("json_extract(?, '$.navidrome_id') IS NULL", l.metadata),
        order_by: [desc: l.listened_at],
        limit: ^limit

    Repo.all(query)
  end

  # === PRIVATE: BATCH PROCESSING ===

  defp process_batch(listens, field) do
    Enum.reduce(listens, %{processed: 0, enriched: 0, failed: 0, skipped: 0}, fn listen, acc ->
      case enrich_single_listen(listen, field) do
        {:ok, :enriched} ->
          %{acc | processed: acc.processed + 1, enriched: acc.enriched + 1}

        {:ok, :skipped} ->
          %{acc | processed: acc.processed + 1, skipped: acc.skipped + 1}

        {:ok, :not_found} ->
          %{acc | processed: acc.processed + 1, failed: acc.failed + 1}

        {:error, _reason} ->
          %{acc | processed: acc.processed + 1, failed: acc.failed + 1}
      end
    end)
  end

  defp enrich_single_listen(listen, field) do
    current_metadata = parse_metadata(listen.metadata)

    needs_enrichment =
      case field do
        :genres ->
          !has_genres?(current_metadata)

        :year ->
          !has_year?(current_metadata)

        :navidrome_id ->
          !has_navidrome_id?(current_metadata)

        :all ->
          !has_genres?(current_metadata) || !has_year?(current_metadata) ||
            !has_navidrome_id?(current_metadata)
      end

    if needs_enrichment do
      missing_fields = get_missing_fields(current_metadata)

      Logger.info(
        "🔍 Enriching #{listen.track_name} by #{listen.artist_name} (missing: #{Enum.join(missing_fields, ", ")})"
      )

      # Try Navidrome first (provides all fields)
      case NavidromeIntegration.enrich_listen_from_navidrome(listen) do
        {:ok, _updated_listen} ->
          Logger.info("✅ Enriched from Navidrome")
          {:ok, :enriched}

        {:error, reason} ->
          Logger.info("⚠️ Navidrome failed: #{inspect(reason)}, trying MusicBrainz...")

          # Fallback to MusicBrainz (only genres + year)
          case GenreEnrichment.enrich_listen(listen) do
            {:ok, _updated_listen} ->
              Logger.info("✅ Enriched from MusicBrainz")
              {:ok, :enriched}

            {:error, reason} ->
              Logger.warning("⚠️ No metadata found: #{inspect(reason)}")
              {:ok, :not_found}
          end
      end
    else
      {:ok, :skipped}
    end
  end

  # === PRIVATE: FIELD CHECKERS ===

  defp has_genres?(metadata) do
    (metadata["genres"] && length(metadata["genres"]) > 0) ||
      (metadata["genre"] && metadata["genre"] != "")
  end

  defp has_year?(metadata) do
    metadata["release_year"] || metadata["year"]
  end

  defp has_navidrome_id?(metadata) do
    metadata["navidrome_id"] && metadata["navidrome_id"] != ""
  end

  defp get_missing_fields(metadata) do
    []
    |> then(&if has_genres?(metadata), do: &1, else: ["genres" | &1])
    |> then(&if has_year?(metadata), do: &1, else: ["year" | &1])
    |> then(&if has_navidrome_id?(metadata), do: &1, else: ["navidrome_id" | &1])
    |> Enum.reverse()
  end

  # === METADATA PARSING ===

  defp parse_metadata(nil), do: %{}
  defp parse_metadata(""), do: %{}
  defp parse_metadata("{}"), do: %{}

  defp parse_metadata(metadata_str) when is_binary(metadata_str) do
    case Jason.decode(metadata_str) do
      {:ok, map} -> map
      {:error, _} -> %{}
    end
  end

  defp parse_metadata(map) when is_map(map), do: map
end
