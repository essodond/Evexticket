# ✅ Flux complet de réservation et affichage dans "Mes tickets"

## 🔄 Flux de données

### 1. User crée une réservation
```
PaymentScreen
  ↓
POST /api/bookings/
  ├─ scheduled_trip: 123
  ├─ seat_number: "5"
  ├─ passenger_name: "John Doe"
  ├─ passenger_email: "john@example.com"
  ├─ passenger_phone: "233987654321"
  ├─ payment_method: "flooz"
  └─ total_price: 5000
```

### 2. Backend crée la réservation
```
BookingCreateSerializer.create()
  ├─ Assigne status = 'confirmed'
  ├─ Assigne user = request.user (l'utilisateur connecté)
  ├─ Réduit available_seats dans ScheduledTrip
  └─ Retourne la réservation créée
```

### 3. User navigue vers "Mes tickets"
```
MyTicketsScreen
  ↓
GET /api/bookings/ (filtré par user=request.user)
  ↓
BookingSerializer retourne:
{
  "id": 123,
  "seat_number": "5",
  "status": "confirmed",
  "total_price": 5000,
  "scheduled_trip_date": "2026-02-15",
  "trip_details": {
    "id": 1,
    "company_name": "TransAfrica",
    "departure_city_name": "Dakar",
    "arrival_city_name": "Thiès",
    "departure_time": "08:00:00",
    "arrival_time": "10:00:00",
    "price": "5000.00"
  },
  "passenger_name": "John Doe",
  "passenger_email": "john@example.com",
  "passenger_phone": "233987654321",
  "booking_date": "2026-02-15T14:30:00Z"
}
```

### 4. Frontend transforme et affiche
```
transformedTickets = [
  {
    id: 123,
    date: "2026-02-15",
    company: "TransAfrica",
    price: 5000,
    from: "Dakar",
    to: "Thiès",
    departure: "08:00",
    arrival: "10:00",
    seat_number: "5",
    status: "confirmed",
    trip_info: { ... }
  }
]

Les tickets s'affichent dans ScrollView avec TicketCard
```

## 📋 Modifications clés effectuées

### Backend Changes

#### 1. BookingCreateSerializer.create()
```python
# Assigner l'utilisateur connecté
validated_data['user'] = self.context['request'].user

# Créer avec status='confirmed' en dev
validated_data['status'] = 'confirmed'
```

#### 2. BookingSerializer
```python
# Ajouter la date du voyage programmé
scheduled_trip_date = serializers.SerializerMethodField()

def get_scheduled_trip_date(self, obj):
    if obj.scheduled_trip:
        return str(obj.scheduled_trip.date)
    return None
```

### Frontend Changes

#### MyTicketsScreen.tsx
```typescript
// Mettre à jour le parsing pour utiliser scheduled_trip_date
date: booking.scheduled_trip_date || 'Date non disponible'
```

## ✅ Checklist de test

- [ ] Créer une réservation
- [ ] Vérifier que la réservation a un `user_id` en base de données
- [ ] Consulter l'API: `GET /api/bookings/` → doit retourner au moins 1 réservation
- [ ] Consulter l'écran "Mes tickets" → doit afficher la réservation
- [ ] Vérifier que le siège s'affiche comme occupé dans le screen de sélection
- [ ] Vérifier que le statut affiche "Confirmé"

## 🔧 Commandes de test (Django shell)

```python
from django.contrib.auth.models import User
from transport.models import Booking

# Vérifier les réservations de l'utilisateur connecté
user = User.objects.get(username='votreusername')
bookings = Booking.objects.filter(user=user)

print(f"Réservations pour {user.username}: {bookings.count()}")
for booking in bookings:
    print(f"  - Siège {booking.seat_number}, Status: {booking.status}, User: {booking.user}")
```

## 🐛 Dépannage

**Problème**: Les tickets n'apparaissent pas dans "Mes tickets"

**Causes possibles**:
1. ❌ Le champ `user` de la réservation est NULL
   - ✅ Vérifier que `validated_data['user']` est assigné dans `create()`

2. ❌ L'utilisateur n'est pas authentifié
   - ✅ Vérifier le token dans les headers de la requête

3. ❌ Les réservations ne sont pas retournées par l'API
   - ✅ Vérifier que `BookingViewSet.get_queryset()` filtre par `user=request.user`

4. ❌ Le frontend n'affiche pas les résultats
   - ✅ Vérifier les logs: `console.log('✅ Tickets chargés:', bookings)`

## 📊 Structure des données

```typescript
// Type attendu par le frontend
interface Ticket {
  id: number;
  date: string;           // "2026-02-15"
  company: string;        // "TransAfrica"
  price: number;          // 5000
  from: string;           // "Dakar"
  to: string;             // "Thiès"
  departure: string;      // "08:00"
  arrival: string;        // "10:00"
  seat_number: string;    // "5"
  status: string;         // "confirmed"
  trip_info: any;         // Détails complets du trajet
}
```


