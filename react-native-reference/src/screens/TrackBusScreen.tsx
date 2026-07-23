import React, { useEffect, useMemo, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/fonts';
import Button from '../components/Button';

export default function TrackBusScreen() {
  const insets = useSafeAreaInsets();

  // Simulation state
  const [positionIndex, setPositionIndex] = useState(0);
  const [position, setPosition] = useState({ lat: 6.1725, lng: 1.2314 }); // start Lomé
  const [speedKmh, setSpeedKmh] = useState(70);
  const [distanceRemainingKm, setDistanceRemainingKm] = useState<number | null>(null);
  const [eta, setEta] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Build a simple route (Lomé -> intermediate points -> Kara) as lat/lng pairs
  const route = useMemo(() => {
    const from = { lat: 6.1725, lng: 1.2314 };
    const to = { lat: 9.5530, lng: 1.1927 };
    const steps = 120; // number of points to interpolate
    const points: { lat: number; lng: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points.push({ lat: from.lat + (to.lat - from.lat) * t, lng: from.lng + (to.lng - from.lng) * t });
    }
    return points;
  }, []);

  // Haversine distance
  const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const sinDlat = Math.sin(dLat / 2);
    const sinDlon = Math.sin(dLon / 2);
    const aHarv = sinDlat * sinDlat + sinDlon * sinDlon * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(aHarv), Math.sqrt(1 - aHarv));
    return R * c;
  };

  // Update metrics
  useEffect(() => {
    const last = route[route.length - 1];
    const dist = haversineKm(position, last);
    setDistanceRemainingKm(Number(dist.toFixed(2)));
    if (speedKmh > 0) {
      const hours = dist / speedKmh;
      const ms = hours * 3600 * 1000;
      const etaDate = new Date(Date.now() + ms);
      setEta(etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } else {
      setEta(null);
    }
  }, [position, speedKmh]);

  // Start simulation on mount
  useEffect(() => {
    let idx = 0;
    setPosition(route[0]);
    setPositionIndex(0);
    intervalRef.current = setInterval(() => {
      idx += 1;
      if (idx >= route.length) {
        // reached destination, stop
        if (intervalRef.current) {
          clearInterval(intervalRef.current as any);
          intervalRef.current = null;
        }
        return;
      }
      setPosition(route[idx]);
      setPositionIndex(idx);
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current as any);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Suivre mon bus</Text>
        <Text style={styles.subtitle}>Visualisez le trajet et l'état du bus en temps réel</Text>
      </View>

        <View style={styles.mapPlaceholder}>
        <Text style={styles.mapTitle}>Carte interactive</Text>
        <Text style={styles.mapSubtitle}>(Google Maps / Leaflet à intégrer)</Text>
        {/* Simulated bus badge showing current coordinates */}
        <View style={styles.busBadge}>
          <Ionicons name="bus" size={18} color="#fff" />
          <Text style={styles.busBadgeText}> Bus • {position.lat.toFixed(4)}, {position.lng.toFixed(4)}</Text>
        </View>
      </View>

      <ScrollView style={styles.infoArea} contentContainerStyle={{ padding: 20 }}>
        <View style={styles.routeCard}>
          <Text style={styles.routeLabel}>Trajet</Text>
          <Text style={styles.routeMain}>Gare de départ • Ville A → Gare d'arrivée • Ville B</Text>
          <Text style={{ marginTop: 8, color: '#64748B' }}>ETA: {eta ?? '--:--'} • Distance restante: {distanceRemainingKm ?? '--'} km • Vitesse: {speedKmh} km/h</Text>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Arrivée estimée</Text>
            <Text style={styles.metricValue}>--:--</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Vitesse</Text>
            <Text style={styles.metricValue}>-- km/h</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Temps restant</Text>
            <Text style={styles.metricValue}>-- min</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Distance restante</Text>
            <Text style={styles.metricValue}>-- km</Text>
          </View>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Statut du voyage</Text>
          <Text style={styles.statusValue}>En cours</Text>
          <Text style={styles.tripId}>ID trajet: #----</Text>
        </View>

        <View style={styles.timelineCard}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <View style={styles.timelineItem}>
            <View style={styles.timelineDotActive} />
            <View>
              <Text style={styles.timelineTitle}>Départ • Ville A</Text>
              <Text style={styles.timelineTime}>08:00</Text>
            </View>
          </View>
          <View style={styles.timelineItem}>
            <View style={styles.timelineDot} />
            <View>
              <Text style={styles.timelineTitle}>Arrivée prévue • Ville B</Text>
              <Text style={styles.timelineTime}>--:--</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Button title="Actualiser" onPress={() => {
            // reset simulation to start
            setPosition(route[0]);
            setPositionIndex(0);
          }} style={styles.actionButtonOutlined} />
          <Button title="Contacter la compagnie" onPress={() => {}} style={styles.actionButtonPrimary} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20 },
  title: { fontSize: FONT_SIZES['2xl'], fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text },
  subtitle: { color: COLORS.textSecondary, marginTop: 6 },
  mapPlaceholder: {
    height: 300,
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapTitle: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text },
  mapSubtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 6 },
  busBadge: { position: 'absolute', top: 16, right: 16, backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
  busBadgeText: { color: '#fff', marginLeft: 6, fontWeight: '600' },
  infoArea: { flex: 1 },
  routeCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 16, marginBottom: 12 },
  routeLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  routeMain: { marginTop: 6, fontSize: FONT_SIZES.base, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  metricCard: { width: '48%', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12 },
  metricLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  metricValue: { marginTop: 6, fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text },
  statusCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12 },
  statusLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  statusValue: { fontSize: FONT_SIZES.base, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.success, marginTop: 6 },
  tripId: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 6 },
  timelineCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12 },
  sectionTitle: { fontSize: FONT_SIZES.base, fontWeight: FONT_WEIGHTS.semibold, marginBottom: 8 },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E5E7EB', marginTop: 6 },
  timelineDotActive: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary, marginTop: 6 },
  timelineTitle: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text },
  timelineTime: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 4 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, gap: 12 },
  actionButtonOutlined: { flex: 1, backgroundColor: '#fff' },
  actionButtonPrimary: { flex: 1, marginLeft: 8 },
});
