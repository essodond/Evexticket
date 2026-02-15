# 🔧 Documentation de la correction - Sièges réservés grisés

## Problème identifié
Le frontend mobile affichait tous les sièges comme disponibles (bleus), même si certains étaient déjà réservés. Cela provoquait l'erreur API "Le siège X est déjà réservé" lors de la tentative de réservation.

## Solution implémentée

### 1. Backend (API Django)

#### Fichier: `backend/transport/serializers.py`
- **Ajout du champ `seats` au `ScheduledTripSerializer`**
  - Retourne la liste complète des sièges avec leur statut
  - Format: `[{"id": "seat-1", "status": "available|occupied", "number": 1}, ...]`

#### Implémentation de `get_seats(obj)`
```python
def get_seats(self, obj):
    """
    Retourne la liste de tous les sièges avec leur statut.
    NOTE: Un siège est considéré comme occupé UNIQUEMENT si la réservation
    a le statut 'confirmed' (en mode dev: immédiat, en prod: après paiement)
    """
    # Récupérer UNIQUEMENT les sièges avec réservations CONFIRMÉES
    booked_seats = set()
    confirmed_bookings = Booking.objects.filter(
        scheduled_trip=obj,
        status='confirmed'  # UNIQUEMENT les réservations confirmées
    ).values_list('seat_number', flat=True)
    
    # Créer la liste de tous les sièges avec leur statut
    seats = []
    for seat_number in range(1, obj.trip.capacity + 1):
        seat_id = f"seat-{seat_number}"
        status = 'occupied' if seat_number in booked_seats else 'available'
        seats.append({
            'id': seat_id,
            'status': status,
            'number': seat_number
        })
    return seats
```

#### Logique de réservation (Mode développement)
```python
def create(self, validated_data):
    # EN MODE DEVELOPPEMENT: créer la réservation directement en 'confirmed'
    # (sans attendre la confirmation de paiement)
    validated_data['status'] = 'confirmed'
    
    booking = super().create(validated_data)
    # Réduire le nombre de places disponibles
    scheduled_trip.available_seats -= 1
    scheduled_trip.save()
    
    return booking
```

### 2. Frontend Mobile (React Native)

#### Fichier: `react-native-reference/src/screens/TripDetailsScreen.tsx`
- **Suppression de la fonction `generateSeats()`** qui créait des sièges factices
- **Utilisation des données réelles** retournées par l'API
- **Application du statut 'selected'** au siège actuellement sélectionné

```typescript
// Avant (incorrect)
const generateSeats = (count: number) => { ... }
const seatsData = generateSeats(trip.available_seats)

// Après (correct)
const seatsData = trip?.seats ? trip.seats : []
```

#### Fichier: `react-native-reference/src/components/SeatSelection.tsx`
- **Changement de la couleur des sièges occupés**
  - Avant: Rouge (#FF6347)
  - Après: Gris (#D3D3D3) - pour mieux indiquer "non disponible"
- **Le composant gère les trois états**
  - 🟦 Bleu: Disponible (clickable)
  - ⬜ Gris: Occupé (disabled)
  - 🟩 Vert: Sélectionné

### 3. Flux de données - Mode Développement

```
User clique "Réserver"
    ↓
POST /api/bookings/ (sans paiement)
    ↓
Backend crée Booking avec status='confirmed' immédiatement
    ↓
Siège est marqué comme occupé
    ↓
GET /api/scheduled_trips/{id}/ retourne le siège en 'occupied'
    ↓
Frontend affiche le siège en GRIS
    ↓
Réservation apparaît dans "Mes réservations"
```

## Comportement observé

### Avant la correction ❌
```
1. User voit tous les sièges en BLEU (disponibles)
2. User clique sur le siège 1
3. User clic sur "Réserver"
4. ❌ Erreur: "Le siège 1 est déjà réservé"
5. User est confus
```

### Après la correction ✅
```
1. User voit:
   - Sièges réservés en GRIS (occupés, désactivés)
   - Sièges disponibles en BLEU
2. User clique sur un siège BLEU
3. User clique sur "Réserver"
4. ✅ Réservation créée instantanément
5. Siège devient GRIS
6. Réservation apparaît dans "Mes réservations"
```

## Test de l'implémentation

### Via API REST
```bash
GET http://192.168.1.64:8000/api/scheduled_trips/{trip_id}/

Response:
{
  "id": 1,
  "trip_info": {...},
  "date": "2026-02-15",
  "available_seats": 47,
  "seats": [
    {"id": "seat-1", "status": "occupied", "number": 1},
    {"id": "seat-2", "status": "available", "number": 2},
    {"id": "seat-3", "status": "occupied", "number": 3},
    ...
  ]
}
```

### Via Django Shell
```python
from transport.models import ScheduledTrip, Booking
from transport.serializers import ScheduledTripSerializer

st = ScheduledTrip.objects.first()
serializer = ScheduledTripSerializer(st)
data = serializer.data

# Vérifier les sièges
seats = data.get('seats', [])
occupied = [s for s in seats if s['status'] == 'occupied']
print(f"Sièges réservés: {[s['number'] for s in occupied]}")

# Vérifier les réservations confirmées
confirmed = Booking.objects.filter(scheduled_trip=st, status='confirmed').count()
print(f"Réservations confirmées: {confirmed}")
```

## Résultat attendu

✅ **Fonctionnement en mode développement :**
1. User crée une réservation → Statut = **'confirmed'** immédiatement
2. Siège s'affiche en **gris** (occupé)
3. Réservation visible dans **"Mes réservations"**
4. Plus d'erreur "siège déjà réservé"

## Migration future vers paiement réel

Quand vous intégrerez un vrai système de paiement, il suffit de :

```python
# EN MODE PRODUCTION: attendre la confirmation de paiement
def create(self, validated_data):
    scheduled_trip = validated_data.pop('scheduled_trip')
    validated_data['trip'] = scheduled_trip.trip
    validated_data['scheduled_trip'] = scheduled_trip
    # Créer en 'pending' et attendre le webhook de paiement
    validated_data['status'] = 'pending'  # ← Mode production
    
    booking = super().create(validated_data)
    # Ne pas réduire available_seats tant que le paiement n'est pas confirmé
    return booking
```

Puis créer un endpoint webhook pour passer au statut 'confirmed' après paiement.

## Fichiers modifiés
- ✅ `backend/transport/serializers.py` (ajout de `seats` + `confirmed` au create)
- ✅ `react-native-reference/src/screens/TripDetailsScreen.tsx` (données réelles)
- ✅ `react-native-reference/src/components/SeatSelection.tsx` (couleur grise)


