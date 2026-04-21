# REMAINING FIXES - DAYS 2-5 IMPLEMENTATION PLAN

This document outlines all remaining fixes to be applied after Phase 1.

## Day 2: Auth Security & Phone Validation (4-5h)

### ✅ APPLIED
- [x] AuthContext: localStorage → sessionStorage (XSS mitigation)
- [ ] Add phone format validation
- [ ] Add rate limiting to auth endpoints
- [ ] Implement token expiration check

### Phone Validation Fix
**Location:** backend/transport/serializers.py - RegisterSerializer class

**Fix:**
```python
def validate_phone(self, value):
    if not value:
        return value
    
    # Remove common formatting characters
    cleaned = ''.join(filter(lambda x: x.isdigit() or x == '+', str(value)))
    
    # Accept Togolese format: +228XXXXXXXX or 228XXXXXXXX (8 digits after country code)
    if cleaned.startswith('+228'):
        if len(cleaned) != 13:  # +228XXXXXXXX
            raise serializers.ValidationError("Phone number must be 11 digits after +228 country code")
    elif cleaned.startswith('228'):
        if len(cleaned) != 11:
            raise serializers.ValidationError("Phone number must be 11 digits with 228 country code")
    elif cleaned.startswith('+'):
        raise serializers.ValidationError("Phone number must start with +228 or 228")
    elif len(cleaned) == 8:
        # Accept 8-digit format (assume 228)
        cleaned = '228' + cleaned
    else:
        raise serializers.ValidationError("Invalid phone number format. Use +228XXXXXXXX or similar")
    
    return value
```

## Day 3: Booking Flow & Models Consolidation (5h)

### Booking Flow Refactor
**From:** PaymentPage creates booking  
**To:** ConfirmationPage creates booking

**Files to modify:**
1. `src/components/PaymentPage.tsx` - Remove lines 74-100 (booking creation)
2. `src/components/ConfirmationPage.tsx` - Add booking creation logic
3. `src/App.tsx` - Adjust state passing

**Steps:**
1. In PaymentPage: Keep payment processing, remove booking.create()
2. In ConfirmationPage: Add booking.create() before showing confirmation
3. Update App.tsx handlers to pass correct data between screens

### Models Consolidation
**Action:** Delete models.py (orphaned old version), use models/ structure as single source of truth

**Files to consolidate:**
- Delete: `backend/transport/models.py`
- Keep: `backend/transport/models/__init__.py`, `models/base.py`, `models/user.py`
- Update: Any imports still referencing old models.py

**Verify:** No migrations needed (models already correct in models/)

## Day 4-5: Features & Cleanup (8h)

### Ticket Reopen/Cancel Feature
**File:** `src/components/MyTicketsPage.tsx`

**Add methods:**
```typescript
const handleCancel = async (bookingId: number) => {
  try {
    await apiService.cancelBooking(bookingId);
    // Refresh tickets
    setBookings(bookings.map(b => 
      b.id === bookingId ? {...b, status: 'cancelled'} : b
    ));
  } catch (error) {
    console.error('Cancel failed:', error);
  }
};

const handleReopen = (bookingId: number) => {
  // Redirect to search to rebook
  navigate('/');
  // Optionally pre-fill search with cancelled booking info
};
```

**Add UI buttons:**
- For active bookings: [Cancel] button
- For cancelled/past: [Rebook] button

### Admin Dashboard Permission Check
**Files:**
- `src/components/AdminDashboard.tsx` - Add is_staff check
- `src/components/CompanyDashboard.tsx` - Add is_company_admin check

**Pattern:**
```typescript
if (!user?.is_staff) {
  return <div>Access Denied - Admin only</div>;
}
```

### Cleanup Dead Code
**Delete:**
- `src/components/PaymentPage.broken.tsx` - Dead file
- `backend/fix_availability.py` - Incomplete script
- `backend/fix_endpoints.py` - Incomplete script
- `backend/fix_views.py` - Incomplete script
- `backend/update_views.py` - Incomplete script
- `backend/update_search_view.py` - Incomplete script
- `backend/views_fix.py` - Backup file

**Keep:** Everything else (even if not actively used)

### Type Safety Improvements
**File:** `src/contexts/AuthContext.tsx` line 4

**Change:**
```typescript
// BEFORE
type User = any;

// AFTER  
interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  is_staff: boolean;
  is_company_admin: boolean;
  company_id?: number;
  is_active: boolean;
  date_joined: string;
}
```

### Final Testing Suite
**Create:** `backend/test_critical_flows.py`
- Test: Email login + logout
- Test: Phone login + logout
- Test: Booking creation
- Test: Payment processing  
- Test: Admin dashboard access
- Test: Company dashboard access

---

## Summary of All Fixes by Category

### Security (Day 2)
- [x] Auth token: localStorage → sessionStorage ✅
- [ ] Phone format validation
- [ ] Rate limiting on /login endpoint
- [ ] CSRF token verification

### Data Integrity (Day 3)
- [x] Seat number validation ✅
- [ ] Booking model consolidation
- [ ] Payment contract alignment
- [ ] Remove stale models.py

### UX/Permissions (Day 3-4)
- [x] Dashboard permission (admin only) ✅
- [x] CompanyBookings 403 response ✅
- [ ] AdminDashboard permission check
- [ ] CompanyDashboard permission check
- [ ] Clear error messages

### Features (Day 4-5)
- [ ] Ticket reopen functionality
- [ ] Ticket cancel functionality
- [ ] Admin controls for bookings

### Cleanup (Day 5)
- [ ] Delete dead code files
- [ ] Type safety improvements
- [ ] Remove debug logs
- [ ] Documentation updates

---

## Effort Estimation

| Task | Effort | Status |
|------|--------|--------|
| Auth security | 2h | 50% done |
| Phone validation | 1h | TODO |
| Booking refactor | 3h | TODO |
| Models consolidation | 2h | TODO |
| Ticket features | 2h | TODO |
| Dashboard checks | 1h | TODO |
| Testing | 3h | TODO |
| Cleanup | 1h | TODO |
| **TOTAL** | **15h** | **~3% done** |

---

## Status & Next Actions

**Completed:** 5 Phase 1 fixes + auth token migration  
**Remaining:** 15 hours over 3-4 days  
**On track:** Yes ✓  
**Confidence:** 95%

**Next immediate action:** Add phone format validation in serializers
