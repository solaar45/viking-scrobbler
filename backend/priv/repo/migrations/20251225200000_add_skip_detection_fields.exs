defmodule AppApi.Repo.Migrations.AddSkipDetectionFields do
  use Ecto.Migration

  def change do
    alter table(:listens) do
      # Track Duration (in Sekunden, von Navidrome/Client)
      add :duration, :integer, comment: "Total track length in seconds"

      # Played Duration (in Sekunden, wie lange tatsächlich gehört)
      add :played_duration, :integer, comment: "Actual played duration in seconds"

      # Skip Status (boolean, auto-calculated)
      add :is_skipped, :boolean, default: false, comment: "True if listen was skipped (< 50% or 4 min)"

      # Scrobble Percentage (float, auto-calculated)
      add :scrobble_percentage, :float, comment: "Percentage of track played (0-100)"

      # Skip Reason (optional, for debugging)
      add :skip_reason, :string, comment: "Reason for skip: duration_threshold, percentage_threshold, manual"
    end

    # Indizes für Performance
    create index(:listens, [:is_skipped], comment: "Filter skipped listens")
    create index(:listens, [:duration], comment: "Filter by track duration")
    create index(:listens, [:scrobble_percentage], comment: "Filter by completion rate")

    # Composite Index für häufige Queries
    create index(:listens, [:user_name, :is_skipped, :listened_at],
           comment: "User skip stats queries")
  end

  def down do
    drop index(:listens, [:user_name, :is_skipped, :listened_at])
    drop index(:listens, [:scrobble_percentage])
    drop index(:listens, [:duration])
    drop index(:listens, [:is_skipped])

    alter table(:listens) do
      remove :duration
      remove :played_duration
      remove :is_skipped
      remove :scrobble_percentage
      remove :skip_reason
    end
  end
end
