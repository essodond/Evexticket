import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/fonts';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'StationMap'>;

type Coordinate = {
  latitude: number;
  longitude: number;
};

const distanceInKm = (from: Coordinate, to: Coordinate) => {
  const earthRadius = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const firstLatitude = toRadians(from.latitude);
  const secondLatitude = toRadians(to.latitude);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

export default function StationMapScreen({ navigation, route }: Props) {
  const { station } = route.params;
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const [position, setPosition] = useState<Coordinate | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const stationCoordinate = useMemo(
    () => ({ latitude: station.latitude, longitude: station.longitude }),
    [station.latitude, station.longitude],
  );

  useEffect(() => {
    let active = true;
    let subscription: Location.LocationSubscription | null = null;

    const startLiveLocation = async () => {
      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          throw new Error('Activez la localisation du téléphone pour suivre votre trajet.');
        }
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== Location.PermissionStatus.GRANTED) {
          throw new Error('La localisation est nécessaire pour afficher votre position en direct.');
        }
        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (!active) return;
        setPosition({
          latitude: initial.coords.latitude,
          longitude: initial.coords.longitude,
        });
        setAccuracy(initial.coords.accuracy);

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 5,
            timeInterval: 3000,
          },
          (next) => {
            if (!active) return;
            setPosition({
              latitude: next.coords.latitude,
              longitude: next.coords.longitude,
            });
            setAccuracy(next.coords.accuracy);
          },
        );
      } catch (error) {
        if (active) {
          setLocationError(
            error instanceof Error
              ? error.message
              : 'Impossible de récupérer votre position.',
          );
        }
      }
    };

    void startLiveLocation();
    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    const points = position
      ? [position, stationCoordinate]
      : [stationCoordinate];
    const timeout = setTimeout(() => {
      mapRef.current?.fitToCoordinates(points, {
        edgePadding: { top: 110, right: 70, bottom: 250, left: 70 },
        animated: true,
      });
    }, 350);
    return () => clearTimeout(timeout);
  }, [position, stationCoordinate]);

  const distance = position
    ? distanceInKm(position, stationCoordinate)
    : null;

  const centerMap = () => {
    const points = position
      ? [position, stationCoordinate]
      : [stationCoordinate];
    mapRef.current?.fitToCoordinates(points, {
      edgePadding: { top: 110, right: 70, bottom: 250, left: 70 },
      animated: true,
    });
  };

  const startNavigation = async () => {
    const destination = `${station.latitude},${station.longitude}`;
    const url = Platform.select({
      ios: `https://maps.apple.com/?daddr=${destination}&dirflg=d`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        destination,
      )}&travelmode=driving&dir_action=navigate`,
    }) as string;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        'Navigation indisponible',
        'Aucune application de navigation ne peut ouvrir cet itinéraire.',
      );
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          ...stationCoordinate,
          latitudeDelta: 0.035,
          longitudeDelta: 0.035,
        }}
        showsCompass
        showsScale
        toolbarEnabled={false}
      >
        <Marker
          coordinate={stationCoordinate}
          title={station.name}
          description={station.address || station.city_name}
          pinColor={COLORS.primary}
        />
        {position && (
          <>
            <Marker
              coordinate={position}
              title="Votre position"
              pinColor="#16A34A"
            />
            <Polyline
              coordinates={[position, stationCoordinate]}
              strokeColor={COLORS.primary}
              strokeWidth={4}
              lineDashPattern={[10, 7]}
            />
          </>
        )}
      </MapView>

      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.topTitleBlock}>
          <Text style={styles.topEyebrow}>ITINÉRAIRE VERS LA GARE</Text>
          <Text style={styles.topTitle} numberOfLines={1}>{station.name}</Text>
        </View>
        <TouchableOpacity style={styles.iconButton} onPress={centerMap}>
          <Ionicons name="locate" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18) }]}>
        <View style={styles.handle} />
        <View style={styles.stationRow}>
          <View style={styles.stationIcon}>
            <Ionicons name="business" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.stationText}>
            <Text style={styles.stationName}>{station.name}</Text>
            <Text style={styles.stationAddress}>
              {station.address || station.city_name}
            </Text>
          </View>
          {distance !== null && (
            <View style={styles.distancePill}>
              <Text style={styles.distanceText}>
                {distance < 1
                  ? `${Math.round(distance * 1000)} m`
                  : `${distance.toFixed(1)} km`}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.liveStatus}>
          <View style={[styles.liveDot, locationError && styles.liveDotError]} />
          <Text style={styles.liveText}>
            {locationError
              ? locationError
              : position
                ? `Position GPS en direct${accuracy ? ` · précision ${Math.round(accuracy)} m` : ''}`
                : 'Recherche de votre position…'}
          </Text>
        </View>

        {locationError && (
          <TouchableOpacity style={styles.settingsButton} onPress={() => Linking.openSettings()}>
            <Ionicons name="settings-outline" size={18} color={COLORS.primary} />
            <Text style={styles.settingsText}>Ouvrir les réglages</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.navigateButton} onPress={startNavigation}>
          <Ionicons name="navigate" size={22} color={COLORS.white} />
          <View>
            <Text style={styles.navigateTitle}>Démarrer l’itinéraire</Text>
            <Text style={styles.navigateSubtitle}>Navigation routière en temps réel</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8EEF7' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 7,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTitleBlock: { flex: 1, marginHorizontal: 12 },
  topEyebrow: {
    fontSize: 9,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 1.1,
  },
  topTitle: {
    marginTop: 3,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    fontWeight: FONT_WEIGHTS.bold,
  },
  sheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    paddingHorizontal: 18,
    paddingTop: 10,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 28,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  stationRow: { flexDirection: 'row', alignItems: 'center' },
  stationIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationText: { flex: 1, marginHorizontal: 12 },
  stationName: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    fontWeight: FONT_WEIGHTS.bold,
  },
  stationAddress: {
    marginTop: 3,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  distancePill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#EAF3FF',
  },
  distanceText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
  },
  liveStatus: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    marginRight: 8,
  },
  liveDotError: { backgroundColor: '#F59E0B' },
  liveText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
    lineHeight: 17,
  },
  settingsButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 9,
  },
  settingsText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  navigateButton: {
    marginTop: 14,
    minHeight: 60,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 6,
  },
  navigateTitle: {
    color: COLORS.white,
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.bold,
  },
  navigateSubtitle: {
    marginTop: 1,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
  },
});
