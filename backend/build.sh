#!/usr/bin/env bash
# Script de build pour Render
set -o errexit

cd "$(dirname "$0")"

echo "=== BUILD START (pwd: $(pwd)) ==="

# Installer les dépendances
pip install --upgrade pip
pip install -r requirements.txt

echo "=== DEPENDENCIES INSTALLED ==="

# Collecter les fichiers statiques
python manage.py collectstatic --no-input
echo "=== STATIC FILES COLLECTED ==="

echo "=== BUILD COMPLETE ==="
echo "NOTE: Migrations will run at startup (start.sh)"

