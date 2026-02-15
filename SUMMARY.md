# ✅ RÉSUMÉ DES MODIFICATIONS

## 🎯 Changements effectués

### Backend (serializers.py)
1. **Ajout du champ `seats`** au ScheduledTripSerializer
2. **Méthode `get_seats()`** retourne liste des sièges avec statut
3. **Validation mise à jour** : vérifier uniquement les confirmés
4. **Créer en 'confirmed'** dans BookingCreateSerializer.create()

### Frontend (TripDetailsScreen.tsx)
1. **Supprimer** fonction `generateSeats()` 
2. **Utiliser** données réelles : `seatsData = trip?.seats`
3. **Appliquer** statut 'selected' au siège choisi

### Frontend (SeatSelection.tsx)
1. **Couleur grise** pour sièges occupés : `#D3D3D3`

## 🚀 Résultat
✅ Sièges réservés = GRIS (disabled)
✅ Sièges libres = BLEU (clickable)
✅ Réservation créée = status 'confirmed'
✅ Pas d'erreur doublons

