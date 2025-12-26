defmodule AppApi.Import do
  @moduledoc """
  Import functionality for Listen data from JSON/CSV files.
  Supports multiple formats: Viking, ListenBrainz, Maloja.
  Supports deduplication modes: skip, merge, replace_all.
  """

  import Ecto.Query
  alias AppApi.{Repo, Listen}
  alias Ecto.Multi

  @max_batch_size 500

  @doc """
  Import listens from JSON or CSV data.

  ## Options
    - mode: :skip_duplicates | :merge | :replace_all
    - format: :json | :csv
  """
  def import_listens(user_name, file_data, opts \\ []) do
    mode = Keyword.get(opts, :mode, :skip_duplicates)
    format = Keyword.get(opts, :format, :json)

    with {:ok, parsed_data} <- parse_data(file_data, format),
         {:ok, validated_listens} <- validate_listens(parsed_data),
         {:ok, result} <- process_import(user_name, validated_listens, mode) do
      {:ok, result}
    else
      {:error, reason} -> {:error, reason}
    end
  end

  # === PARSING ===

  defp parse_data(file_data, :json) do
    case Jason.decode(file_data) do
      # Viking/ListenBrainz format: {listens: [...]}
      {:ok, %{"listens" => listens}} when is_list(listens) ->
        {:ok, normalize_listens(listens, :viking)}

      # Viking/ListenBrainz format: [...]
      {:ok, listens} when is_list(listens) ->
        {:ok, normalize_listens(listens, :viking)}

      # Maloja format: {scrobbles: [...]}
      {:ok, %{"scrobbles" => scrobbles}} when is_list(scrobbles) ->
        {:ok, normalize_listens(scrobbles, :maloja)}

      {:ok, _} ->
        {:error, "Invalid JSON structure. Supported formats: Viking ({listens: [...]}), Maloja ({scrobbles: [...]})"}

      {:error, error} ->
        {:error, "JSON parsing failed: #{inspect(error)}"}
    end
  end

  defp parse_data(file_data, :csv) do
    try do
      listens =
        file_data
        |> String.split("\n", trim: true)
        |> CSV.decode(headers: true)
        |> Enum.map(fn {:ok, row} -> csv_row_to_map(row) end)

      {:ok, listens}
    rescue
      e -> {:error, "CSV parsing failed: #{inspect(e)}"}
    end
  end

  # === NORMALIZATION ===

  defp normalize_listens(items, :viking) do
    # Already in Viking format
    items
  end

  defp normalize_listens(scrobbles, :maloja) do
    Enum.map(scrobbles, fn scrobble ->
      track = scrobble["track"] || %{}
      album = track["album"] || %{}

      # Extract artists (can be array or string)
      artist_name = extract_artist_name(track["artists"])

      %{
        "listened_at" => scrobble["time"],
        "track_name" => track["title"],
        "artist_name" => artist_name,
        "release_name" => album["albumtitle"],
        "duration_ms" => parse_duration(track["length"] || scrobble["duration"]),
        "music_service" => extract_origin(scrobble["origin"]),
        # Additional metadata
        "additional_info" => %{
          "artists" => track["artists"],
          "album_artists" => album["artists"],
          "origin" => scrobble["origin"]
        }
      }
    end)
  end

  defp extract_artist_name(artists) when is_list(artists) do
    # Join multiple artists with ", "
    Enum.join(artists, ", ")
  end
  defp extract_artist_name(artist) when is_binary(artist), do: artist
  defp extract_artist_name(_), do: "Unknown Artist"

  defp parse_duration(nil), do: nil
  defp parse_duration(seconds) when is_integer(seconds), do: seconds * 1000
  defp parse_duration(_), do: nil

  defp extract_origin(nil), do: nil
  defp extract_origin(origin) when is_binary(origin) do
    # "client:Navidrome" -> "navidrome"
    origin
    |> String.downcase()
    |> String.split(":")
    |> List.last()
  end

  defp csv_row_to_map(row) do
    %{
      "listened_at" => String.to_integer(row["listened_at"]),
      "track_name" => row["track_name"],
      "artist_name" => row["artist_name"],
      "release_name" => row["release_name"],
      "duration_ms" => parse_int_or_nil(row["duration_ms"]),
      "music_service" => row["music_service"],
      "recording_mbid" => row["recording_mbid"],
      "artist_mbid" => row["artist_mbid"],
      "release_mbid" => row["release_mbid"],
      "tracknumber" => parse_int_or_nil(row["tracknumber"]),
      "discnumber" => parse_int_or_nil(row["discnumber"]),
      "loved" => row["loved"] == "true",
      "rating" => parse_int_or_nil(row["rating"]),
      "metadata" => %{
        "genres" => parse_csv_genres(row["genres"]),
        "release_year" => parse_int_or_nil(row["release_year"])
      }
    }
  end

  defp parse_int_or_nil(""), do: nil
  defp parse_int_or_nil(nil), do: nil
  defp parse_int_or_nil(str) when is_binary(str) do
    case Integer.parse(str) do
      {int, _} -> int
      :error -> nil
    end
  end

  defp parse_csv_genres(""), do: []
  defp parse_csv_genres(nil), do: []
  defp parse_csv_genres(str), do: String.split(str, "; ", trim: true)

  # === VALIDATION ===

  defp validate_listens(listens) do
    validated =
      Enum.reduce_while(listens, {:ok, []}, fn listen, {:ok, acc} ->
        case validate_listen_data(listen) do
          {:ok, valid_listen} -> {:cont, {:ok, [valid_listen | acc]}}
          {:error, reason} -> {:halt, {:error, reason}}
        end
      end)

    case validated do
      {:ok, list} -> {:ok, Enum.reverse(list)}
      error -> error
    end
  end

  defp validate_listen_data(data) do
    required = ["listened_at", "track_name", "artist_name"]

    missing = Enum.filter(required, fn key -> is_nil(data[key]) or data[key] == "" end)

    if Enum.empty?(missing) do
      {:ok, data}
    else
      {:error, "Missing required fields: #{Enum.join(missing, ", ")}"}
    end
  end

  # === IMPORT PROCESSING ===

  defp process_import(user_name, listens, :replace_all) do
    Multi.new()
    |> Multi.delete_all(:delete_existing, from(l in Listen, where: l.user_name == ^user_name))
    |> Multi.run(:insert_listens, fn _repo, _changes ->
      insert_listens_batch(user_name, listens)
    end)
    |> Repo.transaction()
    |> case do
      {:ok, %{insert_listens: result}} -> {:ok, result}
      {:error, _step, reason, _changes} -> {:error, reason}
    end
  end

  defp process_import(user_name, listens, mode) when mode in [:skip_duplicates, :merge] do
    insert_listens_batch(user_name, listens, mode)
  end

  defp insert_listens_batch(user_name, listens, mode \\ :skip_duplicates) do
    results =
      listens
      |> Enum.chunk_every(@max_batch_size)
      |> Enum.reduce({0, 0, []}, fn batch, {imported, skipped, errors} ->
        batch_result = process_batch(user_name, batch, mode)
        {
          imported + batch_result.imported,
          skipped + batch_result.skipped,
          errors ++ batch_result.errors
        }
      end)

    {imported, skipped, errors} = results

    {:ok,
     %{
       imported: imported,
       skipped: skipped,
       errors: errors,
       total: length(listens)
     }}
  end

  defp process_batch(user_name, batch, mode) do
    Enum.reduce(batch, %{imported: 0, skipped: 0, errors: []}, fn listen_data, acc ->
      attrs = prepare_attrs(user_name, listen_data)

      case insert_or_skip(attrs, mode) do
        {:ok, _listen} -> %{acc | imported: acc.imported + 1}
        {:skipped, _reason} -> %{acc | skipped: acc.skipped + 1}
        {:error, changeset} -> %{acc | errors: [format_error(changeset) | acc.errors]}
      end
    end)
  end

  defp prepare_attrs(user_name, data) do
    metadata_json = Jason.encode!(data["metadata"] || %{})

    %{
      user_name: user_name,
      listened_at: data["listened_at"],
      track_name: data["track_name"],
      artist_name: data["artist_name"],
      release_name: data["release_name"],
      recording_mbid: data["recording_mbid"],
      artist_mbid: data["artist_mbid"],
      release_mbid: data["release_mbid"],
      origin_url: data["origin_url"],
      music_service: data["music_service"],
      duration_ms: data["duration_ms"],
      tracknumber: data["tracknumber"],
      discnumber: data["discnumber"],
      loved: data["loved"] || false,
      rating: data["rating"],
      metadata: metadata_json,
      additional_info: data["additional_info"] || %{}
    }
  end

  defp insert_or_skip(attrs, :skip_duplicates) do
    # Check if exists by unique key
    existing =
      Repo.get_by(Listen,
        track_name: attrs.track_name,
        artist_name: attrs.artist_name,
        listened_at: attrs.listened_at
      )

    if existing do
      {:skipped, "Duplicate listen"}
    else
      %Listen{}
      |> Listen.changeset(attrs)
      |> Repo.insert()
    end
  end

  defp insert_or_skip(attrs, :merge) do
    existing =
      Repo.get_by(Listen,
        track_name: attrs.track_name,
        artist_name: attrs.artist_name,
        listened_at: attrs.listened_at
      )

    if existing do
      existing
      |> Listen.changeset(attrs)
      |> Repo.update()
    else
      %Listen{}
      |> Listen.changeset(attrs)
      |> Repo.insert()
    end
  end

  defp format_error(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, _opts} -> msg end)
    |> inspect()
  end
end
