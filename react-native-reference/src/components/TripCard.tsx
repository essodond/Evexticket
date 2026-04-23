import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Trip } from '../types';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/fonts';

const formatTime = (time?: string) => {
  if (!time) return '00:00';
  try {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '00:00';
  }
};

const formatDate = (date?: string) => {
  if (!date) return 'Date inconnue';
  try {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Date invalide';
  }
};

const formatPrice = (price: number) => {
  if (typeof price !== 'number' || Number.isNaN(price)) return 'Prix indisponible';
  return `${new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)} F CFA`;
};

interface TripCardProps {
  trip: Trip;
  onPress: () => void;
}

export default function TripCard({ trip, onPress }: TripCardProps) {
  const companyName = trip.trip_info?.company_name || 'Compagnie inconnue';
  const departureCityName = trip.trip_info?.departure_city_name || 'Ville inconnue';
  const arrivalCityName = trip.trip_info?.arrival_city_name || 'Ville inconnue';
  const departureTime = trip.trip_info?.departure_time || '00:00';
  const arrivalTime = trip.trip_info?.arrival_time || '00:00';
  const price = parseFloat(trip.trip_info?.price || '0') || 0;
  const availableSeats = trip.available_seats || 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* SECTION HAUTE : COMPAGNIE & PRIX */}
      <View style={styles.topSection}>
        <View style={styles.companyRow}>
          <Ionicons name="bus" size={20} color="#1E293B" />
          <Text style={styles.companyName}>{companyName}</Text>
        </View>
        <Text style={styles.priceText}>{formatPrice(price)}</Text>
      </View>

      {/* SECTION INFOS : DATE & PLACES */}
      <View style={styles.infoRow}>
        <View style={styles.dateBadge}>
          <Ionicons name="calendar" size={14} color="#64748B" />
          <Text style={styles.dateText}>{formatDate(trip.date)}</Text>
        </View>
        <Text style={styles.seatsText}>{availableSeats} places</Text>
      </View>

      {/* LIGNE DE SÉPARATION STYLE TICKET (PERFORATIONS) */}
      <View style={styles.dividerContainer}>
        <View style={styles.leftCutout} />
        <View style={styles.dashedLine} />
        <View style={styles.rightCutout} />
      </View>

      {/* SECTION TRAJET */}
      <View style={styles.routeRow}>
        <View style={styles.routePoint}>
          <Text style={styles.cityLabel}>Départ</Text>
          <Text style={styles.cityName}>{departureCityName}</Text>
          <Text style={styles.timeText}>{formatTime(departureTime)}</Text>
        </View>

        <View style={styles.visualContainer}>
          <View style={styles.line} />
          <View style={styles.busCircle}>
            <Ionicons name="bus" size={14} color={COLORS.primary} />
          </View>
          <View style={styles.line} />
        </View>

        <View style={[styles.routePoint, { alignItems: 'flex-end' }]}>
          <Text style={styles.cityLabel}>Arrivée</Text>
          <Text style={styles.cityName}>{arrivalCityName}</Text>
          <Text style={styles.timeText}>{formatTime(arrivalTime)}</Text>
        </View>
      </View>

      {/* FOOTER : TYPE & BOUTON */}
      <View style={styles.footer}>
        <View style={styles.typeTag}>
          <Text style={styles.typeTagText}>{trip.trip_info?.bus_type || 'Standard'}</Text>
        </View>
        <TouchableOpacity style={styles.bookButton} onPress={onPress}>
          <Text style={styles.bookButtonText}>Réserver</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    // Ombre douce iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'visible',
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  priceText: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary, // #007AFF
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  seatsText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  // Effet Ticket
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: -20, // Pour faire sortir les encoches
    marginBottom: 20,
    height: 20,
  },
  leftCutout: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F8FAFC', // Couleur du fond de l'app
    marginLeft: -10,
  },
  rightCutout: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    marginRight: -10,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginHorizontal: 10,
  },
  routeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  routePoint: {
    flex: 1,
  },
  cityLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cityName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
    marginVertical: 2,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  visualContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
    justifyContent: 'center',
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: '#F1F5F9',
  },
  busCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  typeTagText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },
  bookButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 14,
  },
  bookButtonText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 15,
  },
});