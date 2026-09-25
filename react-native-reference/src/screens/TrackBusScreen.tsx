import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import * as Notifications from '../services/notifications';

import IncidentReportModal from '../components/IncidentReportModal';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/fonts';
import { getTripTracking, reportTripIncident } from '../services/api';
import { RootStackParamList, SafetyIncidentReportPayload, TrackingSnapshot } from '../types';

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

const safetyPriority = { critical: 4, high: 3, medium: 2, low: 1 } as const;

export default function TrackBusScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { width, height } = useWindowDimensions();
  const mapRef = useRef<MapView>(null);
  const mountedRef = useRef(true);
  const pollingActiveRef = useRef(false);
  const requestInFlightRef = useRef(false);
  const refreshQueuedRef = useRef(false);
  const loadTrackingRef = useRef<(silent?: boolean) => Promise<void>>(async () => undefined);
  const notifiedAlertRef = useRef<string | null>(null);
  const notifiedIncidentRefs = useRef<Set<string>>(new Set());
  const tripId = route.params?.tripId;
  const [snapshot, setSnapshot] = useState<TrackingSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const [appState, setAppState] = useState(AppState.currentState);
  const [incidentModalVisible, setIncidentModalVisible] = useState(false);
  const [incidentNotificationsReady, setIncidentNotificationsReady] = useState(false);
  const incidentNotificationStorageKey = `evex:notified-safety-incidents:${String(tripId ?? 'unknown')}`;
  const compactHeader = width < 390;
  const singleColumnMetrics = width < 350;
  const mapHeight = Math.max(220, Math.min(330, Math.round(width * 0.7), Math.round(height * 0.42)));
  pollingActiveRef.current = isFocused && appState === 'active';

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('MainTabs');
  }, [navigation]);

  const renderBackButton = (floating = false) => (
    <TouchableOpacity
      style={[
        styles.backButton,
        floating && styles.floatingBackButton,
        floating && { top: insets.top + 8 },
      ]}
      onPress={handleBack}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Retour"
      accessibilityHint="Revenir à l’écran précédent"
    >
      <Ionicons name="chevron-back" size={25} color={COLORS.text} />
    </TouchableOpacity>
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pollingActiveRef.current = false;
      refreshQueuedRef.current = false;
    };
  }, []);

  const loadTracking = useCallback(async (silent = false) => {
    if (!mountedRef.current) return;
    if (!tripId) {
      setError('Identifiant du voyage introuvable.');
      setLoading(false);
      return;
    }
    if (requestInFlightRef.current) {
      refreshQueuedRef.current = true;
      return;
    }
    requestInFlightRef.current = true;
    if (!silent) setRefreshing(true);
    try {
      const nextSnapshot = await getTripTracking(tripId);
      if (mountedRef.current) {
        setSnapshot(nextSnapshot);
        setError(null);
      }
    } catch (trackingError) {
      if (mountedRef.current) {
        setError(
          trackingError instanceof Error
            ? trackingError.message
            : 'Impossible de récupérer la position du bus.',
        );
      }
    } finally {
      requestInFlightRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
      if (mountedRef.current && pollingActiveRef.current && refreshQueuedRef.current) {
        refreshQueuedRef.current = false;
        setTimeout(() => void loadTrackingRef.current(true), 0);
      } else {
        refreshQueuedRef.current = false;
      }
    }
  }, [tripId]);

  loadTrackingRef.current = loadTracking;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!isFocused || appState !== 'active') return undefined;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      if (cancelled) return;
      await loadTracking(true);
      if (!cancelled) timer = setTimeout(poll, 8000);
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [appState, isFocused, loadTracking]);

  const reportIncident = useCallback(async (
    payload: Omit<SafetyIncidentReportPayload, 'latitude' | 'longitude' | 'accuracy_m' | 'occurred_at'>,
  ) => {
    if (!tripId) throw new Error('Identifiant du voyage introuvable.');
    let location: Location.LocationObject | null = null;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status === Location.PermissionStatus.GRANTED) {
        location = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
        ]);
        if (location?.coords.accuracy != null && location.coords.accuracy > 150) location = null;
      }
    } catch {
      location = null;
    }
    const incident = await reportTripIncident(tripId, {
      ...payload,
      occurred_at: location ? new Date(location.timestamp).toISOString() : new Date().toISOString(),
      ...(location ? {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy_m: location.coords.accuracy,
      } : {}),
    });
    await loadTracking(true);
    return incident.id;
  }, [loadTracking, tripId]);

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
    }).catch(() => {
      if (notifiedAlertRef.current === alertKey) notifiedAlertRef.current = null;
    });
  }, [snapshot?.approach_alert, tripId]);

  useEffect(() => {
    let mounted = true;
    setIncidentNotificationsReady(false);
    void AsyncStorage.getItem(incidentNotificationStorageKey)
      .then((raw) => {
        if (!mounted) return;
        try {
          const ids = raw ? JSON.parse(raw) : [];
          notifiedIncidentRefs.current = new Set(Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : []);
        } catch {
          notifiedIncidentRefs.current = new Set();
        }
        setIncidentNotificationsReady(true);
      })
      .catch(() => {
        if (mounted) setIncidentNotificationsReady(true);
      });
    return () => { mounted = false; };
  }, [incidentNotificationStorageKey]);

  useEffect(() => {
    const alerts = snapshot?.safety?.alerts ?? [];
    if (!incidentNotificationsReady || alerts.length === 0) return undefined;
    let cancelled = false;
    const notify = async () => {
      for (const safetyAlert of alerts) {
        if (cancelled || notifiedIncidentRefs.current.has(safetyAlert.id)) continue;
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `Incident signalé · ${safetyAlert.incident_type_label}`,
              body: safetyAlert.public_message,
              sound: 'default',
              data: { tripId: String(tripId), incidentId: safetyAlert.id },
            },
            trigger: null,
          });
          notifiedIncidentRefs.current.add(safetyAlert.id);
          await AsyncStorage.setItem(
            incidentNotificationStorageKey,
            JSON.stringify([...notifiedIncidentRefs.current]),
          );
        } catch {
          // Réessayer au prochain polling si la notification locale échoue.
        }
      }
    };
    void notify();
    return () => { cancelled = true; };
  }, [incidentNotificationStorageKey, incidentNotificationsReady, snapshot?.safety?.alerts, tripId]);

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
        {renderBackButton(true)}
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Connexion au GPS du bus…</Text>
      </View>
    );
  }

  if (error && !snapshot) {
    return (
      <View style={styles.centered}>
        {renderBackButton(true)}
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
  const activeSafetyAlert = [...(snapshot.safety?.alerts ?? [])].sort(
    (first, second) => safetyPriority[second.severity] - safetyPriority[first.severity],
  )[0] ?? null;
  const incidentReportable = snapshot.incident_reportable === true;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Suivre mon bus" subtitle={`${snapshot.route.departure_city} → ${snapshot.route.arrival_city}`} onBack={() => navigation.goBack()}>
        <View style={[
          styles.livePill,
          snapshot.status !== 'live' && styles.offlinePill,
          { marginTop: 12, alignSelf: 'flex-start' },
        ]}>
          <View style={[styles.liveDot, snapshot.status !== 'live' && styles.offlineDot]} />
          <Text style={styles.liveText}>{trackingLabel(snapshot)}</Text>
        </View>
      </ScreenHeader>
      <ScrollView
        style={styles.pageScroll}
        contentContainerStyle={[
          styles.pageScrollContent,
          { paddingTop: 20, paddingBottom: insets.bottom + 28 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void loadTracking()} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageContent}>
          {activeSafetyAlert && (
            <View style={[
              styles.safetyBanner,
              activeSafetyAlert.severity === 'critical' ? styles.safetyBannerCritical : styles.safetyBannerWarning,
            ]}>
              <Ionicons
                name="warning"
                size={23}
                color={activeSafetyAlert.severity === 'critical' ? '#991B1B' : '#92400E'}
              />
              <View style={styles.safetyBannerCopy}>
                <Text style={[
                  styles.safetyBannerTitle,
                  activeSafetyAlert.severity === 'critical' ? styles.safetyTextCritical : styles.safetyTextWarning,
                ]}>
                  Incident signalé · {activeSafetyAlert.incident_type_label}
                </Text>
                <Text style={[
                  styles.safetyBannerText,
                  activeSafetyAlert.severity === 'critical' ? styles.safetyTextCritical : styles.safetyTextWarning,
                ]}>
                  {activeSafetyAlert.public_message}
                </Text>
              </View>
            </View>
          )}

          <View style={[styles.mapContainer, { height: mapHeight }]}>
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

          <View style={styles.infoContent}>
            <TouchableOpacity
              style={[styles.reportButton, !incidentReportable && styles.reportButtonDisabled]}
              onPress={() => setIncidentModalVisible(true)}
              disabled={!incidentReportable}
              accessibilityRole="button"
              accessibilityLabel="Signaler un incident pendant ce trajet"
              accessibilityState={{ disabled: !incidentReportable }}
            >
              <View style={styles.reportIcon}>
                <Ionicons name="warning" size={22} color="#B91C1C" />
              </View>
              <View style={styles.reportCopy}>
                <Text style={styles.reportTitle}>
                  {incidentReportable ? 'Signaler un incident' : 'Signalement indisponible'}
                </Text>
                <Text style={styles.reportText}>
                  {incidentReportable
                    ? 'Accident, panne, crevaison ou problème à bord'
                    : 'Disponible uniquement pendant la fenêtre active du voyage'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#B91C1C" />
            </TouchableOpacity>

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
              <View style={[styles.metricCard, singleColumnMetrics && styles.metricCardSingle]}>
                <Text style={styles.metricLabel}>Arrivée estimée</Text>
                <Text style={styles.metricValue}>{formatClock(snapshot.estimated_arrival_at)}</Text>
              </View>
              <View style={[styles.metricCard, singleColumnMetrics && styles.metricCardSingle]}>
                <Text style={styles.metricLabel}>Vitesse actuelle</Text>
                <Text style={styles.metricValue}>{Math.round(snapshot.current_position?.speed_kmh ?? 0)} km/h</Text>
              </View>
              <View style={[styles.metricCard, singleColumnMetrics && styles.metricCardSingle]}>
                <Text style={styles.metricLabel}>Temps restant</Text>
                <Text style={styles.metricValue}>{snapshot.eta_minutes ?? '--'} min</Text>
              </View>
              <View style={[styles.metricCard, singleColumnMetrics && styles.metricCardSingle]}>
                <Text style={styles.metricLabel}>Distance restante</Text>
                <Text style={styles.metricValue}>{snapshot.distance_remaining_km ?? '--'} km</Text>
              </View>
            </View>

            <View style={[styles.delayCard, compactHeader && styles.delayCardCompact]}>
              <Ionicons
                name={snapshot.delay_minutes > 5 ? 'time-outline' : 'checkmark-circle-outline'}
                size={21}
                color={snapshot.delay_minutes > 5 ? COLORS.warning : COLORS.success}
              />
              <Text style={[styles.delayText, snapshot.delay_minutes > 5 && styles.delayedText]}>{delayText}</Text>
              <Text style={[styles.lastUpdate, compactHeader && styles.lastUpdateCompact]}>GPS : {formatClock(snapshot.updated_at)}</Text>
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
          </View>
        </View>
      </ScrollView>
      <IncidentReportModal
        visible={incidentModalVisible}
        tripId={tripId ?? null}
        tripLabel={`${snapshot.route.departure_city} → ${snapshot.route.arrival_city}`}
        locationStatus="GPS du téléphone si disponible, sinon dernière position connue du bus"
        reporterMode="passenger"
        onClose={() => setIncidentModalVisible(false)}
        onSubmit={reportIncident}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.canvas },
  pageScroll: { flex: 1 },
  pageScrollContent: { flexGrow: 1 },
  pageContent: { width: '100%', maxWidth: 760, alignSelf: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: COLORS.canvas },
  loadingText: { marginTop: 14, color: COLORS.textSecondary },
  errorTitle: { marginTop: 14, fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.text },
  errorText: { marginTop: 8, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21 },
  retryButton: { marginTop: 20, backgroundColor: COLORS.action, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 28 },
  retryText: { color: COLORS.white, fontWeight: FONT_WEIGHTS.bold },
  backButton: { width: 42, height: 42, flexShrink: 0, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#E2E8F0', marginRight: 10, shadowColor: COLORS.black, shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  floatingBackButton: { position: 'absolute', left: 16, zIndex: 10, marginRight: 0 },
  livePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DCFCE7', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7, maxWidth: 155 },
  offlinePill: { backgroundColor: '#FEF3C7' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success, marginRight: 6 },
  offlineDot: { backgroundColor: COLORS.warning },
  liveText: { fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text, flexShrink: 1 },
  safetyBanner: { marginHorizontal: 16, marginBottom: 12, padding: 13, borderRadius: 15, borderWidth: 1, flexDirection: 'row', alignItems: 'flex-start' },
  safetyBannerCritical: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
  safetyBannerWarning: { backgroundColor: '#FFFBEB', borderColor: '#FCD34D' },
  safetyBannerCopy: { flex: 1, marginLeft: 10 },
  safetyBannerTitle: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold },
  safetyBannerText: { marginTop: 3, fontSize: FONT_SIZES.xs, lineHeight: 18 },
  safetyTextCritical: { color: '#991B1B' },
  safetyTextWarning: { color: '#92400E' },
  mapContainer: { marginHorizontal: 16, borderRadius: 20, overflow: 'hidden', backgroundColor: COLORS.gray },
  mapTypeButton: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.94)', paddingHorizontal: 11, paddingVertical: 9, borderRadius: 28 },
  mapTypeText: { marginLeft: 6, fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text },
  staleBanner: { position: 'absolute', left: 12, right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', padding: 10, borderRadius: 12 },
  staleText: { marginLeft: 7, color: '#92400E', fontSize: FONT_SIZES.xs, flex: 1 },
  busMarker: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, borderWidth: 3, borderColor: COLORS.white, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.black, shadowOpacity: 0.25, shadowRadius: 5, elevation: 5 },
  infoContent: { padding: 16, paddingBottom: 30 },
  reportButton: { minHeight: 70, marginBottom: 14, padding: 13, borderRadius: 28, borderWidth: 1, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2', flexDirection: 'row', alignItems: 'center' },
  reportButtonDisabled: { opacity: 0.55 },
  reportIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  reportCopy: { flex: 1, minWidth: 0, marginHorizontal: 11 },
  reportTitle: { color: '#991B1B', fontSize: FONT_SIZES.base, fontWeight: FONT_WEIGHTS.bold },
  reportText: { marginTop: 3, color: '#B91C1C', fontSize: FONT_SIZES.xs, lineHeight: 17 },
  approachCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7D6', borderColor: '#F4D86B', borderWidth: 1, borderRadius: 26, padding: 14, marginBottom: 14 },
  approachContent: { marginLeft: 11, flex: 1 },
  approachTitle: { color: '#5F3A00', fontWeight: FONT_WEIGHTS.bold },
  approachText: { color: '#8A5B13', fontSize: FONT_SIZES.sm, marginTop: 3 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  metricCard: { width: '48%', backgroundColor: COLORS.white, borderRadius: 26, padding: 14, marginBottom: 12 },
  metricCardSingle: { width: '100%' },
  metricLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  metricValue: { marginTop: 7, fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.text },
  delayCard: { backgroundColor: COLORS.white, borderRadius: 26, padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  delayCardCompact: { flexWrap: 'wrap' },
  delayText: { color: COLORS.success, fontWeight: FONT_WEIGHTS.semibold, marginLeft: 8, flex: 1 },
  delayedText: { color: COLORS.warning },
  lastUpdate: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs },
  lastUpdateCompact: { flexBasis: '100%', marginTop: 9, paddingLeft: 29 },
  timelineCard: { backgroundColor: COLORS.white, borderRadius: 26, padding: 16 },
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
