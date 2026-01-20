import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl, // Import RefreshControl
  LayoutAnimation, // Import LayoutAnimation
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, Trip } from '../types';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/fonts';
import { getTrips, getCities, City } from '../services/api';
import TripCard from '../components/TripCard';
import Input from '../components/Input';
import Select from '../components/Select';
import { useAuth } from '../contexts/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'MainTabs'>;

export default function HomeConnectedScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [date, setDate] = useState(new Date());
  const [displayDate, setDisplayDate] = useState(new Date()); // Nouvelle date pour l'affichage et le fetch
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false); // Nouvel état pour le rafraîchissement
  const [isSearchCollapsed, setIsSearchCollapsed] = useState(true); // État pour la barre de recherche dépliable
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState<boolean>(true);
  const [citiesError, setCitiesError] = useState<string | null>(null);

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

  const fetchAndFilterTrips = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const formattedDate = displayDate.toISOString().split('T')[0];
      const fetchedTrips = await getTrips({ departure_date: formattedDate });

      const now = new Date();
      const isDisplayDateToday = displayDate.toDateString() === now.toDateString();

      const currentlyDisplayableTrips = fetchedTrips.filter((trip) => {
        const hasAvailableSeats = trip.available_seats > 0;
          const tripDepartureDateTime = new Date(`${trip.date}T${trip.trip_info.departure_time}`);
          let shouldDisplayBasedOnTime = true;

          if (isDisplayDateToday) {
            const threeHoursInMs = 3 * 60 * 60 * 1000;
            shouldDisplayBasedOnTime = (tripDepartureDateTime.getTime() - now.getTime()) >= threeHoursInMs;
          }

          return hasAvailableSeats && shouldDisplayBasedOnTime;
      });

      if (isDisplayDateToday && currentlyDisplayableTrips.length === 0) {
        const nextDay = new Date(displayDate);
        nextDay.setDate(displayDate.getDate() + 1);
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
  }, [displayDate, date, fetchAndFilterTrips]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAndFilterTrips();
  }, [fetchAndFilterTrips]);

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
      setDisplayDate(selectedDate); // Mettre à jour displayDate aussi
    }
  };

  const filteredTrips = (Array.isArray(trips) ? trips : []).filter((trip) => {
    const depName = trip?.trip_info?.departure_city_name
      || (typeof trip?.trip_info?.departure_city === 'string' ? trip.trip_info.departure_city : trip?.trip_info?.departure_city?.name)
      || '';
    const arrName = trip?.trip_info?.arrival_city_name
      || (typeof trip?.trip_info?.arrival_city === 'string' ? trip.trip_info.arrival_city : trip?.trip_info?.arrival_city?.name)
      || '';
    const fromName = depName.toLowerCase?.() || '';
    const toName = arrName.toLowerCase?.() || '';
    const matchFrom = searchFrom ? fromName.includes(searchFrom.toLowerCase()) : true;
    const matchTo = searchTo ? toName.includes(searchTo.toLowerCase()) : true;

    return matchFrom && matchTo;
  });

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
        <View style={styles.tripsHeader}>
          <Text style={styles.tripsTitle}>Trajets disponibles</Text>
          <Text style={styles.tripsCount}>{filteredTrips.length} résultats</Text>
        </View>

        {loading && <Text style={styles.loadingText}>Chargement des trajets…</Text>}
        {error && <Text style={styles.errorText}>{error}</Text>}
        {filteredTrips.length > 0 ? (
          filteredTrips.map((trip) => (
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
});
