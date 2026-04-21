# TEST PHASE 1 FIXES

**Date:** 2026-04-20  
**Fixes Applied:**
1. ✅ Dashboard permission (IsAuthenticatedUser → IsAdminUser)
2. ✅ Mobile field names (firstName → first_name)
3. ✅ Seat number validation (added numeric check)
4. ⏳ Phone login (to be tested)

---

## TEST 1: Dashboard Permission Fix

**What was changed:**
- `views.py:292` - Changed `permission_classes = [permissions.IsAuthenticated]` to `[permissions.IsAdminUser]`

**Test this:**
```bash
# Backend still running on localhost:8000

# 1. Create test user (regular user, not staff)
python manage.py shell
>>> from django.contrib.auth.models import User
>>> user = User.objects.create_user(username='testuser', password='pass123', is_staff=False)
>>> print(user.id)
# Remember the ID

# 2. Get their token
python manage.py shell
>>> from rest_framework.authtoken.models import Token
>>> from django.contrib.auth.models import User
>>> user = User.objects.get(username='testuser')
>>> token, _ = Token.objects.get_or_create(user=user)
>>> print(f"Token: {token.key}")
# Use this token in curl

# 3. Test endpoint with non-admin user
curl -X GET http://localhost:8000/api/dashboard/stats/ \
  -H "Authorization: Token YOUR_USER_TOKEN"

# Expected: ❌ 403 Forbidden (NOT 200 OK!)
```

**Expected Result:**
```json
{
  "detail": "You do not have permission to perform this action."
}
```

---

## TEST 2: Seat Number Validation Fix

**What was changed:**
- `serializers.py:369-380` - Added numeric validation and range check (1-100)

**Test this:**
```bash
# 1. First get a valid trip and user auth
# Use a real scheduled trip ID (e.g., 1)

# 2. Try to create booking with invalid seat (string)
curl -X POST http://localhost:8000/api/bookings/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scheduled_trip": 1,
    "passenger_name": "Test User",
    "passenger_email": "test@example.com",
    "passenger_phone": "+22899999999",
    "seat_number": "invalid",
    "payment_method": "mobile_money",
    "total_price": 5000
  }'

# Expected: ❌ 400 Bad Request - "Seat number must be numeric"
```

**Expected Result:**
```json
{
  "seat_number": ["Seat number must be numeric"]
}
```

**3. Try to create booking with seat out of range (>100)**
```bash
curl -X POST http://localhost:8000/api/bookings/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scheduled_trip": 1,
    "passenger_name": "Test User",
    "passenger_email": "test@example.com",
    "passenger_phone": "+22899999999",
    "seat_number": "999",
    "payment_method": "mobile_money",
    "total_price": 5000
  }'

# Expected: ❌ 400 Bad Request - "Seat number must be between 1 and 100"
```

**4. Valid seat should work**
```bash
curl -X POST http://localhost:8000/api/bookings/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scheduled_trip": 1,
    "passenger_name": "Test User",
    "passenger_email": "test@example.com",
    "passenger_phone": "+22899999999",
    "seat_number": "5",
    "payment_method": "mobile_money",
    "total_price": 5000
  }'

# Expected: ✅ 201 Created - booking created
```

---

## TEST 3: Mobile Field Names Fix

**What was changed:**
- `PaymentScreen.tsx:42-44` - Changed firstName/lastName/phoneNumber to first_name/last_name/phone_number

**How to test:**
1. On mobile device or emulator:
2. Login with a user account
3. Go to PaymentScreen
4. Check browser dev tools / network tab
5. Make a booking
6. Look at POST request payload to /api/bookings/
7. Verify passenger_name is NOT empty (should have actual name)
8. Verify passenger_phone is NOT empty (should have actual phone)

**Before fix:** passenger_name and passenger_phone would be empty strings  
**After fix:** passenger_name and passenger_phone populated correctly

---

## TEST 4: Phone Login (Pre-existing, should already work)

**Test phone login:**
```bash
# Assuming user registered with phone number stored in profile

curl -X POST http://localhost:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+22899999999",
    "password": "userpassword"
  }'

# Expected: ✅ 200 OK with token
# OR: ❌ 401 if phone doesn't exist or password wrong
```

If this FAILS with 400/500 error:
- Check UserProfile model to see if field is `phone` or `phone_number`
- Check views.py line 105 to see what field it searches for

---

## Verification Checklist

```
[ ] Dashboard returns 403 for non-admin user
[ ] Dashboard works for admin user  
[ ] Seat validation rejects non-numeric values
[ ] Seat validation rejects out-of-range values
[ ] Valid seats are accepted
[ ] Mobile booking sends passenger_name with value
[ ] Mobile booking sends passenger_phone with value
[ ] Phone login works (if phone profile exists)
```

---

## Files Modified

1. ✅ `backend/transport/views.py:292` - Dashboard permission
2. ✅ `backend/transport/serializers.py:369-380` - Seat validation  
3. ✅ `react-native-reference/src/screens/PaymentScreen.tsx:42-44` - Field names

## Files NOT Modified (yet)

- Booking flow (move from PaymentPage - Jour 2)
- Auth tokens (localStorage fix - Jour 2)
- Models consolidation (Jour 3)
- Phone login (appears to already work - verify)

---

**Status:** Ready for testing  
**Estimated Time:** 30-45 min to validate all 4 fixes
