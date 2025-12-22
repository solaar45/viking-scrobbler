defmodule AppApi.UserToken do
  use Ecto.Schema
  import Ecto.Changeset

  schema "user_tokens" do
    field :token, :string
    field :user_name, :string
    field :description, :string
    field :active, :boolean, default: true
    field :last_used, :utc_datetime

    timestamps(type: :utc_datetime)
  end

  def changeset(token, attrs) do
    token
    |> cast(attrs, [:token, :user_name, :description, :active, :last_used])
    |> validate_required([:token, :user_name])
    |> unique_constraint(:token)
  end

  def generate_token do
    :crypto.strong_rand_bytes(32) |> Base.url_encode64(padding: false)
  end
end
