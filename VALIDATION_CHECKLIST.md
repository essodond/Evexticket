# CHECKLIST DE VALIDATION - FLOWS CRITIQUES

## AVANT CORRECTION

### Backend
```
[ ] python manage.py test transport.tests
    Expected: Tests exist and define baseline

[ ] POST /api/login/ with phone number
    Expected: ❌ FAILS (phone_number field mismatch)
    
[ ] GET /api/dashboard/stats/ with regular user token
    Expected: ❌ Should return 403, actually returns stats
    
[ ] GET /api/booked_seats/?scheduled_trip=1
    Expected: ✅ Returns occupied seats list
    
[ ] POST /api/bookings/ with invalid seat_number="xyz"
    Expected: ❌ Accepts invalid seat
```

### Web Frontend
```
[ ] yarn dev
    Expected: App loads without errors
    
[ ] Login with email
    Expected: ✅ Works
    
[ ] Search trip from HomePage
    Expected: ✅ Shows results
    
[ ] Click trip → BookingPage
    Expected: ✅ Shows seats
    
[ ] Select seat → PaymentPage
    Expected: ⚠️ Page shows, but will create booking immediately
    
[ ] MyTicketsPage
    Expected: ❌ No Reopen/Cancel buttons visible
    
[ ] Navigate to /admin as regular user
    Expected: ⚠️ Page accessible (no permission check frontend)
```

### Mobile
```
[ ] npm start (Expo)
    Expected: App loads
    
[ ] Try phone login
    Expected: ✅ UI accepts it, but check if backend works
    
[ ] Complete booking flow
    Expected: ⚠️ Booking created with empty passenger_name
```

---

## PHASE 1 - CRITICAL FIXES (Day 1)

### Fix #1: Phone Login - Backend

**File:** `backend/transport/views.py` line 105

**Change:**
```python
# BEFORE
user_profile = UserProfile.objects.get(phone=phone)

# AFTER  
user_profile = UserProfile.objects.get(phone_number=phone)
```

**Test:**
```bash
# Test phone login
curl -X POST http://localhost:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d '{"phone": "+22899999999", "password": "testpass123"}'

# Expected: 200 OK with token
```

**Checklist:**
- [ ] Code changed
- [ ] Verify models/user.py actually has phone_number field
- [ ] Run migration if needed
- [ ] Test login with phone in Postman
- [ ] Verify token returned

---

### Fix #2: Dashboard Permission - Backend

**File:** `backend/transport/views.py` line 291

**Change:**
```python
# BEFORE
class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

# AFTER
class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAdminUser]
```

**Test:**
```bash
# Test 1: With regular user token (should fail)
curl -X GET http://localhost:8000/api/dashboard/stats/ \
  -H "Authorization: Token REGULAR_USER_TOKEN"
# Expected: 403 Forbidden

# Test 2: With admin token (should work)
curl -X GET http://localhost:8000/api/dashboard/stats/ \
  -H "Authorization: Token ADMIN_TOKEN"
# Expected: 200 OK with stats
```

**Checklist:**
- [ ] Code changed
- [ ] Create test admin user if needed (python manage.py create_superuser)
- [ ] Test with admin token - should work
- [ ] Test with user token - should fail with 403
- [ ] Verify response structure

---

### Fix #3: Mobile Field Names - Frontend

**File:** `react-native-reference/src/screens/PaymentScreen.tsx` lines 42-44

**Change:**
```typescript
// BEFORE
const passengerName = `${user?.firstName || ''} ${user?.lastName || ''}`;
const passengerPhone = user?.phoneNumber || '';

// AFTER
const passengerName = `${user?.first_name || ''} ${user?.last_name || ''}`;
const passengerPhone = user?.phone_number || '';
```

**Test:**
```bash
# Complete booking flow in mobile
# Verify in network inspector that passenger_name has actual name
# Not empty string
```

**Checklist:**
- [ ] Code changed in PaymentScreen
- [ ] Verify AuthContext returns user with snake_case fields
- [ ] Test booking → verify passenger_name not empty
- [ ] Check network request in dev tools

---

### Fix #4: Seat Number Validation - Backend

**File:** `backend/transport/serializers.py` around line 369

**Add validation:**
```python
def validate_seat_number(self, value):
    """Seat number must be numeric and within bus capacity"""
    if not value:
        raise serializers.ValidationError("Seat number is required")
    
    try:
        seat_num = int(value)
    except ValueError:
        raise serializers.ValidationError("Seat number must be numeric")
    
    # Get capacity from trip
    trip = self.instance.trip if self.instance else self.initial_data.get('trip')
    if trip and trip.capacity:
        if seat_num < 1 or seat_num > trip.capacity:
            raise serializers.ValidationError(
                f"Seat number must be between 1 and {trip.capacity}"
            )
    
    return value
```

**Test:**
```bash
# Test 1: Invalid seat (string)
curl -X POST http://localhost:8000/api/bookings/ \
  -H "Authorization: Token TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scheduled_trip": 1,
    "passenger_name": "Test User",
    "passenger_email": "test@test.com",
    "passenger_phone": "+22899999999",
    "seat_number": "invalid",
    "payment_method": "mobile_money",
    "total_price": 5000
  }'
# Expected: 400 Bad Request - seat number must be numeric

# Test 2: Seat out of range
# Same request but seat_number: "999"
# Expected: 400 Bad Request - seat number must be between 1 and N
```

**Checklist:**
- [ ] Validation function added
- [ ] Test with invalid string - should fail
- [ ] Test with out-of-range number - should fail
- [ ] Test with valid seat - should succeed
- [ ] Verify error messages clear

---

### Fix #5: Verify All Fixes Day 1

**End-to-End Test:**
```bash
# 1. Phone login backend
POST /api/login/ with {"phone": "...", "password": "..."}
Expected: ✅ Works

# 2. Dashboard stats permission
GET /api/dashboard/stats/ with user token
Expected: ✅ Returns 403

# 3. Mobile booking
Complete booking in React Native
Expected: ✅ passenger_name not empty

# 4. Seat validation
POST booking with seat_number="invalid"
Expected: ✅ Returns 400 error
```

**Checklist:**
- [ ] Phone login works
- [ ] Dashboard returns 403 for non-admin
- [ ] Mobile booking has passenger data
- [ ] Invalid seats rejected
- [ ] No regressions in other flows

---

## PHASE 2 - SECURITY (Day 2)

### Fix #6: Auth Token Security

**File:** `src/contexts/AuthContext.tsx` and `src/services/api.ts`

**Option 1: Use sessionStorage (interim)**
```typescript
// BEFORE - AuthContext.tsx:37
const token = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;

// AFTER - Use sessionStorage (cleared on browser close)
const token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('authToken') : null;
```

**Option 2: Use httpOnly Cookies (recommended)**
- Backend: Send Set-Cookie with httpOnly flag
- Frontend: Use credentials: 'include' in fetch
- Token never exposed to JavaScript

**Test:**
- [ ] Token not accessible from console `localStorage.getItem('authToken')`
- [ ] Login still works
- [ ] Token persists across page reload (or not, depending on storage choice)
- [ ] Logout clears token

---

## PHASE 3 - FLOW FIX (Day 3)

### Fix #7: Booking Flow - Frontend

**Current Flow (BROKEN):**
```
BookingPage → PaymentPage (CREATES booking) → ConfirmationPage
```

**Correct Flow:**
```
BookingPage → ConfirmationPage (CREATES booking + payment) → PaymentProcessing
```

**Changes:**

**1. PaymentPage.tsx - Remove booking creation**
```typescript
// REMOVE Lines 85-89 (createBooking call)
const created = await apiService.createBooking(payload);
```

**2. ConfirmationPage.tsx - Add booking creation**
```typescript
// ADD booking creation logic before payment
const payload = {
  scheduled_trip: tripId,
  passenger_name: passengerName,
  passenger_email: passengerEmail,
  passenger_phone: passengerPhone,
  seat_number: seatNumber,
  payment_method: paymentMethod,
  total_price: totalPrice,
  travel_date: tripDate  // ADD THIS
};

const booking = await apiService.createBooking(payload);
setBooking(booking);  // Store for payment confirmation

// Then proceed to payment processing
```

**Test:**
```
[ ] Search trip
[ ] Select seat → BookingPage
[ ] Enter passenger info → ConfirmationPage
[ ] Press Confirm → Booking created
[ ] Payment page shows
[ ] Complete payment → Confirmation
[ ] MyTickets shows new ticket
```

---

## PHASE 4 - FEATURES (Day 4-5)

### Fix #8: Models Consolidation

**Files to consolidate:**
- `backend/models.py` (old)
- `backend/models/base.py` (new)
- `backend/models/user.py` (UserProfile)

**Steps:**
1. Merge all models into `models/` structure
2. Ensure single Trip definition with all fields
3. Run migrations
4. Update serializers to reference merged models

**Checklist:**
- [ ] One source of truth for each model
- [ ] Migrations run without errors
- [ ] Serializers updated
- [ ] No import errors in views

---

### Fix #9: Ticket Reopen Feature - Frontend

**File:** `src/components/MyTicketsPage.tsx`

**Add button:**
```typescript
// Line 328 - Add cancel + reopen buttons
{!isPast && (
  <div>
    <button onClick={() => handleCancel(booking.id)}>Cancel Booking</button>
    <button onClick={() => handleReopen(booking.id)}>Reopen Booking</button>
  </div>
)}

// Also for past:
{isPast && (
  <button onClick={() => handleReopen(booking.id)}>Rebook</button>
)}
```

**Implementation:**
```typescript
const handleCancel = async (bookingId: number) => {
  try {
    await apiService.cancelBooking(bookingId);
    setBookings(bookings.map(b => 
      b.id === bookingId ? {...b, status: 'cancelled'} : b
    ));
    showNotification('Booking cancelled');
  } catch (error) {
    showError('Failed to cancel booking');
  }
};

const handleReopen = async (bookingId: number) => {
  // Redirect to search to rebook
  navigate('/');
};
```

**Test:**
- [ ] Cancel button appears for active bookings
- [ ] Clicking cancel updates status to cancelled
- [ ] Reopen button appears for cancelled/past bookings
- [ ] Clicking reopen takes to homepage to search again

---

### Fix #10: Admin Dashboard Permissions

**File:** `src/components/AdminDashboard.tsx`

**Add permission check:**
```typescript
import { useAuth } from '../contexts/AuthContext';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  
  // ADD THIS CHECK
  if (!user?.is_staff && !user?.is_superuser) {
    return (
      <div>
        <h1>Access Denied</h1>
        <p>You don't have permission to access this page</p>
      </div>
    );
  }
  
  // Rest of component
};
```

**Same for CompanyDashboard:**
```typescript
if (!user?.is_company_admin || !user?.company_id) {
  return <div>Access Denied</div>;
}
```

**Test:**
- [ ] Regular user can't access admin dashboard
- [ ] Non-company-admin can't access company dashboard
- [ ] Admin can access admin dashboard
- [ ] Company admin can access company dashboard

---

## FINAL VALIDATION

### Checklist - Backend API
```
[ ] Login with email works
[ ] Login with phone works
[ ] Dashboard stats returns 403 for non-admin
[ ] Dashboard stats returns data for admin
[ ] Invalid seat_number rejected with 400
[ ] Valid booking accepted
[ ] Models have single source of truth
[ ] No import/migration errors
[ ] All endpoints return correct data format
```

### Checklist - Web Frontend
```
[ ] Email login works
[ ] Browse trips works
[ ] Select seat works
[ ] Booking created on ConfirmationPage (not PaymentPage)
[ ] MyTickets shows Cancel + Reopen buttons
[ ] AdminDashboard requires is_staff
[ ] CompanyDashboard requires is_company_admin
[ ] No console errors on critical flows
[ ] Token securely stored (not localStorage)
```

### Checklist - Mobile
```
[ ] Email + Phone login works
[ ] Browse trips works
[ ] Book trip with passenger name/phone populated
[ ] Same endpoints as web
[ ] No field mapping errors
[ ] Seat status not corrupted
```

### End-to-End Flows
```
[ ] Email Registration → Login → Browse → Book → Confirm → Pay → Ticket
[ ] Phone Login → Browse → Book → MyTickets → Reopen → Rebook
[ ] Admin Login → AdminDashboard → View Stats
[ ] Company Admin → CompanyDashboard → View Bookings
```

---

## DEPLOYMENT CHECKLIST

Before going to production:
```
[ ] All tests passing
[ ] No console errors
[ ] All critical flows validated
[ ] Security fixes in place
[ ] Phone login working
[ ] Dashboard permissions enforced
[ ] Bookings created correctly
[ ] Payment processing tested
[ ] Models consolidated
[ ] Documentation updated
```

---

**Generated:** 2026-04-20  
**Status:** READY FOR IMPLEMENTATION
