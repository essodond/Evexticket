import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../constants/colors';
import { getSmartNotifications, SmartNotification } from '../services/api';

export default function NotificationsScreen() {
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
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="notifications" size={24} color={COLORS.white} />
        </View>
        <View>
          <Text style={styles.eyebrow}>ALERTES INTELLIGENTES</Text>
          <Text style={styles.title}>Mon voyage</Text>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
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
  container: { flex: 1, backgroundColor: '#F4F7FC' },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 22,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: { color: 'rgba(255,255,255,0.72)', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: COLORS.white, fontSize: 27, fontWeight: '800', marginTop: 2 },
  content: { padding: 20, paddingBottom: 40, gap: 13 },
  infoCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#E7F8F1',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  infoText: { flex: 1, color: '#176146', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
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
  cardTitle: { color: '#102847', fontSize: 16, fontWeight: '800' },
  cardMessage: { color: '#52657D', fontSize: 14, lineHeight: 20, marginTop: 5 },
  cardDate: { color: COLORS.primary, fontSize: 12, fontWeight: '700', marginTop: 9 },
  empty: { alignItems: 'center', paddingVertical: 70 },
  emptyTitle: { color: '#1E3653', fontSize: 19, fontWeight: '800', marginTop: 12 },
  emptyText: { color: '#7C8DA4', fontSize: 14, marginTop: 5 },
  error: { color: '#C53C3C', textAlign: 'center', paddingVertical: 25 },
});
