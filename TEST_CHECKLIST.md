# ✅ Test de la correction - Sièges et réservations

## Checklist de test

### 1. Test Backend - Vérifier que get_seats() fonctionne

```bash
# Dans le Django shell
python manage.py shell
```

```python
from transport.models import ScheduledTrip, Booking
from transport.serializers import ScheduledTripSerializer

# Récupérer un voyage programmé
st = ScheduledTrip.objects.first()

# Sérialiser et vérifier les sièges
serializer = ScheduledTripSerializer(st)
data = serializer.data

# Afficher les infos
print(f"✅ ID: {data['id']}")
print(f"✅ Date: {data['date']}")
print(f"✅ Places disponibles: {data['available_seats']}")
print(f"✅ Total sièges: {len(data['seats'])}")

# Vérifier les sièges réservés
occupied = [s for s in data['seats'] if s['status'] == 'occupied']
available = [s for s in data['seats'] if s['status'] == 'available']

print(f"\n🔴 Sièges occupés ({len(occupied)}): {[s['number'] for s in occupied]}")
print(f"🟢 Sièges disponibles ({len(available)}): Premiers 10 = {[s['number'] for s in available[:10]]}")

# Vérifier les réservations confirmées en base
confirmed_bookings = Booking.objects.filter(scheduled_trip=st, status='confirmed')
print(f"\n📋 Réservations confirmées en base: {confirmed_bookings.count()}")
for booking in confirmed_bookings:
    print(f"   - Siège {booking.seat_number}: {booking.passenger_name}")
```

### 2. Test Frontend - Vérifier l'affichage des sièges

1. **Lancer l'app mobile**
   ```bash
   cd react-native-reference
   npm start
   # Ou
   expo start
   ```

2. **Naviguer vers un trajet**
   - Aller à l'écran "Accueil" → Sélectionner un trajet
   - Cliquer sur "Voir les détails"

3. **Vérifier le rendu**
   - ✅ Les sièges s'affichent avec les bonnes couleurs
   - ✅ Les sièges GRIS (occupés) ne sont pas cliquables
   - ✅ Les sièges BLEUS (disponibles) sont cliquables
   - ✅ Quand on clique, le siège devient VERT

### 3. Test Complet - Réserver et vérifier

1. **Créer une réservation**
   - Sélectionner un siège BLEU (disponible)
   - Cliquer "Réserver maintenant"
   - Remplir les infos et payer
   - ✅ Réservation confirmée immédiatement

2. **Vérifier le siège est maintenant gris**
   - Retourner au même trajet
   - ✅ Le siège réservé s'affiche maintenant en GRIS

3. **Vérifier dans Mes réservations**
   - Aller à "Mes réservations"
   - ✅ La nouvelle réservation y apparaît

4. **Vérifier la base de données**
   ```python
   from transport.models import Booking
   
   # Vérifier le statut
   booking = Booking.objects.latest('booking_date')
   print(f"✅ Statut: {booking.status}")  # Doit être 'confirmed'
   print(f"✅ Siège: {booking.seat_number}")
   print(f"✅ Passager: {booking.passenger_name}")
   ```

## 🎯 Résultats attendus

| Aspect | Avant | Après |
|--------|-------|-------|
| **Affichage des sièges** | Tous BLEUS | BLEUS (libres) + GRIS (réservés) |
| **Statut réservation** | pending (en attente) | confirmed (immédiate) |
| **Erreur siège réservé** | ❌ Oui | ✅ Non |
| **Siège dans Mes réservations** | Après confirmation | Immédiatement |
| **Siège grisé après réservation** | Non | ✅ Oui |

## 🚀 Prochaines étapes (quand vous ajouterez le vrai paiement)

1. Modifier le statut par défaut: `pending` au lieu de `confirmed`
2. Créer un webhook pour écouter les notifications de paiement
3. Mettre à jour le statut à `confirmed` quand le paiement est complété
4. Les sièges s'afficheront alors en gris uniquement après paiement


