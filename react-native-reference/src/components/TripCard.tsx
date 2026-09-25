import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Trip } from '../types';
import { COLORS } from '../constants/colors';

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
  }).format(price)} F`;
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
  const isFull = availableSeats <= 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.topSection}>
        <View style={styles.companyIcon}>
          <Ionicons name="bus-outline" size={22} color="#0066CC" />
        </View>
        <View style={styles.companyCopy}>
          <Text style={styles.companyName} numberOfLines={2}>{companyName}</Text>
          <View style={styles.dateBadge}>
            <Ionicons name="calendar-outline" size={12} color="#777777" />
            <Text style={styles.dateText}>{formatDate(trip.date)}</Text>
          </View>
        </View>
        <View style={styles.priceColumn}>
          <Text style={styles.priceText}>{formatPrice(price)}</Text>
          <Text style={[styles.seatsText, isFull && styles.seatsTextFull]}>
            {isFull ? 'Complet' : `${availableSeats} places`}
          </Text>
        </View>
      </View>

      {/* SECTION TRAJET */}
      <View style={styles.routeRow}>
        <Text style={styles.timeText}>{formatTime(departureTime)}</Text>

        <View style={styles.visualContainer}>
          <View style={styles.line} />
          <View style={styles.busCircle}>
            <Ionicons name="bus-outline" size={14} color={COLORS.primary} />
          </View>
          <View style={styles.line} />
        </View>

        <Text style={styles.timeText}>{formatTime(arrivalTime)}</Text>
      </View>
      <View style={styles.citiesRow}>
        <Text style={styles.cityName}>{departureCityName}</Text>
        <Text style={[styles.cityName, { textAlign: 'right' }]}>{arrivalCityName}</Text>
      </View>

      {/* FOOTER : TYPE & BOUTON */}
      <View style={styles.footer}>
        <View style={styles.typeTag}>
          <Text style={styles.typeTagText}>{trip.trip_info?.bus_type || 'Standard'}</Text>
        </View>
        <TouchableOpacity
          style={[styles.bookButton, isFull && styles.bookButtonFull]}
          onPress={onPress}
        >
          <Text style={styles.bookButtonText}>{isFull ? "Liste d'attente" : 'Réserver'}</Text>
          <Ionicons name="arrow-forward" size={15} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white, borderRadius: 28, padding: 21, marginBottom: 18,
    shadowColor: '#20364C', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.04, shadowRadius: 20, elevation: 2,
  },
  topSection: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 23, gap: 10 },
  companyIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: '#F7F7F8', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  companyCopy: { flex: 1, minWidth: 0 },
  companyName: { fontSize: 17, fontWeight: '600', color: '#080808' },
  dateBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  dateText: { fontSize: 12, color: '#777777', fontWeight: '500', flexShrink: 1 },
  priceColumn: { alignItems: 'flex-end', flexShrink: 0 },
  priceText: { fontSize: 21, fontWeight: '800', color: '#0066CC' },
  seatsText: { fontSize: 12, color: '#999999', marginTop: 4, fontWeight: '500' },
  seatsTextFull: { color: '#EF4444', fontWeight: '700' },
  routeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  timeText: { fontSize: 21, fontWeight: '700', color: '#080808' },
  visualContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, marginHorizontal: 13, transform: [{ translateY: 8 }] },
  line: { flex: 1, borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#DEDEDE' },
  busCircle: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  citiesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  cityName: { fontSize: 13, fontWeight: '500', color: '#777777', flex: 1 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  typeTag: { backgroundColor: '#F7F7F8', borderWidth: 1, borderColor: '#E8E8E8', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, flexShrink: 1 },
  typeTagText: { fontSize: 12, color: '#777777', fontWeight: '500' },
  bookButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#0066CC', paddingHorizontal: 21, minHeight: 42, borderRadius: 24 },
  bookButtonFull: { backgroundColor: '#F59E0B' },
  bookButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
});
