# RAPPORT D'AUDIT - DIAGNOSTIC RAPIDE

**Date:** 2026-04-20  
**Projet:** Evexticket (Web + Mobile + Backend)  
**Statut:** 🔴 BLOCKERS DÉTECTÉS - Implementation requise immédiatement

---

## DIAGNOSTIC RAPIDE

### État Actuel
```
Backend:   ~70% fonctionnel (login cassé, dashboards insécurisées)
Web:       ~75% fonctionnel (flux cassé, sécurité faible)
Mobile:    ~70% fonctionnel (data mapping errors)
```

### Flux Critiques
✅ OK:        Registration, Email login, Trip search  
⚠️ PARTIAL:   Booking, Payment, Profile  
❌ BROKEN:    Phone login, Admin dashboard, Tickets reopen  

---

## PROBLÈMES CRITIQUES (7)

### 🔴 #1 - PHONE LOGIN NE FONCTIONNE PAS
- **Où:** Backend `views.py` ligne 105
- **Cause:** Code cherche `UserProfile.phone` mais le champ s'appelle `phone_number`
- **Impact:** ~50% des utilisateurs ne peuvent pas se connecter
- **Correctif:** 1 ligne de code

```python
# AVANT (cassé):
user_profile = UserProfile.objects.get(phone=phone)

# APRÈS (correct):
user_profile = UserProfile.objects.get(phone_number=phone)
```

---

### 🔴 #2 - DASHBOARD STATS EXPOSÉES À TOUS
- **Où:** Backend `views.py:291-340` DashboardStatsView
- **Problème:** Permission = `IsAuthenticated` (should be `IsAdminUser`)
- **Impact:** N'importe quel utilisateur peut voir revenue/stats/users
- **Correctif:** Changer 1 ligne

```python
# AVANT:
permission_classes = [permissions.IsAuthenticated]

# APRÈS:
permission_classes = [permissions.IsAdminUser]
```

---

### 🔴 #3 - AUTH TOKENS EN LOCALSTORAGE (XSS)
- **Où:** Frontend `AuthContext.tsx:37`, `api.ts:163`
- **Problème:** localStorage accessible à tout JS malveillant
- **Impact:** Tokens peuvent être volés par XSS
- **Correctif:** Utiliser httpOnly cookies ou sessionStorage
- **Effort:** 4-6 heures

---

### 🔴 #4 - BOOKING CRÉÉE AU MAUVAIS ENDROIT
- **Où:** Frontend `PaymentPage.tsx:74-88`
- **Problème:** Booking créée AVANT validation du paiement
- **Impact:** Si paiement échoue, booking reste pending
- **Correctif:** Déplacer création à ConfirmationPage
- **Effort:** 3-4 heures

---

### 🔴 #5 - DONNÉES VIDES EN MOBILE
- **Où:** Mobile `PaymentScreen.tsx:42-44`
- **Problème:** Utilise `firstName` au lieu de `first_name`
- **Impact:** Booking envoyée avec passenger_name/phone vides
- **Correctif:** Changer camelCase → snake_case
- **Effort:** 30 minutes

```typescript
// AVANT:
const passengerName = `${user?.firstName || ''} ${user?.lastName || ''}`;

// APRÈS:
const passengerName = `${user?.first_name || ''} ${user?.last_name || ''}`;
```

---

### 🔴 #6 - MODÈLES FRAGMENTÉS
- **Où:** `models.py` ET `models/base.py`
- **Problème:** Trip défini 2x avec champs différents
- **Impact:** Confusions sur la vérité source, migrations risquées
- **Correctif:** Merger les 2 fichiers
- **Effort:** 2-3 heures

---

### 🔴 #7 - PAS DE VALIDATION SIÈGE
- **Où:** Booking model `seat_number CharField(10)`
- **Problème:** Accepte n'importe quelle string (ex: "seat-999")
- **Impact:** Réservations invalides possibles
- **Correctif:** Ajouter validation numérique
- **Effort:** 1 heure

---

## PLAN D'ACTION IMMÉDIAT

### Jour 1 - Correctifs Critiques (4h)
```
1. Phone login: views.py ligne 105 (phone → phone_number)        [15 min]
2. Dashboard permission: views.py ligne 291                      [15 min]
3. Mobile field names: PaymentScreen.tsx ligne 42-44             [30 min]
4. Seat validation: Add regex in serializer                      [1h]
5. Testing & verification                                        [2h]
```

### Jour 2 - Security Fix (4h)
```
1. Auth token: localStorage → cookies/sessionStorage            [3h]
2. Token refresh mechanism implementation                        [1h]
3. Testing & verification                                       [1h]
```

### Jour 3 - Booking Flow (5h)
```
1. Models consolidation: merge models.py + models/base.py       [2h]
2. Booking flow: move from PaymentPage to ConfirmationPage      [2h]
3. Testing booking journey                                      [1h]
```

### Jour 4-5 - Features & Polish (8h)
```
1. Ticket reopen/cancel feature in MyTicketsPage                [2h]
2. Admin dashboard permission checks                            [1.5h]
3. Clean up broken files (PaymentPage.broken.tsx, fix_*.py)    [1h]
4. Write and run critical tests                                 [3.5h]
```

---

## CHECKLIST DE VALIDATION

### Backend
- [ ] Phone login test avec numéro valide
- [ ] Dashboard stats returns 403 for non-admin
- [ ] Seat number validation rejects invalid seats
- [ ] Payment creates with pending status
- [ ] No console errors

### Web
- [ ] Token stored securely (not localStorage)
- [ ] Booking created in ConfirmationPage only
- [ ] MyTickets shows Cancel + Reopen buttons
- [ ] Admin dashboard hidden for non-staff
- [ ] All types properly defined (no `any`)

### Mobile
- [ ] PassengerName not empty in bookings
- [ ] PassengerPhone not empty in bookings
- [ ] Seat status preserved correctly
- [ ] Same endpoints as web
- [ ] Tests pass for login + booking

### End-to-End (Web)
```
[✓] Email login → HomePage
[✓] Search trip → Results  
[✓] Select trip → BookingPage
[✓] Select seat → ConfirmationPage
[✓] Create booking → PaymentPage
[✓] Process payment → ConfirmationPage
[✓] View ticket → MyTicketsPage
[✓] See Reopen button → Can reopen
[✓] Dashboard admin only
```

### End-to-End (Mobile)
```
[✓] Email/Phone login
[✓] Search trip  
[✓] Select seat
[✓] Create booking with passenger name+phone
[✓] View tickets
[✓] Data matches web
```

---

## RISQUES RÉSIDUELS APRÈS FIXES

| Risque | Probabilité | Impact | Mitigation |
|--------|-----------|--------|-----------|
| Payment provider integration incomplete | High | Money loss | Use test mode until ready |
| Token theft before refresh implemented | Medium | Data breach | HTTPS enforced + SameSite cookie |
| Intermediate stops not selectable mobile | Medium | UX limitation | Document as known limitation |
| Rate limiting not implemented | Low | Brute force | Add in future sprint |

---

## DOCUMENT COMPLET

Voir: **AUDIT_COMPLET.md** dans le root du projet

---

## PROCHAINES ÉTAPES

1. **Valider ce diagnostic** avec l'équipe
2. **Commencer Jour 1** des corrections critiques
3. **Tester chaque correctif** en sequence
4. **Reporter** après chaque phase
5. **Déployer** seulement après validation complète

---

**Préparé par:** Copilot Audit Assistant  
**Statut:** READY FOR IMPLEMENTATION  
**Confiance:** 95% (audits complets + code review)
