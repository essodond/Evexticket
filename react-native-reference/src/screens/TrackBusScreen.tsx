import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/fonts';
import { getTripTracking } from '../services/api';
import { RootStackParamList, TrackingSnapshot } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'TrackBus'>;

const formatClock = (value: string | null) => {
  if (!value) return '--:--';
  return new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

const trackingLabel = (snapshot: TrackingSnapshot) => {
  if (snapshot.status === 'live') return 'En direct';
  if (snapshot.status === 'offline') return 'Signal GPS interrompu';
  if (snapshot.status === 'stopped') return 'Suivi terminé';
  return 'Suivi pas encore démarré';
};

export default function TrackBusScreen({ route }: Props) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const notifiedAlertRef = useRef<string | null>(null);
  const tripId = route.params?.tripId;
  const [snapshot, setSnapshot] = useState<TrackingSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');

  const loadTracking = useCallback(async (silent = false) => {
    if (!tripId) {
      setError('Identifiant du voyage introuvable.');
      setLoading(false);
      return;
    }
    if (!silent) setRefreshing(true);
    try {
      const nextSnapshot = await getTripTracking(tripId);
      setSnapshot(nextSnapshot);
      setError(null);
    } catch (trackingError) {
      setError(
        trackingError instanceof Error
          ? trackingError.message
          : 'Impossible de récupérer la position du bus.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tripId]);

  useEffect(() => {
    void loadTracking(true);
    const poller = setInterval(() => void loadTracking(true), 8000);
    return () => clearInterval(poller);
  }, [loadTracking]);

  useEffect(() => {
    const alert = snapshot?.approach_alert;
    if (!alert?.active || !alert.stop_name) return;
    const alertKey = `${tripId}:${alert.stop_name}`;
    if (notifiedAlertRef.current === alertKey) return;
    notifiedAlertRef.current = alertKey;
    void Notifications.scheduleNotificationAsync({
      content: {
        title: 'Votre bus approche 🚌',
        body: `Le bus est à environ ${alert.distance_km ?? '--'} km de ${alert.stop_name}.`,
        sound: 'default',
      },
      trigger: null,
    });
  }, [snapshot?.approach_alert, tripId]);

  useEffect(() => {
    const position = snapshot?.current_position;
    if (!position) return;
    mapRef.current?.animateCamera(
      {
        center: { latitude: position.latitude, longitude: position.longitude },
        zoom: 11,
        heading: position.heading ?? 0,
      },
      { duration: 700 },
    );
  }, [snapshot?.current_position?.latitude, snapshot?.current_position?.longitude]);

  const routeCoordinates = useMemo(
    () => (snapshot?.stops ?? [])
      .filter((stop) => stop.latitude !== null && stop.longitude !== null)
      .map((stop) => ({ latitude: stop.latitude!, longitude: stop.longitude! })),
    [snapshot?.stops],
  );

  const initialPoint = snapshot?.current_position
    ? {
        latitude: snapshot.current_position.latitude,
        longitude: snapshot.current_position.longitude,
      }
    : routeCoordinates[0] ?? { latitude: 8.6195, longitude: 0.8248 };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Connexion au GPS du bus…</Text>
      </View>
    );
  }

  if (error && !snapshot) {
    return (
      <View style={styles.centered}>
        <Ionicons name="location-outline" size={52} color={COLORS.textMuted} />
        <Text style={styles.errorTitle}>Suivi indisponible</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => void loadTracking()}>
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!snapshot) return null;

  const delayText = snapshot.delay_minutes > 5
    ? `+${snapshot.delay_minutes} min de retard`
    : snapshot.delay_minutes < -5
      ? `${Math.abs(snapshot.delay_minutes)} min d’avance`
      : 'À l’heure';

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Suivre mon bus</Text>
          <Text style={styles.subtitle}>
            {snapshot.route.departure_city} → {snapshot.route.arrival_city}
          </Text>
        </View>
        <View style={[styles.livePill, snapshot.status !== 'live' && styles.offlinePill]}>
          <View style={[styles.liveDot, snapshot.status !== 'live' && styles.offlineDot]} />
          <Text style={styles.liveText}>{trackingLabel(snapshot)}</Text>
        </View>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          mapType={mapType}
          initialRegion={{ ...initialPoint, latitudeDelta: 0.7, longitudeDelta: 0.7 }}
        >
          {routeCoordinates.length > 1 && (
            <Polyline coordinates={routeCoordinates} strokeColor={COLORS.primary} strokeWidth={4} />
          )}
          {snapshot.stops
            .filter((stop) => stop.latitude !== null && stop.longitude !== null)
            .map((stop) => (
              <Marker
                key={stop.id}
                coordinate={{ latitude: stop.latitude!, longitude: stop.longitude! }}
                title={stop.station_name}
                description={stop.status === 'passed' ? 'Arrêt parcouru' : stop.status === 'next' ? 'Prochain arrêt' : 'À venir'}
                pinColor={stop.status === 'passed' ? COLORS.success : stop.status === 'next' ? COLORS.warning : COLORS.primary}
              />
            ))}
          {snapshot.current_position && (
            <Marker
              coordinate={{
                latitude: snapshot.current_position.latitude,
                longitude: snapshot.current_position.longitude,
              }}
              title="Bus EVEX"
              description={`Mis à jour à ${formatClock(snapshot.current_position.recorded_at)}`}
              anchor={{ x: 0.5, y: 0.5 }}
              rotation={snapshot.current_position.heading ?? 0}
            >
              <View style={styles.busMarker}>
                <Ionicons name="bus" size={22} color={COLORS.white} />
              </View>
            </Marker>
          )}
        </MapView>
        <TouchableOpacity
          style={styles.mapTypeButton}
          onPress={() => setMapType((value) => value === 'standard' ? 'satellite' : 'standard')}
        >
          <Ionicons name={mapType === 'standard' ? 'earth-outline' : 'map-outline'} size={19} color={COLORS.text} />
          <Text style={styles.mapTypeText}>{mapType === 'standard' ? 'Satellite' : 'Plan'}</Text>
        </TouchableOpacity>
        {snapshot.is_stale && (
          <View style={styles.staleBanner}>
            <Ionicons name="warning-outline" size={17} color="#92400E" />
            <Text style={styles.staleText}>Dernière position reçue il y a plus de 2 minutes</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.infoArea}
        contentContainerStyle={styles.infoContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void loadTracking()} tintColor={COLORS.primary} />
        }
      >
        {snapshot.approach_alert.active && (
          <View style={styles.approachCard}>
            <Ionicons name="notifications" size={22} color="#8A4B00" />
            <View style={styles.approachContent}>
              <Text style={styles.approachTitle}>Le bus approche de votre arrêt</Text>
              <Text style={styles.approachText}>
                Environ {snapshot.approach_alert.distance_km} km avant {snapshot.approach_alert.stop_name}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Arrivée estimée</Text>
            <Text style={styles.metricValue}>{formatClock(snapshot.estimated_arrival_at)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Vitesse actuelle</Text>
            <Text style={styles.metricValue}>{Math.round(snapshot.current_position?.speed_kmh ?? 0)} km/h</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Temps restant</Text>
            <Text style={styles.metricValue}>{snapshot.eta_minutes ?? '--'} min</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Distance restante</Text>
            <Text style={styles.metricValue}>{snapshot.distance_remaining_km ?? '--'} km</Text>
          </View>
        </View>

        <View style={styles.delayCard}>
          <Ionicons
            name={snapshot.delay_minutes > 5 ? 'time-outline' : 'checkmark-circle-outline'}
            size={21}
            color={snapshot.delay_minutes > 5 ? COLORS.warning : COLORS.success}
          />
          <Text style={[styles.delayText, snapshot.delay_minutes > 5 && styles.delayedText]}>{delayText}</Text>
          <Text style={styles.lastUpdate}>GPS : {formatClock(snapshot.updated_at)}</Text>
        </View>

        <View style={styles.timelineCard}>
          <Text style={styles.sectionTitle}>Progression des arrêts</Text>
          {snapshot.stops.map((stop, index) => (
            <View key={stop.id} style={styles.timelineItem}>
              <View style={styles.timelineRail}>
                <View style={[
                  styles.timelineDot,
                  stop.status === 'passed' && styles.timelineDotPassed,
                  stop.status === 'next' && styles.timelineDotNext,
                ]}>
                  {stop.status === 'passed' && <Ionicons name="checkmark" size={11} color={COLORS.white} />}
                </View>
                {index < snapshot.stops.length - 1 && (
                  <View style={[styles.timelineLine, stop.status === 'passed' && styles.timelineLinePassed]} />
                )}
              </View>
              <View style={styles.timelineCopy}>
                <Text style={[styles.timelineTitle, stop.status === 'passed' && styles.timelineTitlePassed]}>
                  {stop.city_name}
                </Text>
                <Text style={styles.timelineStation}>{stop.station_name}</Text>
                <Text style={styles.timelineStatus}>
                  {stop.status === 'passed' ? 'Parcouru' : stop.status === 'next' ? 'Prochain arrêt' : 'À venir'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: COLORS.background },
  loadingText: { marginTop: 14, color: COLORS.textSecondary },
  errorTitle: { marginTop: 14, fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.text },
  errorText: { marginTop: 8, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21 },
  retryButton: { marginTop: 20, backgroundColor: COLORS.primary, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: COLORS.white, fontWeight: FONT_WEIGHTS.bold },
  header: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: FONT_SIZES['2xl'], fontWeight: FONT_WEIGHTS.bold, color: COLORS.text },
  subtitle: { color: COLORS.textSecondary, marginTop: 4 },
  livePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DCFCE7', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7, maxWidth: 155 },
  offlinePill: { backgroundColor: '#FEF3C7' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success, marginRight: 6 },
  offlineDot: { backgroundColor: COLORS.warning },
  liveText: { fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text, flexShrink: 1 },
  mapContainer: { height: 310, marginHorizontal: 16, borderRadius: 20, overflow: 'hidden', backgroundColor: COLORS.gray },
  mapTypeButton: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.94)', paddingHorizontal: 11, paddingVertical: 9, borderRadius: 12 },
  mapTypeText: { marginLeft: 6, fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text },
  staleBanner: { position: 'absolute', left: 12, right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', padding: 10, borderRadius: 12 },
  staleText: { marginLeft: 7, color: '#92400E', fontSize: FONT_SIZES.xs, flex: 1 },
  busMarker: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, borderWidth: 3, borderColor: COLORS.white, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.black, shadowOpacity: 0.25, shadowRadius: 5, elevation: 5 },
  infoArea: { flex: 1 },
  infoContent: { padding: 16, paddingBottom: 30 },
  approachCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7D6', borderColor: '#F4D86B', borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 14 },
  approachContent: { marginLeft: 11, flex: 1 },
  approachTitle: { color: '#5F3A00', fontWeight: FONT_WEIGHTS.bold },
  approachText: { color: '#8A5B13', fontSize: FONT_SIZES.sm, marginTop: 3 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  metricCard: { width: '48%', backgroundColor: COLORS.white, borderRadius: 15, padding: 14, marginBottom: 12 },
  metricLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  metricValue: { marginTop: 7, fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.text },
  delayCard: { backgroundColor: COLORS.white, borderRadius: 15, padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  delayText: { color: COLORS.success, fontWeight: FONT_WEIGHTS.semibold, marginLeft: 8, flex: 1 },
  delayedText: { color: COLORS.warning },
  lastUpdate: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs },
  timelineCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.text, marginBottom: 15 },
  timelineItem: { flexDirection: 'row', minHeight: 76 },
  timelineRail: { width: 26, alignItems: 'center' },
  timelineDot: { width: 15, height: 15, borderRadius: 8, backgroundColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', marginTop: 3 },
  timelineDotPassed: { backgroundColor: COLORS.success },
  timelineDotNext: { backgroundColor: COLORS.warning, borderWidth: 3, borderColor: '#FEF3C7' },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#E2E8F0' },
  timelineLinePassed: { backgroundColor: COLORS.success },
  timelineCopy: { flex: 1, paddingLeft: 9, paddingBottom: 16 },
  timelineTitle: { fontSize: FONT_SIZES.base, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text },
  timelineTitlePassed: { color: COLORS.textSecondary },
  timelineStation: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm, marginTop: 2 },
  timelineStatus: { color: COLORS.primary, fontSize: FONT_SIZES.xs, marginTop: 4 },
});
