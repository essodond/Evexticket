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
import { formatCurrency } from '../utils/mockData';
import Button from '../components/Button';

type Props = NativeStackScreenProps<RootStackParamList, 'Ticket'>;

export default function TicketScreen({ navigation, route }: Props) {
  const { trip } = route.params;
  const ticketNumber = `EVEX-${trip.trip_info?.id || trip.id}-${Date.now().toString().slice(-6)}`;
  const viewShotRef = useRef<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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

  // Helpers pour afficher correctement selon les champs backend
  const resolveCompanyName = (company: any) => {
    if (!company) return 'Compagnie';
    if (typeof company === 'string') return company;
    if (typeof company === 'number') return `Compagnie #${company}`;
    if (company?.name) return company.name;
    return 'Compagnie';
  };

  const resolveCityName = (city: any, fallbackName?: string) => {
    if (!city && fallbackName) return fallbackName;
    if (typeof city === 'string') return city;
    if (typeof city === 'number') return `Ville #${city}`;
    if (city?.name) return city.name;
    return fallbackName || 'Ville';
  };

  const fromCity = trip.trip_info?.departure_city_name || 'Ville de départ inconnue';
  const toCity = trip.trip_info?.arrival_city_name || 'Ville d\'arrivée inconnue';
  const departureTime = trip.trip_info?.departure_time || '';
  const arrivalTime = trip.trip_info?.arrival_time || '';
  const dateLabel = trip.date || '';
  const companyName = trip.trip_info?.company_name || 'Compagnie inconnue';

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
            <View style={styles.ticketHeaderTop}>
              <View>
                <Text style={styles.ticketNumberLabel}>Numéro de billet</Text>
                <Text style={styles.ticketNumber}>{ticketNumber}</Text>
              </View>
              {trip.seat_number && (
                <View style={styles.passengerBadge}>
                  <Text style={styles.passengerBadgeText}>Siège {trip.seat_number}</Text>
                </View>
              )}
            </View>

            <View style={styles.ticketRoute}>
              <View style={styles.ticketRouteItem}>
                <Text style={styles.ticketRouteLabel}>Départ</Text>
                <Text style={styles.ticketRouteCity}>{fromCity}</Text>
                <Text style={styles.ticketRouteTime}>{departureTime}</Text>
              </View>

              <View style={styles.ticketRouteLine}>
                <View style={styles.ticketRouteLineDot} />
                <Ionicons name="location" size={20} color="rgba(255,255,255,0.9)" />
                <View style={styles.ticketRouteLineDot} />
              </View>

              <View style={[styles.ticketRouteItem, styles.ticketRouteItem_end]}>
                <Text style={styles.ticketRouteLabel}>Arrivée</Text>
                <Text style={styles.ticketRouteCity}>{toCity}</Text>
                <Text style={styles.ticketRouteTime}>{arrivalTime}</Text>
              </View>
            </View>

              <View style={styles.ticketHeaderBottom}>
                <View>
                  <Text style={styles.ticketInfoLabel}>Date</Text>
                  <Text style={styles.ticketInfoValue}>{dateLabel}</Text>
                </View>
                <View style={styles.ticketInfoRight}>
                  <Text style={styles.ticketInfoLabel}>Compagnie</Text>
                  <Text style={styles.ticketInfoValue}>{companyName}</Text>
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
                value={ticketNumber}
                size={200}
                backgroundColor={COLORS.white}
                color={COLORS.black}
              />
            </View>
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
    padding: 24,
  },
  ticketHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  ticketNumberLabel: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  ticketNumber: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.white,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  passengerBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  passengerBadgeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
  },
  ticketRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  ticketRouteItem: {
    flex: 1,
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
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.white,
    marginBottom: 4,
  },
  ticketRouteTime: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.9)',
  },
  ticketRouteLine: {
    alignItems: 'center',
    marginHorizontal: 16,
  },
  ticketRouteLineDot: {
    width: 48,
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
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 4,
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
