import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';

import { COLORS } from '../constants/colors';
import { getSmartNotifications, SmartNotification } from '../services/api';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<SmartNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (persist = false) => {
    try {
      setError(null);
      setItems(await getSmartNotifications(persist));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Impossible de charger les alertes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
  }, [load]);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Mes alertes" subtitle="Les informations utiles pour vos voyages." />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 110 + insets.bottom }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load(true);
            }}
            colors={[COLORS.primary]}
          />
        }
      >
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={22} color="#157B58" />
          <Text style={styles.infoText}>
            EVEX vous rappelle uniquement les informations utiles liées à vos billets.
          </Text>
        </View>
        {loading && <ActivityIndicator color={COLORS.primary} size="large" />}
        {error && <Text style={styles.error}>{error}</Text>}
        {!loading && !error && items.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle-outline" size={44} color="#7C93B2" />
            <Text style={styles.emptyTitle}>Tout est calme</Text>
            <Text style={styles.emptyText}>Aucun rappel important pour le moment.</Text>
          </View>
        )}
        {items.map((item) => (
          <View key={`${item.booking_id}-${item.departure_at}`} style={styles.card}>
            <View style={styles.cardIcon}>
              <Ionicons name="bus-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMessage}>{item.message}</Text>
              <Text style={styles.cardDate}>
                {new Date(item.departure_at).toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.canvas },
  content: { padding: 20, paddingBottom: 40, gap: 13 },
  infoCard: {
    padding: 16,
    borderRadius: 26,
    backgroundColor: '#E7F8F1',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  infoText: { flex: 1, color: '#176146', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 26,
    padding: 17,
    flexDirection: 'row',
    gap: 13,
    borderWidth: 1,
    borderColor: '#E2EAF5',
  },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#E8F1FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: { flex: 1 },
  cardTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  cardMessage: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 5 },
  cardDate: { color: COLORS.primary, fontSize: 12, fontWeight: '700', marginTop: 9 },
  empty: { alignItems: 'center', paddingVertical: 70 },
  emptyTitle: { color: COLORS.text, fontSize: 19, fontWeight: '700', marginTop: 12 },
  emptyText: { color: COLORS.textSecondary, fontSize: 14, marginTop: 5 },
  error: { color: '#C53C3C', textAlign: 'center', paddingVertical: 25 },
});
