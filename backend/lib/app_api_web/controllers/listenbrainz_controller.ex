defmodule AppApiWeb.ListenBrainzController do
  @moduledoc """
  ListenBrainz API v1 Implementation

  Handles:
  - Real-time scrobbling from Navidrome
  - ListenBrainz-compatible API endpoints
  - Statistics and user data retrieval
  """

  use AppApiWeb, :controller
  alias AppApi.{Repo, Listen, Stats, PlayerSessionCache}
  alias AppApiWeb.TokenController
  import Ecto.Query
  require Logger

  # ============================================================================
  # PUBLIC API ENDPOINTS
  # ============================================================================

  @doc """
  POST /1/submit-listens

  ListenBrainz API v1 endpoint for submitting listens.
  Used by Navidrome for real-time scrobbling.

  Requires: Token authentication
  """
  def submit_listens(conn, params) do
    Logger.info("📥 ListenBrainz API: #{inspect(params["listen_type"])}")

    token = get_token_from_header(conn)

    case TokenController.validate(token) do
      {:ok, user_name} ->
        listen_type = params["listen_type"]
        payload = params["payload"] || []

        case listen_type do
          "single" ->
            process_live_scrobbles(conn, payload, user_name)

          "playing_now" ->
            json(conn, %{status: "ok", message: "playing_now received"})

          "import" ->
            # ListenBrainz bulk import (e.g. from Last.fm)
            process_live_scrobbles(conn, payload, user_name)

          _ ->
            conn
            |> put_status(:bad_request)
            |> json(%{code: 400, error: "Invalid listen_type"})
        end

      {:error, _reason} ->
        conn
        |> put_status(:unauthorized)
        |> json(%{code: 401, error: "Invalid token"})
    end
  end

  @doc "GET /1/user/:user_name/listens"
  def get_listens(conn, %{"user_name" => user_name} = params) do
    count = String.to_integer(params["count"] || "25")
    max_ts = parse_timestamp(params["max_ts"])
    min_ts = parse_timestamp(params["min_ts"])

    query =
      from(l in Listen,
        where: l.user_name == ^user_name,
        order_by: [desc: l.listened_at],
        limit: ^count
      )

    query = if max_ts, do: where(query, [l], l.listened_at < ^max_ts), else: query
    query = if min_ts, do: where(query, [l], l.listened_at > ^min_ts), else: query

    listens = Repo.all(query)

    json(conn, %{
      payload: %{
        count: length(listens),
        listens: Enum.map(listens, &format_listen/1),
        user_id: user_name
      }
    })
  end

  @doc "GET /1/user/:user_name/recent-listens"
  def get_recent_listens(conn, %{"user_name" => user_name} = params) do
    count = String.to_integer(params["count"] || "20")

    listens =
      Listen
      |> where([l], l.user_name == ^user_name)
      |> order_by([l], desc: l.listened_at)
      |> limit(^count)
      |> Repo.all()

    json(conn, %{
      payload: %{
        count: length(listens),
        listens: Enum.map(listens, &format_listen_detailed_hybrid/1)
      }
    })
  end

  @doc "GET /1/stats/user/:user_name/artists"
  def get_user_artists(conn, %{"user_name" => user_name} = params) do
    count = String.to_integer(params["count"] || "10")
    range = params["range"] || "all_time"

    query = build_time_range_query(Listen, user_name, range)

    top_artists =
      query
      |> group_by([l], l.artist_name)
      |> select([l], %{
        artist_name: l.artist_name,
        artist_mbid: fragment("MAX(?)", l.artist_mbid),
        listen_count: count(l.id)
      })
      |> order_by([l], desc: count(l.id))
      |> limit(^count)
      |> Repo.all()

    json(conn, %{
      payload: %{
        artists: top_artists,
        count: length(top_artists),
        offset: 0,
        range: range,
        user_id: user_name
      }
    })
  end

  @doc "GET /1/stats/user/:user_name/recordings"
  def get_user_recordings(conn, %{"user_name" => user_name} = params) do
    count = String.to_integer(params["count"] || "10")
    range = params["range"] || "all_time"

    query = build_time_range_query(Listen, user_name, range)

    top_recordings =
      query
      |> group_by([l], [l.track_name, l.artist_name])
      |> select([l], %{
        track_name: l.track_name,
        artist_name: l.artist_name,
        recording_mbid: fragment("MAX(?)", l.recording_mbid),
        listen_count: count(l.id)
      })
      |> order_by([l], desc: count(l.id))
      |> limit(^count)
      |> Repo.all()

    json(conn, %{
      payload: %{
        recordings: top_recordings,
        count: length(top_recordings),
        offset: 0,
        range: range,
        user_id: user_name
      }
    })
  end

  @doc "GET /1/stats/user/:user_name/listening-activity"
  def get_listening_activity(conn, %{"user_name" => user_name} = params) do
    range = params["range"] || "all_time"
    query = build_time_range_query(Listen, user_name, range)

    activity =
      case range do
        "week" ->
          query
          |> select([l], %{
            time_range: fragment("DATE(datetime(?, 'unixepoch'))", l.listened_at),
            listen_count: count(l.id)
          })
          |> group_by([l], fragment("DATE(datetime(?, 'unixepoch'))", l.listened_at))
          |> order_by([l], asc: fragment("DATE(datetime(?, 'unixepoch'))", l.listened_at))
          |> Repo.all()

        "month" ->
          query
          |> select([l], %{
            time_range: fragment("strftime('%Y-W%W', datetime(?, 'unixepoch'))", l.listened_at),
            listen_count: count(l.id)
          })
          |> group_by(
            [l],
            fragment("strftime('%Y-W%W', datetime(?, 'unixepoch'))", l.listened_at)
          )
          |> order_by([l],
            asc: fragment("strftime('%Y-W%W', datetime(?, 'unixepoch'))", l.listened_at)
          )
          |> Repo.all()

        "year" ->
          query
          |> select([l], %{
            time_range: fragment("strftime('%Y-%m', datetime(?, 'unixepoch'))", l.listened_at),
            listen_count: count(l.id)
          })
          |> group_by([l], fragment("strftime('%Y-%m', datetime(?, 'unixepoch'))", l.listened_at))
          |> order_by([l],
            asc: fragment("strftime('%Y-%m', datetime(?, 'unixepoch'))", l.listened_at)
          )
          |> Repo.all()

        "all_time" ->
          query
          |> select([l], %{
            time_range: fragment("strftime('%Y', datetime(?, 'unixepoch'))", l.listened_at),
            listen_count: count(l.id)
          })
          |> group_by([l], fragment("strftime('%Y', datetime(?, 'unixepoch'))", l.listened_at))
          |> order_by([l],
            asc: fragment("strftime('%Y', datetime(?, 'unixepoch'))", l.listened_at)
          )
          |> Repo.all()

        _ ->
          query
          |> select([l], %{
            time_range: fragment("DATE(datetime(?, 'unixepoch'))", l.listened_at),
            listen_count: count(l.id)
          })
          |> group_by([l], fragment("DATE(datetime(?, 'unixepoch'))", l.listened_at))
          |> order_by([l], asc: fragment("DATE(datetime(?, 'unixepoch'))", l.listened_at))
          |> Repo.all()
      end

    grouping =
      case range do
        "week" -> "daily"
        "month" -> "weekly"
        "year" -> "monthly"
        "all_time" -> "yearly"
        _ -> "daily"
      end

    json(conn, %{
      payload: %{
        listening_activity: activity,
        range: range,
        grouping: grouping,
        user_id: user_name
      }
    })
  end

  @doc "GET /1/stats/user/:user_name/totals"
  def get_user_totals(conn, %{"user_name" => user_name} = params) do
    range = params["range"] || "all_time"
    query = build_time_range_query(Listen, user_name, range)

    total_listens = Repo.aggregate(query, :count, :id)

    unique_artists =
      query
      |> select([l], l.artist_name)
      |> distinct(true)
      |> Repo.aggregate(:count, :artist_name)

    unique_tracks =
      query
      |> select([l], fragment("? || ' - ' || ?", l.artist_name, l.track_name))
      |> distinct(true)
      |> Repo.all()
      |> length()

    unique_albums =
      query
      |> where([l], not is_nil(l.release_name))
      |> select([l], l.release_name)
      |> distinct(true)
      |> Repo.aggregate(:count, :release_name)

    first_listen =
      query
      |> order_by([l], asc: l.listened_at)
      |> limit(1)
      |> select([l], l.listened_at)
      |> Repo.one()

    last_listen =
      query
      |> order_by([l], desc: l.listened_at)
      |> limit(1)
      |> select([l], l.listened_at)
      |> Repo.one()

    from_timestamp = get_range_timestamp(range)
    {most_active_day, tracks_on_most_active} = Stats.most_active_day(user_name, from_timestamp)
    avg_per_day = Stats.avg_per_day(user_name, from_timestamp)
    peak_day_data = Stats.peak_day(user_name, from_timestamp)
    current_streak = if range == "all_time", do: Stats.current_streak(user_name), else: 0

    json(conn, %{
      payload: %{
        total_listens: total_listens,
        unique_artists: unique_artists,
        unique_tracks: unique_tracks,
        unique_albums: unique_albums,
        first_listen: first_listen,
        last_listen: last_listen,
        most_active_day: most_active_day,
        tracks_on_most_active_day: tracks_on_most_active,
        avg_per_day: avg_per_day,
        peak_day: peak_day_data.date,
        peak_count: peak_day_data.count,
        current_streak: current_streak,
        range: range,
        user_id: user_name
      }
    })
  end

  @doc "GET /1/validate-token"
  def validate_token(conn, _params) do
    json(conn, %{
      code: 200,
      message: "Token valid",
      valid: true,
      user_name: "viking_user"
    })
  end

  # ============================================================================
  # PRIVATE FUNCTIONS
  # ============================================================================

  defp process_live_scrobbles(conn, payload, user_name) when is_list(payload) do
    # STEP 1: Get player info BEFORE inserting listens
    player_info = get_player_info_sync(user_name)
    
    Logger.info("🎮 Player info for #{user_name}: #{inspect(player_info)}")
    
    listens =
      Enum.map(payload, fn listen_data ->
        track_metadata = listen_data["track_metadata"] || %{}
        base_additional_info = track_metadata["additional_info"] || %{}
        
        # Use discovered player info
        enriched_additional_info = 
          base_additional_info
          |> Map.put("media_player", player_info.player)
          |> maybe_put("player_client", player_info.client)
          |> maybe_put("player_platform", player_info.platform)

        %{
          listened_at: parse_timestamp(listen_data["listened_at"]),
          track_name: track_metadata["track_name"],
          artist_name: track_metadata["artist_name"],
          release_name: track_metadata["release_name"],
          recording_mbid: get_in(track_metadata, ["additional_info", "recording_mbid"]),
          artist_mbid: get_in(track_metadata, ["additional_info", "artist_mbid"]),
          release_mbid: get_in(track_metadata, ["additional_info", "release_mbid"]),
          additional_info: enriched_additional_info,
          user_name: user_name,
          inserted_at: DateTime.utc_now() |> DateTime.truncate(:second)
        }
      end)
      |> Enum.reject(&is_nil(&1.track_name))

    case Repo.insert_all(Listen, listens) do
      {count, _} when count > 0 ->
        Logger.info("✅ Scrobbled #{count} tracks for #{user_name}")

        # Async enrichment: metadata (genres, bitrate, format)
        listens_to_enrich =
          Listen
          |> where([l], l.user_name == ^user_name)
          |> order_by([l], desc: l.listened_at)
          |> limit(^count)
          |> Repo.all()

        Task.start(fn ->
          Enum.each(listens_to_enrich, fn listen ->
            # Enrich metadata (genres, bitrate, format, etc.)
            case AppApi.NavidromeIntegration.enrich_listen_from_navidrome(listen) do
              {:ok, _} ->
                Logger.debug("✅ Enriched from Navidrome: #{listen.track_name}")

              {:error, _} ->
                Logger.debug("⚠️ Navidrome failed, trying MusicBrainz: #{listen.track_name}")
                Task.start(fn -> AppApi.GenreEnrichment.enrich_listen(listen) end)
            end

            :timer.sleep(150)
          end)
        end)

        # Broadcast to frontend
        AppApiWeb.Endpoint.broadcast!(
          "scrobbles:#{user_name}",
          "new_scrobble",
          %{count: count, user: user_name, timestamp: DateTime.utc_now() |> DateTime.to_unix()}
        )

        json(conn, %{status: "ok", message: "#{count} listen(s) inserted"})

      _ ->
        Logger.error("Failed to insert listens")

        conn
        |> put_status(:internal_server_error)
        |> json(%{status: "error", message: "Failed to insert listens"})
    end
  end

  # Get player info synchronously (with cache fallback)
  defp get_player_info_sync(user_name) do
    # Try to get current player from Navidrome getNowPlaying
    case fetch_player_from_navidrome(user_name) do
      {:ok, player_info} ->
        # Cache for future requests
        PlayerSessionCache.put_player(user_name, player_info)
        player_info
      
      {:error, _reason} ->
        # Fallback to cached session
        case PlayerSessionCache.get_player(user_name) do
          {:ok, cached_info} ->
            Logger.debug("🎮 Using cached player: #{cached_info.player}")
            cached_info
          
          {:error, _} ->
            Logger.debug("⚠️ No player info available, using Unknown Client")
            %{player: "Unknown Client", client: nil, platform: nil}
        end
    end
  end

  # Fetch player info from Navidrome getNowPlaying API
  defp fetch_player_from_navidrome(user_name) do
    # Create a dummy listen just to get navidrome config
    dummy_listen = %Listen{user_name: user_name, additional_info: %{}}
    
    case AppApi.NavidromeIntegration.resolve_navidrome_config(dummy_listen) do
      {:ok, navidrome_config} ->
        case AppApi.NavidromeIntegration.get_now_playing(
          navidrome_config.url,
          navidrome_config.username,
          navidrome_config.password
        ) do
          {:ok, player_info} ->
            # Parse player name from Navidrome format
            parsed = AppApi.NavidromeIntegration.parse_player_name(player_info.player_name)
            Logger.info("🎮 Found active player: #{parsed.player}")
            {:ok, parsed}
          
          error ->
            Logger.debug("⚠️ getNowPlaying failed: #{inspect(error)}")
            error
        end
      
      error ->
        Logger.debug("⚠️ No Navidrome config: #{inspect(error)}")
        error
    end
  end

  # Helper to conditionally add keys to map
  defp maybe_put(map, _key, nil), do: map
  defp maybe_put(map, key, value), do: Map.put(map, key, value)

  defp format_listen(listen) do
    metadata =
      case listen.metadata do
        nil ->
          %{}

        str when is_binary(str) ->
          case Jason.decode(str) do
            {:ok, map} -> map
            _ -> %{}
          end

        map when is_map(map) ->
          map

        _ ->
          %{}
      end

    genres_string =
      case metadata["genres"] do
        list when is_list(list) and list != [] -> Enum.join(list, ", ")
        _ -> nil
      end

    additional_info =
      (listen.additional_info || %{})
      |> Map.put("genres", genres_string)
      |> Map.put("duration_ms", listen.duration_ms)
      |> Map.put("tracknumber", listen.tracknumber)
      |> Map.put("discnumber", listen.discnumber)

    %{
      listened_at: listen.listened_at,
      track_metadata: %{
        track_name: listen.track_name,
        artist_name: listen.artist_name,
        release_name: listen.release_name,
        additional_info: additional_info
      }
    }
  end

  defp format_listen_detailed_hybrid(listen) do
    metadata =
      case listen.metadata do
        nil ->
          %{}

        str when is_binary(str) ->
          case Jason.decode(str) do
            {:ok, map} -> map
            _ -> %{}
          end

        map when is_map(map) ->
          map

        _ ->
          %{}
      end

    base_info = listen.additional_info || %{}

    genres_from_metadata =
      case metadata["genres"] do
        list when is_list(list) and list != [] ->
          list |> Enum.take(3) |> Enum.join(", ")

        _ ->
          nil
      end

    genres = genres_from_metadata || base_info["genres"] || "–"

    release_year =
      cond do
        is_integer(metadata["year"]) ->
          metadata["year"]

        is_binary(metadata["year"]) and String.length(metadata["year"]) >= 4 ->
          String.slice(metadata["year"], 0, 4)

        is_integer(metadata["mb_release_year"]) ->
          metadata["mb_release_year"]

        is_binary(metadata["mb_release_year"]) and String.length(metadata["mb_release_year"]) >= 4 ->
          String.slice(metadata["mb_release_year"], 0, 4)

        is_integer(metadata["release_year"]) ->
          metadata["release_year"]

        is_binary(metadata["release_year"]) and String.length(metadata["release_year"]) >= 4 ->
          String.slice(metadata["release_year"], 0, 4)

        true ->
          base_info["release_year"] || nil
      end

    duration_ms = base_info["duration_ms"] || listen.duration_ms
    tracknumber = base_info["tracknumber"] || listen.tracknumber
    discnumber = base_info["discnumber"] || listen.discnumber

    navidrome_id = metadata["navidrome_id"] || base_info["navidrome_id"]

    merged_info =
      base_info
      |> Map.put_new("duration_ms", duration_ms)
      |> Map.put_new("tracknumber", tracknumber)
      |> Map.put_new("discnumber", discnumber)
      |> Map.put("genres", genres)
      |> Map.put("release_year", release_year)
      |> Map.put("navidrome_id", navidrome_id)
      |> maybe_put("originalBitRate", base_info["originalBitRate"])
      |> maybe_put("originalFormat", base_info["originalFormat"])

    %{
      listened_at: listen.listened_at,
      track_name: listen.track_name,
      artist_name: listen.artist_name,
      release_name: listen.release_name,
      recording_mbid: listen.recording_mbid,
      artist_mbid: listen.artist_mbid,
      release_mbid: listen.release_mbid,
      additional_info: merged_info
    }
  end

  defp get_token_from_header(conn) do
    case get_req_header(conn, "authorization") do
      ["Token " <> token] -> token
      ["Bearer " <> token] -> token
      _ -> nil
    end
  end

  defp parse_timestamp(nil), do: DateTime.utc_now() |> DateTime.to_unix()

  defp parse_timestamp(ts) when is_binary(ts) do
    case Integer.parse(ts) do
      {timestamp, _} -> timestamp
      :error -> DateTime.utc_now() |> DateTime.to_unix()
    end
  end

  defp parse_timestamp(ts) when is_integer(ts), do: ts
  defp parse_timestamp(_), do: DateTime.utc_now() |> DateTime.to_unix()

  defp build_time_range_query(query, user_name, range) do
    now = DateTime.utc_now() |> DateTime.to_unix()

    time_filter =
      case range do
        "week" -> now - 7 * 86400
        "month" -> now - 30 * 86400
        "year" -> now - 365 * 86400
        "all_time" -> 0
        _ -> 0
      end

    from(l in query,
      where: l.user_name == ^user_name and l.listened_at >= ^time_filter
    )
  end

  defp get_range_timestamp(range) do
    now = DateTime.utc_now() |> DateTime.to_unix()

    case range do
      "week" -> now - 7 * 86400
      "month" -> now - 30 * 86400
      "year" -> now - 365 * 86400
      "all_time" -> nil
      _ -> nil
    end
  end
end
