import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StarRating from '../components/StarRating';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/fonts';
import {
  getPartnerCompany,
  PartnerCompany,
  PartnerEligibleBooking,
  PartnerStation,
  ratePartnerCompany,
} from '../services/api';
import { ApiId, RootStackParamList, StationDestination } from '../types';
import { distanceBetweenCoordinatesKm } from '../utils/station';

type Props = NativeStackScreenProps<RootStackParamList, 'CompanyDetails'>;
type Coordinate = { latitude: number; longitude: number };

const stationCoordinate = (station: PartnerStation): Coordinate | null => {
  const latitude = Number(station.latitude);
  const longitude = Number(station.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
};

const toDestination = (station: PartnerStation): StationDestination | null => {
  const coordinate = stationCoordinate(station);
  if (!coordinate) return null;
  return {
    id: station.id,
    name: station.name,
    address: station.address,
    city_name: station.city_name,
    ...coordinate,
    source: 'agency',
  };
};

const formatDistance = (distance?: number | null) => {
  if (distance === undefined || distance === null) return null;
  return distance < 1
    ? `${Math.round(distance * 1000)} m`
    : `${distance.toFixed(1)} km`;
};

export default function CompanyDetailsScreen({ navigation, route }: Props) {
  const { companyId, preferredCityName } = route.params;
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const [company, setCompany] = useState<PartnerCompany | null>(null);
  const [position, setPosition] = useState<Coordinate | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<ApiId | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const selectBooking = useCallback((booking: PartnerEligibleBooking) => {
    setSelectedBookingId(booking.id);
    setRating(booking.existing_rating || 0);
    setComment(booking.existing_comment || '');
  }, []);

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await getPartnerCompany(companyId);
      setCompany(result);
      const eligible = result.eligible_bookings || [];
      if (eligible.length) {
        const selected =
          eligible.find((booking) => booking.id === selectedBookingId) ||
          eligible[0];
        selectBooking(selected);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Impossible de charger cette compagnie.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId, selectBooking, selectedBookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const locate = async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== Location.PermissionStatus.GRANTED) return;
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setPosition({
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        });
      } catch {
        setPosition(null);
      }
    };
    void locate();
  }, []);

  const stationsWithDistance = useMemo(() => {
    if (!company) return [];
    return company.stations
      .map((station) => {
        const coordinate = stationCoordinate(station);
        return {
          station,
          coordinate,
          distance:
            position && coordinate
              ? distanceBetweenCoordinatesKm(position, coordinate)
              : null,
        };
      })
      .sort((first, second) => {
        if (position) {
          if (first.distance === null) return 1;
          if (second.distance === null) return -1;
          return first.distance - second.distance;
        }
        if (preferredCityName) {
          const firstMatches =
            first.station.city_name.toLowerCase() === preferredCityName.toLowerCase();
          const secondMatches =
            second.station.city_name.toLowerCase() === preferredCityName.toLowerCase();
          if (firstMatches !== secondMatches) return firstMatches ? -1 : 1;
        }
        return first.station.city_name.localeCompare(second.station.city_name);
      });
  }, [company, position, preferredCityName]);

  const mappedStations = stationsWithDistance.filter((item) => item.coordinate);

  useEffect(() => {
    if (!mappedStations.length) return;
    const coordinates = mappedStations.map((item) => item.coordinate as Coordinate);
    if (position) coordinates.push(position);
    const timeout = setTimeout(() => {
      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 55, right: 40, bottom: 55, left: 40 },
        animated: true,
      });
    }, 400);
    return () => clearTimeout(timeout);
  }, [mappedStations.length, position, company?.id]);

  const openStation = (station: PartnerStation) => {
    const destination = toDestination(station);
    if (!destination) {
      Alert.alert(
        'Gare non géolocalisée',
        'La compagnie doit encore ajouter les coordonnées GPS de cette gare.',
      );
      return;
    }
    navigation.navigate('StationMap', { station: destination });
  };

  const submitReview = async () => {
    if (!selectedBookingId) {
      Alert.alert('Voyage requis', 'Sélectionnez le voyage que vous souhaitez noter.');
      return;
    }
    if (!rating) {
      Alert.alert('Note requise', 'Choisissez entre 1 et 5 étoiles.');
      return;
    }
    try {
      setSubmitting(true);
      await ratePartnerCompany(companyId, {
        booking_id: selectedBookingId,
        rating,
        comment,
      });
      Alert.alert('Merci !', 'Votre avis a été enregistré.');
      await load();
    } catch (submitError) {
      Alert.alert(
        'Avis non enregistré',
        submitError instanceof Error
          ? submitError.message
          : 'Une erreur est survenue.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement de la compagnie…</Text>
      </View>
    );
  }

  if (error || !company) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={44} color="#F59E0B" />
        <Text style={styles.errorText}>{error || 'Compagnie introuvable.'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => void load()}>
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const eligibleBookings = company.eligible_bookings || [];
  const reviews = company.reviews || [];
  const firstCoordinate =
    mappedStations[0]?.coordinate || { latitude: 8.6195, longitude: 0.8248 };

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={23} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>{company.name}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (company.website) void Linking.openURL(company.website);
          }}
          disabled={!company.website}
        >
          <Ionicons
            name="globe-outline"
            size={21}
            color={company.website ? COLORS.primary : '#CBD5E1'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
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
      >
        <View style={styles.hero}>
          <View style={styles.heroBrand}>
            <View style={styles.logoShell}>
              {company.logo ? (
                <Image source={{ uri: company.logo }} style={styles.logo} resizeMode="contain" />
              ) : (
                <Text style={styles.logoFallback}>
                  {company.name.slice(0, 2).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={styles.heroText}>
              <Text style={styles.partnerLabel}>PARTENAIRE EVEX VÉRIFIÉ</Text>
              <Text style={styles.companyName}>{company.name}</Text>
              <View style={styles.ratingRow}>
                <StarRating value={company.rating_average} showValue />
                <Text style={styles.reviewCount}>({company.review_count} avis)</Text>
              </View>
            </View>
          </View>
          <Text style={styles.description}>
            {company.description || 'Compagnie partenaire EVEX Ticket.'}
          </Text>
          <View style={styles.contactRow}>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => void Linking.openURL(`tel:${company.phone}`)}
            >
              <Ionicons name="call-outline" size={18} color={COLORS.primary} />
              <Text style={styles.contactText}>Appeler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => void Linking.openURL(`mailto:${company.email}`)}
            >
              <Ionicons name="mail-outline" size={18} color={COLORS.primary} />
              <Text style={styles.contactText}>Email</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>CARTE DU RÉSEAU</Text>
            <Text style={styles.sectionTitle}>Gares par ville</Text>
          </View>
          <Text style={styles.sectionCount}>{company.stations_count} gares</Text>
        </View>

        {mappedStations.length > 0 ? (
          <View style={styles.mapCard}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={{
                ...firstCoordinate,
                latitudeDelta: 2.5,
                longitudeDelta: 2.5,
              }}
              toolbarEnabled={false}
            >
              {mappedStations.map(({ station, coordinate }, index) => (
                <Marker
                  key={station.id}
                  coordinate={coordinate as Coordinate}
                  title={station.name}
                  description={`${station.city_name} · ${station.address}`}
                  pinColor={index === 0 ? '#16A34A' : COLORS.primary}
                  onCalloutPress={() => openStation(station)}
                />
              ))}
              {position && (
                <Marker
                  coordinate={position}
                  title="Votre position"
                  pinColor="#F59E0B"
                />
              )}
            </MapView>
            <View style={styles.mapLegend}>
              <Ionicons name="navigate" size={15} color="#15803D" />
              <Text style={styles.mapLegendText}>
                {position
                  ? 'La gare la plus proche est affichée en premier.'
                  : 'Touchez une gare puis ouvrez son itinéraire.'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.noMapCard}>
            <Ionicons name="map-outline" size={36} color="#94A3B8" />
            <Text style={styles.noMapTitle}>Aucune gare géolocalisée</Text>
            <Text style={styles.noMapText}>
              Les adresses restent visibles ci-dessous. La compagnie doit encore ajouter leurs coordonnées GPS.
            </Text>
          </View>
        )}

        <View style={styles.stationsList}>
          {stationsWithDistance.map(({ station, distance }, index) => {
            const canNavigate = Boolean(stationCoordinate(station));
            return (
              <View key={station.id} style={styles.stationCard}>
                <View style={styles.stationRank}>
                  <Text style={styles.stationRankText}>{index + 1}</Text>
                </View>
                <View style={styles.stationContent}>
                  <View style={styles.stationHeading}>
                    <Text style={styles.stationName}>{station.name}</Text>
                    {index === 0 && position && canNavigate && (
                      <View style={styles.nearestPill}>
                        <Text style={styles.nearestText}>PLUS PROCHE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.stationCity}>
                    {station.city_name} · {station.region}
                  </Text>
                  <Text style={styles.stationAddress}>{station.address}</Text>
                  <View style={styles.stationMeta}>
                    {formatDistance(distance) && (
                      <Text style={styles.distanceText}>{formatDistance(distance)}</Text>
                    )}
                    <Text style={styles.phoneText}>{station.phone}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[
                    styles.routeButton,
                    !canNavigate && styles.routeButtonDisabled,
                  ]}
                  onPress={() => openStation(station)}
                >
                  <Ionicons
                    name="navigate"
                    size={20}
                    color={canNavigate ? COLORS.white : '#94A3B8'}
                  />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <View style={styles.ratingSummary}>
          <View style={styles.ratingScore}>
            <Text style={styles.ratingNumber}>
              {company.rating_average.toFixed(1)}
            </Text>
            <StarRating value={company.rating_average} />
            <Text style={styles.ratingTotal}>{company.review_count} avis</Text>
          </View>
          <View style={styles.ratingBars}>
            {[5, 4, 3, 2, 1].map((value) => {
              const total = company.rating_distribution?.[String(value)] || 0;
              const ratio = company.review_count
                ? total / company.review_count
                : 0;
              return (
                <View key={value} style={styles.ratingBarRow}>
                  <Text style={styles.ratingBarLabel}>{value}</Text>
                  <Ionicons name="star" size={11} color="#F5A524" />
                  <View style={styles.ratingBarTrack}>
                    <View style={[styles.ratingBarFill, { width: `${ratio * 100}%` }]} />
                  </View>
                  <Text style={styles.ratingBarTotal}>{total}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.reviewComposer}>
          <Text style={styles.sectionEyebrow}>VOTRE EXPÉRIENCE</Text>
          <Text style={styles.sectionTitle}>Noter cette compagnie</Text>
          {eligibleBookings.length ? (
            <>
              <Text style={styles.reviewHint}>
                Choisissez une réservation effectuée avec cette compagnie.
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.bookingChoices}
              >
                {eligibleBookings.map((booking) => (
                  <TouchableOpacity
                    key={booking.id}
                    style={[
                      styles.bookingChoice,
                      selectedBookingId === booking.id && styles.bookingChoiceActive,
                    ]}
                    onPress={() => selectBooking(booking)}
                  >
                    <Text
                      style={[
                        styles.bookingReference,
                        selectedBookingId === booking.id && styles.bookingTextActive,
                      ]}
                    >
                      {booking.reference}
                    </Text>
                    <Text
                      style={[
                        styles.bookingRoute,
                        selectedBookingId === booking.id && styles.bookingTextActive,
                      ]}
                    >
                      {booking.route}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.starPicker}>
                <StarRating value={rating} onChange={setRating} size={34} />
                <Text style={styles.starPickerLabel}>
                  {rating ? `${rating}/5` : 'Touchez les étoiles'}
                </Text>
              </View>
              <TextInput
                value={comment}
                onChangeText={setComment}
                multiline
                maxLength={1500}
                placeholder="Partagez votre expérience (optionnel)"
                placeholderTextColor={COLORS.textMuted}
                style={styles.commentInput}
              />
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitDisabled]}
                onPress={() => void submitReview()}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="star" size={19} color={COLORS.white} />
                    <Text style={styles.submitText}>
                      {eligibleBookings.find((booking) => booking.id === selectedBookingId)
                        ?.existing_rating
                        ? 'Mettre à jour mon avis'
                        : 'Publier mon avis'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.noBookingReview}>
              <Ionicons name="ticket-outline" size={28} color={COLORS.primary} />
              <Text style={styles.noBookingTitle}>Une réservation est nécessaire</Text>
              <Text style={styles.noBookingText}>
                Vous pourrez noter cette compagnie après avoir réservé un billet avec elle.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.reviewsSection}>
          <Text style={styles.sectionTitle}>Avis des voyageurs</Text>
          {reviews.length ? (
            reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {review.passenger_name.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.reviewIdentity}>
                    <Text style={styles.reviewerName}>{review.passenger_name}</Text>
                    <Text style={styles.reviewRoute}>{review.route}</Text>
                  </View>
                  <StarRating value={review.rating} size={14} />
                </View>
                {review.comment ? (
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                ) : null}
              </View>
            ))
          ) : (
            <Text style={styles.emptyReviews}>
              Aucun avis pour le moment. Soyez le premier voyageur à noter cette compagnie.
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F8FC' },
  topBar: {
    paddingHorizontal: 18,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EEF6',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTitle: {
    flex: 1,
    marginHorizontal: 12,
    textAlign: 'center',
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.bold,
  },
  content: { padding: 18, paddingBottom: 50 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F5F8FC',
  },
  loadingText: { marginTop: 10, color: COLORS.textSecondary },
  errorText: {
    marginTop: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 14,
  },
  retryText: { color: COLORS.white, fontWeight: FONT_WEIGHTS.bold },
  hero: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E5EDF7',
  },
  heroBrand: { flexDirection: 'row', alignItems: 'center' },
  logoShell: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: '#EEF5FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logo: { width: 58, height: 58 },
  logoFallback: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: FONT_WEIGHTS.bold,
  },
  heroText: { flex: 1, marginLeft: 14 },
  partnerLabel: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  companyName: {
    marginTop: 3,
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  reviewCount: { marginLeft: 6, color: COLORS.textMuted, fontSize: 10 },
  description: {
    marginTop: 16,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  contactRow: { marginTop: 16, flexDirection: 'row', gap: 10 },
  contactButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: '#EDF5FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  contactText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
  },
  sectionHeader: {
    marginTop: 26,
    marginBottom: 13,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sectionEyebrow: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  sectionTitle: {
    marginTop: 3,
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
  },
  sectionCount: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm },
  mapCard: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E5EDF7',
  },
  map: { height: 260 },
  mapLegend: {
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  mapLegendText: { flex: 1, color: COLORS.textSecondary, fontSize: 11 },
  noMapCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E5EDF7',
  },
  noMapTitle: {
    marginTop: 10,
    color: COLORS.text,
    fontWeight: FONT_WEIGHTS.bold,
  },
  noMapText: {
    marginTop: 5,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
    lineHeight: 18,
    textAlign: 'center',
  },
  stationsList: { marginTop: 13, gap: 10 },
  stationCard: {
    padding: 13,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E5EDF7',
    flexDirection: 'row',
    alignItems: 'center',
  },
  stationRank: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#EAF3FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stationRankText: { color: COLORS.primary, fontWeight: '800' },
  stationContent: { flex: 1, marginHorizontal: 11 },
  stationHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  stationName: {
    flexShrink: 1,
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.bold,
  },
  nearestPill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: '#EAF8EF',
  },
  nearestText: { color: '#15803D', fontSize: 7, fontWeight: '900' },
  stationCity: {
    marginTop: 3,
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  stationAddress: {
    marginTop: 3,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
    lineHeight: 16,
  },
  stationMeta: { marginTop: 5, flexDirection: 'row', gap: 10 },
  distanceText: { color: '#15803D', fontSize: 10, fontWeight: '800' },
  phoneText: { color: COLORS.textMuted, fontSize: 10 },
  routeButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeButtonDisabled: { backgroundColor: '#E2E8F0' },
  ratingSummary: {
    marginTop: 26,
    padding: 18,
    borderRadius: 22,
    backgroundColor: '#102F58',
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingScore: { width: 100, alignItems: 'center' },
  ratingNumber: { color: COLORS.white, fontSize: 35, fontWeight: '900' },
  ratingTotal: { marginTop: 5, color: '#AFC4E0', fontSize: 10 },
  ratingBars: { flex: 1, marginLeft: 17, gap: 5 },
  ratingBarRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ratingBarLabel: { width: 8, color: '#DCE8F7', fontSize: 10 },
  ratingBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  ratingBarFill: { height: '100%', backgroundColor: '#F5A524' },
  ratingBarTotal: { width: 18, color: '#AFC4E0', fontSize: 9 },
  reviewComposer: {
    marginTop: 18,
    padding: 18,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E5EDF7',
  },
  reviewHint: {
    marginTop: 7,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
  },
  bookingChoices: { gap: 8, paddingVertical: 13 },
  bookingChoice: {
    width: 165,
    padding: 11,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bookingChoiceActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  bookingReference: { color: COLORS.text, fontSize: 10, fontWeight: '800' },
  bookingRoute: { color: COLORS.textSecondary, fontSize: 10, marginTop: 3 },
  bookingTextActive: { color: COLORS.white },
  starPicker: {
    marginTop: 4,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#FFF8E8',
  },
  starPickerLabel: { marginTop: 7, color: '#A16207', fontSize: 11 },
  commentInput: {
    marginTop: 12,
    minHeight: 90,
    padding: 13,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#DCE5F0',
    color: COLORS.text,
    textAlignVertical: 'top',
    fontSize: FONT_SIZES.sm,
  },
  submitButton: {
    marginTop: 12,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitDisabled: { opacity: 0.65 },
  submitText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
  },
  noBookingReview: { marginTop: 14, alignItems: 'center', paddingVertical: 10 },
  noBookingTitle: {
    marginTop: 8,
    color: COLORS.text,
    fontWeight: FONT_WEIGHTS.bold,
  },
  noBookingText: {
    marginTop: 5,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
    lineHeight: 18,
    textAlign: 'center',
  },
  reviewsSection: { marginTop: 24 },
  reviewCard: {
    marginTop: 11,
    padding: 15,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E5EDF7',
  },
  reviewTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.primary, fontWeight: '900' },
  reviewIdentity: { flex: 1, marginHorizontal: 10 },
  reviewerName: { color: COLORS.text, fontSize: FONT_SIZES.sm, fontWeight: '800' },
  reviewRoute: { marginTop: 2, color: COLORS.textMuted, fontSize: 9 },
  reviewComment: {
    marginTop: 10,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  emptyReviews: {
    marginTop: 11,
    padding: 18,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
});
