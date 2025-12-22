defmodule AppApi.Integration do
  use Ecto.Schema
  import Ecto.Changeset

  schema "integrations" do
    field :service, :string
    field :url, :string
    field :token, :string
    field :enabled, :boolean, default: true

    timestamps()
  end

  def changeset(integration, attrs) do
    integration
    |> cast(attrs, [:service, :url, :token, :enabled])
    |> validate_required([:service, :url])
    |> unique_constraint(:service)
  end
end
