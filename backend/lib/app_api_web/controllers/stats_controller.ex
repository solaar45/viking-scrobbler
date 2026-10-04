defmodule AppApiWeb.StatsController do
  use AppApiWeb, :controller
  alias AppApi.{Listen, Repo}
  import Ecto.Query

  # ═══════════════════════════════════════════════════════════════
  # OVERVIEW ENDPOINT
  # ═══════════════════════════════════════════════════════════════

  # GET /api/stats/overview
  def overview(conn, params) do
    range = params["range"] || "month"
    query = Listen |> apply_time_filter(range)

    total_plays = Repo.aggregate(query, :count, :id)

    unique_artists = Repo.one(from(l in query, where: not is_nil(l.artist_name) and l.artist_name != "", select: fragment("count(distinct ?)", l.artist_name))) || 0
    unique_albums = Repo.one(from(l in query, where: not is_nil(l.release_name) and l.release_name != "", select: fragment("count(distinct ?)", l.release_name))) || 0

    # Total listening time
    total_ms = Repo.one(from(l in query, select: sum(l.duration_ms))) || 0
    total_listening_time = format_duration(total_ms)

    # Top artist WITH sample_listen_id for cover
    top_artist =
      Repo.one(
        from(l in query,
          where: not is_nil(l.artist_name) and l.artist_name != "",
          group_by: l.artist_name,
          select: %{
            name: l.artist_name, 
            plays: count(l.id),
            sample_listen_id: max(l.id)
          },
          order_by: [desc: count(l.id)],
          limit: 1
        )
      ) || %{name: "N/A", plays: 0, sample_listen_id: nil}

    # Top track WITH sample_listen_id for cover
    top_track =
      Repo.one(
        from(l in query,
          where: not is_nil(l.track_name) and l.track_name != "",
          group_by: [l.track_name, l.artist_name],
          select: %{
            name: l.track_name, 
            artist: l.artist_name, 
            plays: count(l.id),
            sample_listen_id: max(l.id)
          },
          order_by: [desc: count(l.id)],
          limit: 1
        )
      ) || %{name: "N/A", artist: "N/A", plays: 0, sample_listen_id: nil}

    # Top album WITH sample_listen_id for cover
    top_album =
      Repo.one(
        from(l in query,
          where: not is_nil(l.release_name) and l.release_name != "",
          group_by: [l.release_name, l.artist_name],
          select: %{
            name: l.release_name, 
            artist: l.artist_name, 
            plays: count(l.id),
            sample_listen_id: max(l.id)
          },
          order_by: [desc: count(l.id)],
          limit: 1
        )
      ) || %{name: "N/A", artist: "N/A", plays: 0, sample_listen_id: nil}

    # Smart cover resolution for top items
    top_artist_cover =
      if top_artist.name != "N/A" do
        resolve_cover_id_for_artist(top_artist.name)
      end

    top_track_cover =
      if top_track.name != "N/A" do
        resolve_cover_id_for_track(top_track.name, top_track.artist)
      end

    top_album_cover =
      if top_album.name != "N/A" do
        resolve_cover_id_for_album(top_album.name, top_album.artist)
      end

    top_artist =
      top_artist
      |> Map.put(:additional_info, %{navidrome_id: top_artist_cover})
      |> Map.delete(:sample_listen_id)

    top_track =
      top_track
      |> Map.put(:additional_info, %{navidrome_id: top_track_cover})
      |> Map.delete(:sample_listen_id)

    top_album =
      top_album
      |> Map.put(:additional_info, %{navidrome_id: top_album_cover})
      |> Map.delete(:sample_listen_id)

    # Recent activity (last 30 days)
    recent_activity =
      Repo.all(
        from(l in query,
          where: not is_nil(l.listened_at),
          group_by: fragment("DATE(datetime(?, 'unixepoch'))", l.listened_at),
          select: %{
            date: fragment("DATE(datetime(?, 'unixepoch'))", l.listened_at),
            plays: count(l.id)
          },
          order_by: [desc: fragment("DATE(datetime(?, 'unixepoch'))", l.listened_at)],
          limit: 30
        )
      )
      |> Enum.reverse()

    # ── BREAKDOWN BY PLAYER ──────────────────────────────────────
    player_query =
      from(l in query,
        group_by: fragment("COALESCE(NULLIF(json_extract(?, '$.media_player'), ''), NULLIF(?, ''), 'Unknown Client')", l.additional_info, l.music_service),
        select: %{
          name: fragment("COALESCE(NULLIF(json_extract(?, '$.media_player'), ''), NULLIF(?, ''), 'Unknown Client')", l.additional_info, l.music_service),
          plays: count(l.id)
        },
        order_by: [desc: count(l.id)]
      )

    player_stats = Repo.all(player_query)
    total_player_plays = Enum.sum(Enum.map(player_stats, & &1.plays))

    breakdown_by_player =
      Enum.map(player_stats, fn p ->
        share =
          if total_player_plays > 0 do
            "#{Float.round(p.plays / total_player_plays * 100, 1)}%"
          else
            "0.0%"
          end

        %{name: p.name, plays: p.plays, share: share}
      end)

    # ── BREAKDOWN BY HOUR (Morning / Afternoon / Evening / Night) ─
    hour_buckets = [
      {"Morning (6-12)", 6, 11},
      {"Afternoon (12-18)", 12, 17},
      {"Evening (18-24)", 18, 23},
      {"Night (0-6)", 0, 5}
    ]

    hour_query =
      from(l in query,
        where: not is_nil(l.listened_at),
        group_by: fragment("CAST(strftime('%H', datetime(?, 'unixepoch')) AS INTEGER)", l.listened_at),
        select: %{
          hour: fragment("CAST(strftime('%H', datetime(?, 'unixepoch')) AS INTEGER)", l.listened_at),
          plays: count(l.id)
        }
      )

    hour_counts =
      Repo.all(hour_query)
      |> Enum.map(fn %{hour: h, plays: p} -> {h, p} end)
      |> Map.new()

    total_hour_plays = Enum.sum(Map.values(hour_counts))

    breakdown_by_hour =
      Enum.map(hour_buckets, fn {label, min_h, max_h} ->
        plays =
          Enum.reduce(min_h..max_h, 0, fn h, acc ->
            acc + Map.get(hour_counts, h, 0)
          end)

        share =
          if total_hour_plays > 0 do
            "#{Float.round(plays / total_hour_plays * 100, 1)}%"
          else
            "0.0%"
          end

        %{name: label, plays: plays, share: share}
      end)

    # ── BREAKDOWN BY GENRE ───────────────────────────────────────
    genre_query =
      from(l in query,
        where: not is_nil(l.metadata) or not is_nil(l.additional_info),
        select: %{metadata: l.metadata, additional_info: l.additional_info}
      )

    genres_list =
      Repo.all(genre_query)
      |> Enum.flat_map(fn l ->
        meta = parse_metadata(l.metadata)
        info = parse_metadata(l.additional_info)

        raw =
          meta["genres"] ||
          meta["genre"] ||
          info["genres"] ||
          info["genre"] ||
          []

        case raw do
          list when is_list(list) -> list
          str when is_binary(str) and str != "" -> String.split(str, ~r/[,;]\s*/)
          _ -> []
        end
      end)
      |> Enum.map(&String.trim/1)
      |> Enum.reject(&(&1 in ["", nil, "–", "Unknown"]))

    genre_counts = Enum.frequencies(genres_list)
    total_genre_plays = Enum.sum(Map.values(genre_counts))

    breakdown_by_genre =
      if total_genre_plays > 0 do
        genre_counts
        |> Enum.sort_by(fn {_genre, count} -> count end, :desc)
        |> Enum.take(6)
        |> Enum.map(fn {genre, plays} ->
          share = "#{Float.round(plays / total_genre_plays * 100, 1)}%"
          %{name: genre, plays: plays, share: share}
        end)
      else
        []
      end

    json(conn, %{
      total_plays: total_plays,
      unique_artists: unique_artists,
      unique_albums: unique_albums,
      total_listening_time: total_listening_time,
      top_artist: top_artist,
      top_track: top_track,
      top_album: top_album,
      recent_activity: recent_activity,
      breakdown_by_player: breakdown_by_player,
      breakdown_by_hour: breakdown_by_hour,
      breakdown_by_genre: breakdown_by_genre
    })
  end

  # ═══════════════════════════════════════════════════════════════
  # TOP ARTISTS
  # ═══════════════════════════════════════════════════════════════

  # GET /api/stats/top-artists
  def top_artists(conn, params) do
    limit = String.to_integer(params["limit"] || "50")
    range = params["range"] || "month"

    query = Listen |> apply_time_filter(range)
    total_plays = Repo.aggregate(query, :count, :id)

    stats_query =
      query
      |> where([l], not is_nil(l.artist_name) and l.artist_name != "")
      |> group_by([l], l.artist_name)
      |> select([l], %{
        name: l.artist_name,
        plays: count(l.id),
        last_played: max(l.listened_at),
        avg_per_day: fragment("ROUND(COUNT(*) * 1.0 / ?, 1)", ^get_days_for_range(range)),
        sample_listen_id: fragment(
          "COALESCE(MAX(CASE WHEN (json_extract(?, '$.navidrome_id') IS NOT NULL AND json_extract(?, '$.navidrome_id') != '') OR (json_extract(?, '$.coverArt') IS NOT NULL AND json_extract(?, '$.coverArt') != '') THEN ? END), MAX(?))",
          l.metadata, l.metadata, l.metadata, l.metadata, l.id, l.id
        )
      })
      |> order_by([l], desc: count(l.id))
      |> limit(^limit)

    artists = Repo.all(stats_query)

    # Get ALL listens for these artists to calculate unique_tracks
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

    # Get navidrome_id from sample listen for each artist
    sample_listen_ids = Enum.map(artists, & &1.sample_listen_id)
    navidrome_ids = get_navidrome_ids_batch(sample_listen_ids)

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

        navidrome_id =
          Map.get(navidrome_ids, artist.sample_listen_id) ||
          resolve_cover_id_for_artist(artist.name)

        artist
        |> Map.put(:rank, rank)
        |> Map.put(:percentage, percentage)
        |> Map.put(:unique_tracks, unique_tracks)
        |> Map.put(:last_played_relative, format_relative_time(artist.last_played))
        |> Map.put(:navidrome_id, navidrome_id)
        |> Map.delete(:sample_listen_id)
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

  # ═══════════════════════════════════════════════════════════════
  # TOP TRACKS
  # ═══════════════════════════════════════════════════════════════

  # GET /api/stats/top-tracks
  def top_tracks(conn, params) do
    limit = String.to_integer(params["limit"] || "50")
    range = params["range"] || "month"

    query = Listen |> apply_time_filter(range)
    total_plays = Repo.aggregate(query, :count, :id)

    stats_query =
      query
      |> where([l], not is_nil(l.track_name) and l.track_name != "")
      |> group_by([l], [l.track_name, l.artist_name, l.release_name])
      |> select([l], %{
        track: l.track_name,
        artist: l.artist_name,
        album: l.release_name,
        plays: count(l.id),
        last_played: max(l.listened_at),
        sample_listen_id: fragment(
          "COALESCE(MAX(CASE WHEN (json_extract(?, '$.navidrome_id') IS NOT NULL AND json_extract(?, '$.navidrome_id') != '') OR (json_extract(?, '$.coverArt') IS NOT NULL AND json_extract(?, '$.coverArt') != '') THEN ? END), MAX(?))",
          l.metadata, l.metadata, l.metadata, l.metadata, l.id, l.id
        )
      })
      |> order_by([l], desc: count(l.id))
      |> limit(^limit)

    tracks = Repo.all(stats_query)

    # Get navidrome_id from sample listen for each track
    sample_listen_ids = Enum.map(tracks, & &1.sample_listen_id)
    navidrome_ids = get_navidrome_ids_batch(sample_listen_ids)

    stats =
      tracks
      |> Enum.with_index(1)
      |> Enum.map(fn {stat, rank} ->
        percentage =
          if total_plays > 0 do
            Float.round(stat.plays / total_plays * 100, 1)
          else
            0.0
          end

        navidrome_id =
          Map.get(navidrome_ids, stat.sample_listen_id) ||
          resolve_cover_id_for_track(stat.track, stat.artist)

        stat
        |> Map.put(:rank, rank)
        |> Map.put(:percentage, percentage)
        |> Map.put(:last_played_relative, format_relative_time(stat.last_played))
        |> Map.put(:navidrome_id, navidrome_id)
        |> Map.delete(:sample_listen_id)
      end)

    json(conn, %{data: stats, meta: get_meta_info(params)})
  end

  # ═══════════════════════════════════════════════════════════════
  # TOP ALBUMS
  # ═══════════════════════════════════════════════════════════════

  # GET /api/stats/top-albums
  def top_albums(conn, params) do
    limit = String.to_integer(params["limit"] || "50")
    range = params["range"] || "month"

    query = Listen |> apply_time_filter(range)
    total_plays = Repo.aggregate(query, :count, :id)

    stats_query =
      query
      |> where([l], not is_nil(l.release_name) and l.release_name != "")
      |> group_by([l], [l.release_name, l.artist_name])
      |> select([l], %{
        album: l.release_name,
        artist: l.artist_name,
        plays: count(l.id),
        last_played: max(l.listened_at),
        sample_listen_id: fragment(
          "COALESCE(MAX(CASE WHEN (json_extract(?, '$.navidrome_id') IS NOT NULL AND json_extract(?, '$.navidrome_id') != '') OR (json_extract(?, '$.coverArt') IS NOT NULL AND json_extract(?, '$.coverArt') != '') THEN ? END), MAX(?))",
          l.metadata, l.metadata, l.metadata, l.metadata, l.id, l.id
        )
      })
      |> order_by([l], desc: count(l.id))
      |> limit(^limit)

    albums = Repo.all(stats_query)

    # Get navidrome_id from sample listen for each album
    sample_listen_ids = Enum.map(albums, & &1.sample_listen_id)
    navidrome_ids = get_navidrome_ids_batch(sample_listen_ids)

    stats =
      albums
      |> Enum.with_index(1)
      |> Enum.map(fn {stat, rank} ->
        percentage =
          if total_plays > 0 do
            Float.round(stat.plays / total_plays * 100, 1)
          else
            0.0
          end

        navidrome_id =
          Map.get(navidrome_ids, stat.sample_listen_id) ||
          resolve_cover_id_for_album(stat.album, stat.artist)

        stat
        |> Map.put(:rank, rank)
        |> Map.put(:percentage, percentage)
        |> Map.put(:completion_rate, 85)
        |> Map.put(:last_played_relative, format_relative_time(stat.last_played))
        |> Map.put(:navidrome_id, navidrome_id)
        |> Map.delete(:sample_listen_id)
      end)

    json(conn, %{data: stats, meta: get_meta_info(params)})
  end

  # ═══════════════════════════════════════════════════════════════
  # TOP GENRES
  # ═══════════════════════════════════════════════════════════════

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
        duration_ms: l.duration_ms,
        listened_at: l.listened_at
      })

    listens = Repo.all(query)

    # Parse genres from JSON metadata
    genre_stats =
      listens
      |> Enum.flat_map(fn listen ->
        metadata = parse_metadata(listen.metadata)

        raw_genres =
          case metadata do
            %{"genres" => genres} when is_list(genres) ->
              genres

            %{"genres" => genres} when is_binary(genres) and genres != "" ->
              String.split(genres, ~r/[,;]\s*/)

            %{"genre" => genre} when is_list(genre) ->
              genre

            %{"genre" => genre} when is_binary(genre) and genre != "" ->
              String.split(genre, ~r/[,;]\s*/)

            _ ->
              []
          end
          |> Enum.map(&String.trim/1)
          |> Enum.reject(&(&1 in ["", "-"]))

        Enum.map(raw_genres, &{&1, listen.duration_ms || 0, listen.listened_at})
      end)
      |> Enum.group_by(
        fn {genre, _, _} -> genre end,
        fn {_, duration, listened_at} -> {duration, listened_at} end
      )
      |> Enum.map(fn {genre, data} ->
        durations = Enum.map(data, fn {d, _} -> d end)
        listen_times = Enum.map(data, fn {_, ts} -> ts end)

        %{
          genre: genre,
          plays: length(data),
          avg_duration: avg_duration(durations),
          artists: 0,
          last_played: Enum.max(listen_times)
        }
      end)
      |> Enum.sort_by(& &1.plays, :desc)
      |> Enum.take(limit)
      |> Enum.with_index(1)
      |> Enum.map(fn {stat, rank} ->
        stat
        |> Map.put(:rank, rank)
        |> Map.put(:last_played_relative, format_relative_time(stat.last_played))
      end)

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

  # ═══════════════════════════════════════════════════════════════
  # TOP YEARS
  # ═══════════════════════════════════════════════════════════════

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
        artist_name: l.artist_name,
        listened_at: l.listened_at
      })

    listens = Repo.all(query)

    year_stats =
      listens
      |> Enum.map(fn listen ->
        metadata = parse_metadata(listen.metadata)
        year = extract_year(metadata)
        {year, listen.release_name, listen.artist_name, listen.listened_at}
      end)
      |> Enum.filter(fn {year, _, _, _} -> is_integer(year) and year > 1000 end)
      |> Enum.group_by(fn {year, _, _, _} -> year end)
      |> Enum.map(fn {year, items} ->
        albums =
          items
          |> Enum.map(fn {_, album, _, _} -> album end)
          |> Enum.reject(&is_nil/1)
          |> Enum.uniq()

        listen_times = items |> Enum.map(fn {_, _, _, ts} -> ts end)

        top_album_data =
          items
          |> Enum.frequencies_by(fn {_, album, artist, _} -> {album, artist} end)
          |> Enum.max_by(fn {_, count} -> count end, fn -> {{nil, nil}, 0} end)
          |> elem(0)

        top_album_label =
          case top_album_data do
            {album_name, artist_name} when is_binary(album_name) and is_binary(artist_name) ->
              "#{album_name} - #{artist_name}"

            {album_name, _} when is_binary(album_name) ->
              album_name

            _ ->
              "Unknown"
          end

        %{
          year: year,
          plays: length(items),
          albums: length(albums),
          top_album: top_album_label,
          last_played: Enum.max(listen_times)
        }
      end)
      |> Enum.sort_by(& &1.plays, :desc)
      |> Enum.take(limit)
      |> Enum.with_index(1)
      |> Enum.map(fn {stat, rank} ->
        stat
        |> Map.put(:rank, rank)
        |> Map.put(:last_played_relative, format_relative_time(stat.last_played))
      end)

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

  # ═══════════════════════════════════════════════════════════════
  # TOP DATES
  # ═══════════════════════════════════════════════════════════════

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

  # ═══════════════════════════════════════════════════════════════
  # TOP TIMES
  # ═══════════════════════════════════════════════════════════════

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

  # ═══════════════════════════════════════════════════════════════
  # TOP DURATIONS
  # ═══════════════════════════════════════════════════════════════

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

  # ═══════════════════════════════════════════════════════════════
  # HELPER FUNCTIONS
  # ═══════════════════════════════════════════════════════════════

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

  defp format_duration(%Decimal{} = d), do: format_duration(d |> Decimal.round() |> Decimal.to_integer())
  defp format_duration(ms) when is_float(ms), do: format_duration(round(ms))

  defp format_duration(ms) when is_integer(ms) and ms > 0 do
    hours = div(ms, 3_600_000)
    minutes = div(rem(ms, 3_600_000), 60_000)
    "#{hours}h #{minutes}m"
  end

  defp format_duration(_), do: "0h 0m"

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

  defp day_name("0"), do: "Sun"
  defp day_name("1"), do: "Mon"
  defp day_name("2"), do: "Tue"
  defp day_name("3"), do: "Wed"
  defp day_name("4"), do: "Thu"
  defp day_name("5"), do: "Fri"
  defp day_name("6"), do: "Sat"
  defp day_name(_), do: "N/A"

  # ═══════════════════════════════════════════════════════════════
  # ═══════════════════════════════════════════════════════════════
  # NAVIDROME ID EXTRACTION & COVER RESOLUTION
  # ═══════════════════════════════════════════════════════════════

  defp get_navidrome_ids_batch(listen_ids) when is_list(listen_ids) do
    if length(listen_ids) == 0 do
      %{}
    else
      Repo.all(
        from(l in Listen,
          where: l.id in ^listen_ids,
          select: %{id: l.id, metadata: l.metadata, additional_info: l.additional_info}
        )
      )
      |> Enum.map(fn listen ->
        navidrome_id = extract_navidrome_id(listen.metadata, listen.additional_info)
        {listen.id, navidrome_id}
      end)
      |> Enum.filter(fn {_id, nav_id} -> nav_id != nil end)
      |> Map.new()
    end
  end

  # Parse metadata helper
  defp parse_metadata(nil), do: %{}
  defp parse_metadata(""), do: %{}
  defp parse_metadata("{}"), do: %{}

  defp parse_metadata(metadata) when is_binary(metadata) do
    case Jason.decode(metadata) do
      {:ok, map} when is_map(map) -> map
      _ -> %{}
    end
  end

  defp parse_metadata(metadata) when is_map(metadata), do: metadata
  defp parse_metadata(_), do: %{}

  # Extract release year from metadata
  defp extract_year(metadata) when is_map(metadata) do
    raw = metadata["release_year"] || metadata["year"] || metadata["mb_release_year"]

    case raw do
      year when is_integer(year) ->
        year

      year_str when is_binary(year_str) ->
        case Integer.parse(String.slice(year_str, 0, 4)) do
          {year, _} -> year
          _ -> nil
        end

      _ ->
        nil
    end
  end

  defp extract_year(_), do: nil

  # Extract navidrome_id from metadata or additional_info
  defp extract_navidrome_id(metadata, additional_info \\ nil) do
    meta_map = parse_metadata(metadata)
    info_map = parse_metadata(additional_info)

    meta_map["navidrome_id"] ||
      meta_map["coverArt"] ||
      meta_map["cover_art"] ||
      info_map["navidrome_id"] ||
      info_map["coverArt"] ||
      info_map["cover_art"]
  end

  defp resolve_cover_id_for_artist(artist_name) do
    case Repo.one(
      from(l in Listen,
        where: l.artist_name == ^artist_name and not is_nil(l.artist_name) and l.artist_name != "",
        where: fragment(
          "(json_extract(?, '$.navidrome_id') IS NOT NULL AND json_extract(?, '$.navidrome_id') != '') OR " <>
          "(json_extract(?, '$.coverArt') IS NOT NULL AND json_extract(?, '$.coverArt') != '') OR " <>
          "(json_extract(?, '$.navidrome_id') IS NOT NULL AND json_extract(?, '$.navidrome_id') != '') OR " <>
          "(json_extract(?, '$.coverArt') IS NOT NULL AND json_extract(?, '$.coverArt') != '')",
          l.metadata, l.metadata, l.metadata, l.metadata, l.additional_info, l.additional_info, l.additional_info, l.additional_info
        ),
        select: fragment(
          "COALESCE(" <>
          "NULLIF(json_extract(?, '$.navidrome_id'), ''), " <>
          "NULLIF(json_extract(?, '$.coverArt'), ''), " <>
          "NULLIF(json_extract(?, '$.navidrome_id'), ''), " <>
          "NULLIF(json_extract(?, '$.coverArt'), ''))",
          l.metadata, l.metadata, l.additional_info, l.additional_info
        ),
        order_by: [desc: l.id],
        limit: 1
      )
    ) do
      nil -> search_navidrome_for_cover(artist: artist_name)
      cover_id -> cover_id
    end
  end

  defp resolve_cover_id_for_album(album_name, artist_name) do
    query =
      from(l in Listen,
        where: l.release_name == ^album_name and not is_nil(l.release_name) and l.release_name != "",
        where: fragment(
          "(json_extract(?, '$.navidrome_id') IS NOT NULL AND json_extract(?, '$.navidrome_id') != '') OR " <>
          "(json_extract(?, '$.coverArt') IS NOT NULL AND json_extract(?, '$.coverArt') != '') OR " <>
          "(json_extract(?, '$.navidrome_id') IS NOT NULL AND json_extract(?, '$.navidrome_id') != '') OR " <>
          "(json_extract(?, '$.coverArt') IS NOT NULL AND json_extract(?, '$.coverArt') != '')",
          l.metadata, l.metadata, l.metadata, l.metadata, l.additional_info, l.additional_info, l.additional_info, l.additional_info
        ),
        select: fragment(
          "COALESCE(" <>
          "NULLIF(json_extract(?, '$.navidrome_id'), ''), " <>
          "NULLIF(json_extract(?, '$.coverArt'), ''), " <>
          "NULLIF(json_extract(?, '$.navidrome_id'), ''), " <>
          "NULLIF(json_extract(?, '$.coverArt'), ''))",
          l.metadata, l.metadata, l.additional_info, l.additional_info
        ),
        order_by: [desc: l.id],
        limit: 1
      )

    query =
      if artist_name && artist_name != "" and artist_name != "N/A" do
        where(query, [l], l.artist_name == ^artist_name)
      else
        query
      end

    case Repo.one(query) do
      nil -> search_navidrome_for_cover(album: album_name, artist: artist_name)
      cover_id -> cover_id
    end
  end

  defp resolve_cover_id_for_track(track_name, artist_name) do
    query =
      from(l in Listen,
        where: l.track_name == ^track_name and not is_nil(l.track_name) and l.track_name != "",
        where: fragment(
          "(json_extract(?, '$.navidrome_id') IS NOT NULL AND json_extract(?, '$.navidrome_id') != '') OR " <>
          "(json_extract(?, '$.coverArt') IS NOT NULL AND json_extract(?, '$.coverArt') != '') OR " <>
          "(json_extract(?, '$.navidrome_id') IS NOT NULL AND json_extract(?, '$.navidrome_id') != '') OR " <>
          "(json_extract(?, '$.coverArt') IS NOT NULL AND json_extract(?, '$.coverArt') != '')",
          l.metadata, l.metadata, l.metadata, l.metadata, l.additional_info, l.additional_info, l.additional_info, l.additional_info
        ),
        select: fragment(
          "COALESCE(" <>
          "NULLIF(json_extract(?, '$.navidrome_id'), ''), " <>
          "NULLIF(json_extract(?, '$.coverArt'), ''), " <>
          "NULLIF(json_extract(?, '$.navidrome_id'), ''), " <>
          "NULLIF(json_extract(?, '$.coverArt'), ''))",
          l.metadata, l.metadata, l.additional_info, l.additional_info
        ),
        order_by: [desc: l.id],
        limit: 1
      )

    query =
      if artist_name && artist_name != "" and artist_name != "N/A" do
        where(query, [l], l.artist_name == ^artist_name)
      else
        query
      end

    case Repo.one(query) do
      nil -> search_navidrome_for_cover(track: track_name, artist: artist_name)
      cover_id -> cover_id
    end
  end

  defp search_navidrome_for_cover(opts) do
    case Repo.one(from(c in AppApi.NavidromeCredential, order_by: [desc: c.id], limit: 1)) do
      nil ->
        nil

      cred ->
        password = AppApi.NavidromeCredential.decrypt_token(cred)

        if password do
          query_param = opts[:album] || opts[:track] || opts[:artist] || ""

          params = %{
            "query" => query_param,
            "u" => cred.username,
            "p" => password,
            "v" => "1.16.1",
            "c" => "VikingScrobbler",
            "f" => "json"
          }

          query_string = URI.encode_query(params)
          url = "#{cred.url}/rest/search3?#{query_string}"

          case HTTPoison.get(url, [], recv_timeout: 3000) do
            {:ok, %{status_code: 200, body: body}} ->
              case Jason.decode(body) do
                {:ok, %{"subsonic-response" => %{"searchResult3" => result}}} ->
                  album_cover =
                    if opts[:album] do
                      albums = result["album"] || []
                      matched =
                        Enum.find(albums, fn a ->
                          String.downcase(a["name"] || "") == String.downcase(opts[:album])
                        end) || List.first(albums)

                      matched && (matched["coverArt"] || matched["id"])
                    end

                  song_cover =
                    if opts[:track] || is_nil(album_cover) do
                      songs = result["song"] || []
                      matched =
                        if opts[:track] do
                          Enum.find(songs, fn s ->
                            String.downcase(s["title"] || "") == String.downcase(opts[:track])
                          end) || List.first(songs)
                        else
                          List.first(songs)
                        end

                      matched && (matched["coverArt"] || matched["id"])
                    end

                  artist_cover =
                    if opts[:artist] && is_nil(album_cover) && is_nil(song_cover) do
                      artists = result["artist"] || []
                      matched =
                        Enum.find(artists, fn a ->
                          String.downcase(a["name"] || "") == String.downcase(opts[:artist])
                        end) || List.first(artists)

                      matched && (matched["coverArt"] || matched["artistImageUrl"] || matched["id"])
                    end

                  album_cover || song_cover || artist_cover

                _ ->
                  nil
              end

            _ ->
              nil
          end
        else
          nil
        end
    end
  rescue
    _ -> nil
  end
end
