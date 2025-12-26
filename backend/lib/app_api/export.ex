defmodule AppApi.Export do
  @moduledoc """
  Export functionality for Listen data in JSON and CSV formats.
  Always exports full data (all fields).
  """

  import Ecto.Query
  alias AppApi.{Repo, Listen}

  @doc """
  Export listens to JSON format with metadata.

  ## Options
    - format: :json | :csv
    - time_range: :week | :month | :year | :all_time | {:custom, from_ts, to_ts}
    - service: "navidrome" | "spotify" | nil (all)
  """
  def export_listens(user_name, opts \\ []) do
    format = Keyword.get(opts, :format, :json)
    time_range = Keyword.get(opts, :time_range, :all_time)
    service = Keyword.get(opts, :service)

    query = build_export_query(user_name, time_range, service)
    listens = Repo.all(query)

    case format do
      :json -> export_to_json(listens, build_metadata(listens, time_range))
      :csv -> export_to_csv(listens)
    end
  end

  # === PRIVATE FUNCTIONS ===

  defp build_export_query(user_name, time_range, service) do
    Listen
    |> where([l], l.user_name == ^user_name)
    |> apply_time_filter(time_range)
    |> apply_service_filter(service)
    |> order_by([l], asc: l.listened_at)
  end

  defp apply_time_filter(query, :all_time), do: query

  defp apply_time_filter(query, :week) do
    from_ts = DateTime.utc_now() |> DateTime.add(-7, :day) |> DateTime.to_unix()
    where(query, [l], l.listened_at >= ^from_ts)
  end

  defp apply_time_filter(query, :month) do
    from_ts = DateTime.utc_now() |> DateTime.add(-30, :day) |> DateTime.to_unix()
    where(query, [l], l.listened_at >= ^from_ts)
  end

  defp apply_time_filter(query, :year) do
    from_ts = DateTime.utc_now() |> DateTime.add(-365, :day) |> DateTime.to_unix()
    where(query, [l], l.listened_at >= ^from_ts)
  end

  defp apply_time_filter(query, {:custom, from_ts, to_ts}) do
    query
    |> where([l], l.listened_at >= ^from_ts)
    |> where([l], l.listened_at <= ^to_ts)
  end

  defp apply_service_filter(query, nil), do: query
  defp apply_service_filter(query, service), do: where(query, [l], l.music_service == ^service)

  # === JSON EXPORT ===

  defp export_to_json(listens, metadata) do
    listens_data = Enum.map(listens, &serialize_listen_full/1)

    data = %{
      export_metadata: metadata,
      listens: listens_data
    }

    {:ok, Jason.encode!(data, pretty: true)}
  end

  defp serialize_listen_full(listen) do
    # Parse metadata JSON string to map
    metadata_map = parse_metadata_field(listen.metadata)

    %{
      listened_at: listen.listened_at,
      track_name: listen.track_name,
      artist_name: listen.artist_name,
      release_name: listen.release_name,
      recording_mbid: listen.recording_mbid,
      artist_mbid: listen.artist_mbid,
      release_mbid: listen.release_mbid,
      user_name: listen.user_name,
      origin_url: listen.origin_url,
      music_service: listen.music_service,
      duration_ms: listen.duration_ms,
      tracknumber: listen.tracknumber,
      discnumber: listen.discnumber,
      loved: listen.loved,
      rating: listen.rating,
      metadata: metadata_map,
      additional_info: listen.additional_info,
      inserted_at: DateTime.to_iso8601(listen.inserted_at)
    }
  end

  defp parse_metadata_field(nil), do: %{}
  defp parse_metadata_field(""), do: %{}
  defp parse_metadata_field(metadata_str) when is_binary(metadata_str) do
    case Jason.decode(metadata_str) do
      {:ok, map} -> map
      {:error, _} -> %{}
    end
  end

  # === CSV EXPORT ===

  defp export_to_csv(listens) do
    header = [
      "listened_at",
      "timestamp_human",
      "track_name",
      "artist_name",
      "release_name",
      "genres",
      "release_year",
      "duration_ms",
      "music_service",
      "user_name",
      "recording_mbid",
      "artist_mbid",
      "release_mbid",
      "tracknumber",
      "discnumber",
      "loved",
      "rating"
    ]

    rows =
      Enum.map(listens, fn listen ->
        metadata = parse_metadata_field(listen.metadata)

        [
          to_string(listen.listened_at),
          format_timestamp(listen.listened_at),
          listen.track_name,
          listen.artist_name,
          listen.release_name || "",
          extract_genres(metadata),
          metadata["release_year"] || "",
          to_string(listen.duration_ms || ""),
          listen.music_service || "",
          listen.user_name,
          listen.recording_mbid || "",
          listen.artist_mbid || "",
          listen.release_mbid || "",
          to_string(listen.tracknumber || ""),
          to_string(listen.discnumber || ""),
          to_string(listen.loved),
          to_string(listen.rating || "")
        ]
      end)

    csv_data = [header | rows] |> CSV.encode() |> Enum.to_list() |> IO.iodata_to_binary()
    {:ok, csv_data}
  end

  defp extract_genres(metadata) do
    case metadata["genres"] do
      genres when is_list(genres) -> Enum.join(genres, "; ")
      _ -> ""
    end
  end

  defp format_timestamp(unix_ts) do
    DateTime.from_unix!(unix_ts)
    |> DateTime.to_iso8601()
  end

  # === METADATA GENERATION ===

  defp build_metadata(listens, time_range) do
    {from_ts, to_ts} =
      case listens do
        [] ->
          {nil, nil}

        _ ->
          from = List.first(listens).listened_at
          to = List.last(listens).listened_at
          {from, to}
      end

    %{
      exported_at: DateTime.utc_now() |> DateTime.to_iso8601(),
      total_listens: length(listens),
      time_range: %{
        filter: to_string(time_range),
        from: from_ts,
        to: to_ts
      },
      viking_scrobbler_version: Application.spec(:app_api, :vsn) |> to_string()
    }
  end
end
