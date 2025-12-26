defmodule AppApiWeb.StatsController do
  use AppApiWeb, :controller
  alias AppApi.{Listen, Repo}
  import Ecto.Query

  # ═══════════════════════════════════════════════════════════
  # OVERVIEW ENDPOINT
  # ═══════════════════════════════════════════════════════════

  # GET /api/stats/overview
  def overview(conn, params) do
    range = params["range"] || "month"
    query = Listen |> apply_time_filter(range)

    total_plays = Repo.aggregate(query, :count, :id)

    # Calculate unique artists in Elixir (no COUNT DISTINCT in SQLite)
    unique_artists =
      Repo.all(from(l in query, select: l.artist_name))
      |> Enum.uniq()
      |> length()

    # Calculate unique albums in Elixir
    unique_albums =
      Repo.all(from(l in query, select: l.release_name))
      |> Enum.uniq()
      |> length()

    # Total listening time
    total_ms = Repo.one(from(l in query, select: sum(l.duration_ms))) || 0
    total_listening_time = format_duration(total_ms)

    # Top artist
    top_artist =
      Repo.one(
        from(l in query,
          group_by: l.artist_name,
          select: %{name: l.artist_name, plays: count(l.id)},
          order_by: [desc: count(l.id)],
          limit: 1
        )
      ) || %{name: "N/A", plays: 0}

    # Top track
    top_track =
      Repo.one(
        from(l in query,
          group_by: [l.track_name, l.artist_name],
          select: %{name: l.track_name, artist: l.artist_name, plays: count(l.id)},
          order_by: [desc: count(l.id)],
          limit: 1
        )
      ) || %{name: "N/A", artist: "N/A", plays: 0}

    # Top album
    top_album =
      Repo.one(
        from(l in query,
          group_by: [l.release_name, l.artist_name],
          select: %{name: l.release_name, artist: l.artist_name, plays: count(l.id)},
          order_by: [desc: count(l.id)],
          limit: 1
        )
      ) || %{name: "N/A", artist: "N/A", plays: 0}

    # Recent activity (last 30 days)
    recent_activity =
      Repo.all(
        from(l in query,
          group_by: fragment("DATE(datetime(?, 'unixepoch'))", l.listened_at),
          select: %{
            date: fragment("DATE(datetime(?, 'unixepoch'))", l.listened_at),
            plays: count(l.id)
          },
          order_by: [asc: fragment("DATE(datetime(?, 'unixepoch'))", l.listened_at)],
          limit: 30
        )
      )

    json(conn, %{
      total_plays: total_plays,
      unique_artists: unique_artists,
      unique_albums: unique_albums,
      total_listening_time: total_listening_time,
      top_artist: top_artist,
      top_track: top_track,
      top_album: top_album,
      recent_activity: recent_activity
    })
  end

  # ═══════════════════════════════════════════════════════════
  # TOP ARTISTS (FIXED - No COUNT DISTINCT in SELECT)
  # ═══════════════════════════════════════════════════════════

  # GET /api/stats/top-artists
  def top_artists(conn, params) do
    limit = String.to_integer(params["limit"] || "50")
    range = params["range"] || "month"

    # First get total plays for percentage calculation
    query = Listen |> apply_time_filter(range)
    total_plays = Repo.aggregate(query, :count, :id)

    # Get artist stats WITHOUT unique_tracks
    stats_query =
      query
      |> group_by([l], l.artist_name)
      |> select([l], %{
        name: l.artist_name,
        plays: count(l.id),
        avg_per_day: fragment("ROUND(COUNT(*) * 1.0 / ?, 1)", ^get_days_for_range(range))
      })
      |> order_by([l], desc: count(l.id))
      |> limit(^limit)

    artists = Repo.all(stats_query)

    # Get ALL listens for these artists to calculate unique_tracks in Elixir
    artist_names = Enum.map(artists, & &1.name)

    tracks_by_artist =
      if length(artist_names) > 0 do
        Repo.all(
          from(l in query,
            where: l.artist_name in ^artist_names,
            select: %{artist: l.artist_name, track: l.track_name}
          )
        )
        |> Enum.group_by(& &1.artist, & &1.track)
        |> Enum.map(fn {artist, tracks} -> {artist, Enum.uniq(tracks) |> length()} end)
        |> Map.new()
      else
        %{}
      end

    # Calculate unique_tracks and percentage in Elixir
    stats =
      artists
      |> Enum.with_index(1)
      |> Enum.map(fn {artist, rank} ->
        unique_tracks = Map.get(tracks_by_artist, artist.name, 0)

        percentage =
          if total_plays > 0 do
            Float.round(artist.plays / total_plays * 100, 1)
          else
            0.0
          end

        artist
        |> Map.put(:rank, rank)
        |> Map.put(:percentage, percentage)
        |> Map.put(:unique_tracks, unique_tracks)
      end)

    json(conn, %{
      data: stats,
      meta: %{
        range: range,
        limit: limit,
        total: length(stats),
        generated_at: DateTime.utc_now() |> DateTime.to_iso8601()
      }
    })
  end

  # ═══════════════════════════════════════════════════════════
  # TOP TRACKS (FIXED)
  # ═══════════════════════════════════════════════════════════

  # GET /api/stats/top-tracks
  def top_tracks(conn, params) do
    limit = String.to_integer(params["limit"] || "50")
    range = params["range"] || "month"

    query = Listen |> apply_time_filter(range)
    total_plays = Repo.aggregate(query, :count, :id)

    stats_query =
      query
      |> group_by([l], [l.track_name, l.artist_name])
      |> select([l], %{
        track: l.track_name,
        artist: l.artist_name,
        plays: count(l.id),
        last_played: max(l.listened_at)
      })
      |> order_by([l], desc: count(l.id))
      |> limit(^limit)

    stats =
      Repo.all(stats_query)
      |> Enum.with_index(1)
      |> Enum.map(fn {stat, rank} ->
        percentage =
          if total_plays > 0 do
            Float.round(stat.plays / total_plays * 100, 1)
          else
            0.0
          end

        stat
        |> Map.put(:rank, rank)
        |> Map.put(:percentage, percentage)
        |> Map.put(:last_played_relative, format_relative_time(stat.last_played))
      end)

    json(conn, %{data: stats, meta: get_meta_info(params)})
  end

  # ═══════════════════════════════════════════════════════════
  # TOP ALBUMS (FIXED)
  # ═══════════════════════════════════════════════════════════

  # GET /api/stats/top-albums
  def top_albums(conn, params) do
    limit = String.to_integer(params["limit"] || "50")
    range = params["range"] || "month"

    query = Listen |> apply_time_filter(range)
    total_plays = Repo.aggregate(query, :count, :id)

    stats_query =
      query
      |> group_by([l], [l.release_name, l.artist_name])
      |> select([l], %{
        album: l.release_name,
        artist: l.artist_name,
        plays: count(l.id)
      })
      |> order_by([l], desc: count(l.id))
      |> limit(^limit)

    stats =
      Repo.all(stats_query)
      |> Enum.with_index(1)
      |> Enum.map(fn {stat, rank} ->
        percentage =
          if total_plays > 0 do
            Float.round(stat.plays / total_plays * 100, 1)
          else
            0.0
          end

        stat
        |> Map.put(:rank, rank)
        |> Map.put(:percentage, percentage)
        # Placeholder
        |> Map.put(:completion_rate, 85)
      end)

    json(conn, %{data: stats, meta: get_meta_info(params)})
  end

  # ═══════════════════════════════════════════════════════════
  # TOP GENRES (Already OK)
  # ═══════════════════════════════════════════════════════════

  # GET /api/stats/top-genres
  def top_genres(conn, params) do
    limit = String.to_integer(params["limit"] || "50")
    range = params["range"] || "month"

    query =
      Listen
      |> apply_time_filter(range)
      |> where([l], not is_nil(l.metadata))
      |> select([l], %{
        metadata: l.metadata,
        duration_ms: l.duration_ms
      })

    listens = Repo.all(query)

    # Parse genres from JSONB metadata
    genre_stats =
      listens
      |> Enum.flat_map(fn listen ->
        case listen.metadata do
          %{"genres" => genres} when is_list(genres) ->
            Enum.map(genres, &{&1, listen.duration_ms || 0})

          _ ->
            []
        end
      end)
      |> Enum.group_by(fn {genre, _} -> genre end, fn {_, duration} -> duration end)
      |> Enum.map(fn {genre, durations} ->
        %{
          genre: genre,
          plays: length(durations),
          avg_duration: avg_duration(durations),
          artists: 0
        }
      end)
      |> Enum.sort_by(& &1.plays, :desc)
      |> Enum.take(limit)
      |> Enum.with_index(1)
      |> Enum.map(fn {stat, rank} -> Map.put(stat, :rank, rank) end)

    total_plays = Enum.sum(Enum.map(genre_stats, & &1.plays))

    genre_stats =
      Enum.map(genre_stats, fn stat ->
        percentage =
          if total_plays > 0 do
            Float.round(stat.plays / total_plays * 100, 1)
          else
            0.0
          end

        Map.put(stat, :percentage, percentage)
      end)

    json(conn, %{data: genre_stats, meta: get_meta_info(params)})
  end

  # ═══════════════════════════════════════════════════════════
  # TOP YEARS (Already OK)
  # ═══════════════════════════════════════════════════════════

  # GET /api/stats/top-years
  def top_years(conn, params) do
    limit = String.to_integer(params["limit"] || "50")
    range = params["range"] || "month"

    query =
      Listen
      |> apply_time_filter(range)
      |> where([l], not is_nil(l.metadata))
      |> select([l], %{
        metadata: l.metadata,
        release_name: l.release_name,
        artist_name: l.artist_name
      })

    listens = Repo.all(query)

    year_stats =
      listens
      |> Enum.filter(fn listen ->
        case listen.metadata do
          %{"release_year" => year} when is_integer(year) -> true
          _ -> false
        end
      end)
      |> Enum.map(fn listen ->
        year = get_in(listen.metadata, ["release_year"])
        {year, listen.release_name, listen.artist_name}
      end)
      |> Enum.group_by(fn {year, _, _} -> year end)
      |> Enum.map(fn {year, items} ->
        albums = items |> Enum.map(fn {_, album, _} -> album end) |> Enum.uniq()

        top_album_data =
          items
          |> Enum.frequencies_by(fn {_, album, artist} -> {album, artist} end)
          |> Enum.max_by(fn {_, count} -> count end, fn -> {{nil, nil}, 0} end)
          |> elem(0)

        {album_name, artist_name} = top_album_data

        %{
          year: year,
          plays: length(items),
          albums: length(albums),
          top_album: "#{album_name} - #{artist_name}"
        }
      end)
      |> Enum.sort_by(& &1.plays, :desc)
      |> Enum.take(limit)
      |> Enum.with_index(1)
      |> Enum.map(fn {stat, rank} -> Map.put(stat, :rank, rank) end)

    total_plays = Enum.sum(Enum.map(year_stats, & &1.plays))

    year_stats =
      Enum.map(year_stats, fn stat ->
        percentage =
          if total_plays > 0 do
            Float.round(stat.plays / total_plays * 100, 1)
          else
            0.0
          end

        Map.put(stat, :percentage, percentage)
      end)

    json(conn, %{data: year_stats, meta: get_meta_info(params)})
  end

  # ═══════════════════════════════════════════════════════════
  # TOP DATES (Already OK)
  # ═══════════════════════════════════════════════════════════

  # GET /api/stats/top-dates
  def top_dates(conn, params) do
    limit = String.to_integer(params["limit"] || "50")
    range = params["range"] || "month"

    query = Listen |> apply_time_filter(range)
    total_plays = Repo.aggregate(query, :count, :id)

    stats_query =
      query
      |> group_by([l], fragment("DATE(datetime(?, 'unixepoch'))", l.listened_at))
      |> select([l], %{
        date: fragment("DATE(datetime(?, 'unixepoch'))", l.listened_at),
        day: fragment("strftime('%w', datetime(?, 'unixepoch'))", l.listened_at),
        plays: count(l.id)
      })
      |> order_by([l], desc: count(l.id))
      |> limit(^limit)

    stats =
      Repo.all(stats_query)
      |> Enum.with_index(1)
      |> Enum.map(fn {stat, rank} ->
        percentage =
          if total_plays > 0 do
            Float.round(stat.plays / total_plays * 100, 1)
          else
            0.0
          end

        stat
        |> Map.put(:rank, rank)
        |> Map.put(:percentage, percentage)
        |> Map.put(:day_name, day_name(stat.day))
      end)

    json(conn, %{data: stats, meta: get_meta_info(params)})
  end

  # ═══════════════════════════════════════════════════════════
  # TOP TIMES (Already OK)
  # ═══════════════════════════════════════════════════════════

  # GET /api/stats/top-times
  def top_times(conn, params) do
    range = params["range"] || "month"

    query = Listen |> apply_time_filter(range)
    total_plays = Repo.aggregate(query, :count, :id)

    stats_query =
      query
      |> group_by([l], fragment("strftime('%H', datetime(?, 'unixepoch'))", l.listened_at))
      |> select([l], %{
        hour:
          fragment("CAST(strftime('%H', datetime(?, 'unixepoch')) AS INTEGER)", l.listened_at),
        plays: count(l.id),
        avg_per_day: fragment("ROUND(COUNT(*) * 1.0 / ?, 1)", ^get_days_for_range(range))
      })
      |> order_by([l], desc: count(l.id))
      |> limit(24)

    stats =
      Repo.all(stats_query)
      |> Enum.with_index(1)
      |> Enum.map(fn {stat, rank} ->
        percentage =
          if total_plays > 0 do
            Float.round(stat.plays / total_plays * 100, 1)
          else
            0.0
          end

        stat
        |> Map.put(:rank, rank)
        |> Map.put(:percentage, percentage)
        |> Map.put(
          :hour_range,
          "#{String.pad_leading(to_string(stat.hour), 2, "0")}:00-#{String.pad_leading(to_string(rem(stat.hour + 1, 24)), 2, "0")}:00"
        )
      end)

    json(conn, %{data: stats, meta: get_meta_info(params)})
  end

  # ═══════════════════════════════════════════════════════════
  # TOP DURATIONS (Already OK)
  # ═══════════════════════════════════════════════════════════

  # GET /api/stats/top-durations
  def top_durations(conn, params) do
    range = params["range"] || "month"

    query =
      Listen
      |> apply_time_filter(range)
      |> where([l], not is_nil(l.duration_ms))
      |> select([l], %{duration_ms: l.duration_ms})

    listens = Repo.all(query)

    duration_ranges = [
      {"<1 min", 0, 60_000},
      {"1-2 min", 60_000, 120_000},
      {"2-3 min", 120_000, 180_000},
      {"3-4 min", 180_000, 240_000},
      {"4-6 min", 240_000, 360_000},
      {"6-8 min", 360_000, 480_000},
      {"8-10 min", 480_000, 600_000},
      {"10-12 min", 600_000, 720_000},
      {"12-15 min", 720_000, 900_000},
      {"15+ min", 900_000, 999_999_999}
    ]

    duration_stats =
      duration_ranges
      |> Enum.map(fn {label, min_ms, max_ms} ->
        filtered =
          Enum.filter(listens, fn l ->
            l.duration_ms >= min_ms && l.duration_ms < max_ms
          end)

        plays = length(filtered)
        total_time_ms = Enum.sum(Enum.map(filtered, & &1.duration_ms))

        %{
          duration_range: label,
          plays: plays,
          tracks: plays,
          total_time: format_duration(total_time_ms)
        }
      end)
      |> Enum.filter(&(&1.plays > 0))
      |> Enum.sort_by(& &1.plays, :desc)
      |> Enum.with_index(1)
      |> Enum.map(fn {stat, rank} -> Map.put(stat, :rank, rank) end)

    total_plays = Enum.sum(Enum.map(duration_stats, & &1.plays))

    duration_stats =
      Enum.map(duration_stats, fn stat ->
        percentage =
          if total_plays > 0 do
            Float.round(stat.plays / total_plays * 100, 1)
          else
            0.0
          end

        Map.put(stat, :percentage, percentage)
      end)

    json(conn, %{data: duration_stats, meta: get_meta_info(params)})
  end

  # ═══════════════════════════════════════════════════════════
  # HELPER FUNCTIONS
  # ═══════════════════════════════════════════════════════════

  defp apply_time_filter(query, "week") do
    ts = DateTime.utc_now() |> DateTime.add(-7, :day) |> DateTime.to_unix()
    where(query, [l], l.listened_at >= ^ts)
  end

  defp apply_time_filter(query, "month") do
    ts = DateTime.utc_now() |> DateTime.add(-30, :day) |> DateTime.to_unix()
    where(query, [l], l.listened_at >= ^ts)
  end

  defp apply_time_filter(query, "year") do
    ts = DateTime.utc_now() |> DateTime.add(-365, :day) |> DateTime.to_unix()
    where(query, [l], l.listened_at >= ^ts)
  end

  defp apply_time_filter(query, "all_time"), do: query
  defp apply_time_filter(query, _), do: query

  defp get_days_for_range("week"), do: 7
  defp get_days_for_range("month"), do: 30
  defp get_days_for_range("year"), do: 365
  defp get_days_for_range("all_time"), do: 365
  defp get_days_for_range(_), do: 365

  defp get_meta_info(params) do
    %{
      range: params["range"] || "month",
      limit: String.to_integer(params["limit"] || "50"),
      generated_at: DateTime.utc_now() |> DateTime.to_iso8601()
    }
  end

  defp format_relative_time(unix_ts) do
    now = DateTime.utc_now() |> DateTime.to_unix()
    diff = now - unix_ts

    cond do
      diff < 3600 -> "#{div(diff, 60)}m ago"
      diff < 86400 -> "#{div(diff, 3600)}h ago"
      diff < 172_800 -> "Yesterday"
      true -> "#{div(diff, 86400)}d ago"
    end
  end

  defp day_name("0"), do: "Sun"
  defp day_name("1"), do: "Mon"
  defp day_name("2"), do: "Tue"
  defp day_name("3"), do: "Wed"
  defp day_name("4"), do: "Thu"
  defp day_name("5"), do: "Fri"
  defp day_name("6"), do: "Sat"
  defp day_name(_), do: "N/A"

  defp avg_duration(durations) do
    valid_durations = Enum.filter(durations, fn d -> d != nil && d > 0 end)

    if length(valid_durations) > 0 do
      avg_ms = Enum.sum(valid_durations) / length(valid_durations)
      seconds = round(avg_ms / 1000)
      "#{div(seconds, 60)}:#{String.pad_leading(to_string(rem(seconds, 60)), 2, "0")}"
    else
      "N/A"
    end
  end

  defp format_duration(ms) when is_integer(ms) and ms > 0 do
    hours = div(ms, 3_600_000)
    minutes = div(rem(ms, 3_600_000), 60_000)
    "#{hours}h #{String.pad_leading(to_string(minutes), 2, "0")}m"
  end

  defp format_duration(_), do: "0h 00m"
end
