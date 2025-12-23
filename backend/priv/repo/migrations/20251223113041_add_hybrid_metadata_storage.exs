defmodule AppApi.Repo.Migrations.AddHybridMetadataStorage do
  use Ecto.Migration

  def up do
    alter table(:listens) do
      # ===== TIER 1: Performance-kritische Spalten =====
      # Device/Origin (für Device-Spalte im Frontend)
      add :origin_url, :string
      add :music_service, :string
      
      # Technical Metadata
      add :duration_ms, :integer
      add :tracknumber, :integer
      add :discnumber, :integer
      
      # Social/User Interaction
      add :loved, :boolean, default: false
      add :rating, :integer
      
      # ===== TIER 2: JSON für strukturierte Metadaten =====
      # SQLite: :text (wird als JSON String gespeichert)
      add :metadata, :text, default: "{}"
    end
    
    # ===== INDIZES für Performance =====
    # SQLite unterstützt nur B-Tree Indizes
    create index(:listens, [:music_service])
    create index(:listens, [:loved])
    create index(:listens, [:duration_ms])
    create index(:listens, [:origin_url])
    
    # Composite Indizes für häufige Kombinationen
    create index(:listens, [:user_name, :loved])
    create index(:listens, [:user_name, :listened_at])
    create index(:listens, [:user_name, :music_service])
    
    # ===== BESTEHENDE DATEN MIGRIEREN =====
    # SQLite JSON-Funktionen verwenden
    execute """
    UPDATE listens
    SET 
      origin_url = json_extract(additional_info, '$.origin_url'),
      music_service = COALESCE(
        json_extract(additional_info, '$.music_service'),
        json_extract(additional_info, '$.submission_client')
      ),
      duration_ms = CAST(json_extract(additional_info, '$.duration_ms') AS INTEGER),
      tracknumber = CAST(json_extract(additional_info, '$.tracknumber') AS INTEGER),
      discnumber = CAST(json_extract(additional_info, '$.discnumber') AS INTEGER),
      loved = 0,
      rating = NULL,
      metadata = json_object(
        'submission_client', json_extract(additional_info, '$.submission_client'),
        'submission_client_version', json_extract(additional_info, '$.submission_client_version'),
        'artist_mbids', json_extract(additional_info, '$.artist_mbids'),
        'artist_names', json_extract(additional_info, '$.artist_names'),
        'total_tracks', json_extract(additional_info, '$.total_tracks')
      )
    WHERE additional_info IS NOT NULL
    """
  end

  def down do
    # Daten zurück in additional_info schreiben
    execute """
    UPDATE listens
    SET additional_info = json_object(
      'origin_url', origin_url,
      'music_service', music_service,
      'duration_ms', duration_ms,
      'tracknumber', tracknumber,
      'discnumber', discnumber,
      'submission_client', json_extract(metadata, '$.submission_client'),
      'submission_client_version', json_extract(metadata, '$.submission_client_version'),
      'artist_mbids', json_extract(metadata, '$.artist_mbids'),
      'artist_names', json_extract(metadata, '$.artist_names'),
      'total_tracks', json_extract(metadata, '$.total_tracks')
    )
    """
    
    # Indizes entfernen
    drop_if_exists index(:listens, [:user_name, :music_service])
    drop_if_exists index(:listens, [:user_name, :listened_at])
    drop_if_exists index(:listens, [:user_name, :loved])
    drop_if_exists index(:listens, [:origin_url])
    drop_if_exists index(:listens, [:duration_ms])
    drop_if_exists index(:listens, [:loved])
    drop_if_exists index(:listens, [:music_service])
    
    # Spalten entfernen
    alter table(:listens) do
      remove :origin_url
      remove :music_service
      remove :duration_ms
      remove :tracknumber
      remove :discnumber
      remove :loved
      remove :rating
      remove :metadata
    end
  end
end
