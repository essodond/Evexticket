#!/usr/bin/env bash
set -euo pipefail

# Script de keepalive pour ping l'application Render depuis un service externe.
# Utilise une URL publique et un scheduler externe comme UptimeRobot, cron-job.org, ou un autre service d'uptime.

TARGET="${KEEPALIVE_URL:-https://evexticket-api.onrender.com/}"

echo "=== RENDER KEEPALIVE ==="
echo "Ping $TARGET"

curl -fsS --max-time 10 "$TARGET" > /dev/null

echo "Keepalive OK"
