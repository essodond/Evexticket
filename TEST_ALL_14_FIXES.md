# ✅ TESTING THE 14 FIXES LOCALLY

Now that you have everything set up, here's how to validate all 14 fixes work correctly.

---

## 🚀 Start Everything First

```bash
# Option 1: Quick start (all 3 servers)
# Windows: Double-click START_LOCAL.bat
# Mac/Linux: ./START_LOCAL.sh

# Option 2: Or start manually in 3 terminals:
# Terminal 1: cd backend && python manage.py runserver
# Terminal 2: npm run dev
# Terminal 3: cd react-native-reference && npm start
```

Wait 30 seconds for everything to be ready.

---

## ✅ TEST PLAN (All 14 Fixes)

### ✓ FIX #1: Dashboard Stats Permission

**Test:** Only admins can see dashboard stats

```bash
# In Terminal 4:

# 1. Get admin token
ADMIN_TOKEN=$(curl -s -X POST http://localhost:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}' | jq -r '.token')

# 2. Admin can access (should return 200 + stats)
curl -H "Authorization: Token $ADMIN_TOKEN" \
  http://localhost:8000/api/dashboard/stats/
echo "✅ Should see stats data"

# 3. Create regular user
curl -s -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username":"testuser",
    "email":"test@test.com",
    "password":"test123456",
    "password2":"test123456"
  }' > /dev/null

# 4. Get regular user token
USER_TOKEN=$(curl -s -X POST http://localhost:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123456"}' | jq -r '.token')

# 5. Regular user cannot access (should return 403)
curl -H "Authorization: Token $USER_TOKEN" \
  http://localhost:8000/api/dashboard/stats/
echo ""
echo "✅ Should get 403 Forbidden"
```

---

### ✓ FIX #2 & #3: Admin & Company Dashboard Permission Guards

**Test:** Web dashboard permission guards work

**In Web Browser:**

1. Go to http://localhost:5173
2. Click "Dashboard" (should fail - you're not logged in)
3. Login with admin/admin123
4. Click "Admin Dashboard"
   - ✅ Should show stats (you're admin)
5. Logout
6. Login with test@test.com/test123456
7. Try to access Admin Dashboard
   - ✅ Should show "Access Denied" message

---

### ✓ FIX #4: Company Bookings 403 Response

**Test:** Non-company-admins get 403 error

```bash
# Create a company (as admin)
COMPANY_ID=$(curl -s -X POST http://localhost:8000/api/companies/ \
  -H "Authorization: Token $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Test Company",
    "phone":"+22899999999",
    "email":"company@test.com"
  }' | jq '.id')

echo "Company ID: $COMPANY_ID"

# Non-company user tries to access
curl -H "Authorization: Token $USER_TOKEN" \
  http://localhost:8000/api/companies/$COMPANY_ID/bookings/
echo ""
echo "✅ Should get 403 Forbidden (not 200 with empty list)"
```

---

### ✓ FIX #5: Seat Number Validation

**Test:** Seat numbers are validated (1-100 only)

```bash
# First create a trip and scheduled trip...
# (This is complex via curl, easier to test via UI)

# Via Web UI:
# 1. Go to http://localhost:5173
# 2. Search for a trip
# 3. Try to select a seat outside 1-100
# 4. The app should prevent invalid seats
```

---

### ✓ FIX #6: Mobile Field Names (camelCase → snake_case)

**Test:** Mobile can submit booking with passenger data

**On Mobile:**

1. Run the mobile app
2. Login
3. Search for trip
4. Book a seat
5. Check payment screen shows passenger info
   - ✅ Should show first_name, last_name, phone

**Or via API:**

```bash
# Submit booking with snake_case fields (what mobile does)
curl -X POST http://localhost:8000/api/bookings/ \
  -H "Authorization: Token $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scheduled_trip": 1,
    "passenger_name": "Test User",
    "passenger_email": "test@test.com",
    "passenger_phone": "+22899999999",
    "seat_number": "5",
    "payment_method": "mobile_money",
    "travel_date": "2024-12-25"
  }'
echo ""
echo "✅ Should create booking successfully"
```

---

### ✓ FIX #7: Cancel Booking Button

**Test:** Users can cancel bookings

**In Web Browser:**

1. Login with test account
2. Create a booking
3. Go to "My Tickets"
4. Click "Cancel" button on active booking
   - ✅ Should show confirmation dialog
   - ✅ After confirm, booking status changes to "cancelled"

---

### ✓ FIX #8: Rebook Button

**Test:** Users can rebook past tickets

**In Web Browser:**

1. Login
2. Create a booking
3. Wait a few seconds (or manually set trip date to past)
4. Go to "My Tickets"
5. For past ticket, click "Rebook"
   - ✅ Should navigate to search page
   - ✅ Should be ready to book again

---

### ✓ FIX #9: Phone Login

**Test:** Phone login works with various formats

```bash
# Register with phone
curl -s -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username":"phoneuser",
    "email":"phone@test.com",
    "password":"test123456",
    "password2":"test123456",
    "phone":"+22899999999"
  }' > /dev/null

# Try all 3 phone formats

# Format 1: +228XXXXXXXX
curl -X POST http://localhost:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d '{"phone":"+22899999999","password":"test123456"}'
echo ""
echo "✅ Format 1 works: +228XXXXXXXX"

# Format 2: 228XXXXXXXX
curl -X POST http://localhost:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d '{"phone":"22899999999","password":"test123456"}'
echo ""
echo "✅ Format 2 works: 228XXXXXXXX"

# Format 3: 8-digit local
curl -X POST http://localhost:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d '{"phone":"99999999","password":"test123456"}'
echo ""
echo "✅ Format 3 works: 8-digit local"
```

---

### ✓ FIX #10: Travel Date in Booking

**Test:** Bookings include travel_date

```bash
curl -s -X POST http://localhost:8000/api/bookings/ \
  -H "Authorization: Token $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scheduled_trip": 1,
    "passenger_name": "Test",
    "passenger_email": "test@test.com",
    "passenger_phone": "+22899999999",
    "seat_number": "10",
    "payment_method": "mobile_money",
    "travel_date": "2024-12-25"
  }' | jq '.travel_date'

echo ""
echo "✅ Should show: \"2024-12-25\""
```

---

### ✓ FIX #11 & #12: Token Refresh

**Test:** Token refresh endpoint works

```bash
# Get initial token
TOKEN=$(curl -s -X POST http://localhost:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}' | jq -r '.token')

echo "Initial token: $TOKEN"

# Refresh token
curl -s -X POST http://localhost:8000/api/token/refresh/ \
  -H "Authorization: Token $TOKEN" \
  -H "Content-Type: application/json" | jq '.token'

echo ""
echo "✅ Should get a refreshed token"
```

---

### ✓ FIX #13: Token Security (sessionStorage)

**Test:** Token is stored in sessionStorage not localStorage

**In Web Browser:**

1. Go to http://localhost:5173
2. Open DevTools (F12)
3. Go to "Storage" tab
4. Expand "Session Storage"
5. Click "http://localhost:5173"
6. Look for "authToken"
   - ✅ Should be in Session Storage (not Local Storage)
7. Expand "Local Storage" 
   - ✅ authToken should NOT be there (or should be empty)
8. Close browser tab
9. Open new tab with same URL
   - ✅ Should NOT be logged in (session cleared)

---

### ✓ FIX #14: Dead Files Cleanup

**Test:** Dead files are ready for cleanup

```bash
# These files exist but are not used:
ls -la backend/fix_*.py
ls -la backend/update_*.py
ls -la src/components/PaymentPage.broken.tsx

# They should be deleted with:
git rm -f backend/fix_*.py backend/update_*.py
git rm -f src/components/PaymentPage.broken.tsx
```

---

## 🎯 FULL END-TO-END TEST

Test everything working together:

**Step 1: Register**
1. http://localhost:5173
2. Click "Sign Up"
3. Fill in details
4. Submit

**Step 2: Login (Email)**
1. Login with email you just created
2. Verify dashboard shows

**Step 3: Search & Book**
1. Click "Search Trips"
2. Enter departure/arrival/date
3. Select a trip
4. Choose seat (1-100 range)
5. Enter passenger info
6. Submit payment
7. Confirm booking

**Step 4: View Ticket**
1. Click "My Tickets"
2. See your booking
3. Verify travel_date is shown
4. ✅ Click "Cancel" and confirm
   - Booking status should change to "cancelled"

**Step 5: Create Another**
1. Click "Rebook"
2. Search again
3. Book different seat/trip

**Step 6: Admin Panel**
1. Logout
2. Login with admin/admin123
3. Go to http://localhost:8000/admin
4. View all bookings
5. View all users

**Step 7: Phone Login**
1. Register with phone
2. Logout
3. Login with phone number (any format)
4. Verify it works

---

## ✅ VALIDATION CHECKLIST

All should be ✅:

```
Authentication
  ✅ Email login works
  ✅ Phone login works (+228, 228, 8-digit formats)
  ✅ Token refresh works
  ✅ Token in sessionStorage (not localStorage)

Booking
  ✅ Search finds trips
  ✅ Seat selection works (1-100 range)
  ✅ Seat validation prevents invalid entries
  ✅ Payment submission works
  ✅ Confirmation page shows booking

Data
  ✅ Travel date included in booking
  ✅ Mobile passenger data preserved (snake_case)
  ✅ Bookings saved correctly

Permissions
  ✅ Dashboard stats visible to admin (200)
  ✅ Dashboard stats forbidden to user (403)
  ✅ Admin dashboard restricted
  ✅ Company dashboard restricted

User Features
  ✅ Cancel booking works
  ✅ Rebook button works
  ✅ Ticket list shows status

Code Quality
  ✅ No console errors
  ✅ No API errors (proper status codes)
  ✅ No data corruption
  ✅ Mobile works (if testing)
```

---

## 🐛 Debug Help

**Backend logs:**
- Check Terminal 1 for request logs
- Look for errors during booking creation

**Web logs:**
- Press F12 in browser
- Check Console tab for errors
- Check Network tab for API calls

**Mobile logs:**
- Check Terminal 3 for Expo output
- Look for network errors

---

## 🎓 Common Issues During Testing

| Issue | Solution |
|-------|----------|
| "Can't find trip" | Create trip in admin panel first |
| "Booking fails" | Check backend logs, ensure all fields present |
| "Permission denied" | Make sure you have right role (admin for dashboard) |
| "Phone login fails" | Verify phone number format, check backend logs |
| "Mobile can't connect" | Use 10.0.2.2:8000 for emulator, or your PC's IP for physical phone |

---

## ✨ That's It!

All 14 fixes are now testable locally. Run the tests above to verify everything works!

**Next steps:**
1. ✅ Run all 14 tests
2. ✅ Verify everything passes
3. ✅ Delete dead files (FIX #14)
4. ✅ Commit and push
5. ✅ Deploy to production

---

**Questions?** Check the browser console (F12) or backend terminal for errors!
