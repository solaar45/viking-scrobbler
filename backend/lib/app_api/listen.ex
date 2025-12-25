defmodule AppApi.Listen do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  @timestamps_opts [type: :utc_datetime]

  schema "listens" do
    # ===== ORIGINAL CORE FIELDS =====
    field :listened_at, :integer
    field :track_name, :string
    field :artist_name, :string
    field :release_name, :string
    field :recording_mbid, :string
    field :artist_mbid, :string
    field :release_mbid, :string
    field :user_name, :string

    # ===== TIER 1: Performance-kritische Felder =====
    field :origin_url, :string
    field :music_service, :string
    field :duration_ms, :integer
    field :tracknumber, :integer
    field :discnumber, :integer
    field :loved, :boolean, default: false
    field :rating, :integer

    # ===== NEU: SKIP-DETECTION FELDER =====
    field :duration, :integer              # Track-Länge in Sekunden
    field :played_duration, :integer       # Tatsächlich gehört in Sekunden
    field :is_skipped, :boolean, default: false
    field :scrobble_percentage, :float
    field :skip_reason, :string

    # ===== TIER 2 & 3: Strukturierte + unstrukturierte Daten =====
    field :metadata, :string, default: "{}"
    field :additional_info, :map, default: %{}

    timestamps(updated_at: false, type: :utc_datetime)
  end

  # NEU: Erweiterte Tier 1 Felder inkl. Skip-Detection
  @tier1_fields [
    :listened_at, :track_name, :artist_name, :release_name,
    :recording_mbid, :artist_mbid, :release_mbid, :user_name,
    :origin_url, :music_service, :duration_ms, :tracknumber,
    :discnumber, :loved, :rating,
    # Skip-Detection
    :duration, :played_duration, :is_skipped, :scrobble_percentage, :skip_reason
  ]

  # Tier 2 Keys die aus additional_info in metadata JSONB extrahiert werden
  @tier2_keys [
    "genres", "tags", "release_year", "label", "isrc",
    "submission_client", "submission_client_version",
    "artist_mbids", "artist_names", "total_tracks"
  ]

  @doc false
  def changeset(listen, attrs) do
    listen
    |> cast(attrs, @tier1_fields ++ [:metadata, :additional_info])
    |> validate_required([:listened_at, :track_name, :artist_name])
    |> auto_extract_metadata()
    |> auto_extract_duration()      # NEU
    |> validate_and_mark_skipped()  # NEU
  end

  # ===== NEU: SKIP-DETECTION LOGIC =====

  # Automatically extract duration from duration_ms if duration field is empty
  defp auto_extract_duration(changeset) do
    case {get_field(changeset, :duration), get_field(changeset, :duration_ms)} do
      {nil, duration_ms} when is_integer(duration_ms) ->
        put_change(changeset, :duration, div(duration_ms, 1000))

      _ ->
        changeset
    end
  end

  # Validates listen and automatically sets skip-related fields
  defp validate_and_mark_skipped(changeset) do
    duration = get_field(changeset, :duration)
    played_duration = get_field(changeset, :played_duration)

    # Validator aufrufen
    validation = AppApi.Listens.Validator.validate_listen(duration, played_duration)

    changeset
    |> put_change(:is_skipped, validation.is_skipped)
    |> put_change(:scrobble_percentage, validation.scrobble_percentage)
    |> put_change(:skip_reason, validation.skip_reason)
  end

  # ===== PRIVATE: Existing Metadata Extraction =====

  defp auto_extract_metadata(changeset) do
    case get_change(changeset, :additional_info) do
      nil ->
        changeset

      info when is_map(info) ->
        tier2_metadata = extract_tier2_metadata(info)
        metadata_json = Jason.encode!(tier2_metadata)

        changeset
        |> put_if_present(:origin_url, info["origin_url"])
        |> put_if_present(:music_service, info["music_service"] || info["submission_client"])
        |> put_if_present(:duration_ms, info["duration_ms"])
        |> put_if_present(:tracknumber, info["tracknumber"])
        |> put_if_present(:discnumber, info["discnumber"])
        |> put_change(:metadata, metadata_json)
    end
  end

  defp extract_tier2_metadata(info) do
    @tier2_keys
    |> Enum.reduce(%{}, fn key, acc ->
      case Map.get(info, key) do
        nil -> acc
        value -> Map.put(acc, key, value)
      end
    end)
  end

  defp put_if_present(changeset, _field, nil), do: changeset
  defp put_if_present(changeset, field, value) when is_binary(value) or is_integer(value) or is_boolean(value) do
    put_change(changeset, field, value)
  end
  defp put_if_present(changeset, _field, _value), do: changeset

  # ===== PUBLIC: Query Helpers (Existing + New) =====

  @doc """
  Filter listens by user name
  """
  def by_user(query, username) do
    from l in query, where: l.user_name == ^username
  end

  @doc """
  Filter listens by music service (e.g. "navidrome", "spotify")
  """
  def with_service(query, service) do
    from l in query, where: l.music_service == ^service
  end

  @doc """
  Filter only loved/favorited tracks
  """
  def loved_only(query) do
    from l in query, where: l.loved == true
  end

  @doc """
  Get most recent listens with limit
  """
  def recent(query, limit \\ 100) do
    from l in query,
      order_by: [desc: l.listened_at],
      limit: ^limit
  end

  @doc """
  Filter by genres (stored in metadata JSONB)
  Example: Listen.with_genres(query, ["Metal", "Progressive"])
  """
  def with_genres(query, genres) when is_list(genres) do
    from l in query,
      where: fragment("? @> ?", l.metadata, ^%{"genres" => genres})
  end

  @doc """
  Filter by release year (stored in metadata JSONB)
  Example: Listen.by_year(query, 2012)
  """
  def by_year(query, year) when is_integer(year) do
    from l in query,
      where: fragment("(?->>'release_year')::integer = ?", l.metadata, ^year)
  end

  @doc """
  Filter by minimum duration in milliseconds
  """
  def min_duration(query, duration_ms) when is_integer(duration_ms) do
    from l in query, where: l.duration_ms >= ^duration_ms
  end

  @doc """
  Filter by time range (unix timestamps)
  """
  def in_time_range(query, from_ts, to_ts) do
    from l in query,
      where: l.listened_at >= ^from_ts and l.listened_at <= ^to_ts
  end

  # ===== NEU: SKIP-DETECTION QUERIES =====

  @doc """
  Filter only valid scrobbles (not skipped)
  """
  def valid_only(query) do
    from l in query, where: l.is_skipped == false
  end

  @doc """
  Filter only skipped listens
  """
  def skipped_only(query) do
    from l in query, where: l.is_skipped == true
  end

  @doc """
  Filter by minimum scrobble percentage
  Example: Listen.min_completion(query, 75.0) # only tracks played >= 75%
  """
  def min_completion(query, percentage) when is_float(percentage) or is_integer(percentage) do
    from l in query, where: l.scrobble_percentage >= ^percentage
  end

  @doc """
  Filter by skip reason
  """
  def by_skip_reason(query, reason) when is_binary(reason) do
    from l in query, where: l.skip_reason == ^reason
  end

  @doc """
  Get skip statistics for a user

  ## Examples

      iex> Listen |> by_user("testuser") |> skip_stats() |> Repo.one()
      %{
        total_listens: 1000,
        skipped_count: 150,
        valid_count: 850,
        skip_rate: 15.0,
        avg_completion: 87.5
      }
  """
  def skip_stats(query) do
    from l in query,
      select: %{
        total_listens: count(l.id),
        skipped_count: sum(fragment("CASE WHEN ? THEN 1 ELSE 0 END", l.is_skipped)),
        valid_count: sum(fragment("CASE WHEN NOT ? OR ? IS NULL THEN 1 ELSE 0 END", l.is_skipped, l.is_skipped)),
        avg_completion: avg(l.scrobble_percentage)
      }
  end

  # ===== JSON HELPERS für SQLite =====

  @doc """
  Parse metadata JSON string to map (SQLite compatibility)
  """
  def parse_metadata(%{metadata: metadata_str} = listen) when is_binary(metadata_str) do
    case Jason.decode(metadata_str) do
      {:ok, metadata_map} -> %{listen | metadata: metadata_map}
      {:error, _} -> %{listen | metadata: %{}}
    end
  end
  def parse_metadata(listen), do: listen
end
