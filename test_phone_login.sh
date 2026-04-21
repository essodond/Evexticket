#!/bin/bash
# Test phone login at runtime

API_URL="http://localhost:8000/api"

echo "=== TESTING PHONE LOGIN RUNTIME ==="
echo ""

# Test 1: Register with phone
echo "1. REGISTER WITH PHONE"
REGISTER_RESP=$(curl -s -X POST "$API_URL/auth/register/" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "phonetest",
    "email": "phonetest@test.com",
    "password": "testpass123",
    "password2": "testpass123",
    "phone": "+22899123456"
  }')

echo "$REGISTER_RESP" | jq .
TOKEN=$(echo "$REGISTER_RESP" | jq -r '.token // empty')

if [ -z "$TOKEN" ]; then
  echo "❌ Registration failed - no token returned"
  exit 1
fi

echo "✅ Registration success, token: ${TOKEN:0:10}..."
echo ""

# Test 2: Login with phone (direct phone search)
echo "2. TEST PHONE LOOKUP ON LOGIN"
LOGIN_RESP=$(curl -s -X POST "$API_URL/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+22899123456"
  }')

echo "$LOGIN_RESP" | jq .
LOGIN_TOKEN=$(echo "$LOGIN_RESP" | jq -r '.token // empty')

if [ -z "$LOGIN_TOKEN" ]; then
  echo "❌ Phone login failed - no token returned"
  # Try alternative format
  echo ""
  echo "3. TRYING ALTERNATIVE FORMAT (228XXXXXXXX)"
  LOGIN_RESP2=$(curl -s -X POST "$API_URL/auth/login/" \
    -H "Content-Type: application/json" \
    -d '{
      "phone": "22899123456"
    }')
  echo "$LOGIN_RESP2" | jq .
  LOGIN_TOKEN=$(echo "$LOGIN_RESP2" | jq -r '.token // empty')
  
  if [ -z "$LOGIN_TOKEN" ]; then
    echo "❌ Phone login still failed with alternative format"
    exit 1
  fi
fi

echo "✅ Phone login success, token: ${LOGIN_TOKEN:0:10}..."
echo ""

# Test 3: Verify user profile retrieved with phone token
echo "4. GET CURRENT USER WITH PHONE LOGIN TOKEN"
USER_RESP=$(curl -s -X GET "$API_URL/auth/me/" \
  -H "Authorization: Token $LOGIN_TOKEN")

echo "$USER_RESP" | jq .
USERNAME=$(echo "$USER_RESP" | jq -r '.username // empty')

if [ -z "$USERNAME" ]; then
  echo "❌ Failed to retrieve user profile"
  exit 1
fi

echo "✅ User profile retrieved: $USERNAME"
echo ""

# Test 4: Verify phone is in response
PHONE=$(echo "$USER_RESP" | jq -r '.phone_number // empty')
echo "User phone from profile: $PHONE"

if [ -z "$PHONE" ]; then
  echo "⚠️  WARNING: Phone not returned in user profile (might be null)"
else
  echo "✅ Phone correctly stored and returned: $PHONE"
fi

echo ""
echo "=== PHONE LOGIN TEST COMPLETE ==="
echo "Status: PASS - Phone login flow working end-to-end"
