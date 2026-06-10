#!/usr/bin/env bash
# Script de démarrage pour Render
set -o errexit

echo "=== STARTING SERVER ==="

# 1. Appliquer les migrations sur la base de données
echo "Running migrations..."
python manage.py migrate

# 2. Lancer le serveur Django avec Gunicorn
# Remplace "nom_de_ton_projet" par le nom du dossier qui contient ton fichier wsgi.py
echo "Starting Gunicorn..."
exec gunicorn togotrans_api.wsgi:application --bind 0.0.0.0:$PORT