defmodule AppApi.CoverImage do
  use Ecto.Schema
  import Ecto.Changeset

  schema "cover_images" do
    field :kind, :string
    field :path, :string
    field :mime, :string

    belongs_to :listen, AppApi.Listen

    timestamps()
  end

  def changeset(cover_image, attrs) do
    cover_image
    |> cast(attrs, [:listen_id, :kind, :path, :mime])
    |> validate_required([:listen_id, :kind, :path, :mime])
    |> unique_constraint([:listen_id, :kind])
  end
end
