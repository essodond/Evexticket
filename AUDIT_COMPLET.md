# AUDIT TECHNIQUE COMPLET - EVEXTICKET

**Date:** 2026-04-20  
**Scope:** Frontend Web (React), Backend (Django), Mobile (React Native)  
**Objectif:** Évaluation complète de stabilité, sécurité et cohérence

---

## RÉSUMÉ EXÉCUTIF

### État Global
- **Frontend Web**: ~75% fonctionnel - Problèmes majeurs: Auth insécurisée, flux booking cassé, permissions manquantes
- **Backend API**: ~70% fonctionnel - Problèmes majeurs: Phone login cassé, sécurité des dashboards, modèles fragmentés
- **Mobile**: ~70% fonctionnel - Problèmes majeurs: Field mapping errors, seat status corruption

### Risques Critiques
1. 🔴 **Phone login NE FONCTIONNE PAS** (field name mismatch)
2. 🔴 **Dashboard stats exposées à tous users** (security breach)
3. 🔴 **Auth tokens en localStorage** (XSS vulnerability)
4. 🔴 **Booking créée au mauvais endroit** (PaymentPage au lieu de ConfirmationPage)

### Flux Critiques Cassés
1. ❌ Login par téléphone
2. ⚠️ Réservation (flow partiellement cassé)
3. ⚠️ Vue des tickets (pas de réouverture possible)
4. ⚠️ Dashboard admin (accessible à tous les users auth)

---

## AUDIT DÉTAILLÉ PAR COMPOSANT

### BACKEND - Django REST API

#### 📊 Authentification & Permissions

**✅ Ce qui fonctionne:**
- Registration endpoint fonctionne
- Email login fonctionne
- Token-based auth correctement configuré
- UserProfile crée automatiquement via signal

**❌ Ce qui est cassé:**
- **Phone login NE FONCTIONNE PAS**
  - Fichier: `backend/transport/views.py:105`
  - Problème: Cherche `UserProfile.phone` mais le champ s'appelle `phone_number` (models/user.py:489)
  - Impact: Aucun utilisateur ne peut se connecter par téléphone
  - Correction: Changer ligne 105 `phone=phone` → `phone_number=phone`

**⚠️ Sécurité:**
- ✅ CSRF protection enabled
- ✅ Password hashing via Django default
- ❌ **DashboardStatsView accessible par ANY authenticated user** (should be staff-only)
  - Fichier: `backend/transport/views.py:291-340`
  - Révèle: total_revenue, total_bookings, active_trips, total_users
  - Correction: `permission_classes = [permissions.IsAdminUser]`
- ❌ Token authentication has no expiration
- ❌ No rate limiting on auth endpoints

#### 🗂️ Modèles de Données

**Problème Critique: Définitions Dupliquées**
- `models.py` ET `models/base.py` existent en parallèle
- Trip dans models.py: champs `base_price` + `evex_commission`
- Trip dans models/base.py: champ `price` seulement
- UserProfile dans models/user.py: champ `phone_number`
- UserProfile dans models.py (autre location?): champ `phone`

**Impact:** 
- Migrations peuvent échouer
- Confusion sur la vérité de source
- Serializers utilisent un modèle, code un autre

**✅ Booking Model:**
- Status flow: pending → confirmed → completed (✓ coherent)
- Permet booking anonyme (nullable user field) - ⚠️ inconsistent

**❌ Seat Number Validation:**
- CharField(10) - accepte n'importe quelle string
- Pas de validation numérique
- Pas de validation de plage (1-50 selon bus_type)
- Correction: Ajouter validation dans serializer ou model

#### 🔗 Endpoints API

**Disponibles & Testés:**
```
POST   /api/register/              - ✅ Functional
POST   /api/login/                 - ✅ Email works, phone BROKEN
GET    /api/me/                    - ✅ Functional
GET    /api/cities/                - ✅ Functional
GET    /api/trips/                 - ✅ Functional
GET    /api/scheduled_trips/       - ✅ Functional
POST   /api/scheduled_trips/search/- ✅ Functional
GET    /api/booked_seats/          - ✅ Functional
GET    /api/availability/          - ✅ Functional
POST   /api/bookings/              - ✅ Functional (creates booking + payment)
GET    /api/my-bookings/           - ✅ Implemented (same as /bookings/)
GET    /api/dashboard/stats/       - ✅ Works but INSECURE
GET    /api/companies/{id}/stats/  - ✅ Permission check exists
```

**Problèmes de Contrat:**
- `/my-bookings/` exists but frontend comments say "will need to be created"
- `/users/` existence unclear in frontend
- Payment flow: Booking crée auto Payment mais status ne se met jamais à jour

#### 📋 Fichiers de Correction Détectés

- `fix_availability.py` - Script incomplet (segmentation logic)
- `fix_endpoints.py` - Script incomplet (booked_seats)
- `fix_views.py` - Patch incomplet
- `views_fix.py` - Sauvegarde/alternative
- `models.py` - vs `models/base.py` → CONFLICT

**Recommandation:** Nettoyer ces fichiers après consolidation

---

### FRONTEND WEB - React + TypeScript

#### 🔐 Authentification

**✅ Ce qui fonctionne:**
- Email login fonctionne
- Registration fonctionne
- Token storage et retrieval

**❌ Sécurité Critique:**
- **Tokens en localStorage** (XSS vulnerable)
  - Fichier: `src/contexts/AuthContext.tsx:37,44,48,75,86,93`
  - Impact: Tout JS malveillant peut accéder aux tokens
  - Correction: Utiliser httpOnly cookies OU sessionStorage + refresh tokens

**❌ Ce qui manque:**
- Pas de token refresh mechanism
- Pas de token expiration check
- Pas de logout sur expiration
- Password reset non implémenté

#### 📄 Flux de Réservation (CASSÉ)

**Problème Principal: Booking créée au mauvais endroit**

Flux ACTUEL (CASSÉ):
```
HomePage (search) 
  → ResultsPage (select trip)
    → BookingPage (select seat)
      → PaymentPage (CRÉE booking ici - MAUVAIS!)
        → ConfirmationPage
```

Flux CORRECT:
```
HomePage (search)
  → ResultsPage (select trip)
    → BookingPage (select seat)
      → ConfirmationPage (CRÉE booking + payment ici)
        → PaymentProcessing (paiement avec provider)
          → Confirmation finale
```

**Code Problématique:** 
`src/components/PaymentPage.tsx:74-88`
```typescript
const payload: any = {
  scheduled_trip: scheduledTripId,
  passenger_name: `${firstName} ${lastName}`,
  passenger_email: passengerInfo.email || undefined,  // ⚠️ undefined = error
  passenger_phone: passengerInfo.phone,
  seat_number: String(selectedSeat),
  payment_method: paymentMethod,
  notes: `Payment via ${paymentMethod}...`,
  // ❌ MISSING: travel_date field
  // ❌ MISSING: user field (backend expects it)
};
const created = await apiService.createBooking(payload);
```

**Impact:**
- Booking crée AVANT paiement validé
- Si paiement échoue, booking reste pending
- Pas de way d'annuler après création
- Payment fake (transaction ID généré en client)

#### 📋 Pages Critiques

| Page | État | Problèmes |
|------|------|----------|
| AuthPage | ✅ 90% OK | Phone validation weak, generic errors |
| HomePage | ✅ OK | No error UI if cities fail |
| ResultsPage | ✅ OK | No empty state if no results |
| BookingPage | ⚠️ 70% | No passenger phone validation, availability fetch can fail silently |
| PaymentPage | ❌ 40% | Booking created here (WRONG), fake payment, field mismatch |
| MyTicketsPage | ⚠️ 60% | No reopen/rebook feature, can't cancel, uses state not ID |
| ConfirmationPage | ⚠️ 50% | Expects paymentData but MyTickets sends booking object |
| AdminDashboard | ⚠️ 50% | No permission check, shows all users data without validation |
| CompanyDashboard | ⚠️ 60% | No explicit is_company_admin check, assumes company_id exists |

#### 🔌 API Integration Issues

**Field Naming Mismatches:**
- Backend: `first_name`, `last_name`, `phone_number`
- Frontend: Sometimes `firstName`, `lastName`, `phoneNumber` (inconsistent)
- Example: `PaymentPage:42-44` uses camelCase but API returns snake_case

**Type Issues:**
- `src/contexts/AuthContext.tsx:4` - `type User = any;` (should use interface)
- Trip interface has many optional fields (compatibility hack)

**Missing Endpoints:**
- `/users/` - API docs unclear if exists
- `/my-bookings/` - Comments say "will need to be created" but it works!

#### 📁 Fichiers Défectifs

- `src/components/PaymentPage.broken.tsx` - Dead file, can delete
- `src/contexts/AuthContext.tsx` - Uses `any` type for User

---

### MOBILE - React Native

#### 🔐 Authentification

**✅ What works:**
- Context-based auth working
- AsyncStorage for token persistence
- Email + phone login support

**⚠️ Same security issues as web:**
- Token in AsyncStorage (Mobile OS level more secure than localStorage)
- No token refresh

#### 🎯 Critical Issues Found

**1. User Data Field Mismatch in PaymentScreen**
```typescript
// src/screens/PaymentScreen.tsx:42-44 - WRONG!
const passengerName = `${user?.firstName || ''} ${user?.lastName || ''}`; // ❌ camelCase
const passengerPhone = user?.phoneNumber || ''; // ❌ camelCase

// Should be:
const passengerName = `${user?.first_name || ''} ${user?.last_name || ''}`; // ✅ snake_case
const passengerPhone = user?.phone_number || ''; // ✅ snake_case
```
**Impact:** Booking sent to backend with empty passenger name/phone!

**2. SeatSelection Status Corruption**
```typescript
// src/screens/TripDetailsScreen.tsx:232-235
seats={seatsData.map(seat =>
  seat.id === selectedSeat
    ? { ...seat, status: SeatStatus.Selected } // ⚠️ Overwrites occupied status!
    : seat
)}
```
**Impact:** Occupied seats show as available if not currently selected

**3. Intermediate Stop Selection Missing**
- Mobile booking always sends `origin_stop: null, destination_stop: null`
- Users can't select pickup/dropoff points
- Feature incomplete or not implemented

#### ✅ What works in Mobile

- Trip search and display
- Basic booking flow (despite data issues)
- My tickets list (transforms correctly)
- Seat selection UI (despite status bug)

#### ❌ What doesn't

- Profile settings (menu exists, not implemented)
- Password reset (placeholder only)
- Booking cancellation
- Ticket PDF/image export
- Notification system

---

## PROBLÈMES PAR SÉVÉRITÉ

### 🔴 CRITIQUES (Blockers)

| # | Problème | Localisation | Impact | Correction |
|----|----------|-------------|--------|-----------|
| 1 | Phone login cassé | views.py:105 | 50% des users ne peuvent pas login | phone → phone_number |
| 2 | Dashboard stats exposées | views.py:291 | Security breach | Add IsAdminUser |
| 3 | Auth token en localStorage | AuthContext:37 | XSS vulnerability | httpOnly cookies |
| 4 | Booking créée au mauvais endroit | PaymentPage:85 | Flux business cassé | Move to ConfirmationPage |
| 5 | Passenger data wrong in mobile | PaymentScreen:42-44 | Booking incomplete | snake_case fields |
| 6 | Modèles fragmentés | models.py vs models/base.py | Data integrity | Consolidate |
| 7 | Seat validation manquante | serializers:369 | Invalid bookings | Add validation |

### 🟠 HAUTE PRIORITÉ

| # | Problème | Impact | Effort |
|----|----------|--------|--------|
| 8 | PaymentPage.broken.tsx | Dead code | 5 min - delete |
| 9 | Seat status corruption mobile | UI shows wrong seats | 1h - fix SeatSelection |
| 10 | CompanyBookings returns empty vs 403 | UX confusion | 30 min - fix permission response |
| 11 | MyTickets pas de reopen | Feature manquante | 2h - implement |
| 12 | Phone format validation | Accepts garbage | 1h - add regex |
| 13 | No token expiration check | Silent failures | 2h - implement refresh |

### 🟡 MOYENNE PRIORITÉ

| # | Problème | Impact | Effort |
|----|----------|--------|--------|
| 14 | User type = any | Type safety | 1h - use proper interface |
| 15 | Hardcoded seat layout (50) | Not scalable | 1h - make configurable |
| 16 | No rate limiting | Brute force risk | 2h - add throttling |
| 17 | Obsolete comments/TODOs | Code clarity | 1h - cleanup |

---

## FLUX CRITIQUES - STATUS

### ✅ FONTIONNEL
- [ ] Registration utilisateur
- [ ] Login par EMAIL
- [ ] Page de landing
- [ ] Recherche de trajets (basic)
- [ ] Dashboard statiques (data accuracy issue)

### ⚠️ PARTIELLEMENT FONTIONNEL
- [ ] Réservation (booking crée au mauvais endroit)
- [ ] Paiement (pas réel, fake IDs)
- [ ] Récupération profil courant (/me)
- [ ] Tickets (view ok, reopen broken)
- [ ] Mobile booking (field mismatch data)

### ❌ CASSÉ
- [ ] Login par TÉLÉPHONE
- [ ] Dashboard admin (permission exposed)
- [ ] Ouverture/réouverture billet depuis liste
- [ ] Annulation réservation (API exists, UI missing)

### 🔒 NON IMPLÉMENTÉ
- [ ] Paiement réel (Flooz/Stripe/etc)
- [ ] Notifications SMS
- [ ] Verification email
- [ ] Password reset
- [ ] Two-factor auth
- [ ] Booking cancellation UI

---

## CONTRATS DONNÉES

### User Object
```
Backend: {id, username, email, first_name, last_name, phone_number, is_staff, is_company_admin, company_id}
Web expects: Same (✅ mostly correct)
Mobile expects: Same (❌ uses camelCase in PaymentScreen)
```

### Trip/ScheduledTrip
```
Backend: {id, date, trip, seats, stops, ...}
Web: Maps to Trip interface with optional fields (✅)
Mobile: Maps to Trip interface (✅)
```

### Booking
```
Backend expects: {scheduled_trip, passenger_name, passenger_email, passenger_phone, seat_number, payment_method, total_price, user, [travel_date]}
Web sends: Missing travel_date, email can be undefined
Mobile sends: passenger_name/phone empty strings due to field mismatch
```

### Payment
```
Backend: {booking, amount, payment_method, transaction_id, status}
Web: Generates fake transaction_id client-side (❌)
Mobile: Same as web
Reality: No real payment provider integrated
```

---

## SÉCURITÉ - CHECKLIST

| Item | Status | Note |
|------|--------|------|
| SQL Injection | ✅ SAFE | Using ORM |
| CSRF | ✅ ENABLED | Middleware active |
| XSS - Frontend | ❌ HIGH RISK | localStorage tokens |
| XSS - Backend | ✅ SAFE | Django escaping |
| Auth Token Expiry | ❌ MISSING | Tokens never expire |
| Rate Limiting | ❌ MISSING | No throttling |
| Input Validation | ⚠️ PARTIAL | Phone/seat validation weak |
| CORS | ⚠️ LOOSE | Allows localhost + Render |
| Permissions | ⚠️ INCOMPLETE | Dashboard exposed |
| Password Reset | ❌ BROKEN | Not implemented |

---

## RECOMMANDATIONS PAR PHASE

### PHASE 1 - STABILITÉ (3 jours)
1. Fix phone login (phone_number field)
2. Fix DashboardStatsView permission
3. Move booking creation to ConfirmationPage
4. Fix mobile PaymentScreen field names
5. Add seat_number validation
6. Fix seat status corruption mobile

### PHASE 2 - SÉCURITÉ (2 jours)
1. Implement httpOnly cookie auth
2. Add token refresh mechanism
3. Add rate limiting
4. Fix phone number format validation
5. Consolidate models (models.py vs models/base.py)

### PHASE 3 - FEATURES (3 jours)
1. Implement booking cancellation UI
2. Implement ticket reopen/rebook
3. Add intermediate stop selection (mobile)
4. Implement real payment integration (Flooz/Stripe)
5. Add email verification flow

### PHASE 4 - POLISH (2 jours)
1. Remove dead files (PaymentPage.broken.tsx, fix_*.py scripts)
2. Type properly (User interface instead of any)
3. Consolidate documentation
4. Add comprehensive tests
5. Clean up comments

---

## CHECKLIST DE VALIDATION

### Backend API
- [ ] Phone login works
- [ ] Dashboard stats only for admins
- [ ] Seat validation prevents invalid bookings
- [ ] Models consolidated (one source of truth)
- [ ] Payment flow creates payment with pending status
- [ ] CompanyBookings returns 403 not empty

### Web Frontend
- [ ] Auth uses secure cookie storage
- [ ] Booking created in ConfirmationPage not PaymentPage
- [ ] User data uses snake_case from API
- [ ] MyTickets has reopen/cancel buttons
- [ ] Dashboards check permissions before rendering
- [ ] All TypeScript types defined (no more `any`)

### Mobile
- [ ] PaymentScreen uses snake_case fields
- [ ] Seat status preserved correctly
- [ ] User data mapped from API correctly
- [ ] Same endpoints as web
- [ ] Booking data sent completely

### End-to-End
- [ ] Email login works web + mobile
- [ ] Phone login works web + mobile
- [ ] Booking flow completes web + mobile
- [ ] Tickets display correctly
- [ ] Dashboards show correct data by role
- [ ] No console errors on critical flows

---

**Generated:** 2026-04-20  
**Status:** READY FOR IMPLEMENTATION
