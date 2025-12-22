defmodule AppApi.Repo.Migrations.CreateListens do
  use Ecto.Migration

  def change do
    create table(:listens) do
      add :listened_at, :bigint, null: false
      add :track_name, :string, null: false
      add :artist_name, :string, null: false
      add :release_name, :string
      add :recording_mbid, :string
      add :artist_mbid, :string
      add :release_mbid, :string
      add :additional_info, :map
      add :user_name, :string
      # ENTFERNT: add :inserted_at, :naive_datetime, null: false

      timestamps(updated_at: false)  # Fügt inserted_at automatisch hinzu
    end

    create index(:listens, [:listened_at])
    create index(:listens, [:artist_name])
    create index(:listens, [:track_name])
    create index(:listens, [:user_name])
  end
end
