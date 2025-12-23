defmodule AppApi.Repo.Migrations.CreateNavidromeCredentials do
  use Ecto.Migration

  def change do
    create table(:navidrome_credentials) do
      add :user_name, :string, null: false
      add :url, :string, null: false
      add :username, :string, null: false
      add :encrypted_token, :text, null: false
      add :last_verified, :utc_datetime
      add :auto_discovered, :boolean, default: false

      timestamps()
    end

    create unique_index(:navidrome_credentials, [:user_name, :url])
    create index(:navidrome_credentials, [:user_name])
  end
end
