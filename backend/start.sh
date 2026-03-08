#!/usr/bin/env bash
# Script de démarrage pour Render
set -o errexit

echo "=== WORKING DIR: $(pwd) ==="

echo "=== RUNNING MIGRATIONS AT STARTUP ==="
python manage.py migrate --no-input
echo "=== MIGRATIONS DONE ==="

echo "=== CREATING SUPERUSER ==="
python create_superuser.py
echo "=== SUPERUSER DONE ==="

echo "=== LOADING INITIAL DATA (cities, etc.) ==="
python manage.py load_initial_data || echo "Initial data already loaded or command failed (non-blocking)"
echo "=== INITIAL DATA DONE ==="

echo "=== STARTING GUNICORN ==="
exec gunicorn togotrans_api.wsgi:application --bind 0.0.0.0:$PORT




