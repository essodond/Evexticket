import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
  useWindowDimensions,
  Modal,
  TouchableWithoutFeedback,
  FlatList,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList, Trip } from '../types';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import {
  getTrips,
  getCities,
  City,
  AISearchResponse,
} from '../services/api';
import TripCard from '../components/TripCard';
import TravelHeaderArtwork from '../components/TravelHeaderArtwork';
import SwipeToHideCard from '../components/SwipeToHideCard';
import Select from '../components/Select';
import FloatingTravelAssistant, {
  FloatingTravelAssistantHandle,
} from '../components/FloatingTravelAssistant';
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
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [searchExpanded, setSearchExpanded] = useState(true);
  const isFocused = useIsFocused();
  const canManageTracking = ['AGENT_GUICHET', 'ADMIN_COMPAGNIE', 'SUPER_ADMIN'].includes(
    user?.role ?? '',
  );
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
  const [cities, setCities] = useState<City[]>([]);
  const [companies, setCompanies] = useState<{ id: string | number; name: string }[]>([]);
  const [loadingCities, setLoadingCities] = useState<boolean>(true);
  const [citiesError, setCitiesError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'departure' | 'price' | 'duration' | 'seats'>('departure');
  const [aiResultsActive, setAiResultsActive] = useState(false);
  const [currentCity, setCurrentCity] = useState<City | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const locationRequestStarted = useRef(false);
  const assistantRef = useRef<FloatingTravelAssistantHandle>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const tripsSectionY = useRef(0);
  const dragStartY = useRef<number | null>(null);

  // Récupérer la liste des villes
  useEffect(() => {
    const fetchCities = async () => {
      try {
        setLoadingCities(true);
        const citiesData = await getCities();
        setCities(citiesData);
        setCitiesError(null);
      } catch(e) {
        setCitiesError(e instanceof Error ? e.message : 'Erreur de chargement des villes');
        console.error('Erreur lors de la récupération des villes:', e);
      } finally {
        setLoadingCities(false);
      }
    };

    fetchCities();
  }, []);

  const locateDepartureCity = useCallback(async () => {
    if(!cities.length) return;
    setLocating(true);
    setLocationNotice(null);
    try {
      const detected = await detectCurrentDepartureCity(cities);
      setCurrentCity(detected.city);
      setSearchFrom((current) => current || detected.city.name);
    } catch(locationError) {
      setCurrentCity(null);
      setLocationNotice(
        locationError instanceof Error
          ? locationError.message
          : 'Impossible de déterminer votre ville actuelle.',
      );
    } finally {
      setLocating(false);
    }
  }, [cities]);

  useEffect(() => {
    if(!cities.length || locationRequestStarted.current) return;
    locationRequestStarted.current = true;
    void locateDepartureCity();
  }, [cities, locateDepartureCity]);

  const handleAIResults = useCallback((response: AISearchResponse) => {
    setTrips(response.trips);
    setSearchFrom(response.criteria.departure_city || '');
    setSearchTo(response.criteria.arrival_city || '');
    setSelectedCompany('');
    setAiResultsActive(true);
    setSearchExpanded(false);
    setShowDatePicker(false);
    scrollViewRef.current?.scrollTo({ y: tripsSectionY.current, animated: true });
    setError(null);
    if(response.criteria.travel_date) {
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
              id: trip.id,
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
          // Un trajet complet reste visible et cherchable tant qu'il n'est pas parti :
          // une annulation peut libérer une place que l'utilisateur pourra alors réserver.
          const tripDepartureDateTime = new Date(`${trip.date}T${trip.trip_info.departure_time}`);
          if(isDisplayDateToday) {
            return tripDepartureDateTime.getTime() > now.getTime();
          }
          return true;
        })
        .sort((a, b) => {
          const aTime = new Date(`${a.date}T${a.trip_info.departure_time}`).getTime();
          const bTime = new Date(`${b.date}T${b.trip_info.departure_time}`).getTime();
          return aTime - bTime;
        });

      if(isDisplayDateToday && currentlyDisplayableTrips.length === 0) {
        const nextDay = new Date(displayDate);
        nextDay.setDate(displayDate.getDate() + 1);
        setDate(nextDay);
        setDisplayDate(nextDay);
      } else {
        setTrips(currentlyDisplayableTrips);
      }
    } catch(e) {
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
  }, [fetchAndFilterTrips]);

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if(selectedDate) {
      setDate(selectedDate);
      setDisplayDate(selectedDate); // Mettre à jour displayDate aussi
    }
  };

  const handleSwapCities = useCallback(() => {
    setSearchFrom(searchTo);
    setSearchTo(searchFrom);
  }, [searchFrom, searchTo]);

  const handleSearchPress = useCallback(() => {
    setAiResultsActive(false);
    setSearchExpanded(false);
    setShowDatePicker(false);
    scrollViewRef.current?.scrollTo({ y: tripsSectionY.current, animated: true });
  }, []);

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

    switch(sortBy) {
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
          const seatsA = a.available_seats || 0;
          const seatsB = b.available_seats || 0;
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
      {isFocused && <StatusBar style="light" />}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View
          style={[styles.headerArtwork, { top: insets.top + 8 }]}
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <TravelHeaderArtwork />
        </View>
        <View style={styles.brandRow}>
          <View style={styles.brandCopy}>
            <Text style={styles.brandTitle}>EVEX</Text>
            {searchExpanded && <Text style={styles.brandSubtitle}>VOYAGES INTERURBAINS</Text>}
          </View>
          <TouchableOpacity
            style={styles.searchToggle}
            onPress={() => {
              setSearchExpanded((expanded) => !expanded);
              setShowDatePicker(false);
            }}
            accessibilityRole="button"
            accessibilityLabel={searchExpanded ? 'Replier la recherche' : 'Ouvrir la recherche'}
            accessibilityState={{ expanded: searchExpanded }}
          >
            <Ionicons name="search-outline" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        <Text style={styles.greeting}>Bonjour,  {user?.first_name || 'Utilisateur'} 👋</Text>
        <Text style={[styles.subtitle, !searchExpanded && styles.subtitleCollapsed]}>
          Où souhaitez-vous voyager aujourd'hui ?
        </Text>
        {searchExpanded && (
          <ScrollView
            style={{ maxHeight: windowHeight * 0.46 }}
            contentContainerStyle={styles.expandedSearchContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
          >
            <LinearGradient colors={['#E1F0FF', '#FAFCFF', '#FFFFFF']} locations={[0, 0.55, 1]} style={styles.searchCard}>
              <View style={styles.searchRow}>
                <Select
                  placeholder="Ville de départ"
                  value={searchFrom}
                  onValueChange={setSearchFrom}
                  options={cities}
                  containerStyle={styles.searchFieldContainer}
                  renderTrigger={({ displayValue, openModal }) => (
                    <TouchableOpacity onPress={openModal} style={styles.searchField}>
                      <Text style={styles.searchFieldLabel}>DÉPART</Text>
                      <View style={styles.searchFieldValueRow}>
                        <Ionicons name="location-outline" size={14} color={'#0066CC'} />
                        <Text style={styles.searchFieldValue} numberOfLines={1}>
                          {searchFrom ? displayValue : 'Ville de départ'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />

                <TouchableOpacity style={styles.swapButton} onPress={handleSwapCities} accessibilityLabel="Inverser le départ et l’arrivée">
                  <Ionicons name="swap-horizontal" size={20} color={'#0066CC'} />
                </TouchableOpacity>

                <Select
                  placeholder="Ville d'arrivée"
                  value={searchTo}
                  onValueChange={setSearchTo}
                  options={cities}
                  containerStyle={styles.searchFieldContainer}
                  renderTrigger={({ displayValue, openModal }) => (
                    <TouchableOpacity onPress={openModal} style={[styles.searchField, styles.searchFieldEnd]}>
                      <Text style={styles.searchFieldLabel}>ARRIVÉE</Text>
                      <View style={[styles.searchFieldValueRow, styles.searchFieldValueRowEnd]}>
                        <Text style={styles.searchFieldValue} numberOfLines={1}>
                          {searchTo ? displayValue : "Ville d'arrivée"}
                        </Text>
                        <Ionicons name="location-outline" size={14} color={'#0066CC'} />
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </View>

              <View style={styles.searchDivider} />

              <TouchableOpacity style={styles.dateRow} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={18} color={COLORS.textSecondary} />
                <Text style={styles.dateRowText}>
                  {date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
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

              <TouchableOpacity style={styles.searchButton} onPress={handleSearchPress}>
                <Ionicons name="search" size={18} color={COLORS.white} />
                <Text style={styles.searchButtonText}>Rechercher des trajets</Text>
              </TouchableOpacity>
            </LinearGradient>

          </ScrollView>
        )}
      </View>
      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        overScrollMode="never"
        alwaysBounceVertical
        scrollEventThrottle={16}
        onScrollBeginDrag={(event) => { dragStartY.current = event.nativeEvent.contentOffset.y; }}
        onScroll={(event) => {
          // Collapse only on an upward user scroll, never during pull-to-refresh or a programmatic scroll.
          if(searchExpanded && dragStartY.current !== null && event.nativeEvent.contentOffset.y > Math.max(0, dragStartY.current) + 12) {
            dragStartY.current = null;
            setSearchExpanded(false);
            setShowDatePicker(false);
          }
        }}
        onScrollEndDrag={() => { dragStartY.current = null; }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
            progressBackgroundColor="#F7F7F8"
          />
        }
      >
        {canManageTracking && (
          <TouchableOpacity
            style={styles.driverTrackingCard}
            onPress={() => navigation.navigate('StartTracking', {})}
          >
            <View style={styles.driverTrackingIcon}>
              <Ionicons name="navigate" size={24} color={COLORS.white} />
            </View>
            <View style={styles.driverTrackingCopy}>
              <Text style={styles.driverTrackingEyebrow}>ESPACE CHAUFFEUR</Text>
              <Text style={styles.driverTrackingTitle}>Transmettre la position du bus</Text>
              <Text style={styles.driverTrackingText}>Démarrer ou reprendre un suivi GPS réel</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={COLORS.white} />
          </TouchableOpacity>
        )}

        {!aiResultsActive && (
          <SwipeToHideCard
            key={user?.id ?? 'guest'}
            storageKey={`evex:home:location-card:${user?.id ?? 'guest'}`}
          >
            <View style={styles.locationCard}>
              <View style={styles.locationIcon}>
                <Ionicons
                  name="locate-outline"
                  size={20}
                  color="#66B0FF"
                />
              </View>
              <View style={styles.locationContent}>
                <Text style={styles.locationEyebrow}>DÉPART À PROXIMITÉ</Text>
                <Text style={styles.locationTitle}>
                  {locating
                    ? 'Localisation en cours…'
                    : currentCity
                      ? `Vous êtes à ${currentCity.name}`
                      : 'Localisation non disponible'}
                </Text>
                {!currentCity && locationNotice && (
                  <Text style={styles.locationText}>{locationNotice}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.locationRefresh}
                onPress={() => void locateDepartureCity()}
                disabled={locating}
                accessibilityLabel="Actualiser ma position"
              >
                {locating ? (
                  <Ionicons name="refresh" size={15} color={COLORS.textMuted} />
                ) : (
                  <Text style={styles.locationRefreshText}>Changer</Text>
                )}
              </TouchableOpacity>
            </View>
          </SwipeToHideCard>
        )}

        <View
          style={styles.tripsHeader}
          onLayout={(e) => { tripsSectionY.current = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.tripsTitle}>
            {aiResultsActive ? 'Résultats de l’assistant' : 'Trajets disponibles'}
          </Text>
          <Text style={styles.tripsCount}>{filteredTrips.length} résultat{filteredTrips.length > 1 ? 's' : ''}</Text>
        </View>

        {/* Boutons de tri */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sortScroll}
          contentContainerStyle={styles.sortContainer}
        >
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
        </ScrollView>

        {/* Bouton de sélection de compagnie */}
        <TouchableOpacity
          style={styles.companyFilterButton}
          onPress={() => setShowCompanyModal(true)}
        >
          <View style={styles.companyFilterContent}>
            <View style={styles.companyFilterIcon}>
              <Ionicons name="bus" size={18} color={'#0066CC'} />
            </View>
            <View style={styles.companyFilterText}>
              <Text style={styles.companyFilterLabel}>Compagnie</Text>
              <Text style={styles.companyFilterValue}>
                {selectedCompany || 'Toutes les compagnies'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
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
                        color={!selectedCompany ? '#0066CC' : COLORS.textSecondary}
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
                      <Ionicons name="checkmark" size={20} color={'#0066CC'} />
                    )}
                  </TouchableOpacity>

                  {/* Liste des compagnies */}
                  <FlatList
                    data={companies}
                    keyExtractor={(item) => item.id.toString()}
                    showsVerticalScrollIndicator={false}
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
                                ? '#0066CC'
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
                          <Ionicons name="checkmark" size={20} color={'#0066CC'} />
                        )}
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {citiesError && <Text style={styles.errorText}>{citiesError}</Text>}
        {loadingCities && <Text style={styles.loadingText}>Chargement des villes…</Text>}
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

        <TouchableOpacity
          style={styles.assistantCard}
          onPress={() => assistantRef.current?.open()}
          activeOpacity={0.9}
        >
          <View style={styles.assistantIcon}>
            <Ionicons name="sparkles" size={20} color={COLORS.white} />
          </View>
          <View style={styles.assistantCopy}>
            <Text style={styles.assistantTitle}>Recherche assistée</Text>
            <Text style={styles.assistantText}>L'IA trouve le meilleur trajet pour vous.</Text>
          </View>
          <View style={styles.assistantButton}>
            <Text style={styles.assistantButtonText}>Essayer</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
      <FloatingTravelAssistant
        ref={assistantRef}
        hideTrigger
        cities={cities}
        onResults={handleAIResults}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F8' },
  header: { backgroundColor: COLORS.primary, paddingBottom: 20, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, overflow: 'hidden' },
  headerArtwork: { position: 'absolute', right: -30, width: 270, height: 170 },
  brandRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 10 },
  brandCopy: { flex: 1, minWidth: 0 },
  searchToggle: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  expandedSearchContent: { paddingTop: 10, paddingBottom: 4 },
  brandTitle: { fontSize: 23, fontWeight: '800', color: COLORS.white },
  brandSubtitle: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.8)', letterSpacing: 0.5, marginTop: 4 },
  greeting: { fontSize: 25, fontWeight: '700', color: COLORS.white, marginTop: 18, marginBottom: 4, marginHorizontal: 20 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.85)', lineHeight: 21, marginHorizontal: 20, marginBottom: 20 },
  subtitleCollapsed: { fontSize: 13, lineHeight: 19, marginTop: 2, marginBottom: 0 },
  searchCard: { marginHorizontal: 20, marginBottom: 12, borderRadius: 26, padding: 17, borderWidth: 1, borderColor: '#EEF2F8', shadowColor: '#193354', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.14, shadowRadius: 22, elevation: 5 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchFieldContainer: {
    flex: 1,
    minWidth: 0,
    marginBottom: 0,
  },
  searchField: {
    minHeight: 44,
    justifyContent: 'center',
  },
  searchFieldEnd: {
    alignItems: 'flex-end',
  },
  searchFieldLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.7, color: '#777777', marginBottom: 7 },
  searchFieldValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  searchFieldValueRowEnd: { flexDirection: 'row', justifyContent: 'flex-end' },
  searchFieldValue: { fontSize: 19, fontWeight: '600', color: COLORS.text, flexShrink: 1 },
  swapButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#E4E4E4', alignItems: 'center', justifyContent: 'center', marginHorizontal: 8 },
  searchDivider: { height: 1, backgroundColor: '#DDE0E5', marginVertical: 18 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 18, minHeight: 20 },
  dateRowText: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text },
  searchButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: '#0066CC', minHeight: 55, borderRadius: 32, paddingHorizontal: 10 },
  searchButtonText: { color: COLORS.white, fontSize: 17, fontWeight: '600' },
  content: {
    flex: 1,
  },
  contentContainer: { paddingHorizontal: 20, paddingTop: 20, flexGrow: 1 },
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
  sortScroll: {
    marginBottom: 16,
  },
  sortContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 0,
    paddingBottom: 4,
  },
  sortButton: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, minHeight: 38, borderRadius: 22, backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#E4E4E4' },
  sortButtonActive: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
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
    borderRadius: 20,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  companyFilterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  companyFilterIcon: { width: 36, height: 36, borderRadius: 13, backgroundColor: '#F7F7F8', alignItems: 'center', justifyContent: 'center' },
  companyFilterText: {
    flex: 1,
  },
  companyFilterLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  companyFilterValue: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#0066CC',
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
    color: '#0066CC',
    fontWeight: FONT_WEIGHTS.semibold,
  },
  driverTrackingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    backgroundColor: '#123D73',
  },
  driverTrackingIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverTrackingCopy: { flex: 1, marginHorizontal: 12 },
  driverTrackingEyebrow: {
    color: '#9DC7FF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  driverTrackingTitle: {
    color: COLORS.white,
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.bold,
    marginTop: 3,
  },
  driverTrackingText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: FONT_SIZES.xs,
    marginTop: 3,
  },
  locationCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 25, backgroundColor: '#4B586F', padding: 17, borderWidth: 1, borderColor: '#788294', minHeight: 76 },
  locationIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#657187', alignItems: 'center', justifyContent: 'center' },
  locationContent: { flex: 1, marginHorizontal: 10 },
  locationEyebrow: { color: '#B5BAC4', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  locationTitle: { color: COLORS.white, fontSize: 15, fontWeight: '600', marginTop: 4 },
  locationText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  locationRefresh: { paddingHorizontal: 14, minHeight: 34, borderRadius: 20, borderWidth: 1, borderColor: '#8993A3', alignItems: 'center', justifyContent: 'center' },
  locationRefreshText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },
  assistantCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 26, borderWidth: 1, borderColor: '#B5D6F5', backgroundColor: '#E4EDF6', padding: 17, marginTop: 2, minHeight: 86 },
  assistantIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: '#0066CC', alignItems: 'center', justifyContent: 'center' },
  assistantCopy: { flex: 1, marginHorizontal: 10 },
  assistantTitle: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  assistantText: { color: '#999999', fontSize: 13, lineHeight: 17, marginTop: 3 },
  assistantButton: { paddingHorizontal: 14, minHeight: 34, borderRadius: 20, backgroundColor: '#0066CC', alignItems: 'center', justifyContent: 'center' },
  assistantButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
});
