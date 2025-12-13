import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert, // Import Alert
  ActivityIndicator, // Import ActivityIndicator
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { getTripStops, getSegmentPrice, SegmentPriceResponse } from '../services/api';
import { TripStop } from '../types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, PaymentMethod } from '../types';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/fonts';
import { formatCurrency, formatTime } from '../utils/mockData';
import Button from '../components/Button';
import Input from '../components/Input';
import { createBooking, BookingData } from '../services/api'; // Import createBooking and BookingData
import { useAuth } from '../contexts/AuthContext'; // Import useAuth

type Props = NativeStackScreenProps<RootStackParamList, 'Payment'>;

const paymentMethods = [
  { id: 'flooz' as PaymentMethod, name: 'Flooz', icon: 'wallet-outline', color: COLORS.flooz, image: 'https://th.bing.com/th/id/OIP._7XYS8QkoiudNZBiWMGWvwAAAA?w=184&h=180&c=7&r=0&o=7&cb=ucfimg2&dpr=1.5&pid=1.7&rm=3&ucfimg=1' },
  { id: 'tmoney' as PaymentMethod, name: 'Mixx by yas', icon: 'wallet-outline', color: COLORS.tmoney, image: 'https://togoscoop.tg/wp-content/uploads/2024/11/YAS-511x430.jpg' },
  { id: 'card' as PaymentMethod, name: 'Carte bancaire', icon: 'card-outline', color: COLORS.card, image: 'https://th.bing.com/th/id/OIP.ZsT8Miplt0NM_mtBfFY5lwHaFb?w=264&h=194&c=7&r=0&o=7&cb=ucfimg2&dpr=1.5&pid=1.7&rm=3&ucfimg=1' },
];

export default function PaymentScreen({ navigation, route }: Props) {
  const { trip, selectedSeat } = route.params;
  const { user } = useAuth(); // Use the useAuth hook to get user details
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('flooz');
  const [tripStops, setTripStops] = useState<TripStop[]>([]);
  const [selectedOriginStop, setSelectedOriginStop] = useState<number | null>(null);
  const [selectedDestinationStop, setSelectedDestinationStop] = useState<number | null>(null);
  const [loadingStops, setLoadingStops] = useState<boolean>(true);
  const [segmentPrice, setSegmentPrice] = useState<number | null>(null);
  const [loadingPrice, setLoadingPrice] = useState<boolean>(false);

  useEffect(() => {
    const fetchTripStops = async () => {
      const tripId = trip?.id || trip?.trip_info?.id;
      console.log("PaymentScreen: Checking trip ID", tripId);
      if (tripId) {
        try {
          setLoadingStops(true);
          console.log("PaymentScreen: Fetching stops for trip", tripId);
          const stops = await getTripStops(tripId.toString());
          console.log("PaymentScreen: Stops received", stops);
          setTripStops(stops);
          if (stops.length > 0) {
            setSelectedOriginStop(stops[0].id);
            setSelectedDestinationStop(stops[stops.length - 1].id);
          } else {
            console.log("PaymentScreen: No stops found in response");
          }
        } catch (error) {
          console.error("Erreur lors de la récupération des arrêts du trajet:", error);
          Alert.alert("Erreur", "Impossible de récupérer les arrêts du trajet.");
        } finally {
          setLoadingStops(false);
        }
      } else {
        setLoadingStops(false);
        console.warn("Trip ID is missing in PaymentScreen", trip);
      }
    };
    fetchTripStops();
  }, [trip?.id, trip?.trip_info?.id]);

  useEffect(() => {
    const fetchSegmentPrice = async () => {
      const tripId = trip?.id || trip?.trip_info?.id;
      if (tripId && selectedOriginStop && selectedDestinationStop) {
        try {
          setLoadingPrice(true);
          const response = await getSegmentPrice(tripId, selectedOriginStop, selectedDestinationStop);
          setSegmentPrice(response.price);
        } catch (error) {
          console.error("Erreur lors de la récupération du prix du segment:", error);
          setSegmentPrice(null);
        } finally {
          setLoadingPrice(false);
        }
      }
    };
    fetchSegmentPrice();
  }, [trip?.id, trip?.trip_info?.id, selectedOriginStop, selectedDestinationStop]);

  const [passengerName, setPassengerName] = useState(`${user?.firstName || ''} ${user?.lastName || ''}`);
  const [passengerEmail, setPassengerEmail] = useState(user?.email || '');
  const [passengerPhone, setPassengerPhone] = useState(user?.phoneNumber || '');
  const [processing, setProcessing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(''); // Add this line

  // Helpers pour aligner l’affichage avec les champs du backend
  const resolveCompanyName = (company: any, fallbackName?: string) => {
    if (fallbackName && typeof fallbackName === 'string' && fallbackName.trim().length > 0) {
      return fallbackName;
    }
    if (company?.name) return company.name;
    if (typeof company === 'string') return company;
    return 'Compagnie';
  };

  const resolveCityName = (city: any, fallbackName?: string) => {
    if (fallbackName && typeof fallbackName === 'string' && fallbackName.trim().length > 0) {
      return fallbackName;
    }
    if (city?.name) return city.name;
    if (typeof city === 'string') return city;
    return 'Ville';
  };

  const fromCity = trip.trip_info.departure_city_name || 'Ville de départ inconnue';
  const toCity = trip.trip_info.arrival_city_name || 'Ville d\'arrivée inconnue';
  const departureTime = trip.trip_info.departure_time || '';
  const departureTimeLabel = formatTime(departureTime);
  const dateLabel = trip.date || ''; // Assuming trip.date is the correct date field
  const companyName = trip.trip_info.company_name || 'Compagnie inconnue';
  const commission = 100; // Commission de 100 FCFA
  const totalAmount = segmentPrice !== null ? segmentPrice + commission : 0;

  const handlePayment = async () => {
    setProcessing(true);
    try {
      if (!selectedSeat) {
        Alert.alert('Erreur', 'Veuillez sélectionner un siège.');
        setProcessing(false);
        return;
      }

      if (!user) {
        Alert.alert('Erreur', 'Utilisateur non connecté.');
        setProcessing(false);
        return;
      }

      console.log("trip.trip_info:", trip.trip_info);

      const tripId = trip?.id || trip?.trip_info?.id;
      if (!tripId || !selectedOriginStop || !selectedDestinationStop || segmentPrice === null) {
        Alert.alert("Erreur", "Veuillez sélectionner les arrêts de départ et de destination et attendre le calcul du prix.");
        setProcessing(false);
        return;
      }

      const bookingData: BookingData = {
        trip: tripId, // Assurez-vous que trip.id est l'ID du ScheduledTrip
        passenger_name: passengerName, // Utilise le nom de l'utilisateur connecté
        passenger_email: passengerEmail, // Utilise l'email de l'utilisateur connecté
        passenger_phone: passengerPhone, // Utilise le numéro saisi, ou celui de l'utilisateur, ou une valeur par défaut
        seat_number: selectedSeat.replace('seat-', ''),
        origin_stop: selectedOriginStop, // Utilise l'arrêt d'origine sélectionné
        destination_stop: selectedDestinationStop, // Utilise l'arrêt de destination sélectionné
        payment_method: selectedMethod,
        price: segmentPrice, // Utiliser le prix du segment calculé
      };

      const response = await createBooking(bookingData);
      console.log('Réservation créée avec succès:', response);
      Alert.alert('Succès', 'Votre réservation a été effectuée avec succès!');
      navigation.navigate('Ticket', { trip: response.trip }); // Naviguer vers l'écran du ticket avec les détails de la réservation
    } catch (error: any) {
      console.error('Erreur lors du paiement:', error);
      Alert.alert('Erreur', error.message || 'Une erreur est survenue lors de la réservation.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paiement</Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Récapitulatif</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Trajet</Text>
            <Text style={styles.summaryValue}>{fromCity} → {toCity}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date</Text>
            <Text style={styles.summaryValue}>{dateLabel}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Heure</Text>
            <Text style={styles.summaryValue}>{departureTimeLabel}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Compagnie</Text>
            <Text style={styles.summaryValue}>{companyName}</Text>
          </View>
          {selectedSeat && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Siège</Text>
              <Text style={styles.summaryValue}>{selectedSeat.replace('seat-', 'Siège ')}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Frais</Text>
            <Text style={styles.summaryValue}>{formatCurrency(commission)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            {loadingPrice ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={styles.summaryTotalValue}>{formatCurrency(segmentPrice !== null ? segmentPrice + commission : trip.trip_info.price + commission)}</Text>
            )}
          </View>
        </View>

        <View style={styles.passengerSection}>
          <Text style={styles.sectionTitle}>Informations du passager</Text>
          <Input
            label="Nom complet"
            placeholder="Amah koffi"
            leftIcon={<Ionicons name="person-outline" size={20} color={COLORS.textSecondary} />}
            value={passengerName}
            onChangeText={setPassengerName}
          />
          <Input
            label="Email(optionnel)"
            placeholder="john@example.com"
            keyboardType="email-address"
            leftIcon={<Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} />}
            value={passengerEmail}
            onChangeText={setPassengerEmail}
          />
          <Input
            label="Numéro de téléphone"
            placeholder="+228 XX XX XX XX"
            keyboardType="phone-pad"
            leftIcon={<Ionicons name="call-outline" size={20} color={COLORS.textSecondary} />}
            value={passengerPhone}
            onChangeText={setPassengerPhone}
          />
        </View>

        {loadingStops ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Arrêt d'embarquement</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedOriginStop}
                  onValueChange={(itemValue) => {
                    setSelectedOriginStop(itemValue);
                    const newOriginIndex = tripStops.findIndex(stop => stop.id === itemValue);
                    const currentDestinationIndex = tripStops.findIndex(stop => stop.id === selectedDestinationStop);

                    if (newOriginIndex !== -1 && currentDestinationIndex !== -1 && newOriginIndex >= currentDestinationIndex) {
                      if (newOriginIndex < tripStops.length - 1) {
                        setSelectedDestinationStop(tripStops[newOriginIndex + 1].id);
                      } else {
                        setSelectedDestinationStop(null);
                      }
                    }
                  }}
                  style={styles.picker}
                >
                  {tripStops.map((stop) => (
                    <Picker.Item key={stop.id} label={resolveCityName(stop.city, stop.city_name)} value={stop.id} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Arrêt de débarquement</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedDestinationStop}
                  onValueChange={(itemValue) => setSelectedDestinationStop(itemValue)}
                  style={styles.picker}
                >
                  {tripStops
                    .filter((stop) => {
                      const originIndex = tripStops.findIndex(s => s.id === selectedOriginStop);
                      const destinationIndex = tripStops.findIndex(s => s.id === stop.id);
                      return destinationIndex > originIndex;
                    })
                    .map((stop) => (
                      <Picker.Item key={stop.id} label={resolveCityName(stop.city, stop.city_name)} value={stop.id} />
                    ))}
                </Picker>
              </View>
            </View>
          </>
        )}

        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Mode de paiement</Text>

          <View style={styles.paymentMethods}>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethod,
                  selectedMethod === method.id && styles.paymentMethod_selected,
                ]}
                onPress={() => setSelectedMethod(method.id)}
              >
                <View style={styles.paymentIcon}>
                  {method.image ? (
                    <Image source={{ uri: method.image }} style={styles.paymentImage} />
                  ) : (
                    <Ionicons name={method.icon as any} size={24} color={method.color} />
                  )}
                </View>
                <Text style={styles.paymentMethodName}>{method.name}</Text>
                {selectedMethod === method.id && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark" size={16} color={COLORS.white} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {(selectedMethod === 'flooz' || selectedMethod === 'tmoney') && (
          <View style={styles.phoneSection}>
            <Input
              label="Numéro de téléphone"
              placeholder="+228 XX XX XX XX"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              leftIcon={
                <Ionicons name="call-outline" size={20} color={COLORS.textSecondary} />
              }
            />
            <Text style={styles.phoneNote}>
              Vous recevrez une notification pour confirmer le paiement
            </Text>
          </View>
        )}

        {selectedMethod === 'card' && (
          <View style={styles.cardSection}>
            <Input
              label="Numéro de carte"
              placeholder="1234 5678 9012 3456"
              keyboardType="number-pad"
              leftIcon={
                <Ionicons name="card-outline" size={20} color={COLORS.textSecondary} />
              }
            />
            <View style={styles.cardRow}>
              <Input
                label="Expiration"
                placeholder="MM/AA"
                containerStyle={styles.cardInput}
              />
              <Input
                label="CVV"
                placeholder="123"
                keyboardType="number-pad"
                containerStyle={styles.cardInput}
                secureTextEntry
              />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={processing ? 'Traitement en cours...' : `Payer ${formatCurrency(totalAmount)}`}
          onPress={handlePayment}
          disabled={processing}
          loading={processing}
          style={styles.payButton}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.white,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 120,
  },
  summary: {
    backgroundColor: `${COLORS.gray}4D`,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  summaryTotalLabel: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },
  summaryTotalValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.primary,
  },
  paymentSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: 16,
  },
  paymentMethods: {
    gap: 12,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
  },
  paymentMethod_selected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}0D`,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  paymentMethodName: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneSection: {
    marginBottom: 24,
  },
  phoneNote: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: -8,
    marginLeft: 4,
  },
  cardSection: {
    marginBottom: 24,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cardInput: {
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 16,
    paddingBottom: 32,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  payButton: {
    height: 56,
    borderRadius: 16,
  },
  paymentImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    borderRadius: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  pickerContainer: {
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
});