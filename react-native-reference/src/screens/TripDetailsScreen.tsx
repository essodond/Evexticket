import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList, Trip, Seat } from '../types';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/fonts';
import { formatCurrency, calculateDuration, formatTime } from '../utils/mockData';
import Button from '../components/Button';
import SeatSelection from '../components/SeatSelection';
import { getTripDetails } from '../services/api';
import { SeatStatus } from '../components/SeatSelection'; // Import SeatStatus

type Props = NativeStackScreenProps<RootStackParamList, 'TripDetails'>;

const InfoCard = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <View style={styles.infoCard}>
    <View style={styles.infoIcon}>
      <Ionicons name={icon as any} size={24} color={COLORS.primary} />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

export default function TripDetailsScreen({ navigation, route }: Props) {
  const { trip: initialTrip } = route.params;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const scheduledTripId = initialTrip?.id ?? initialTrip?.trip_info?.id;

  const handleSelectSeat = (seatId: string | null) => {
    setSelectedSeat(seatId);
  };

  const handleSeatPress = (seatId: string) => {
    setSelectedSeat(prevSelectedSeat => (prevSelectedSeat === seatId ? null : seatId));
  };

  // Utiliser les sièges réels de l'API, avec gestion du statut "occupied"
  const seatsData = trip?.seats ? trip.seats : [];

  useEffect(() => {
    const fetchTrip = async () => {
      if (!scheduledTripId) {
        setError('Identifiant du trajet introuvable.');
        setLoading(false);
        return;
      }

      try {
        const fetchedTrip = await getTripDetails(String(scheduledTripId));
        setTrip(fetchedTrip);
      } catch (err) {
        console.error('Failed to fetch trip details:', err);
        setError('Impossible de charger les détails du trajet.');
      } finally {
        setLoading(false);
      }
    };

    fetchTrip();
  }, [scheduledTripId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement des détails du trajet...</Text>
      </View>
    );
  }

  if (error || !trip) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Aucun détail de trajet trouvé.'}</Text>
        <Button title="Retour" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  // Toujours privilégier les libellés fournis (company_name, *_city_name)
  const resolveCompanyName = (company: any, fallbackName?: string) => {
    if (fallbackName && typeof fallbackName === 'string' && fallbackName.trim().length > 0) {
      return fallbackName;
    }
    if (company?.name) return company.name;
    if (typeof company === 'string') return company;
    // Si c'est un id numérique et qu'on n'a pas de nom, afficher générique
    return 'Compagnie';
  };

  const resolveCityName = (city: any, cityName?: string) => {
    if (cityName && typeof cityName === 'string' && cityName.trim().length > 0) {
      return cityName;
    }
    if (city?.name) return city.name;
    if (typeof city === 'string') return city;
    return 'Ville';
  };

  const safeDuration = (start?: string, end?: string) => {
    if (trip?.trip_info?.duration && typeof trip.trip_info.duration === 'number') {
      const totalMinutes = trip.trip_info.duration;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}h${minutes > 0 ? minutes.toString().padStart(2, '0') : '00'}`;
    }
    if (!start || !end) return 'Durée N/A';
    try {
      return calculateDuration(start, end);
    } catch {
      return 'Durée N/A';
    }
  };

  const companyName = resolveCompanyName((trip as any).company, (trip as any).company_name);
  const dateLabel = (trip as any).departure_date || (trip as any).date || '';
  const fromCity = resolveCityName((trip as any).departure_city, (trip as any).departure_city_name);
  const toCity = resolveCityName((trip as any).arrival_city, (trip as any).arrival_city_name);
  const departureTime = (trip as any).departure_time || (trip as any).departure || '';
  const arrivalTime = (trip as any).arrival_time || (trip as any).arrival || '';
  const departureTimeLabel = formatTime(departureTime);
  const arrivalTimeLabel = formatTime(arrivalTime);
  const seatsLeft = (trip as any).seats_left ?? (trip as any).seatsLeft ?? '';

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1624901713295-504bf074e0df?w=800' }}
          style={styles.image}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.3)', 'transparent']}
          style={styles.gradient}
        />
        
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.company}>{trip.trip_info.company_name || 'Compagnie inconnue'}</Text>
            <Text style={styles.date}>{dateLabel}</Text>
          </View>
          <Text style={styles.price}>{formatCurrency(parseFloat(trip.trip_info.price || '0'))}</Text>
        </View>

        <View style={styles.routeContainer}>
          <View style={styles.routeItem}>
            <View style={styles.routeHeader}>
              <Ionicons name="location-outline" size={16} color={COLORS.primary} />
              <Text style={styles.routeLabel}>Départ</Text>
            </View>
            <Text style={styles.routeCity}>{trip.trip_info.departure_city_name || 'Ville de départ inconnue'}</Text>
            <Text style={styles.routeTime}>{departureTimeLabel}</Text>
          </View>

          <View style={styles.routeLine}>
            <View style={styles.routeLineBar} />
            <Text style={styles.routeDuration}>{safeDuration(departureTime, arrivalTime)}</Text>
            <View style={styles.routeLineBar} />
          </View>

          <View style={[styles.routeItem, styles.routeItem_end]}>
            <View style={styles.routeHeader}>
              <Text style={styles.routeLabel}>Arrivée</Text>
              <Ionicons name="location-outline" size={16} color={COLORS.primary} />
            </View>
            <Text style={styles.routeCity}>{trip.trip_info.arrival_city_name || 'Ville d\'arrivée inconnue'}</Text>
            <Text style={styles.routeTime}>{arrivalTimeLabel}</Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Informations du trajet</Text>
          
          <InfoCard
            icon="bus"
            label="Type de bus"
            value={trip.trip_info.bus_type || "Non spécifié"}
          />
          
          <InfoCard
            icon="people"
            label="Places disponibles"
            value={`${seatsLeft} sièges restants`}
          />
          
          <InfoCard
            icon="time"
            label="Durée du trajet"
            value={safeDuration(departureTime, arrivalTime)}
          />
        </View>



        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            ℹ️ Veuillez arriver 15 minutes avant le départ. Le billet est valable uniquement pour la date et l\'heure sélectionnées.
          </Text>
        </View>

        {/* Seat Selection Component */}
        <SeatSelection
          seats={seatsData.map(seat =>
            seat.id === selectedSeat
              ? { ...seat, status: SeatStatus.Selected }
              : seat
          )}
          onSeatPress={handleSeatPress}
          selectedSeatId={selectedSeat}
        />

        <View style={styles.footer}>
          <View style={styles.footerPrice}>
            <Text style={styles.footerPriceLabel}>Prix total</Text>
            <Text style={styles.footerPriceValue}>{formatCurrency(parseFloat(trip.trip_info.price || '0'))}</Text>
          </View>
          <Button
            title="Réserver maintenant"
            onPress={() => navigation.navigate('Payment', { trip, selectedSeat })}
            style={styles.bookButton}
            disabled={!selectedSeat}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  imageContainer: {
    height: 200,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  backButton: {
    position: 'absolute',
    top: 48,
    left: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 150, // Increased padding to avoid content hiding under fixed footer
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  company: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },
  date: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  price: {
    fontSize: FONT_SIZES['3xl'],
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.primary,
  },
  routeContainer: {
    backgroundColor: `${COLORS.gray}4D`,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  routeItem: {
    flex: 1,
  },
  routeItem_end: {
    alignItems: 'flex-end',
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  routeLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  routeCity: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: 2,
  },
  routeTime: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.primary,
  },
  routeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  routeLineBar: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.border,
  },
  routeDuration: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginHorizontal: 8,
  },
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  infoIcon: {
    width: 48,
    height: 48,
    backgroundColor: `${COLORS.primary}1A`,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },
  notice: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: `${COLORS.primary}33`,
    borderRadius: 12,
    padding: 16,
  },
  noticeText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  footer: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 10,
    paddingBottom: 10, // Further reduced padding
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  footerPrice: {
    flex: 1,
  },
  footerPriceLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  footerPriceValue: {
    fontSize: FONT_SIZES['xl'],
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.primary,
  },
  bookButton: {
    flex: 2,
    height: 40, // Further reduced height
    borderRadius: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  loadingText: {
    marginTop: 10,
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  errorText: {
    marginBottom: 20,
    fontSize: FONT_SIZES.base,
    color: COLORS.error,
    textAlign: 'center',
  },
  stopCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  stopCity: {
    fontSize: FONT_SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginLeft: 5,
  },
  stopTimes: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  stopTime: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
  },
  boardingZonesContainer: {
    marginTop: 5,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.lightGray,
  },
  boardingZonesTitle: {
    fontSize: FONT_SIZES.small,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 5,
  },
  boardingZoneText: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
});
