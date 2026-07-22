import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/fonts';
import Button from '../components/Button';

const PositionItem = ({ item }: { item: any }) => (
  <View style={styles.positionRow}>
    <View>
      <Text style={styles.positionTime}>{item.time}</Text>
      <Text style={styles.positionCoords}>{item.lat}, {item.lng}</Text>
    </View>
    <Text style={styles.positionNote}>{item.note}</Text>
  </View>
);

export default function StartTrackingScreen() {
  const insets = useSafeAreaInsets();

  const mockHistory = [
    { id: '1', time: '08:00', lat: '--', lng: '--', note: 'Départ' },
    { id: '2', time: '08:30', lat: '--', lng: '--', note: 'En route' },
  ];

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Démarrer le suivi</Text>
        <Text style={styles.subtitle}>Contrôlez le suivi GPS du bus pour ce trajet</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Informations du voyage</Text>
        <Text style={styles.infoValue}>Gare A → Gare B</Text>
        <Text style={styles.infoSmall}>Heure départ: 08:00 • ID: #----</Text>
      </View>

      <View style={styles.controlsRow}>
        <Button title="Démarrer" onPress={() => {}} style={styles.startButton} />
        <Button title="Arrêter" onPress={() => {}} style={styles.stopButton} />
      </View>

      <View style={styles.gpsCard}>
        <Text style={styles.gpsLabel}>État du GPS</Text>
        <Text style={styles.gpsStatus}>Inactif</Text>
        <Text style={styles.currentPos}>Position actuelle: --, --</Text>
      </View>

      <View style={styles.historyCard}>
        <Text style={styles.sectionTitle}>Historique des positions</Text>
        <FlatList
          data={mockHistory}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => <PositionItem item={item} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20 },
  title: { fontSize: FONT_SIZES['2xl'], fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text },
  subtitle: { color: COLORS.textSecondary, marginTop: 6 },
  infoCard: { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 12, padding: 16, marginBottom: 12 },
  infoLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  infoValue: { fontSize: FONT_SIZES.base, fontWeight: FONT_WEIGHTS.semibold, marginTop: 6, color: COLORS.text },
  infoSmall: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 6 },
  controlsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, gap: 12, marginBottom: 12 },
  startButton: { flex: 1, marginRight: 8 },
  stopButton: { flex: 1, backgroundColor: '#fff' },
  gpsCard: { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 12, padding: 16, marginBottom: 12 },
  gpsLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  gpsStatus: { fontSize: FONT_SIZES.base, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.error, marginTop: 6 },
  currentPos: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 6 },
  historyCard: { flex: 1, backgroundColor: '#fff', margin: 20, borderRadius: 12, padding: 12 },
  sectionTitle: { fontSize: FONT_SIZES.base, fontWeight: FONT_WEIGHTS.semibold, marginBottom: 8 },
  positionRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  positionTime: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text },
  positionCoords: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 4 },
  positionNote: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 6, textAlign: 'right' },
});
