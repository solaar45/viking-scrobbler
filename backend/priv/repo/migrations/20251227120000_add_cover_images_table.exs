defmodule AppApi.Repo.Migrations.AddCoverImagesTable do
  use Ecto.Migration

  def change do
    create table(:cover_images) do
      add :listen_id, references(:listens, on_delete: :delete_all), null: false
      add :kind, :string, null: false
      add :path, :string, null: false
      add :mime, :string, null: false

      timestamps()
    end

    create index(:cover_images, [:listen_id])
    create unique_index(:cover_images, [:listen_id, :kind])
  end
end
