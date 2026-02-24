#!/bin/bash
# Test API endpoint pour les réservations

echo "=== Test des réservations ==="
echo ""

# Remplacez YOUR_TOKEN par votre vrai token
TOKEN="YOUR_TOKEN_HERE"
API_URL="http://192.168.1.64:8000/api"

echo "📡 GET /api/bookings/"
curl -H "Authorization: Token $TOKEN" \
     -H "Content-Type: application/json" \
     "$API_URL/bookings/" | python -m json.tool

echo ""
echo "✅ Test terminé"

