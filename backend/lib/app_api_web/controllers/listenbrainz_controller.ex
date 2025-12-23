defmodule AppApiWeb.ListenBrainzController do
  use AppApiWeb, :controller
  alias AppApi.Repo
  alias AppApi.Listen
  alias AppApi.Stats
  alias AppApiWeb.TokenController
  import Ecto.Query
  require Logger

  # POST /1/submit-listens (ListenBrainz API v1)
  def submit_listens(conn, params) do
    token = get_token_from_header(conn)

    case TokenController.validate(token) do
      {:ok, user_name} ->
        listen_type = params["listen_type"]
        payload = params["payload"] || []

        case listen_type do
          "single" -> process_listens(conn, payload, user_name)
          "playing_now" -> json(conn, %{status: "ok", message: "playing_now received"})
          "import" -> process_listens(conn, payload, user_name)
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

  # GET /1/user/:user_name/listens
  def get_listens(conn, %{"user_name" => user_name} = params) do
    count = String.to_integer(params["count"] || "25")
    max_ts = parse_timestamp(params["max_ts"])
    min_ts = parse_timestamp(params["min_ts"])

    query =
      from l in Listen,
        where: l.user_name == ^user_name,
        order_by: [desc: l.listened_at],
        limit: ^count

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

  # GET /1/stats/user/:user_name/artists
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

  # GET /1/stats/user/:user_name/recordings
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

  # GET /1/stats/user/:user_name/listening-activity
  def get_listening_activity(conn, %{"user_name" => user_name} = params) do
    range = params["range"] || "all_time"

    query = build_time_range_query(Listen, user_name, range)

    # Smart Grouping basierend auf range - direkt die Queries bauen
    activity = case range do
      "week" ->
        # Gruppiere nach Tag (7 Einträge)
        query
        |> select([l], %{
          time_range: fragment("DATE(datetime(?, 'unixepoch'))", l.listened_at),
          listen_count: count(l.id)
        })
        |> group_by([l], fragment("DATE(datetime(?, 'unixepoch'))", l.listened_at))
        |> order_by([l], asc: fragment("DATE(datetime(?, 'unixepoch'))", l.listened_at))
        |> Repo.all()

      "month" ->
        # Gruppiere nach Woche (4-5 Einträge)
        query
        |> select([l], %{
          time_range: fragment("strftime('%Y-W%W', datetime(?, 'unixepoch'))", l.listened_at),
          listen_count: count(l.id)
        })
        |> group_by([l], fragment("strftime('%Y-W%W', datetime(?, 'unixepoch'))", l.listened_at))
        |> order_by([l], asc: fragment("strftime('%Y-W%W', datetime(?, 'unixepoch'))", l.listened_at))
        |> Repo.all()

      "year" ->
        # Gruppiere nach Monat (12 Einträge)
        query
        |> select([l], %{
          time_range: fragment("strftime('%Y-%m', datetime(?, 'unixepoch'))", l.listened_at),
          listen_count: count(l.id)
        })
        |> group_by([l], fragment("strftime('%Y-%m', datetime(?, 'unixepoch'))", l.listened_at))
        |> order_by([l], asc: fragment("strftime('%Y-%m', datetime(?, 'unixepoch'))", l.listened_at))
        |> Repo.all()

      "all_time" ->
        # Gruppiere nach Jahr
        query
        |> select([l], %{
          time_range: fragment("strftime('%Y', datetime(?, 'unixepoch'))", l.listened_at),
          listen_count: count(l.id)
        })
        |> group_by([l], fragment("strftime('%Y', datetime(?, 'unixepoch'))", l.listened_at))
        |> order_by([l], asc: fragment("strftime('%Y', datetime(?, 'unixepoch'))", l.listened_at))
        |> Repo.all()

      _ ->
        # Default: daily
        query
        |> select([l], %{
          time_range: fragment("DATE(datetime(?, 'unixepoch'))", l.listened_at),
          listen_count: count(l.id)
        })
        |> group_by([l], fragment("DATE(datetime(?, 'unixepoch'))", l.listened_at))
        |> order_by([l], asc: fragment("DATE(datetime(?, 'unixepoch'))", l.listened_at))
        |> Repo.all()
    end

    grouping = case range do
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

  # GET /1/stats/user/:user_name/totals (ERWEITERT)
  def get_user_totals(conn, %{"user_name" => user_name} = params) do
    range = params["range"] || "all_time"
    
    query = build_time_range_query(Listen, user_name, range)

    # Total Scrobbles
    total_listens = Repo.aggregate(query, :count, :id)

    # Unique Artists
    unique_artists = 
      query
      |> select([l], l.artist_name)
      |> distinct(true)
      |> Repo.aggregate(:count, :artist_name)

    # Unique Tracks
    unique_tracks = 
      query
      |> select([l], fragment("? || ' - ' || ?", l.artist_name, l.track_name))
      |> distinct(true)
      |> Repo.all()
      |> length()

    # Unique Albums
    unique_albums = 
      query
      |> where([l], not is_nil(l.release_name))
      |> select([l], l.release_name)
      |> distinct(true)
      |> Repo.aggregate(:count, :release_name)

    # First & Last Listen
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

    # --- NEUE ADVANCED STATS ---
    
    # Most Active Day (Wochentag mit meisten Scrobbles)
    from_timestamp = get_range_timestamp(range)
    {most_active_day, tracks_on_most_active} = Stats.most_active_day(user_name, from_timestamp)
    
    # Average Scrobbles per Day
    avg_per_day = Stats.avg_per_day(user_name, from_timestamp)
    
    # Peak Day (einzelner Tag mit meisten Scrobbles)
    {peak_day, peak_value} = Stats.peak_day(user_name, from_timestamp)
    
    # Current Streak (nur für all_time sinnvoll)
    current_streak = if range == "all_time", do: Stats.current_streak(user_name), else: 0

    json(conn, %{
      payload: %{
        total_listens: total_listens,
        unique_artists: unique_artists,
        unique_tracks: unique_tracks,
        unique_albums: unique_albums,
        first_listen: first_listen,
        last_listen: last_listen,
        # NEU:
        most_active_day: most_active_day,
        tracks_on_most_active_day: tracks_on_most_active,
        avg_per_day: avg_per_day,
        peak_day: peak_day,
        peak_value: peak_value,
        current_streak: current_streak,
        range: range,
        user_id: user_name
      }
    })
  end

  # GET /1/user/:user_name/recent-listens
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
        listens: Enum.map(listens, &format_listen_detailed/1)
      }
    })
  end

  # Validate Token
  def validate_token(conn, _params) do
    json(conn, %{
      code: 200,
      message: "Token valid",
      valid: true,
      user_name: "viking_user"
    })
  end

  # Private functions

  defp process_listens(conn, payload, user_name) when is_list(payload) do
    listens =
      Enum.map(payload, fn listen_data ->
        track_metadata = listen_data["track_metadata"] || %{}

        %{
          listened_at: parse_timestamp(listen_data["listened_at"]),
          track_name: track_metadata["track_name"],
          artist_name: track_metadata["artist_name"],
          release_name: track_metadata["release_name"],
          recording_mbid: get_in(track_metadata, ["additional_info", "recording_mbid"]),
          artist_mbid: get_in(track_metadata, ["additional_info", "artist_mbid"]),
          release_mbid: get_in(track_metadata, ["additional_info", "release_mbid"]),
          additional_info: track_metadata["additional_info"] || %{},
          user_name: user_name,
          inserted_at: DateTime.utc_now() |> DateTime.truncate(:second)
        }
      end)
      |> Enum.reject(&is_nil(&1.track_name))

    case Repo.insert_all(Listen, listens) do
      {count, _} when count > 0 ->
        Logger.info("Inserted #{count} listens for user #{user_name}")
        
        # 🚀 BROADCAST NEW SCROBBLE
        AppApiWeb.Endpoint.broadcast(
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

  defp format_listen(listen) do
    %{
      listened_at: listen.listened_at,
      track_metadata: %{
        track_name: listen.track_name,
        artist_name: listen.artist_name,
        release_name: listen.release_name,
        additional_info: listen.additional_info || %{}
      }
    }
  end

  defp format_listen_detailed(listen) do
    %{
      listened_at: listen.listened_at,
      track_name: listen.track_name,
      artist_name: listen.artist_name,
      release_name: listen.release_name,
      recording_mbid: listen.recording_mbid,
      artist_mbid: listen.artist_mbid,
      release_mbid: listen.release_mbid,
      additional_info: listen.additional_info || %{}
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
        "week" -> now - (7 * 86400)
        "month" -> now - (30 * 86400)
        "year" -> now - (365 * 86400)
        "all_time" -> 0
        _ -> 0
      end

    from l in query,
      where: l.user_name == ^user_name and l.listened_at >= ^time_filter
  end

  # Helper für Stats-Module: Konvertiere range zu Timestamp
  defp get_range_timestamp(range) do
    now = DateTime.utc_now() |> DateTime.to_unix()

    case range do
      "week" -> now - (7 * 86400)
      "month" -> now - (30 * 86400)
      "year" -> now - (365 * 86400)
      "all_time" -> nil
      _ -> nil
    end
  end
end
