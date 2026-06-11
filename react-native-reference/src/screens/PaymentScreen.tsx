import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { RootStackParamList, PaymentMethod } from '../types';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/fonts';
import { formatCurrency, formatTime } from '../utils/mockData';
import Button from '../components/Button';
import Input from '../components/Input';
import { initiateQosPayment, verifyQosPayment } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Payment'>;

const paymentMethods = [
  { id: 'flooz' as PaymentMethod, name: 'Flooz', icon: 'wallet-outline', color: COLORS.flooz, image: 'https://th.bing.com/th/id/OIP._7XYS8QkoiudNZBiWMGWvwAAAA?w=184&h=180&c=7&r=0&o=7&cb=ucfimg2&dpr=1.5&pid=1.7&rm=3&ucfimg=1' },
  { id: 'tmoney' as PaymentMethod, name: 'TMoney', icon: 'wallet-outline', color: COLORS.tmoney, image: 'https://togoscoop.tg/wp-content/uploads/2024/11/YAS-511x430.jpg' },
];

export default function PaymentScreen({ navigation, route }: Props) {
  const { trip, selectedSeat } = route.params;
  const { user } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('flooz');
  const [passengerName, setPassengerName] = useState(`${user?.first_name || ''} ${user?.last_name || ''}`.trim());
  const [passengerEmail, setPassengerEmail] = useState(user?.email || '');
  const [passengerPhone, setPassengerPhone] = useState(user?.phone_number || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '');
  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fromCity = trip.trip_info.departure_city_name || 'Ville de depart inconnue';
  const toCity = trip.trip_info.arrival_city_name || 'Ville d arrivee inconnue';
  const departureTimeLabel = formatTime(trip.trip_info.departure_time || '');
  const dateLabel = trip.date || '';
  const companyName = trip.trip_info.company_name || 'Compagnie inconnue';
  const commission = 300;

  const bookingPrice = useMemo(() => {
    const value = parseFloat(trip.trip_info.price || '0');
    return isNaN(value) ? 0 : value;
  }, [trip.trip_info.price]);

  const totalAmount = useMemo(() => bookingPrice + commission, [bookingPrice]);

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const waitForPaymentConfirmation = async (reference: string) => {
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const verification = await verifyQosPayment(reference);
      if (verification.paye || verification.statut === 'paye') return verification;
      if (verification.statut === 'echoue' || verification.statut === 'expire') {
        throw new Error(verification.message || 'Le paiement a echoue ou a expire.');
      }
      setStatusMessage('Paiement en attente de confirmation...');
      await wait(5000);
    }
    throw new Error('Paiement initie, mais la confirmation QOS prend trop de temps. Verifiez le statut dans quelques instants.');
  };

  const handlePayment = async () => {
    if (!selectedSeat) {
      Alert.alert('Erreur', 'Veuillez selectionner un siege.');
      return;
    }
    if (!user) {
      Alert.alert('Erreur', 'Utilisateur non connecte.');
      return;
    }
    if (!phoneNumber) {
      Alert.alert('Erreur', 'Veuillez saisir le numero Mobile Money.');
      return;
    }

    setProcessing(true);
    setStatusMessage('Initialisation du paiement QOS...');

    try {
      const seatNumber = selectedSeat.replace('seat-', '');
      const initiated = await initiateQosPayment({
        voyage_id: trip.id,
        numero_siege: seatNumber,
        client_nom: passengerName,
        client_telephone: phoneNumber || passengerPhone,
        montant_billet: Math.round(bookingPrice),
        montant_total: Math.round(totalAmount),
        operateur: selectedMethod,
        ville_depart: fromCity,
        ville_arrivee: toCity,
      });

      setStatusMessage('Paiement lance. Confirmez la demande sur votre telephone.');
      const confirmed = await waitForPaymentConfirmation(initiated.reference_evex);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'EVEX: Reservation confirmee',
          body: `${fromCity} - ${toCity}\n${dateLabel} a ${departureTimeLabel}\nSiege ${seatNumber} - ${companyName}`,
          sound: 'default',
          data: { screen: 'Ticket' },
        },
        trigger: null,
      });

      const tripForTicket = {
        ...trip,
        id: initiated.reference_evex,
        payment_status: confirmed.statut,
        transaction_id: initiated.transaction_id,
        seat_number: seatNumber,
        trip_info: {
          ...trip.trip_info,
        },
      };

      Alert.alert('Succes', 'Votre paiement a ete confirme avec succes!');
      navigation.navigate('Ticket', { trip: tripForTicket as any });
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Une erreur est survenue lors du paiement.');
    } finally {
      setProcessing(false);
      setStatusMessage(null);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Paiement QosPay</Text>
          <Text style={styles.headerSubtitle}>Sécurisé via QosPay, Flooz ou TMoney</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Recapitulatif</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Trajet</Text>
            <Text style={styles.summaryValue}>{fromCity} - {toCity}</Text>
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
              <Text style={styles.summaryLabel}>Siege</Text>
              <Text style={styles.summaryValue}>{selectedSeat.replace('seat-', 'Siege ')}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Frais</Text>
            <Text style={styles.summaryValue}>{formatCurrency(commission)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            <Text style={styles.summaryTotalValue}>{formatCurrency(totalAmount)}</Text>
          </View>
        </View>

        <View style={styles.passengerSection}>
          <Text style={styles.sectionTitle}>Informations du passager</Text>
          <Input label="Nom complet" placeholder="Amah Koffi" leftIcon={<Ionicons name="person-outline" size={20} color={COLORS.textSecondary} />} value={passengerName} onChangeText={setPassengerName} />
          <Input label="Email (optionnel)" placeholder="john@example.com" keyboardType="email-address" leftIcon={<Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} />} value={passengerEmail} onChangeText={setPassengerEmail} />
          <Input label="Telephone passager" placeholder="+228 XX XX XX XX" keyboardType="phone-pad" leftIcon={<Ionicons name="call-outline" size={20} color={COLORS.textSecondary} />} value={passengerPhone} onChangeText={setPassengerPhone} />
        </View>

        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Mode de paiement</Text>
          <Text style={styles.paymentHint}>Choisissez votre opérateur mobile. QosPay traitera la transaction en toute sécurité.</Text>
          <View style={styles.paymentMethods}>
            {paymentMethods.map((method) => (
              <TouchableOpacity key={method.id} style={[styles.paymentMethod, selectedMethod === method.id && styles.paymentMethod_selected]} onPress={() => setSelectedMethod(method.id)}>
                <View style={[styles.paymentIcon, { backgroundColor: `${method.color}14` }]}>
                  {method.image ? <Image source={{ uri: method.image }} style={styles.paymentImage} /> : <Ionicons name={method.icon as any} size={24} color={method.color} />}
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

        <View style={styles.phoneSection}>
          <Input label="Numero Mobile Money" placeholder="+228 XX XX XX XX" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" leftIcon={<Ionicons name="call-outline" size={20} color={COLORS.textSecondary} />} />
          <Text style={styles.phoneNote}>Vous recevrez une notification pour confirmer le paiement</Text>
        </View>

        {statusMessage && (
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>{statusMessage}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button title={processing ? 'Traitement QOS...' : `Payer ${formatCurrency(totalAmount)}`} onPress={handlePayment} disabled={processing || !phoneNumber} loading={processing} style={styles.payButton} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
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
  headerTitle: { fontSize: FONT_SIZES['2xl'], fontWeight: FONT_WEIGHTS.semibold, color: COLORS.white },
  content: { flex: 1 },
  contentContainer: { padding: 24, paddingBottom: 120 },
  headerTitles: { flex: 1 },
  headerSubtitle: { fontSize: FONT_SIZES.sm, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  summary: { backgroundColor: `${COLORS.gray}4D`, borderRadius: 16, padding: 20, marginBottom: 24 },
  summaryTitle: { fontSize: FONT_SIZES.base, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, gap: 12 },
  summaryLabel: { fontSize: FONT_SIZES.base, color: COLORS.textSecondary },
  summaryValue: { flex: 1, textAlign: 'right', fontSize: FONT_SIZES.base, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text },
  summaryDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  summaryTotalLabel: { fontSize: FONT_SIZES.base, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text },
  summaryTotalValue: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.primary },
  passengerSection: { marginBottom: 24 },
  paymentSection: { marginBottom: 24 },
  sectionTitle: { fontSize: FONT_SIZES.base, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text, marginBottom: 16 },
  paymentHint: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: 12 },
  paymentMethods: { gap: 12 },
  paymentMethod: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderWidth: 2, borderColor: COLORS.border, borderRadius: 12, padding: 16 },
  paymentMethod_selected: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}0D` },
  paymentIcon: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  paymentMethodName: { flex: 1, fontSize: FONT_SIZES.base, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text },
  checkmark: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  phoneSection: { marginBottom: 24 },
  phoneNote: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: -8, marginLeft: 4 },
  statusBox: { backgroundColor: `${COLORS.primary}14`, borderColor: COLORS.primary, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 24 },
  statusText: { color: COLORS.primary, fontSize: FONT_SIZES.sm },
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
  payButton: { height: 56, borderRadius: 16 },
  paymentImage: { width: '100%', height: '100%', resizeMode: 'contain', borderRadius: 8 },
});
