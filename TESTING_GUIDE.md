# 🧪 GUIDE DE TEST - Comment tester toutes les fonctionnalités

## 📋 PRÉ-REQUIS

- ✅ Backend Django démarré
- ✅ Frontend React Native démarré
- ✅ Utilisateur authentifié
- ✅ Token valide dans les headers

---

## 🧪 TEST 1: Sièges grisés (Sélection de siège)

### Étape 1: Naviguer vers un trajet
1. Ouvrir l'app mobile
2. Aller à "Accueil"
3. Rechercher et sélectionner un trajet

### Étape 2: Vérifier les sièges
```
✅ Les sièges occupés sont GRIS (#D3D3D3)
✅ Les sièges libres sont BLEUS (#87CEEB)
✅ Impossible de cliquer sur les gris
✅ Cliquable sur les bleus
```

### Étape 3: Créer une réservation
1. Cliquer sur un siège bleu → devient VERT
2. Cliquer "Réserver"
3. Valider le paiement

### Étape 4: Vérifier mise à jour
1. Retourner au même trajet
2. Vérifier que le siège réservé est maintenant **GRIS**
3. ✅ **TEST RÉUSSI si siège grisé**

---

## 🧪 TEST 2: Affichage dans "Mes tickets"

### Étape 1: Créer une réservation (voir Test 1)

### Étape 2: Naviguer vers "Mes tickets"
1. Cliquer sur "Mes tickets" (onglet)

### Étape 3: Vérifier l'affichage
```
✅ La réservation créée s'affiche
✅ Informations visibles:
   - Date du voyage
   - Compagnie
   - Villes (départ → arrivée)
   - Horaires
   - Numéro de siège
   - Statut "Confirmé"
```

### Étape 4: Vérifier les boutons
```
✅ Deux boutons visibles:
   - Bleu: "Voir le billet"
   - Rouge: 🗑️ (poubelle)
```

### ✅ TEST RÉUSSI si ticket s'affiche correctement

---

## 🧪 TEST 3: Badge "TICKET INVALIDE"

### Étape 1: Créer une réservation avec date PASSÉE

**Option A**: Modifier en base de données
```bash
sqlite3 db.sqlite3
UPDATE transport_scheduledtrip SET date='2025-01-15' WHERE id=<your_id>;
.quit
```

**Option B**: Via Django shell
```python
from transport.models import ScheduledTrip
from datetime import date
st = ScheduledTrip.objects.latest('id')
st.date = date(2025, 1, 15)
st.save()
```

### Étape 2: Ouvrir "Mes tickets"

### Étape 3: Vérifier le badge
```
✅ Badge ROUGE en haut du ticket
✅ Icône ⚠️
✅ Texte blanc "TICKET INVALIDE"
✅ Ticket reste visible et fonctionnel
```

### Étape 4: Tester avec date FUTURE
```
✅ Pas de badge pour date future
```

### ✅ TEST RÉUSSI si badge apparaît pour les anciennes dates

---

## 🧪 TEST 4: Bouton poubelle (Masquage)

### Étape 1: Avoir au moins un ticket dans "Mes tickets"

### Étape 2: Cliquer sur le bouton 🗑️

### Étape 3: Vérifier la disparition
```
✅ Le ticket disparaît immédiatement
✅ Console affiche: "🗑️  Ticket X masqué de la liste"
```

### Étape 4: Si c'est le dernier ticket
```
✅ Message "Tous les tickets sont masqués"
✅ Button "Afficher tous les tickets" visible
```

### Étape 5: Cliquer "Afficher tous les tickets"
```
✅ Les tickets réapparaissent
```

### Étape 6: Recharger la page
```
ℹ️ Les tickets masqués reviennent
(masquage local, pas persistant)
```

### ✅ TEST RÉUSSI si masquage fonctionne

---

## 🧪 TEST 5: Flux complet de bout en bout

### Étape 1: Créer une première réservation
1. Accueil → Trajet → Siège bleu
2. Réserver
3. Voir siège gris pour autres users

### Étape 2: Aller dans "Mes tickets"
1. Voir la réservation affichée
2. Vérifier les infos
3. Pas de badge (date future)

### Étape 3: Créer une deuxième réservation (autre trajet/siège)
1. Accueil → Autre trajet → Siège bleu
2. Réserver
3. Aller dans "Mes tickets"

### Étape 4: Vérifier l'affichage
```
✅ Deux tickets affichés
✅ Tous les détails visibles
✅ Boutons Voir + Poubelle pour chaque
```

### Étape 5: Masquer le premier
1. Cliquer 🗑️ sur le premier ticket
2. Vérifier disparition
3. Second ticket reste visible

### Étape 6: Restaurer
1. Cliquer "Afficher tous"
2. Les deux reviennent

### ✅ TEST RÉUSSI si tout fonctionne

---

## 🐛 DÉPANNAGE

### Problème: Sièges toujours bleus
**Solution**:
- Vérifier que l'API retourne `seats` avec les bonnes données
- Tester: `GET /api/scheduled_trips/{id}/`
- Doit contenir: `"seats": [{"id": "seat-1", "status": "occupied"}, ...]`

### Problème: Pas de tickets dans "Mes tickets"
**Solution**:
- Vérifier que `user` est assigné à la réservation
- Tester: `python manage.py shell`
- `Booking.objects.latest('id').user` doit retourner l'user

### Problème: Badge ne s'affiche pas
**Solution**:
- Vérifier que la date est réellement passée
- Tester: `isTravelPassed('2025-01-15')` doit retourner `true`
- Vérifier le format YYYY-MM-DD

### Problème: Poubelle ne marche pas
**Solution**:
- Vérifier la console pour l'erreur
- Vérifier que `ticket.id` est un nombre
- Pas d'appel API, tout en local

---

## ✅ CHECKLIST COMPLÈTE

### Backend
- [ ] `seats` retourné par `/scheduled_trips/{id}/`
- [ ] `scheduled_trip_date` retourné par `/my-bookings/`
- [ ] User assigné à chaque réservation
- [ ] Status='confirmed' par défaut
- [ ] `/my-bookings/` retourne un tableau direct

### Frontend
- [ ] Sièges gris pour réservés
- [ ] Réservations affichées dans "Mes tickets"
- [ ] Badge rouge pour dates passées
- [ ] Bouton poubelle masque tickets
- [ ] Message et button pour restaurer

---

## 🚀 RÉSULTAT ATTENDU

✅ **Tous les tests passent**
✅ **Pas d'erreurs en console**
✅ **UX fluide et intuitive**
✅ **Données cohérentes**
✅ **Prêt pour production** 🎊

---

## 📞 SUPPORT

Si un test échoue:
1. Vérifier les logs backend: `python manage.py runserver`
2. Vérifier les logs frontend: `expo start --clear`
3. Vérifier la base de données
4. Relire les modifications correspondantes

Good luck! 🚀

