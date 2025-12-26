defmodule AppApi.Enrichment do
  @moduledoc """
  Manual metadata enrichment for imported listens.
  Enriches missing genres and release years from Navidrome/MusicBrainz.

  Strategy:
  1. Try Navidrome first (primary source) via NavidromeIntegration
  2. Fallback to MusicBrainz search if Navidrome fails
  """

  require Logger
  import Ecto.Query
  alias AppApi.{Repo, Listen, GenreEnrichment, NavidromeIntegration}

  @doc """
  Scan database for listens missing metadata (genres or release_year).
  Returns count of tracks needing enrichment.
  """
  def scan_missing_metadata(user_name) do
    query =
      from l in Listen,
        where: l.user_name == ^user_name,
        where:
          fragment("? = ?", l.metadata, "{}") or
            fragment("? = ?", l.metadata, "null") or
            l.metadata == "" or
            is_nil(l.metadata) or
            fragment("json_extract(?, '$.genres') IS NULL", l.metadata) or
            fragment("json_array_length(json_extract(?, '$.genres')) = 0", l.metadata) or
            fragment("json_extract(?, '$.release_year') IS NULL", l.metadata),
        select: count(l.id)

    count = Repo.one(query)
    {:ok, %{missing_count: count}}
  end

  @doc """
  Start enrichment process for listens missing metadata.
  Returns total processed and enriched counts.

  ## Options
    - batch_size: Number of tracks to process at once (default: 50)
    - limit: Max total tracks to process (default: 1000)
  """
  def enrich_missing_metadata(user_name, opts \\ []) do
    batch_size = Keyword.get(opts, :batch_size, 50)
    limit = Keyword.get(opts, :limit, 1000)

    # Get listens missing metadata
    listens = get_listens_needing_enrichment(user_name, limit)

    if Enum.empty?(listens) do
      {:ok, %{processed: 0, enriched: 0, failed: 0}}
    else
      # Process in batches to avoid rate limiting
      results =
        listens
        |> Enum.chunk_every(batch_size)
        |> Enum.reduce(%{processed: 0, enriched: 0, failed: 0}, fn batch, acc ->
          batch_result = process_batch(batch)

          # Small delay between batches to respect rate limits
          Process.sleep(1000)

          %{
            processed: acc.processed + batch_result.processed,
            enriched: acc.enriched + batch_result.enriched,
            failed: acc.failed + batch_result.failed
          }
        end)

      {:ok, results}
    end
  end

  # === PRIVATE FUNCTIONS ===

  defp get_listens_needing_enrichment(user_name, limit) do
    query =
      from l in Listen,
        where: l.user_name == ^user_name,
        where:
          fragment("? = ?", l.metadata, "{}") or
            fragment("? = ?", l.metadata, "null") or
            l.metadata == "" or
            is_nil(l.metadata) or
            fragment("json_extract(?, '$.genres') IS NULL", l.metadata) or
            fragment("json_array_length(json_extract(?, '$.genres')) = 0", l.metadata) or
            fragment("json_extract(?, '$.release_year') IS NULL", l.metadata),
        order_by: [desc: l.listened_at],
        limit: ^limit

    Repo.all(query)
  end

  defp process_batch(listens) do
    Enum.reduce(listens, %{processed: 0, enriched: 0, failed: 0}, fn listen, acc ->
      case enrich_single_listen(listen) do
        {:ok, :enriched} ->
          %{acc | processed: acc.processed + 1, enriched: acc.enriched + 1}

        {:ok, :not_found} ->
          %{acc | processed: acc.processed + 1, failed: acc.failed + 1}

        {:error, _reason} ->
          %{acc | processed: acc.processed + 1, failed: acc.failed + 1}
      end
    end)
  end

  defp enrich_single_listen(listen) do
    current_metadata = parse_metadata(listen.metadata)

    needs_enrichment =
      is_nil(current_metadata["genres"]) or
        Enum.empty?(current_metadata["genres"] || []) or
        is_nil(current_metadata["release_year"])

    if needs_enrichment do
      Logger.info("🔍 Enriching: #{listen.track_name} by #{listen.artist_name}")

      # ✅ STRATEGY 1: Use existing NavidromeIntegration (handles auto-discovery)
      case NavidromeIntegration.enrich_listen_from_navidrome(listen) do
        {:ok, _updated_listen} ->
          Logger.info("✅ Enriched from Navidrome")
          {:ok, :enriched}

        {:error, reason} ->
          Logger.info("⚠️ Navidrome failed: #{inspect(reason)}, trying MusicBrainz...")

          # ✅ STRATEGY 2: Fallback to MusicBrainz search
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
      {:ok, :enriched}
    end
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
