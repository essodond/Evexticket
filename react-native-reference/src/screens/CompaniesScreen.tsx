import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import StarRating from '../components/StarRating';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/fonts';
import {
  getPartnerCompanies,
  PartnerCompany,
} from '../services/api';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'MainTabs'>;

export default function CompaniesScreen({ navigation }: Props) {
  const [companies, setCompanies] = useState<PartnerCompany[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await getPartnerCompanies();
      setCompanies(result);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Impossible de charger les compagnies.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return companies;
    return companies.filter(
      (company) =>
        company.name.toLowerCase().includes(query) ||
        company.cities.some((city) => city.toLowerCase().includes(query)),
    );
  }, [companies, search]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A84FF', '#075FC4']} style={styles.header}>
        <Text style={styles.eyebrow}>RÉSEAU EVEX</Text>
        <Text style={styles.title}>Compagnies partenaires</Text>
        <Text style={styles.subtitle}>
          Consultez leurs gares, itinéraires et avis voyageurs.
        </Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Compagnie ou ville"
            placeholderTextColor={COLORS.textMuted}
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement des partenaires…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
              colors={[COLORS.primary]}
            />
          }
          ListHeaderComponent={
            <View style={styles.countRow}>
              <Text style={styles.countText}>
                {filtered.length} compagnie{filtered.length > 1 ? 's' : ''}
              </Text>
              <View style={styles.verifiedPill}>
                <Ionicons name="shield-checkmark" size={14} color="#15803D" />
                <Text style={styles.verifiedText}>Partenaires vérifiés</Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Ionicons name="business-outline" size={42} color="#94A3B8" />
              <Text style={styles.emptyTitle}>
                {error || 'Aucune compagnie trouvée'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.card}
              onPress={() =>
                (navigation as any).navigate('CompanyDetails', {
                  companyId: item.id,
                })
              }
            >
              <View style={styles.cardTop}>
                <View style={styles.logoShell}>
                  {item.logo ? (
                    <Image source={{ uri: item.logo }} style={styles.logo} resizeMode="contain" />
                  ) : (
                    <Text style={styles.logoFallback}>
                      {item.name.slice(0, 2).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={styles.cardHeading}>
                  <Text style={styles.companyName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <StarRating value={item.rating_average} showValue />
                  <Text style={styles.reviewCount}>
                    {item.review_count} avis voyageur{item.review_count > 1 ? 's' : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={COLORS.primary} />
              </View>

              <Text style={styles.description} numberOfLines={2}>
                {item.description || 'Compagnie partenaire EVEX Ticket.'}
              </Text>

              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Ionicons name="location-outline" size={17} color={COLORS.primary} />
                  <Text style={styles.statValue}>{item.stations_count}</Text>
                  <Text style={styles.statLabel}>gares</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Ionicons name="map-outline" size={17} color={COLORS.primary} />
                  <Text style={styles.statValue}>{item.cities.length}</Text>
                  <Text style={styles.statLabel}>villes</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Ionicons name="bus-outline" size={17} color={COLORS.primary} />
                  <Text style={styles.statValue}>{item.active_trips_count}</Text>
                  <Text style={styles.statLabel}>trajets</Text>
                </View>
              </View>

              <View style={styles.citiesRow}>
                {item.cities.slice(0, 3).map((city) => (
                  <View key={city} style={styles.cityPill}>
                    <Text style={styles.cityText}>{city}</Text>
                  </View>
                ))}
                {item.cities.length > 3 && (
                  <Text style={styles.moreCities}>+{item.cities.length - 3}</Text>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F8FC' },
  header: {
    paddingTop: 56,
    paddingHorizontal: 22,
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  title: {
    marginTop: 5,
    color: COLORS.white,
    fontSize: 27,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.82)',
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  searchBox: {
    marginTop: 18,
    height: 52,
    paddingHorizontal: 15,
    borderRadius: 17,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: COLORS.textSecondary },
  list: { padding: 18, paddingBottom: 110 },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  countText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#EAF8EF',
  },
  verifiedText: { color: '#15803D', fontSize: 10, fontWeight: '700' },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 17,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5EDF7',
    shadowColor: '#0F2747',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 13,
    elevation: 3,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  logoShell: {
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: '#EEF5FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logo: { width: 48, height: 48 },
  logoFallback: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  cardHeading: { flex: 1, marginHorizontal: 12 },
  companyName: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: 4,
  },
  reviewCount: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 3,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    lineHeight: 19,
    marginTop: 14,
  },
  statsRow: {
    marginTop: 15,
    paddingVertical: 11,
    borderRadius: 15,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue: { color: COLORS.text, fontSize: FONT_SIZES.sm, fontWeight: '800' },
  statLabel: { color: COLORS.textMuted, fontSize: 10 },
  statDivider: { width: 1, height: 20, backgroundColor: '#E2E8F0' },
  citiesRow: {
    marginTop: 13,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 7,
  },
  cityPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 11,
    backgroundColor: '#EAF3FF',
  },
  cityText: { color: '#1D5FAE', fontSize: 10, fontWeight: '700' },
  moreCities: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700' },
  emptyCard: {
    marginTop: 60,
    alignItems: 'center',
    padding: 28,
    borderRadius: 22,
    backgroundColor: COLORS.white,
  },
  emptyTitle: {
    marginTop: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
