import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/fonts';
import {
  getManageableTrackingTrips,
  getTripTracking,
  sendTripPosition,
  startTripTracking,
  stopTripTracking,
} from '../services/api';
import {
  ManageableTrackingTrip,
  RootStackParamList,
  TrackingPosition,
  TrackingSnapshot,
} from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'StartTracking'>;

const timeLabel = (value: string) => new Date(value).toLocaleTimeString('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const PositionItem = ({ item }: { item: TrackingPosition }) => (
  <View style={styles.positionRow}>
    <View style={styles.positionIcon}>
      <Ionicons name="navigate" size={15} color={COLORS.primary} />
    </View>
    <View style={styles.positionCopy}>
      <Text style={styles.positionTime}>{timeLabel(item.recorded_at)}</Text>
      <Text style={styles.positionCoords}>
        {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
      </Text>
    </View>
    <Text style={styles.positionNote}>{Math.round(item.speed_kmh ?? 0)} km/h</Text>
  </View>
);

export default function StartTrackingScreen({ route }: Props) {
  const insets = useSafeAreaInsets();
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const sendingRef = useRef(false);
  const [trips, setTrips] = useState<ManageableTrackingTrip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<number | null>(
    route.params?.tripId ? Number(route.params.tripId) : null,
  );
  const [snapshot, setSnapshot] = useState<TrackingSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const selectedTrip = trips.find((trip) => trip.id === selectedTripId) ?? null;

  const loadTrips = useCallback(async () => {
    try {
      const availableTrips = await getManageableTrackingTrips();
      setTrips(availableTrips);
      setSelectedTripId((current) => current ?? availableTrips[0]?.id ?? null);
    } catch (error) {
      setGpsError(error instanceof Error ? error.message : 'Impossible de charger les voyages.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTrips();
    return () => {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [loadTrips]);

  useEffect(() => {
    if (!selectedTripId) {
      setSnapshot(null);
      return;
    }
    void getTripTracking(selectedTripId)
      .then(setSnapshot)
      .catch(() => setSnapshot(null));
  }, [selectedTripId]);

  const sendLocation = useCallback(async (tripId: number, location: Location.LocationObject) => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    try {
      const speed = location.coords.speed;
      const heading = location.coords.heading;
      const nextSnapshot = await sendTripPosition(tripId, {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy_m: location.coords.accuracy,
        speed_mps: speed !== null && speed >= 0 ? speed : null,
        heading: heading !== null && heading >= 0 ? heading : null,
        recorded_at: new Date(location.timestamp).toISOString(),
      });
      setSnapshot(nextSnapshot);
      setGpsError(null);
    } catch (error) {
      setGpsError(error instanceof Error ? error.message : 'Échec de transmission GPS.');
    } finally {
      sendingRef.current = false;
    }
  }, []);

  const startLiveLocation = async () => {
    if (!selectedTripId) {
      Alert.alert('Voyage requis', 'Sélectionnez le voyage à suivre.');
      return;
    }
    setStarting(true);
    setGpsError(null);
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) throw new Error('Activez le GPS du téléphone.');
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        throw new Error('La permission GPS est nécessaire pour transmettre la position du bus.');
      }

      await startTripTracking(selectedTripId);
      subscriptionRef.current?.remove();
      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      await sendLocation(selectedTripId, initialLocation);
      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 5000,
          distanceInterval: 20,
        },
        (location) => void sendLocation(selectedTripId, location),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de démarrer le GPS.';
      setGpsError(message);
      Alert.alert('Suivi GPS', message);
    } finally {
      setStarting(false);
    }
  };

  const stopLiveLocation = async () => {
    if (!selectedTripId) return;
    setStopping(true);
    try {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      const nextSnapshot = await stopTripTracking(selectedTripId);
      setSnapshot(nextSnapshot);
    } catch (error) {
      Alert.alert(
        'Suivi GPS',
        error instanceof Error ? error.message : 'Impossible d’arrêter le suivi.',
      );
    } finally {
      setStopping(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement des voyages…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Mode chauffeur</Text>
        <Text style={styles.subtitle}>Transmettez la position réelle du bus aux voyageurs</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>VOYAGE À SUIVRE</Text>
        {trips.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={32} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Aucun voyage disponible</Text>
            <Text style={styles.emptyText}>Les voyages de votre compagnie apparaîtront ici.</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tripList}>
            {trips.map((trip) => {
              const selected = trip.id === selectedTripId;
              return (
                <TouchableOpacity
                  key={trip.id}
                  style={[styles.tripCard, selected && styles.tripCardSelected]}
                  onPress={() => {
                    if (subscriptionRef.current) {
                      Alert.alert('Suivi en cours', 'Arrêtez le suivi actuel avant de changer de voyage.');
                      return;
                    }
                    setSelectedTripId(trip.id);
                  }}
                >
                  <View style={styles.tripTopRow}>
                    <Text style={[styles.tripCompany, selected && styles.tripSelectedText]} numberOfLines={1}>
                      {trip.company_name}
                    </Text>
                    {trip.tracking_active && <View style={styles.activeDot} />}
                  </View>
                  <Text style={[styles.tripRoute, selected && styles.tripSelectedText]}>
                    {trip.departure_city} → {trip.arrival_city}
                  </Text>
                  <Text style={[styles.tripMeta, selected && styles.tripSelectedMeta]}>
                    {trip.date} • {trip.departure_time.slice(0, 5)} • #{trip.id}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {selectedTrip && (
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Ionicons name="bus" size={25} color={COLORS.primary} />
            </View>
            <View style={styles.infoCopy}>
              <Text style={styles.infoValue}>{selectedTrip.departure_city} → {selectedTrip.arrival_city}</Text>
              <Text style={styles.infoSmall}>Départ {selectedTrip.departure_time.slice(0, 5)} • Voyage #{selectedTrip.id}</Text>
            </View>
          </View>
        )}

        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.startButton, (!selectedTripId || snapshot?.is_active) && styles.disabledButton]}
            onPress={() => void startLiveLocation()}
            disabled={!selectedTripId || starting || Boolean(snapshot?.is_active && subscriptionRef.current)}
          >
            {starting ? <ActivityIndicator color={COLORS.white} /> : <Ionicons name="navigate" size={20} color={COLORS.white} />}
            <Text style={styles.startButtonText}>{snapshot?.is_active ? 'Reprendre le GPS' : 'Démarrer'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.stopButton, !snapshot?.is_active && styles.disabledStopButton]}
            onPress={() => void stopLiveLocation()}
            disabled={!snapshot?.is_active || stopping}
          >
            {stopping ? <ActivityIndicator color={COLORS.error} /> : <Ionicons name="stop-circle-outline" size={20} color={COLORS.error} />}
            <Text style={styles.stopButtonText}>Arrêter</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.gpsCard}>
          <View style={styles.gpsHeader}>
            <View>
              <Text style={styles.gpsLabel}>ÉTAT DU GPS</Text>
              <Text style={[styles.gpsStatus, snapshot?.is_active && styles.gpsActive]}>
                {snapshot?.is_active ? 'Transmission active' : 'Inactif'}
              </Text>
            </View>
            <View style={[styles.signalIcon, snapshot?.is_active && styles.signalIconActive]}>
              <Ionicons name="radio" size={24} color={snapshot?.is_active ? COLORS.success : COLORS.textMuted} />
            </View>
          </View>
          <Text style={styles.currentPos}>
            Position : {snapshot?.current_position
              ? `${snapshot.current_position.latitude.toFixed(5)}, ${snapshot.current_position.longitude.toFixed(5)}`
              : '--, --'}
          </Text>
          <View style={styles.gpsMetrics}>
            <Text style={styles.gpsMetric}>Précision : {Math.round(snapshot?.current_position?.accuracy_m ?? 0)} m</Text>
            <Text style={styles.gpsMetric}>Vitesse : {Math.round(snapshot?.current_position?.speed_kmh ?? 0)} km/h</Text>
          </View>
          {gpsError && <Text style={styles.gpsError}>{gpsError}</Text>}
          <Text style={styles.foregroundNotice}>
            Gardez cet écran ouvert pendant le trajet pour continuer l’envoi GPS.
          </Text>
        </View>

        <View style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>Positions transmises</Text>
            <Text style={styles.historyCount}>{snapshot?.history.length ?? 0}</Text>
          </View>
          <FlatList
            data={snapshot?.history ?? []}
            keyExtractor={(item) => String(item.id ?? item.recorded_at)}
            renderItem={({ item }) => <PositionItem item={item} />}
            scrollEnabled={false}
            ListEmptyComponent={<Text style={styles.emptyHistory}>Aucune position transmise.</Text>}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  loadingText: { marginTop: 12, color: COLORS.textSecondary },
  header: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 14 },
  title: { fontSize: FONT_SIZES['2xl'], fontWeight: FONT_WEIGHTS.bold, color: COLORS.text },
  subtitle: { color: COLORS.textSecondary, marginTop: 5 },
  content: { paddingBottom: 30 },
  sectionLabel: { marginHorizontal: 20, marginBottom: 9, marginTop: 4, fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  tripList: { paddingHorizontal: 20, paddingBottom: 14 },
  tripCard: { width: 245, backgroundColor: COLORS.white, borderRadius: 16, padding: 15, marginRight: 12, borderWidth: 1, borderColor: COLORS.border },
  tripCardSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tripTopRow: { flexDirection: 'row', alignItems: 'center' },
  tripCompany: { flex: 1, fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontWeight: FONT_WEIGHTS.semibold },
  activeDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.success },
  tripRoute: { fontSize: FONT_SIZES.base, fontWeight: FONT_WEIGHTS.bold, color: COLORS.text, marginTop: 7 },
  tripMeta: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 7 },
  tripSelectedText: { color: COLORS.white },
  tripSelectedMeta: { color: 'rgba(255,255,255,0.75)' },
  emptyCard: { marginHorizontal: 20, backgroundColor: COLORS.white, borderRadius: 16, padding: 22, alignItems: 'center', marginBottom: 14 },
  emptyTitle: { marginTop: 9, color: COLORS.text, fontWeight: FONT_WEIGHTS.bold },
  emptyText: { marginTop: 4, color: COLORS.textSecondary, textAlign: 'center', fontSize: FONT_SIZES.sm },
  infoCard: { backgroundColor: COLORS.white, marginHorizontal: 20, borderRadius: 16, padding: 15, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  infoIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EAF4FF', alignItems: 'center', justifyContent: 'center' },
  infoCopy: { flex: 1, marginLeft: 12 },
  infoValue: { fontSize: FONT_SIZES.base, fontWeight: FONT_WEIGHTS.bold, color: COLORS.text },
  infoSmall: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 5 },
  controlsRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 12 },
  startButton: { flex: 1, height: 50, borderRadius: 14, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  disabledButton: { opacity: 0.55 },
  startButtonText: { color: COLORS.white, fontWeight: FONT_WEIGHTS.bold, marginLeft: 7 },
  stopButton: { flex: 1, height: 50, borderRadius: 14, backgroundColor: COLORS.white, borderColor: '#FECACA', borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  disabledStopButton: { opacity: 0.45 },
  stopButtonText: { color: COLORS.error, fontWeight: FONT_WEIGHTS.bold, marginLeft: 7 },
  gpsCard: { backgroundColor: COLORS.white, marginHorizontal: 20, borderRadius: 16, padding: 16, marginBottom: 14 },
  gpsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gpsLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  gpsStatus: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.error, marginTop: 5 },
  gpsActive: { color: COLORS.success },
  signalIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.grayLight, alignItems: 'center', justifyContent: 'center' },
  signalIconActive: { backgroundColor: '#DCFCE7' },
  currentPos: { fontSize: FONT_SIZES.sm, color: COLORS.text, marginTop: 14 },
  gpsMetrics: { flexDirection: 'row', marginTop: 8 },
  gpsMetric: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginRight: 18 },
  gpsError: { color: COLORS.error, fontSize: FONT_SIZES.xs, marginTop: 9 },
  foregroundNotice: { backgroundColor: '#EFF6FF', color: '#1D4ED8', fontSize: FONT_SIZES.xs, lineHeight: 18, padding: 10, borderRadius: 10, marginTop: 12 },
  historyCard: { backgroundColor: COLORS.white, marginHorizontal: 20, borderRadius: 16, padding: 14 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  sectionTitle: { fontSize: FONT_SIZES.base, fontWeight: FONT_WEIGHTS.bold, color: COLORS.text },
  historyCount: { color: COLORS.primary, backgroundColor: '#EAF4FF', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, fontSize: FONT_SIZES.xs },
  positionRow: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', flexDirection: 'row', alignItems: 'center' },
  positionIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EAF4FF', alignItems: 'center', justifyContent: 'center' },
  positionCopy: { flex: 1, marginLeft: 10 },
  positionTime: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text },
  positionCoords: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 3 },
  positionNote: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  emptyHistory: { color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 18 },
});
