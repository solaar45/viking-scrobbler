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

    if has_genres?(metadata) and has_year?(metadata) do
      {:ok, listen}
    else
      fetch_and_update_genres(listen)
    end
  end

  @doc """
  Enriches a listen and returns the enriched metadata map.
  Used by manual enrichment process.
  """
  def enrich_listen_metadata(%Listen{} = listen) do
    case enrich_listen(listen) do
      {:ok, updated_listen} ->
        metadata = parse_metadata(updated_listen.metadata)

        enriched_data = %{
          "genres" => metadata["genres"],
          "release_year" => metadata["mb_release_year"] || metadata["release_year"] || metadata["year"]
        }

        {:ok, enriched_data}

      {:error, reason} ->
        {:error, reason}
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
    Logger.info("🎵 MusicBrainz Fallback: Searching for #{listen.track_name} by #{listen.artist_name}")

    cond do
      not is_nil(listen.recording_mbid) and listen.recording_mbid != "" ->
        Logger.debug("Using recording MBID: #{listen.recording_mbid}")
        fetch_genres_by_recording(listen)

      not is_nil(listen.release_mbid) and listen.release_mbid != "" ->
        Logger.debug("Using release MBID: #{listen.release_mbid}")
        fetch_genres_by_release(listen)

      not is_nil(listen.artist_mbid) and listen.artist_mbid != "" ->
        Logger.debug("Using artist MBID: #{listen.artist_mbid}")
        fetch_genres_by_artist(listen)

      true ->
        Logger.debug("No MBIDs found, using text search")
        search_and_fetch_genres(listen)
    end
  end

  # --- RECORDING ---

  defp fetch_genres_by_recording(listen, fallback_year \\ nil) do
    url = "#{@musicbrainz_api}/recording/#{listen.recording_mbid}?inc=genres+tags+releases+artist-credits&fmt=json"

    case http_get(url) do
      {:ok, data} ->
        # 1. Year resolution
        mb_year =
          (data["first-release-date"] && extract_year_from_date(data["first-release-date"])) ||
          extract_year_from_releases(data["releases"]) ||
          fallback_year

        # 2. Recording genres & tags
        rec_genres = extract_genres_and_tags(data)

        # 3. Artist MBID resolution from recording credits
        first_artist = get_in(data, ["artist-credit", Access.at(0), "artist"])
        artist_mbid = (first_artist && first_artist["id"]) || listen.artist_mbid

        # 4. If no recording genres, fetch from artist
        artist_genres =
          if rec_genres == [] and not is_nil(artist_mbid) do
            fetch_artist_genres_direct(artist_mbid)
          else
            []
          end

        # 5. If still empty, check release tags
        release_genres =
          if rec_genres == [] and artist_genres == [] do
            extract_genres_from_releases(data["releases"])
          else
            []
          end

        all_genres = (rec_genres ++ artist_genres ++ release_genres) |> Enum.uniq() |> Enum.take(5)

        update_listen_metadata(listen, all_genres, mb_year, "musicbrainz_recording", artist_mbid)

      _ ->
        fetch_genres_by_artist(listen)
    end
  end

  # --- RELEASE ---

  defp fetch_genres_by_release(listen) do
    url = "#{@musicbrainz_api}/release/#{listen.release_mbid}?inc=genres+tags+artist-credits&fmt=json"

    case http_get(url) do
      {:ok, data} ->
        genre_names = extract_genres_and_tags(data)

        mb_year =
          data
          |> Map.get("date")
          |> extract_year_from_date()

        first_artist = get_in(data, ["artist-credit", Access.at(0), "artist"])
        artist_mbid = (first_artist && first_artist["id"]) || listen.artist_mbid

        update_listen_metadata(listen, genre_names, mb_year, "musicbrainz_release", artist_mbid)

      _ ->
        fetch_genres_by_artist(listen)
    end
  end

  # --- ARTIST ---

  defp fetch_genres_by_artist(listen) do
    artist_mbid =
      if not is_nil(listen.artist_mbid) and listen.artist_mbid != "" do
        listen.artist_mbid
      else
        search_artist_mbid(clean_artist_name(listen.artist_name))
      end

    if is_nil(artist_mbid) do
      {:error, :no_artist_mbid}
    else
      genres = fetch_artist_genres_direct(artist_mbid)
      update_listen_metadata(listen, genres, nil, "musicbrainz_artist", artist_mbid)
    end
  end

  defp fetch_artist_genres_direct(artist_mbid) when is_binary(artist_mbid) do
    url = "#{@musicbrainz_api}/artist/#{artist_mbid}?inc=genres+tags&fmt=json"

    case http_get(url) do
      {:ok, data} ->
        extract_genres_and_tags(data)

      _ ->
        []
    end
  end

  defp fetch_artist_genres_direct(_), do: []

  defp search_artist_mbid(nil), do: nil
  defp search_artist_mbid(""), do: nil
  defp search_artist_mbid(artist_name) do
    query = URI.encode_query(%{"query" => "artist:\"#{artist_name}\"", "fmt" => "json"})
    url = "#{@musicbrainz_api}/artist?#{query}"

    case http_get(url) do
      {:ok, %{"artists" => [first | _]}} ->
        first["id"]

      _ ->
        nil
    end
  end

  # --- SEARCH FALLBACK ---

  defp clean_track_name(nil), do: ""
  defp clean_track_name(track) when is_binary(track) do
    track
    |> String.replace(~r/\s*[\(\[](?:feat\.?|ft\.?|featuring|with)\s+[^)\]]+[\)\]]/i, "")
    |> String.replace(~r/\s*-\s*(?:feat\.?|ft\.?|featuring|with)\s+.+$/i, "")
    |> String.replace(~r/\s*[\(\[](?:remaster(?:ed)?(?:\s+\d{4})?|live|mono|stereo|radio edit|original mix)[\)\]]/i, "")
    |> String.trim()
  end

  defp clean_artist_name(nil), do: ""
  defp clean_artist_name(artist) when is_binary(artist) do
    artist
    |> String.replace(~r/\s*[\(\[](?:feat\.?|ft\.?|featuring|with)\s+[^)\]]+[\)\]]/i, "")
    |> String.replace(~r/\s+(?:feat\.?|ft\.?|featuring|with)\s+.+$/i, "")
    |> String.trim()
  end

  defp search_and_fetch_genres(listen) do
    clean_track = clean_track_name(listen.track_name)
    clean_art = clean_artist_name(listen.artist_name)

    candidates =
      [
        # 1. Cleaned query (highest success rate on MusicBrainz)
        if(clean_track != listen.track_name or clean_art != listen.artist_name, do: {clean_art, clean_track}),
        # 2. Raw query
        {listen.artist_name, listen.track_name}
      ]
      |> Enum.reject(&is_nil/1)
      |> Enum.uniq()

    do_search_recordings(listen, candidates)
  end

  defp do_search_recordings(listen, []) do
    # Fallback: at least try to get artist genres
    fetch_genres_by_artist(listen)
  end

  defp do_search_recordings(listen, [{art, trk} | rest]) do
    query =
      URI.encode_query(%{
        "query" => "artist:\"#{art}\" AND recording:\"#{trk}\"",
        "fmt" => "json"
      })

    url = "#{@musicbrainz_api}/recording?#{query}"

    case http_get(url) do
      {:ok, %{"recordings" => [first | _]}} ->
        mbid = first["id"]
        first_year = first["first-release-date"] && extract_year_from_date(first["first-release-date"])
        first_artist = get_in(first, ["artist-credit", Access.at(0), "artist"])
        artist_mbid = first_artist && first_artist["id"]

        fetch_genres_by_recording(
          %{listen | recording_mbid: mbid, artist_mbid: listen.artist_mbid || artist_mbid},
          first_year
        )

      _ ->
        do_search_recordings(listen, rest)
    end
  end

  # --- HELPERS: Genres/Tags ---

  defp extract_genres_and_tags(data) do
    genres = Map.get(data, "genres", []) |> Enum.map(& &1["name"])

    tags =
      Map.get(data, "tags", [])
      |> Enum.filter(fn t -> (t["count"] || 0) >= 1 end)
      |> Enum.map(& &1["name"])

    (genres ++ tags)
    |> Enum.map(&String.downcase/1)
    |> Enum.uniq()
    |> Enum.take(5)
  end

  defp extract_year_from_releases(releases) when is_list(releases) do
    releases
    |> Enum.map(&Map.get(&1, "date"))
    |> Enum.reject(&is_nil/1)
    |> Enum.map(&extract_year_from_date/1)
    |> Enum.reject(&is_nil/1)
    |> Enum.sort()
    |> List.first()
  end
  defp extract_year_from_releases(_), do: nil

  defp extract_genres_from_releases(releases) when is_list(releases) do
    releases
    |> Enum.flat_map(fn rel ->
      rel_genres = (rel["genres"] || []) |> Enum.map(& &1["name"])
      rel_tags = (rel["tags"] || []) |> Enum.map(& &1["name"])
      rel_genres ++ rel_tags
    end)
    |> Enum.map(&String.downcase/1)
    |> Enum.uniq()
  end
  defp extract_genres_from_releases(_), do: []

  # --- UPDATE METADATA (Genres + Year) ---

  defp update_listen_metadata(listen, genres, mb_year, source, artist_mbid \\ nil) do
    has_genres = is_list(genres) and genres != []
    has_year = not is_nil(mb_year)

    if not has_genres and not has_year do
      {:error, :no_metadata_found}
    else
      metadata = parse_metadata(listen.metadata)

      new_metadata =
        metadata
        |> then(fn m -> if has_genres, do: Map.put(m, "genres", genres), else: m end)
        |> maybe_put_mb_year(mb_year)
        |> Map.put("source", source)

      changes = %{metadata: Jason.encode!(new_metadata)}
      changes =
        if is_nil(listen.artist_mbid) and not is_nil(artist_mbid) do
          Map.put(changes, :artist_mbid, artist_mbid)
        else
          changes
        end

      changeset = Ecto.Changeset.change(listen, changes)

      case Repo.update(changeset) do
        {:ok, updated_listen} ->
          Logger.info(
            "✅ Enriched listen #{listen.id} from #{source}: genres=#{inspect(genres)}, year=#{inspect(mb_year)}"
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
  end

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

  defp has_year?(metadata) when is_map(metadata) do
    not is_nil(metadata["year"]) or not is_nil(metadata["release_year"]) or not is_nil(metadata["mb_release_year"])
  end
  defp has_year?(_), do: false

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
