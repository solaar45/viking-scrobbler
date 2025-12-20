#!/bin/sh
set -e

SECRET_FILE="/app/data/.secret_key_base"

# Prüfen ob Secret bereits existiert
if [ ! -f "$SECRET_FILE" ]; then
  echo "🔑 Generating new SECRET_KEY_BASE..."
  
  # Secret generieren und speichern
  SECRET_KEY_BASE=$(openssl rand -base64 64 | tr -d '\n')
  echo "$SECRET_KEY_BASE" > "$SECRET_FILE"
  chmod 600 "$SECRET_FILE"
  
  echo "✅ SECRET_KEY_BASE generated and saved to $SECRET_FILE"
else
  echo "🔑 Using existing SECRET_KEY_BASE from $SECRET_FILE"
  SECRET_KEY_BASE=$(cat "$SECRET_FILE")
fi

# Secret als Umgebungsvariable exportieren
export SECRET_KEY_BASE

echo "🚀 Starting Viking Scrobbler..."

# Phoenix starten
exec "$@"
