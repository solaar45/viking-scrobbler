defmodule AppApi.GenreEnrichment do
  @moduledoc """
  MusicBrainz Genre Enrichment (Fallback when Navidrome has no genres).

  Ergänzt:
  - `metadata["genres"]` (wie bisher)
  - 🆕 `metadata["mb_release_year"]` wenn über Release/Recording verfügbar
  """

  require Logger
  alias AppApi.{Repo, Listen}
  import Ecto.Query

  @musicbrainz_api "https://musicbrainz.org/ws/2"
  @user_agent "VikingScrobbler/1.0 (https://github.com/solaar45/viking-scrobbler)"

  @doc """
  Enriches a listen with genre data from MusicBrainz (Fallback only)
  """
  def enrich_listen(%Listen{} = listen) do
    metadata = parse_metadata(listen.metadata)

    if has_genres?(metadata) do
      {:ok, listen}
    else
      fetch_and_update_genres(listen)
    end
  end

  @doc """
  Background task: Enrich all listens without genres
  """
  def enrich_missing_genres(limit \\ 50) do
    Listen
    |> where([l], fragment("? NOT LIKE '%genres%'", l.metadata))
    |> or_where([l], l.metadata == "{}")
    |> limit(^limit)
    |> Repo.all()
    |> Enum.each(&enrich_listen/1)
  end

  # === PRIVATE ===

  defp fetch_and_update_genres(listen) do
    Logger.info("🎵 Fallback: Fetching genres from MusicBrainz for #{listen.track_name}")

    cond do
      listen.recording_mbid && listen.recording_mbid != "" ->
        fetch_genres_by_recording(listen)

      listen.release_mbid && listen.release_mbid != "" ->
        fetch_genres_by_release(listen)

      listen.artist_mbid && listen.artist_mbid != "" ->
        fetch_genres_by_artist(listen)

      true ->
        search_and_fetch_genres(listen)
    end
  end

  # --- RECORDING ---

  defp fetch_genres_by_recording(listen) do
    url = "#{@musicbrainz_api}/recording/#{listen.recording_mbid}?inc=genres+releases&fmt=json"

    case http_get(url) do
      {:ok, %{"genres" => [_ | _] = genres} = data} ->
        genre_names = Enum.map(genres, & &1["name"])

        mb_year =
          data
          |> Map.get("first-release-date")
          |> extract_year_from_date()

        update_listen_metadata(listen, genre_names, mb_year, "musicbrainz_recording")

      _ ->
        fetch_genres_by_artist(listen)
    end
  end

  # --- RELEASE ---

  defp fetch_genres_by_release(listen) do
    url = "#{@musicbrainz_api}/release/#{listen.release_mbid}?inc=genres+artist-credits&fmt=json"

    case http_get(url) do
      {:ok, %{"genres" => [_ | _] = genres} = data} ->
        genre_names = Enum.map(genres, & &1["name"])

        mb_year =
          data
          |> Map.get("date")
          |> extract_year_from_date()

        update_listen_metadata(listen, genre_names, mb_year, "musicbrainz_release")

      _ ->
        fetch_genres_by_artist(listen)
    end
  end

  # --- ARTIST ---

  defp fetch_genres_by_artist(listen) do
    url = "#{@musicbrainz_api}/artist/#{listen.artist_mbid}?inc=genres+tags&fmt=json"

    case http_get(url) do
      {:ok, data} ->
        genres = extract_genres_and_tags(data)
        # Für Artist-Ebene gibt es kein klares Releasejahr → nil
        update_listen_metadata(listen, genres, nil, "musicbrainz_artist")

      _ ->
        {:error, :no_genres_found}
    end
  end

  # --- SEARCH FALLBACK ---

  defp search_and_fetch_genres(listen) do
    query =
      URI.encode_query(%{
        "query" => "artist:\"#{listen.artist_name}\" AND recording:\"#{listen.track_name}\"",
        "fmt" => "json"
      })

    url = "#{@musicbrainz_api}/recording?#{query}"

    case http_get(url) do
      {:ok, %{"recordings" => [first | _]}} ->
        mbid = first["id"]
        # versuche erneut mit Recording-MBID
        fetch_genres_by_recording(%{listen | recording_mbid: mbid})

      _ ->
        {:error, :search_failed}
    end
  end

  # --- HELPERS: Genres/Tags ---

  defp extract_genres_and_tags(data) do
    genres = Map.get(data, "genres", []) |> Enum.map(& &1["name"])

    tags =
      Map.get(data, "tags", [])
      |> Enum.filter(&(&1["count"] >= 5))
      |> Enum.map(& &1["name"])

    (genres ++ tags)
    |> Enum.uniq()
    |> Enum.take(5)
  end

  # --- UPDATE METADATA (Genres + Year) ---

  defp update_listen_metadata(_listen, [], _mb_year, _source), do: {:error, :no_genres}

  defp update_listen_metadata(listen, genres, mb_year, source) when is_list(genres) do
    metadata = parse_metadata(listen.metadata)

    new_metadata =
      metadata
      |> Map.put("genres", genres)
      |> maybe_put_mb_year(mb_year)
      |> Map.put("source", source)

    changeset =
      listen
      |> Ecto.Changeset.change(%{metadata: Jason.encode!(new_metadata)})

    case Repo.update(changeset) do
      {:ok, updated_listen} ->
        Logger.info(
          "✅ Enriched listen #{listen.id} from #{source}: #{inspect(genres)} (year: #{inspect(mb_year)})"
        )

        # Broadcast update so connected clients can refresh their recent-listens
        try do
          AppApiWeb.Endpoint.broadcast!("scrobbles:#{listen.user_name}", "listen_enriched", %{
            listen_id: updated_listen.id,
            track_name: updated_listen.track_name,
            artist_name: updated_listen.artist_name
          })
        rescue
          _ -> Logger.debug("Broadcast failed or endpoint not available")
        end

        {:ok, updated_listen}

      {:error, _} ->
        {:error, :update_failed}
    end
  end

  # Rückwärtskompatibilität für alte Aufrufe ohne Jahr
  # defp update_listen_metadata(listen, genres, source) do
  #  update_listen_metadata(listen, genres, nil, source)
  # end

  defp maybe_put_mb_year(metadata, nil), do: metadata

  defp maybe_put_mb_year(metadata, year) do
    case extract_year_from_date(year) do
      nil -> metadata
      y -> Map.put(metadata, "mb_release_year", y)
    end
  end

  defp extract_year_from_date(nil), do: nil

  # akzeptiert "1976", "1976-05-01" etc.
  defp extract_year_from_date(date) when is_binary(date) do
    year = String.slice(date, 0, 4)

    case Integer.parse(year) do
      {int, ""} when int >= 1000 and int <= 9999 ->
        int

      _ ->
        nil
    end
  end

  defp extract_year_from_date(year) when is_integer(year) do
    if year >= 1000 and year <= 9999, do: year, else: nil
  end

  defp extract_year_from_date(_), do: nil

  # --- METADATA / FLAGS / HTTP ---

  defp parse_metadata(nil), do: %{}

  defp parse_metadata(str) when is_binary(str) do
    case Jason.decode(str) do
      {:ok, map} -> map
      _ -> %{}
    end
  end

  defp has_genres?(%{"genres" => [_ | _]}), do: true
  defp has_genres?(_), do: false

  defp http_get(url) do
    headers = [
      {"User-Agent", @user_agent},
      {"Accept", "application/json"}
    ]

    case HTTPoison.get(url, headers, recv_timeout: 5000) do
      {:ok, %{status_code: 200, body: body}} ->
        Jason.decode(body)

      {:ok, %{status_code: 503}} ->
        :timer.sleep(1000)
        {:error, :rate_limited}

      error ->
        Logger.warning("MusicBrainz API error: #{inspect(error)}")
        {:error, :api_error}
    end
  end
end
