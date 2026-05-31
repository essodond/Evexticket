#!/usr/bin/env bash
# Script de démarrage pour Render
set -o errexit

echo "=== WORKING DIR: $(pwd) ==="

echo "=== DATABASE_URL DIAGNOSTICS ==="
python - <<'PY'
import os
from urllib.parse import urlparse
url = urlparse(os.environ.get('DATABASE_URL', ''))
print('DATABASE_URL set:', bool(os.environ.get('DATABASE_URL')))
print('DATABASE_URL scheme:', url.scheme)
print('DATABASE_URL host:', url.hostname)
print('DATABASE_URL port:', url.port)
print('DATABASE_URL path:', url.path)
PY

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




