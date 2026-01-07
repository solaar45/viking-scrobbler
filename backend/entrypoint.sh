#!/bin/sh
set -e

echo "🔧 Viking Scrobbler Setup"

# === FIX: Verzeichnis ZUERST erstellen! ===
# Wichtig: Muss VOR jedem Schreibzugriff auf /app/data passieren
mkdir -p /app/data

# === SECRET_KEY_BASE ===
SECRET_FILE="/app/data/.secret_key_base"

if [ ! -f "$SECRET_FILE" ]; then
  echo "🔑 Generating SECRET_KEY_BASE..."
  SECRET_KEY_BASE=$(openssl rand -base64 64 | tr -d '\n')
  echo "$SECRET_KEY_BASE" > "$SECRET_FILE"
  chmod 600 "$SECRET_FILE"
  echo "✅ SECRET_KEY_BASE generated"
else
  echo "🔑 Using existing SECRET_KEY_BASE"
  SECRET_KEY_BASE=$(cat "$SECRET_FILE")
fi

export SECRET_KEY_BASE

# === DATABASE SETUP ===
export DATABASE_PATH="${DATABASE_PATH:-/app/data/viking.db}"
echo "📦 Database: $DATABASE_PATH"

# Data-Ordner nochmals sicherstellen (falls DATABASE_PATH anders ist)
mkdir -p "$(dirname "$DATABASE_PATH")"

echo "🚀 Starting Viking Scrobbler with SECRET_KEY_BASE set..."
exec "$@"
