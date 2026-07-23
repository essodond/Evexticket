import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  Image,
  useWindowDimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { RootStackParamList } from '../types';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/fonts';
import Button from '../components/Button';

type Props = NativeStackScreenProps<RootStackParamList, 'Ticket'>;

export default function TicketScreen({ navigation, route }: Props) {
  const { trip } = route.params;
  const viewShotRef = useRef<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { width } = useWindowDimensions();

  const ticketData = trip as any;
  const tripInfo = ticketData.trip_info || ticketData.trip_details || {};
  const rawReference =
    ticketData.ticket_reference ||
    ticketData.reference ||
    (ticketData.transaction_id && ticketData.transaction_id !== 'MODE-TEST'
      ? ticketData.transaction_id
      : null);
  const ticketNumber = rawReference || `EVEX-${String(ticketData.booking_id || ticketData.id || '000000').padStart(6, '0')}`;
  const passengerName =
    ticketData.passenger_full_name ||
    ticketData.passenger_name ||
    ticketData.client_name ||
    'Voyageur EVEX';
  const seatNumber = String(ticketData.seat_number || ticketData.seat || '?');
  const companyName = tripInfo.company_name || ticketData.company_name || ticketData.company || 'Compagnie EVEX';
  const companyLogo = tripInfo.company_logo || tripInfo.company_logo_url || ticketData.company_logo || null;
  const fromCity = tripInfo.departure_city_name || ticketData.departure_city_name || ticketData.from || 'Départ';
  const toCity = tripInfo.arrival_city_name || ticketData.arrival_city_name || ticketData.to || 'Arrivée';
  const departureTime = tripInfo.departure_time || ticketData.departure_time || ticketData.departure || '';
  const arrivalTime = tripInfo.arrival_time || ticketData.arrival_time || ticketData.arrival || '';
  const dateLabel = ticketData.scheduled_trip_date || ticketData.travel_date || ticketData.date || '';
  const companyInitials = companyName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase())
    .join('') || 'EV';
  const qrSize = Math.min(210, Math.max(164, width - 154));
  const qrPayload = JSON.stringify({
    type: 'EVEX_TICKET',
    reference: ticketNumber,
    booking_id: ticketData.booking_id || ticketData.id || null,
    passenger: passengerName,
    seat: seatNumber,
    company: companyName,
    departure: fromCity,
    arrival: toCity,
    date: dateLabel,
  });

  // Capturer le ticket en image
  const captureTicket = async (): Promise<string | null> => {
    try {
      if (!viewShotRef.current) return null;
      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1,
      });
      return uri;
    } catch (error) {
      console.error('Erreur capture ticket:', error);
      return null;
    }
  };

  // Enregistrer le ticket en photo dans la galerie
  const handleDownload = async () => {
    try {
      setIsProcessing(true);

      // Demander la permission d'accéder à la galerie
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'Veuillez autoriser l\'accès à la galerie pour enregistrer votre ticket.'
        );
        return;
      }

      const uri = await captureTicket();
      if (!uri) {
        Alert.alert('Erreur', 'Impossible de capturer le ticket. Réessayez.');
        return;
      }

      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert(
        '✅ Enregistré !',
        'Votre ticket a été enregistré dans votre galerie photo.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de l\'enregistrement.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Partager le ticket
  const handleShare = async () => {
    try {
      setIsProcessing(true);

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Indisponible', 'Le partage n\'est pas disponible sur cet appareil.');
        return;
      }

      const uri = await captureTicket();
      if (!uri) {
        Alert.alert('Erreur', 'Impossible de capturer le ticket. Réessayez.');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Partager mon ticket EVEX',
      });
    } catch (error) {
      console.error('Erreur partage:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du partage.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('MainTabs')}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon Ticket</Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.successBanner}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={24} color={COLORS.white} />
          </View>
          <View style={styles.successContent}>
            <Text style={styles.successTitle}>Réservation confirmée</Text>
            <Text style={styles.successText}>Votre billet a été généré avec succès</Text>
          </View>
        </View>

        <ViewShot
          ref={viewShotRef}
          options={{ format: 'png', quality: 1 }}
          style={{ backgroundColor: COLORS.white }}
        >
        <View style={styles.ticket} collapsable={false}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.ticketHeader}
          >
            <View style={styles.companyBrandRow}>
              <View style={styles.companyLogoShell}>
                {companyLogo ? (
                  <Image source={{ uri: companyLogo }} style={styles.companyLogo} resizeMode="contain" />
                ) : (
                  <Text style={styles.companyInitials}>{companyInitials}</Text>
                )}
              </View>
              <View style={styles.companyBrandContent}>
                <Text style={styles.companyEyebrow}>COMPAGNIE</Text>
                <Text style={styles.companyBrandName} numberOfLines={1} adjustsFontSizeToFit>{companyName}</Text>
              </View>
            </View>

            <View style={styles.ticketHeaderTop}>
              <View style={styles.ticketReferenceBlock}>
                <Text style={styles.ticketNumberLabel}>RÉFÉRENCE DU BILLET</Text>
                <Text style={styles.ticketNumber} numberOfLines={1} adjustsFontSizeToFit>{ticketNumber}</Text>
              </View>
              <View style={styles.passengerBadge}>
                <Ionicons name="bus-outline" size={14} color={COLORS.white} />
                <Text style={styles.passengerBadgeText}>Confirmé</Text>
              </View>
            </View>

            <View style={styles.passengerPanel}>
              <View style={styles.passengerIcon}>
                <Ionicons name="person" size={20} color={COLORS.primaryDark} />
              </View>
              <View style={styles.passengerContent}>
                <Text style={styles.passengerLabel}>VOYAGEUR</Text>
                <Text style={styles.passengerName} numberOfLines={1} adjustsFontSizeToFit>{passengerName}</Text>
              </View>
              <View style={styles.seatPill}>
                <Text style={styles.seatPillLabel}>SIÈGE</Text>
                <Text style={styles.seatPillValue}>{seatNumber}</Text>
              </View>
            </View>

            <View style={styles.ticketRoute}>
              <View style={styles.ticketRouteItem}>
                <Text style={styles.ticketRouteLabel}>Départ</Text>
                <Text style={styles.ticketRouteCity} numberOfLines={2}>{fromCity}</Text>
                <Text style={styles.ticketRouteTime}>{departureTime}</Text>
              </View>

              <View style={styles.ticketRouteLine}>
                <View style={styles.ticketRouteLineDot} />
                <Ionicons name="location" size={20} color="rgba(255,255,255,0.9)" />
                <View style={styles.ticketRouteLineDot} />
              </View>

              <View style={[styles.ticketRouteItem, styles.ticketRouteItem_end]}>
                <Text style={styles.ticketRouteLabel}>Arrivée</Text>
                <Text style={styles.ticketRouteCity} numberOfLines={2}>{toCity}</Text>
                <Text style={styles.ticketRouteTime}>{arrivalTime}</Text>
              </View>
            </View>

              <View style={styles.ticketHeaderBottom}>
                <View>
                  <Text style={styles.ticketInfoLabel}>Date</Text>
                  <Text style={styles.ticketInfoValue}>{dateLabel}</Text>
                </View>
                <View style={styles.ticketInfoRight}>
                  <Text style={styles.ticketInfoLabel}>Siège</Text>
                  <Text style={styles.ticketInfoValue}>{seatNumber}</Text>
                </View>
              </View>
          </LinearGradient>

          <View style={styles.ticketDivider}>
            <View style={styles.ticketNotchLeft} />
            <View style={styles.ticketNotchRight} />
            <View style={styles.ticketDividerLine} />
          </View>

          <View style={styles.ticketQR}>
            <Text style={styles.qrLabel}>Scannez ce code à la gare</Text>
            <View style={styles.qrCodeContainer}>
              <QRCode
                value={qrPayload}
                size={qrSize}
                backgroundColor={COLORS.white}
                color={COLORS.black}
              />
            </View>
            <Text style={styles.qrReference}>{ticketNumber}</Text>
            <Text style={styles.qrNote}>
              Présentez ce QR code au chauffeur ou à l'agent de la compagnie avant l'embarquement
            </Text>
          </View>
        </View>
        </ViewShot>

        {isProcessing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.processingText}>Traitement en cours...</Text>
          </View>
        )}

        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            ℹ️ Veuillez arriver 15 minutes avant le départ. Conservez ce ticket jusqu'à la fin de votre voyage.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            title="Partager"
            onPress={handleShare}
            variant="outline"
            icon={<Ionicons name="share-outline" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />}
            style={styles.actionButton}
            disabled={isProcessing}
          />
          <Button
            title="Enregistrer"
            onPress={handleDownload}
            icon={<Ionicons name="download-outline" size={20} color={COLORS.white} style={{ marginRight: 8 }} />}
            style={styles.actionButton}
            disabled={isProcessing}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: `${COLORS.gray}33`,
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
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#81C784',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  successIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  successContent: {
    flex: 1,
  },
  successTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#2E7D32',
    marginBottom: 2,
  },
  successText: {
    fontSize: FONT_SIZES.sm,
    color: '#388E3C',
  },
  ticket: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  ticketHeader: {
    padding: 20,
  },
  companyBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  companyLogoShell: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  companyLogo: {
    width: 42,
    height: 42,
  },
  companyInitials: {
    color: COLORS.primaryDark,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  companyBrandContent: {
    flex: 1,
    marginLeft: 12,
  },
  companyEyebrow: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 1.2,
  },
  companyBrandName: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    marginTop: 2,
  },
  ticketHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  ticketReferenceBlock: {
    flex: 1,
    paddingRight: 12,
  },
  ticketNumberLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.72)',
    marginBottom: 4,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 0.8,
  },
  ticketNumber: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.white,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  passengerBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  passengerBadgeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  passengerPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 24,
  },
  passengerIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passengerContent: {
    flex: 1,
    marginHorizontal: 10,
  },
  passengerLabel: {
    color: 'rgba(255,255,255,0.66)',
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 0.9,
  },
  passengerName: {
    color: COLORS.white,
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.bold,
    marginTop: 2,
  },
  seatPill: {
    minWidth: 52,
    backgroundColor: COLORS.white,
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: 'center',
  },
  seatPillLabel: {
    color: COLORS.textMuted,
    fontSize: 8,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 0.6,
  },
  seatPillValue: {
    color: COLORS.primaryDark,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  ticketRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 26,
  },
  ticketRouteItem: {
    flex: 1,
    minWidth: 0,
  },
  ticketRouteItem_end: {
    alignItems: 'flex-end',
  },
  ticketRouteLabel: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  ticketRouteCity: {
    fontSize: 24,
    lineHeight: 29,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.white,
    marginTop: 5,
    marginBottom: 6,
    minHeight: 29,
    flexShrink: 1,
  },
  ticketRouteTime: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.9)',
  },
  ticketRouteLine: {
    alignItems: 'center',
    marginHorizontal: 8,
  },
  ticketRouteLineDot: {
    width: 28,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginVertical: 4,
  },
  ticketHeaderBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  ticketInfoLabel: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  ticketInfoValue: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.white,
  },
  ticketInfoRight: {
    alignItems: 'flex-end',
  },
  ticketDivider: {
    height: 2,
    position: 'relative',
  },
  ticketNotchLeft: {
    position: 'absolute',
    left: -16,
    top: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${COLORS.gray}33`,
  },
  ticketNotchRight: {
    position: 'absolute',
    right: -16,
    top: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${COLORS.gray}33`,
  },
  ticketDividerLine: {
    height: 2,
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ticketQR: {
    padding: 32,
    alignItems: 'center',
  },
  qrLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  qrCodeContainer: {
    padding: 14,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  qrNote: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    maxWidth: 280,
    lineHeight: 18,
  },
  qrReference: {
    marginTop: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    letterSpacing: 0.4,
  },
  notice: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: `${COLORS.primary}33`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  noticeText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
  },
  processingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  processingText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.medium,
  },
});
