defmodule AppApi.Repo.Migrations.RemoveGermanHipHopEntries do
  use Ecto.Migration

  def up do
    execute("""
    DELETE FROM listens 
    WHERE (metadata LIKE '%hip hop, german%' OR additional_info LIKE '%hip hop, german%')
      AND track_name = 'Schoß Der Kolchose (feat. Max, Afrob & Emil)';
    """)
  end

  def down do
    :ok
  end
end
