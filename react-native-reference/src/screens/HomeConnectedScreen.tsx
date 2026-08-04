import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl, // Import RefreshControl
  LayoutAnimation, // Import LayoutAnimation
  Modal,
  TouchableWithoutFeedback,
  FlatList,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, Trip } from '../types';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/fonts';
import {
  getTrips,
  getCities,
  City,
  getAIRecommendations,
  AISearchResponse,
} from '../services/api';
import TripCard from '../components/TripCard';
import Select from '../components/Select';
import FloatingTravelAssistant from '../components/FloatingTravelAssistant';
import { useAuth } from '../contexts/AuthContext';
import { detectCurrentDepartureCity } from '../services/location';

type Props = NativeStackScreenProps<RootStackParamList, 'MainTabs'>;

const formatLocalDate = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function HomeConnectedScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [date, setDate] = useState(new Date());
  const [displayDate, setDisplayDate] = useState(new Date()); // Nouvelle date pour l'affichage et le fetch
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false); // Nouvel état pour le rafraîchissement
  const [isSearchCollapsed, setIsSearchCollapsed] = useState(true); // État pour la barre de recherche dépliable
  const [cities, setCities] = useState<City[]>([]);
  const [companies, setCompanies] = useState<{ id: number; name: string }[]>([]);
  const [loadingCities, setLoadingCities] = useState<boolean>(true);
  const [citiesError, setCitiesError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'departure' | 'price' | 'duration' | 'seats'>('departure');
  const [aiResultsActive, setAiResultsActive] = useState(false);
  const [recommendations, setRecommendations] = useState<Trip[]>([]);
  const [currentCity, setCurrentCity] = useState<City | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const locationRequestStarted = useRef(false);

  // Récupérer la liste des villes
  useEffect(() => {
    const fetchCities = async () => {
      try {
        setLoadingCities(true);
        const citiesData = await getCities();
        setCities(citiesData);
        setCitiesError(null);
      } catch (e) {
        setCitiesError(e instanceof Error ? e.message : 'Erreur de chargement des villes');
        console.error('Erreur lors de la récupération des villes:', e);
      } finally {
        setLoadingCities(false);
      }
    };

    fetchCities();
  }, []);

  const loadNearbyRecommendations = useCallback(async () => {
    if (!cities.length) return;
    setLocating(true);
    setLocationNotice(null);
    try {
      const detected = await detectCurrentDepartureCity(cities);
      setCurrentCity(detected.city);
      setSearchFrom((current) => current || detected.city.name);
      const nearbyTrips = await getAIRecommendations(detected.city.name);
      setRecommendations(nearbyTrips);
      setLocationNotice(
        nearbyTrips.length
          ? `Les suggestions partent uniquement de ${detected.city.name}.`
          : `Aucun départ disponible depuis ${detected.city.name} pour le moment.`,
      );
    } catch (locationError) {
      setCurrentCity(null);
      setLocationNotice(
        locationError instanceof Error
          ? locationError.message
          : 'Impossible de déterminer votre ville actuelle.',
      );
      getAIRecommendations()
        .then(setRecommendations)
        .catch(() => setRecommendations([]));
    } finally {
      setLocating(false);
    }
  }, [cities]);

  useEffect(() => {
    if (!cities.length || locationRequestStarted.current) return;
    locationRequestStarted.current = true;
    void loadNearbyRecommendations();
  }, [cities, loadNearbyRecommendations]);

  const handleAIResults = useCallback((response: AISearchResponse) => {
    setTrips(response.trips);
    setSearchFrom(response.criteria.departure_city || '');
    setSearchTo(response.criteria.arrival_city || '');
    setSelectedCompany('');
    setAiResultsActive(true);
    setError(null);
    if (response.criteria.travel_date) {
      setDate(new Date(`${response.criteria.travel_date}T12:00:00`));
    }
  }, []);

  const fetchAndFilterTrips = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const formattedDate = formatLocalDate(displayDate);
      const fetchedTrips = await getTrips({ departure_date: formattedDate });

      // Extraire les compagnies uniques des trajets récupérés
      const uniqueCompanies = Array.from(
        new Map(
          fetchedTrips
            .map((trip) => ({
              id: trip.id as number,
              name: trip.trip_info?.company_name || 'Compagnie inconnue',
            }))
            .map((item) => [item.name, item])
        ).values()
      );
      setCompanies(uniqueCompanies);

      const now = new Date();
      const isDisplayDateToday = displayDate.toDateString() === now.toDateString();

      const currentlyDisplayableTrips = fetchedTrips
        .filter((trip) => {
          const hasAvailableSeats = trip.available_seats > 0;
          const tripDepartureDateTime = new Date(`${trip.date}T${trip.trip_info.departure_time}`);
          let shouldDisplayBasedOnTime = true;

          if (isDisplayDateToday) {
            const threeHoursInMs = 3 * 60 * 60 * 1000;
            shouldDisplayBasedOnTime = (tripDepartureDateTime.getTime() - now.getTime()) >= threeHoursInMs;
          }

          return hasAvailableSeats && shouldDisplayBasedOnTime;
        })
        .sort((a, b) => {
          const aTime = new Date(`${a.date}T${a.trip_info.departure_time}`).getTime();
          const bTime = new Date(`${b.date}T${b.trip_info.departure_time}`).getTime();
          return aTime - bTime;
        });

      if (isDisplayDateToday && currentlyDisplayableTrips.length === 0) {
        const nextDay = new Date(displayDate);
        nextDay.setDate(displayDate.getDate() + 1);
        setDate(nextDay);
        setDisplayDate(nextDay);
      } else {
        setTrips(currentlyDisplayableTrips);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement des trajets');
    } finally {
      setLoading(false);
      setRefreshing(false); // Arrêter l'indicateur de rafraîchissement
    }
  }, [displayDate]);

  useEffect(() => {
    fetchAndFilterTrips();
  }, [displayDate, fetchAndFilterTrips]);

  const onRefresh = useCallback(() => {
    setAiResultsActive(false);
    setRefreshing(true);
    fetchAndFilterTrips();
    void loadNearbyRecommendations();
  }, [fetchAndFilterTrips, loadNearbyRecommendations]);

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
      setDisplayDate(selectedDate); // Mettre à jour displayDate aussi
    }
  };

  const filteredTrips = (Array.isArray(trips) ? trips : [])
    .filter((trip) => {
      const depName = trip?.trip_info?.departure_city_name ||
        (typeof trip?.trip_info?.departure_city === 'string'
          ? trip.trip_info.departure_city
          : typeof trip?.trip_info?.departure_city === 'object' && trip.trip_info.departure_city
            ? trip.trip_info.departure_city.name
            : '') ||
        '';
      const arrName = trip?.trip_info?.arrival_city_name ||
        (typeof trip?.trip_info?.arrival_city === 'string'
          ? trip.trip_info.arrival_city
          : typeof trip?.trip_info?.arrival_city === 'object' && trip.trip_info.arrival_city
            ? trip.trip_info.arrival_city.name
            : '') ||
        '';
      const companyName = trip?.trip_info?.company_name || '';
      const fromName = depName.toLowerCase?.() || '';
      const toName = arrName.toLowerCase?.() || '';
      const company = companyName.toLowerCase?.() || '';
      const matchFrom = aiResultsActive ? true : searchFrom
        ? fromName.includes(searchFrom.toLowerCase())
        : true;
      const matchTo = aiResultsActive
        ? true
        : searchTo
          ? toName.includes(searchTo.toLowerCase())
          : true;
      const matchCompany = selectedCompany
        ? company.includes(selectedCompany.toLowerCase())
        : true;

      return matchFrom && matchTo && matchCompany;
    });

  const getSortedTrips = () => {
    const trips = [...filteredTrips];

    switch (sortBy) {
      case 'price':
        return trips.sort((a, b) => {
          const priceA = parseFloat(a.trip_info?.price || '0') || 0;
          const priceB = parseFloat(b.trip_info?.price || '0') || 0;
          return priceA - priceB;
        });

      case 'duration':
        return trips.sort((a, b) => {
          const durationA = a.trip_info?.duration || 0;
          const durationB = b.trip_info?.duration || 0;
          return durationA - durationB;
        });

      case 'seats':
        return trips.sort((a, b) => {
          const seatsA = a.trip_info?.available_seats || 0;
          const seatsB = b.trip_info?.available_seats || 0;
          return seatsB - seatsA;
        });

      case 'departure':
      default:
        return trips.sort((a, b) => {
          const timeA = new Date(`${a.date}T${a.trip_info?.departure_time || '00:00'}`).getTime();
          const timeB = new Date(`${b.date}T${b.trip_info?.departure_time || '00:00'}`).getTime();
          return timeA - timeB;
        });
    }
  };

  const sortedTrips = getSortedTrips();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>Bonjour {user?.first_name || 'Utilisateur'} 👋</Text>
            {isSearchCollapsed && (
              <TouchableOpacity
                style={styles.searchIconContainer}
                onPress={() => {
                  LayoutAnimation.easeInEaseOut();
                  setIsSearchCollapsed(false);
                }}
              >
                <Ionicons name="search" size={24} color={COLORS.white} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.subtitleContainer}>
            <Text style={styles.subtitle}>Où souhaitez-vous voyager ?</Text>
            {!isSearchCollapsed && (
              <TouchableOpacity onPress={() => {
                LayoutAnimation.easeInEaseOut();
                setIsSearchCollapsed(true);
              }}>
                <Ionicons name="close-circle-outline" size={24} color={COLORS.white} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {!isSearchCollapsed ? (
          <View style={styles.searchContainer}>
            <Select
              placeholder="Ville de départ"
              value={searchFrom}
              onValueChange={setSearchFrom}
              options={cities}
              leftIcon={
                <Ionicons name="location-outline" size={20} color={COLORS.textSecondary} />
              }
              containerStyle={styles.searchInput}
            />

            <Select
              placeholder="Ville d'arrivée"
              value={searchTo}
              onValueChange={setSearchTo}
              options={cities}
              leftIcon={
                <Ionicons name="location-outline" size={20} color={COLORS.textSecondary} />
              }
              containerStyle={styles.searchInput}
            />

            <Select
              placeholder="Compagnie (tous)"
              value={selectedCompany}
              onValueChange={setSelectedCompany}
              options={companies}
              leftIcon={
                <Ionicons name="bus" size={20} color={COLORS.textSecondary} />
              }
              containerStyle={styles.searchInput}
            />

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
              <Text style={styles.dateButtonText}>
                {date.toLocaleDateString('fr-FR')}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            )}
          </View>
        ) : null}
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        refreshControl={ // Ajout du RefreshControl
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]} // Couleur de l'indicateur de rafraîchissement
            tintColor={COLORS.primary}
          />
        }
      >
        {!aiResultsActive && (
          <View style={styles.locationCard}>
            <View style={styles.locationIcon}>
              <Ionicons
                name={currentCity ? 'navigate' : 'location-outline'}
                size={22}
                color={COLORS.primary}
              />
            </View>
            <View style={styles.locationContent}>
              <Text style={styles.locationEyebrow}>DÉPART AUTOUR DE MOI</Text>
              <Text style={styles.locationTitle}>
                {locating
                  ? 'Localisation en cours…'
                  : currentCity
                    ? `Vous êtes à ${currentCity.name}`
                    : 'Localisation non disponible'}
              </Text>
              {locationNotice && (
                <Text style={styles.locationText}>{locationNotice}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.locationRefresh}
              onPress={() => void loadNearbyRecommendations()}
              disabled={locating}
              accessibilityLabel="Actualiser ma position"
            >
              <Ionicons
                name="refresh"
                size={19}
                color={locating ? COLORS.textMuted : COLORS.primary}
              />
            </TouchableOpacity>
          </View>
        )}

        {!aiResultsActive && recommendations.length > 0 && (
          <View style={styles.recommendationSection}>
            <View style={styles.recommendationHeader}>
              <View>
                <Text style={styles.recommendationEyebrow}>
                  {currentCity ? `AU DÉPART DE ${currentCity.name.toUpperCase()}` : 'POUR VOUS'}
                </Text>
                <Text style={styles.recommendationTitle}>
                  {currentCity ? 'Tickets proches de vous' : 'Voyages recommandés'}
                </Text>
              </View>
              <Ionicons name="sparkles-outline" size={22} color={COLORS.primary} />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recommendationList}
            >
              {recommendations.slice(0, 5).map((trip) => (
                <TouchableOpacity
                  key={`recommendation-${trip.id}`}
                  style={styles.recommendationCard}
                  onPress={() => navigation.navigate('TripDetails', { trip })}
                >
                  <Text style={styles.recommendationCompany} numberOfLines={1}>
                    {trip.trip_info?.company_name || 'Compagnie'}
                  </Text>
                  <Text style={styles.recommendationRoute} numberOfLines={1}>
                    {trip.trip_info?.departure_city_name} → {trip.trip_info?.arrival_city_name}
                  </Text>
                  <View style={styles.recommendationMeta}>
                    <Text style={styles.recommendationDate}>
                      {new Date(`${trip.date}T00:00:00`).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </Text>
                    <Text style={styles.recommendationPrice}>
                      {Number(trip.trip_info?.price || 0).toLocaleString('fr-FR')} F
                    </Text>
                  </View>
                  <Text style={styles.recommendationReason} numberOfLines={2}>
                    {(trip as any).ai_reason || 'Horaire et disponibilité intéressants'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.tripsHeader}>
          <Text style={styles.tripsTitle}>
            {aiResultsActive ? 'Résultats de l’assistant' : 'Trajets disponibles'}
          </Text>
          <Text style={styles.tripsCount}>{filteredTrips.length} résultats</Text>
        </View>

        {/* Boutons de tri */}
        <View style={styles.sortContainer}>
          <TouchableOpacity
            style={[
              styles.sortButton,
              sortBy === 'departure' && styles.sortButtonActive,
            ]}
            onPress={() => setSortBy('departure')}
          >
            <Ionicons
              name="time-outline"
              size={16}
              color={sortBy === 'departure' ? COLORS.white : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.sortButtonText,
                sortBy === 'departure' && styles.sortButtonTextActive,
              ]}
            >
              Départ
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sortButton,
              sortBy === 'price' && styles.sortButtonActive,
            ]}
            onPress={() => setSortBy('price')}
          >
            <Ionicons
              name="pricetag-outline"
              size={16}
              color={sortBy === 'price' ? COLORS.white : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.sortButtonText,
                sortBy === 'price' && styles.sortButtonTextActive,
              ]}
            >
              Prix
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sortButton,
              sortBy === 'duration' && styles.sortButtonActive,
            ]}
            onPress={() => setSortBy('duration')}
          >
            <Ionicons
              name="timer-outline"
              size={16}
              color={sortBy === 'duration' ? COLORS.white : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.sortButtonText,
                sortBy === 'duration' && styles.sortButtonTextActive,
              ]}
            >
              Durée
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sortButton,
              sortBy === 'seats' && styles.sortButtonActive,
            ]}
            onPress={() => setSortBy('seats')}
          >
            <Ionicons
              name="people-outline"
              size={16}
              color={sortBy === 'seats' ? COLORS.white : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.sortButtonText,
                sortBy === 'seats' && styles.sortButtonTextActive,
              ]}
            >
              Sièges
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bouton de sélection de compagnie */}
        <TouchableOpacity
          style={styles.companyFilterButton}
          onPress={() => setShowCompanyModal(true)}
        >
          <View style={styles.companyFilterContent}>
            <Ionicons name="bus" size={20} color={COLORS.white} />
            <View style={styles.companyFilterText}>
              <Text style={styles.companyFilterLabel}>Compagnie</Text>
              <Text style={styles.companyFilterValue}>
                {selectedCompany || 'Toutes les compagnies'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.white} />
        </TouchableOpacity>

        {/* Modal de sélection de compagnie */}
        <Modal
          visible={showCompanyModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCompanyModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowCompanyModal(false)}>
            <View style={styles.companyModalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.companyModalContent}>
                  <View style={styles.companyModalHeader}>
                    <Text style={styles.companyModalTitle}>Sélectionner une compagnie</Text>
                    <TouchableOpacity onPress={() => setShowCompanyModal(false)}>
                      <Ionicons name="close" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                  </View>

                  {/* Option "Toutes les compagnies" */}
                  <TouchableOpacity
                    style={[
                      styles.companyModalOption,
                      !selectedCompany && styles.companyModalOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedCompany('');
                      setShowCompanyModal(false);
                    }}
                  >
                    <View style={styles.companyModalOptionContent}>
                      <Ionicons
                        name="apps"
                        size={20}
                        color={!selectedCompany ? COLORS.primary : COLORS.textSecondary}
                      />
                      <Text
                        style={[
                          styles.companyModalOptionText,
                          !selectedCompany && styles.companyModalOptionTextSelected,
                        ]}
                      >
                        Toutes les compagnies
                      </Text>
                    </View>
                    {!selectedCompany && (
                      <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>

                  {/* Liste des compagnies */}
                  <FlatList
                    data={companies}
                    keyExtractor={(item) => item.id.toString()}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.companyModalOption,
                          selectedCompany === item.name && styles.companyModalOptionSelected,
                        ]}
                        onPress={() => {
                          setSelectedCompany(item.name);
                          setShowCompanyModal(false);
                        }}
                      >
                        <View style={styles.companyModalOptionContent}>
                          <Ionicons
                            name="bus"
                            size={20}
                            color={
                              selectedCompany === item.name
                                ? COLORS.primary
                                : COLORS.textSecondary
                            }
                          />
                          <Text
                            style={[
                              styles.companyModalOptionText,
                              selectedCompany === item.name &&
                                styles.companyModalOptionTextSelected,
                            ]}
                          >
                            {item.name}
                          </Text>
                        </View>
                        {selectedCompany === item.name && (
                          <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                        )}
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {loading && <Text style={styles.loadingText}>Chargement des trajets…</Text>}
        {error && <Text style={styles.errorText}>{error}</Text>}
        {filteredTrips.length > 0 ? (
          sortedTrips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onPress={() => navigation.navigate('TripDetails', { trip })}
            />
          ))
        ) : (
          !loading && !error && (
            <Text style={styles.noTripsText}>Aucun trajet disponible pour le moment.</Text>
          )
        )}
      </ScrollView>
      <FloatingTravelAssistant cities={cities} onResults={handleAIResults} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    marginBottom: 24,
  },
  greetingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  greeting: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.white,
    // marginBottom: 4,
  },
  subtitle: {
    fontSize: FONT_SIZES.base,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  subtitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchContainer: {
    gap: 10,
  },
  searchIconContainer: {
    padding: 0,
  },
  searchInput: {
    marginBottom: 0,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  dateButtonText: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  tripsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tripsTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },
  tripsCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  loadingText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  errorText: {
    fontSize: FONT_SIZES.base,
    color: 'red',
    marginBottom: 12,
  },
  noTripsText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  sortContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 0,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sortButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  sortButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.medium,
  },
  sortButtonTextActive: {
    color: COLORS.white,
  },
  companyFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
  },
  companyFilterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  companyFilterText: {
    flex: 1,
  },
  companyFilterLabel: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 2,
  },
  companyFilterValue: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.white,
  },
  companyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  companyModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
    maxHeight: '80%',
  },
  companyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  companyModalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },
  companyModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  companyModalOptionSelected: {
    backgroundColor: '#F0F7FF',
  },
  companyModalOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  companyModalOptionText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.medium,
  },
  companyModalOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  recommendationSection: { marginBottom: 22 },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CFE2FF',
    backgroundColor: '#F4F8FF',
    padding: 14,
    marginBottom: 20,
  },
  locationIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationContent: { flex: 1, marginHorizontal: 12 },
  locationEyebrow: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  locationTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.bold,
    marginTop: 2,
  },
  locationText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  locationRefresh: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recommendationEyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  recommendationTitle: { color: '#102846', fontSize: 19, fontWeight: '800', marginTop: 2 },
  recommendationList: { gap: 12, paddingRight: 4 },
  recommendationCard: {
    width: 230,
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#102F58',
  },
  recommendationCompany: { color: '#AFCDF8', fontSize: 11, fontWeight: '700' },
  recommendationRoute: { color: COLORS.white, fontSize: 17, fontWeight: '800', marginTop: 6 },
  recommendationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  recommendationDate: { color: '#C6D7EE', fontSize: 12, fontWeight: '600' },
  recommendationPrice: { color: '#7BE3BD', fontSize: 13, fontWeight: '800' },
  recommendationReason: { color: '#9FB4D0', fontSize: 11, lineHeight: 16, marginTop: 11 },
});
