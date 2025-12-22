defmodule AppApi.Listen do
  use Ecto.Schema
  import Ecto.Changeset

  @timestamps_opts [type: :utc_datetime]

  schema "listens" do
    field :listened_at, :integer
    field :track_name, :string
    field :artist_name, :string
    field :release_name, :string
    field :recording_mbid, :string
    field :artist_mbid, :string
    field :release_mbid, :string
    field :additional_info, :map
    field :user_name, :string

    timestamps(updated_at: false, type: :utc_datetime)
  end

  @doc false
  def changeset(listen, attrs) do
    listen
    |> cast(attrs, [
      :listened_at,
      :track_name,
      :artist_name,
      :release_name,
      :recording_mbid,
      :artist_mbid,
      :release_mbid,
      :additional_info,
      :user_name
    ])
    |> validate_required([:listened_at, :track_name, :artist_name])
  end
end
