#!/usr/bin/env bash
# Script de démarrage pour Render
# Exécute les migrations au démarrage (plus fiable que pendant le build)
set -o errexit

echo "=== RUNNING MIGRATIONS AT STARTUP ==="
python manage.py migrate --no-input
echo "=== MIGRATIONS DONE ==="

echo "=== CREATING SUPERUSER ==="
python create_superuser.py
echo "=== SUPERUSER DONE ==="

echo "=== STARTING GUNICORN ==="
exec gunicorn togotrans_api.wsgi:application --bind 0.0.0.0:$PORT

