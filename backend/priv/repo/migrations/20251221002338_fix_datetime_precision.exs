defmodule AppApi.Repo.Migrations.FixDatetimePrecision do
  use Ecto.Migration

  def change do
    # Keine Änderung an bestehenden Tabellen nötig
    # SQLite speichert datetime als TEXT, die Konvertierung passiert in Ecto
    # Diese Migration ist nur für Dokumentation
  end
end
