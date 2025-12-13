import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Trip } from '../types';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/fonts';

// Helper functions
const formatTime = (time?: string) => {
  if (!time) return 'Heure inconnue';
  try {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Heure invalide';
  }
};

const formatPrice = (price?: number) => {
  if (typeof price !== 'number' || isNaN(price) || price < 0) {
    return 'Prix indisponible';
  }
  const num = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
  return `${num} F CFA`;
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'Date inconnue';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Date invalide';
  }
};

const formatSeats = (seats?: number) => {
  if (typeof seats !== 'number' || isNaN(seats) || seats < 0) return 'Places indisponibles';
  return `${seats} place${seats > 1 ? 's' : ''}`;
};

const computeDuration = (dep?: string, arr?: string) => {
  if (!dep || !arr) return 'Durée inconnue';
  try {
    const d = new Date(`2000-01-01T${dep}`);
    let a = new Date(`2000-01-01T${arr}`);
    if (a.getTime() < d.getTime()) {
      a = new Date(`2000-01-02T${arr}`);
    }
    const diffMin = Math.round((a.getTime() - d.getTime()) / 60000);
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return `${h} h ${m.toString().padStart(2, '0')}`;
  } catch {
    return 'Durée invalide';
  }
};

interface TripCardProps {
  trip: Trip;
  onPress: () => void;
}

export default function TripCard({ trip, onPress }: TripCardProps) {
  const companyName = trip.trip_info?.company_name || 'Compagnie inconnue';
  const departureCityName = trip.trip_info?.departure_city_name || 'Ville inconnue';
  const arrivalCityName = trip.trip_info?.arrival_city_name || 'Ville inconnue';
  const departureTime = trip.trip_info?.departure_time || 'Heure inconnue';
  const arrivalTime = trip.trip_info?.arrival_time || 'Heure inconnue';
  const duration = trip.trip_info?.duration || 0;
  const price = parseFloat(trip.trip_info?.price || '0') || 0;
  const availableSeats = trip.available_seats || 0;

  const formattedDate = trip.date ? formatDate(trip.date) : 'Date inconnue';
  const formattedDepartureTime = departureTime !== 'Heure inconnue' ? formatTime(departureTime) : 'Heure inconnue';
  const formattedArrivalTime = arrivalTime !== 'Heure inconnue' ? formatTime(arrivalTime) : 'Heure inconnue';
  const formattedPrice = price > 0 ? formatPrice(price) : 'Prix indisponible';
  const formattedDuration = duration > 0 ? computeDuration(departureTime, arrivalTime) : 'Durée inconnue';
  const formattedSeats = formatSeats(availableSeats);

  const resolveCompanyName = () => {
    return companyName;
  };

  const resolveCityName = (cityName: string) => {
    return cityName;
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.companyRow}>
          {/* {trip.company?.logo_url ? (
            <Image
              source={{ uri: trip.company.logo_url }}
              style={styles.logo}
            />
          ) : null} */}
          <View>
            <Text style={styles.company}>{companyName}</Text>
            <Text style={styles.date}>{formattedDate}</Text>
          </View>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{formattedPrice}</Text>
          <Text style={styles.seats}>{formattedSeats}</Text>
        </View>
      </View>

      <View style={styles.routeContainer}>
        <View style={styles.routeItem}>
          <Text style={styles.routeLabel}>Départ</Text>
          <Text style={styles.routeCity}>{departureCityName}</Text>
          <Text style={styles.routeTime}>{formattedDepartureTime}</Text>
        </View>

        <View style={styles.durationContainer}>
          <Text style={styles.duration}>Durée {formattedDuration}</Text>
          <View style={styles.routeLine}>
            <View style={styles.routeDot} />
          </View>
        </View>

        <View style={[styles.routeItem, styles.routeItem_end]}>
          <Text style={styles.routeLabel}>Arrivée</Text>
          <Text style={styles.routeCity}>{arrivalCityName}</Text>
          <Text style={styles.routeTime}>{formattedArrivalTime}</Text>
        </View>
      </View>

      {trip.trip_info?.stops && trip.trip_info.stops.length > 0 && (
        <View style={styles.stopsIndicator}>
          <Text style={styles.stopsText}>{trip.trip_info.stops.length} arrêt(s) intermédiaire(s)</Text>
        </View>
      )}

      {trip.trip_info?.bus_type ? (
        <View style={styles.busTypeBadge}>
          <Text style={styles.busTypeText}>{trip.trip_info.bus_type}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 4,
    marginRight: 8,
  },
  company: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },
  date: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
  },
  seats: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeItem: {
    flex: 1,
  },
  routeItem_end: {
    alignItems: 'flex-end',
  },
  routeLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  routeCity: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: 2,
  },
  routeTime: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.medium,
  },
  routeLine: {
    width: 84,
    height: 2,
    backgroundColor: COLORS.gray,
    marginHorizontal: 12,
    position: 'relative',
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    position: 'absolute',
    top: -3,
    left: '50%',
    marginLeft: -4,
  },
  duration: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 6,
    textAlign: 'center',
  },
  durationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  busTypeBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  busTypeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  stopsIndicator: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  stopsText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.medium,
  },
});
