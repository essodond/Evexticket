#!/bin/bash
# Test script for Phase 1 fixes
# Run these tests to validate the corrections

echo "=== PHASE 1 FIXES VALIDATION ==="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:8000/api"

# Function to make HTTP requests
test_endpoint() {
    local method=$1
    local endpoint=$2
    local token=$3
    local data=$4
    local expected_code=$5
    
    echo -n "Testing $method $endpoint ... "
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" \
            -H "Authorization: Token $token" \
            -H "Content-Type: application/json")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" \
            -H "Authorization: Token $token" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "$expected_code" ]; then
        echo -e "${GREEN}✓ $http_code${NC}"
        return 0
    else
        echo -e "${RED}✗ Expected $expected_code, got $http_code${NC}"
        echo "Response: $body"
        return 1
    fi
}

echo -e "${YELLOW}### TEST 1: Dashboard Permission Fix ###${NC}"
echo "Setup: Create test user (non-admin) and get token"
echo ""

# These would need to be done manually or via Django shell
echo "⚠️  Manual step: Create test user and get token"
echo "    python manage.py shell"
echo "    >>> from django.contrib.auth.models import User"
echo "    >>> from rest_framework.authtoken.models import Token"
echo "    >>> user = User.objects.create_user(username='testuser', password='test123', is_staff=False)"
echo "    >>> token = Token.objects.get_or_create(user=user)[0]"
echo "    >>> print(token.key)"
echo ""
echo "Then set USER_TOKEN and ADMIN_TOKEN:"
echo ""

# You would run this manually:
# test_endpoint "GET" "/dashboard/stats/" "$USER_TOKEN" "" "403"

echo -e "${YELLOW}### TEST 2: Seat Number Validation ###${NC}"
echo ""

# Test invalid seat (non-numeric)
echo "Test 2a: Invalid seat number (string)"
cat > /tmp/test_booking_invalid_seat.json << 'EOF'
{
  "scheduled_trip": 1,
  "passenger_name": "Test User",
  "passenger_email": "test@example.com",
  "passenger_phone": "+22899999999",
  "seat_number": "invalid",
  "payment_method": "mobile_money",
  "total_price": 5000
}
EOF

echo "Should return 400 Bad Request with 'Seat number must be numeric'"
echo ""

# Test out of range seat
echo "Test 2b: Seat number out of range (999)"
cat > /tmp/test_booking_out_of_range.json << 'EOF'
{
  "scheduled_trip": 1,
  "passenger_name": "Test User",
  "passenger_email": "test@example.com",
  "passenger_phone": "+22899999999",
  "seat_number": "999",
  "payment_method": "mobile_money",
  "total_price": 5000
}
EOF

echo "Should return 400 Bad Request with 'Seat number must be between 1 and 100'"
echo ""

# Test valid seat
echo "Test 2c: Valid seat number (5)"
cat > /tmp/test_booking_valid_seat.json << 'EOF'
{
  "scheduled_trip": 1,
  "passenger_name": "Test User",
  "passenger_email": "test@example.com",
  "passenger_phone": "+22899999999",
  "seat_number": "5",
  "payment_method": "mobile_money",
  "total_price": 5000
}
EOF

echo "Should return 201 Created (if trip/seat available)"
echo ""

echo -e "${YELLOW}### TEST 3: CompanyBookings Permission Fix ###${NC}"
echo ""
echo "Before: Non-company-admins got empty 200 response"
echo "After: Non-company-admins get 403 Forbidden"
echo ""

echo -e "${YELLOW}### TEST 4: Mobile Field Names Fix ###${NC}"
echo ""
echo "Navigate to PaymentScreen in React Native app"
echo "Complete booking and check network tab"
echo "Verify: passenger_name and passenger_phone are populated (not empty)"
echo ""

echo -e "${YELLOW}=== MANUAL TESTING REQUIRED ===${NC}"
echo ""
echo "1. Start backend: python manage.py runserver"
echo "2. Test with Postman or curl (samples below)"
echo "3. Mobile: Navigate app and verify passenger data"
echo ""

echo "=== CURL EXAMPLES ==="
echo ""

echo "# Test 1: Dashboard with non-admin token"
echo "curl -X GET http://localhost:8000/api/dashboard/stats/ \\"
echo "  -H \"Authorization: Token YOUR_USER_TOKEN\""
echo "# Should return 403 Forbidden"
echo ""

echo "# Test 2: Invalid seat booking"
echo "curl -X POST http://localhost:8000/api/bookings/ \\"
echo "  -H \"Authorization: Token YOUR_TOKEN\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '@/tmp/test_booking_invalid_seat.json'"
echo "# Should return 400 Bad Request"
echo ""

echo "# Test 3: Valid seat booking"
echo "curl -X POST http://localhost:8000/api/bookings/ \\"
echo "  -H \"Authorization: Token YOUR_TOKEN\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '@/tmp/test_booking_valid_seat.json'"
echo "# Should return 201 Created (if seat available)"
echo ""

echo "=== VALIDATION CHECKLIST ==="
echo ""
echo "[ ] Dashboard returns 403 for non-admin user"
echo "[ ] Dashboard returns 200 for admin user"
echo "[ ] Invalid seat rejects with 'must be numeric' message"
echo "[ ] Out-of-range seat rejects with range error message"
echo "[ ] Valid seat allows booking creation"
echo "[ ] CompanyBookings returns 403 for non-admin"
echo "[ ] Mobile booking includes passenger_name"
echo "[ ] Mobile booking includes passenger_phone"
echo "[ ] No regressions in other endpoints"
echo ""

echo -e "${GREEN}Ready for testing!${NC}"
