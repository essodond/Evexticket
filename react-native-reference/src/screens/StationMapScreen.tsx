import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
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
import { distanceBetweenCoordinatesKm } from '../utils/station';
import type { DrivingRoute, RouteInstruction } from '../services/routing';
import {
  formatRouteDistance,
  formatRouteDuration,
  getDrivingRoute,
} from '../services/routing';

type Props = NativeStackScreenProps<RootStackParamList, 'StationMap'>;

type Coordinate = {
  latitude: number;
  longitude: number;
};

const routeStepIcon = (instruction: RouteInstruction) => {
  if (instruction.maneuverType === 'arrive') return 'flag';
  if (instruction.maneuverType === 'depart') return 'navigate';
  if (['roundabout', 'rotary'].includes(instruction.maneuverType)) return 'sync';
  if (instruction.maneuverModifier?.includes('left')) return 'return-up-back';
  if (instruction.maneuverModifier?.includes('right')) return 'return-up-forward';
  return 'arrow-up';
};

type NavigationProgress = {
  closestRouteIndex: number;
  distanceFromRouteMeters: number;
  distanceToInstructionMeters: number;
  remainingDistanceMeters: number;
  remainingDurationSeconds: number;
  progressPercent: number;
  currentInstruction: RouteInstruction;
  followingInstruction?: RouteInstruction;
};

const distanceAlongRouteMeters = (
  coordinates: Coordinate[],
  startIndex: number,
  endIndex: number,
) => {
  let distanceMeters = 0;
  const safeStart = Math.max(0, Math.min(startIndex, coordinates.length - 1));
  const safeEnd = Math.max(safeStart, Math.min(endIndex, coordinates.length - 1));
  for (let index = safeStart; index < safeEnd; index += 1) {
    distanceMeters += distanceBetweenCoordinatesKm(
      coordinates[index],
      coordinates[index + 1],
    ) * 1000;
  }
  return distanceMeters;
};

const getNavigationProgress = (
  position: Coordinate,
  roadRoute: DrivingRoute,
): NavigationProgress | null => {
  if (!roadRoute.coordinates.length || !roadRoute.instructions.length) return null;

  let closestRouteIndex = 0;
  let distanceFromRouteMeters = Number.POSITIVE_INFINITY;
  roadRoute.coordinates.forEach((coordinate, index) => {
    const distanceMeters = distanceBetweenCoordinatesKm(position, coordinate) * 1000;
    if (distanceMeters < distanceFromRouteMeters) {
      distanceFromRouteMeters = distanceMeters;
      closestRouteIndex = index;
    }
  });

  let instructionIndex = roadRoute.instructions.findIndex(
    (instruction) => instruction.routeIndex >= closestRouteIndex,
  );
  if (instructionIndex < 0) instructionIndex = roadRoute.instructions.length - 1;

  const currentInstruction = roadRoute.instructions[instructionIndex];
  const followingInstruction = roadRoute.instructions[instructionIndex + 1];
  const geometryDistanceMeters = distanceAlongRouteMeters(
    roadRoute.coordinates,
    0,
    roadRoute.coordinates.length - 1,
  );
  const distanceScale = geometryDistanceMeters > 0
    ? roadRoute.distanceMeters / geometryDistanceMeters
    : 1;
  const distanceToInstructionMeters = distanceAlongRouteMeters(
    roadRoute.coordinates,
    closestRouteIndex,
    currentInstruction.routeIndex,
  ) * distanceScale;
  const remainingDistanceMeters = distanceAlongRouteMeters(
    roadRoute.coordinates,
    closestRouteIndex,
    roadRoute.coordinates.length - 1,
  ) * distanceScale;
  const remainingDurationSeconds = roadRoute.distanceMeters > 0
    ? roadRoute.durationSeconds * (remainingDistanceMeters / roadRoute.distanceMeters)
    : roadRoute.durationSeconds;
  const progressPercent = roadRoute.distanceMeters > 0
    ? Math.max(0, Math.min(100, 100 - (remainingDistanceMeters / roadRoute.distanceMeters) * 100))
    : 0;

  return {
    closestRouteIndex,
    distanceFromRouteMeters,
    distanceToInstructionMeters,
    remainingDistanceMeters,
    remainingDurationSeconds,
    progressPercent,
    currentInstruction,
    followingInstruction,
  };
};

export default function StationMapScreen({ navigation, route }: Props) {
  const { station } = route.params;
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const lastDeviationRecalculationRef = useRef(0);
  const arrivalNotifiedRef = useRef(false);
  const [position, setPosition] = useState<Coordinate | null>(null);
  const [routeOrigin, setRouteOrigin] = useState<Coordinate | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [roadRoute, setRoadRoute] = useState<DrivingRoute | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [showDirections, setShowDirections] = useState(false);
  const [routeRefreshKey, setRouteRefreshKey] = useState(0);
  const [navigationActive, setNavigationActive] = useState(false);
  const [heading, setHeading] = useState(0);
  const [satelliteMode, setSatelliteMode] = useState(false);
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
          accuracy: Location.Accuracy.BestForNavigation,
        });
        if (!active) return;
        const initialCoordinate = {
          latitude: initial.coords.latitude,
          longitude: initial.coords.longitude,
        };
        setPosition(initialCoordinate);
        setRouteOrigin(initialCoordinate);
        setAccuracy(initial.coords.accuracy);
        if (Number.isFinite(initial.coords.heading) && Number(initial.coords.heading) >= 0) {
          setHeading(Number(initial.coords.heading));
        }

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: 3,
            timeInterval: 1500,
          },
          (next) => {
            if (!active) return;
            const nextCoordinate = {
              latitude: next.coords.latitude,
              longitude: next.coords.longitude,
            };
            setPosition(nextCoordinate);
            setRouteOrigin((current) => {
              if (!current) return nextCoordinate;
              const movedKm = distanceBetweenCoordinatesKm(current, nextCoordinate);
              return movedKm >= 0.1 ? nextCoordinate : current;
            });
            setAccuracy(next.coords.accuracy);
            if (Number.isFinite(next.coords.heading) && Number(next.coords.heading) >= 0) {
              setHeading(Number(next.coords.heading));
            }
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
    if (!routeOrigin) return;
    const controller = new AbortController();
    setRouteLoading(true);
    setRouteError(null);

    void getDrivingRoute(routeOrigin, stationCoordinate, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setRoadRoute(result);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setRouteError(
            error instanceof Error
              ? error.message
              : 'Impossible de calculer l’itinéraire routier.',
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setRouteLoading(false);
      });

    return () => controller.abort();
  }, [routeOrigin, routeRefreshKey, stationCoordinate]);

  useEffect(() => {
    const points = roadRoute?.coordinates.length
      ? roadRoute.coordinates
      : routeOrigin
        ? [routeOrigin, stationCoordinate]
        : [stationCoordinate];
    const timeout = setTimeout(() => {
      mapRef.current?.fitToCoordinates(points, {
        edgePadding: {
          top: 110,
          right: 70,
          bottom: showDirections ? 460 : 340,
          left: 70,
        },
        animated: true,
      });
    }, 350);
    return () => clearTimeout(timeout);
  }, [roadRoute, routeOrigin, showDirections, stationCoordinate]);

  const displayedDistanceMeters = roadRoute?.distanceMeters ?? null;
  const navigationProgress = useMemo(
    () => position && roadRoute ? getNavigationProgress(position, roadRoute) : null,
    [position, roadRoute],
  );

  useEffect(() => {
    if (!navigationActive || !position) return;
    mapRef.current?.animateCamera(
      {
        center: position,
        heading,
        pitch: 52,
        zoom: 17,
      },
      { duration: 700 },
    );
  }, [heading, navigationActive, position]);

  useEffect(() => {
    if (
      !navigationActive ||
      !position ||
      !navigationProgress ||
      routeLoading ||
      navigationProgress.distanceFromRouteMeters < 65
    ) return;

    const now = Date.now();
    if (now - lastDeviationRecalculationRef.current < 12_000) return;
    lastDeviationRecalculationRef.current = now;
    setRouteOrigin(position);
    setRouteRefreshKey((current) => current + 1);
  }, [navigationActive, navigationProgress, position, routeLoading]);

  useEffect(() => {
    if (!navigationActive || !position || arrivalNotifiedRef.current) return;
    const distanceToDestinationMeters = distanceBetweenCoordinatesKm(
      position,
      stationCoordinate,
    ) * 1000;
    if (distanceToDestinationMeters > 35) return;

    arrivalNotifiedRef.current = true;
    setNavigationActive(false);
    Alert.alert('Vous êtes arrivé', `Vous êtes arrivé à ${station.name}.`);
  }, [navigationActive, position, station.name, stationCoordinate]);

  const centerMap = () => {
    const points = roadRoute?.coordinates.length
      ? roadRoute.coordinates
      : position
        ? [position, stationCoordinate]
        : [stationCoordinate];
    mapRef.current?.fitToCoordinates(points, {
      edgePadding: {
        top: 110,
        right: 70,
        bottom: showDirections ? 460 : 340,
        left: 70,
      },
      animated: true,
    });
  };

  const retryRoute = () => setRouteRefreshKey((current) => current + 1);

  const toggleNavigation = () => {
    if (navigationActive) {
      setNavigationActive(false);
      return;
    }
    if (!position) {
      Alert.alert(
        'Position indisponible',
        'Activez la localisation pour démarrer la navigation EVEX.',
      );
      return;
    }
    if (!roadRoute) {
      retryRoute();
      Alert.alert(
        'Itinéraire en préparation',
        'EVEX calcule le trajet routier. Réessayez dans un instant.',
      );
      return;
    }

    arrivalNotifiedRef.current = false;
    lastDeviationRecalculationRef.current = 0;
    setShowDirections(false);
    setNavigationActive(true);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        mapType={satelliteMode ? 'hybrid' : 'standard'}
        initialRegion={{
          ...stationCoordinate,
          latitudeDelta: 0.035,
          longitudeDelta: 0.035,
        }}
        showsCompass
        showsScale
        pitchEnabled
        rotateEnabled
        toolbarEnabled={false}
      >
        <Marker
          coordinate={stationCoordinate}
          title={station.name}
          description={station.address || station.city_name}
          pinColor={COLORS.primary}
        />
        {position && (
          <Marker
            coordinate={position}
            title="Votre position"
            anchor={{ x: 0.5, y: 0.5 }}
            flat={navigationActive}
          >
            <View style={[styles.userMarker, navigationActive && styles.userMarkerActive]}>
              <Ionicons
                name={navigationActive ? 'navigate' : 'person'}
                size={navigationActive ? 20 : 17}
                color={COLORS.white}
              />
            </View>
          </Marker>
        )}
        {roadRoute && (
          <Polyline
            coordinates={roadRoute.coordinates}
            strokeColor={COLORS.primary}
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
          />
        )}
      </MapView>

      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.topTitleBlock}>
          <Text style={styles.topEyebrow}>
            {navigationActive ? 'NAVIGATION EVEX EN COURS' : 'ITINÉRAIRE VERS LA GARE'}
          </Text>
          <Text style={styles.topTitle} numberOfLines={1}>{station.name}</Text>
        </View>
        <TouchableOpacity style={styles.iconButton} onPress={centerMap}>
          <Ionicons name="locate" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.mapTypeButton, { top: insets.top + 82 }]}
        onPress={() => setSatelliteMode((current) => !current)}
        accessibilityRole="button"
        accessibilityLabel={satelliteMode ? 'Afficher le plan classique' : 'Afficher la carte satellite'}
      >
        <Ionicons
          name={satelliteMode ? 'map-outline' : 'layers-outline'}
          size={19}
          color={COLORS.primary}
        />
        <Text style={styles.mapTypeButtonText}>
          {satelliteMode ? 'Plan' : 'Satellite'}
        </Text>
      </TouchableOpacity>

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
          {displayedDistanceMeters !== null && (
            <View style={styles.distancePill}>
              <Text style={styles.distanceText}>
                {formatRouteDistance(displayedDistanceMeters)}
              </Text>
            </View>
          )}
        </View>

        {position && (
          <View style={styles.routeCard}>
            {routeLoading && !roadRoute ? (
              <View style={styles.routeMessageRow}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.routeMessageText}>Calcul du meilleur itinéraire…</Text>
              </View>
            ) : roadRoute ? navigationActive && navigationProgress ? (
              <View style={styles.navigationGuidance}>
                <View style={styles.navigationManeuverRow}>
                  <View style={styles.navigationManeuverIcon}>
                    <Ionicons
                      name={routeStepIcon(navigationProgress.currentInstruction)}
                      size={30}
                      color={COLORS.white}
                    />
                  </View>
                  <View style={styles.navigationInstructionBlock}>
                    <Text style={styles.navigationDistanceToTurn}>
                      {navigationProgress.distanceToInstructionMeters <= 15
                        ? 'Maintenant'
                        : `Dans ${formatRouteDistance(navigationProgress.distanceToInstructionMeters)}`}
                    </Text>
                    <Text style={styles.navigationInstructionText} numberOfLines={3}>
                      {navigationProgress.currentInstruction.text}
                    </Text>
                  </View>
                </View>

                {navigationProgress.followingInstruction && (
                  <View style={styles.navigationFollowingRow}>
                    <Ionicons
                      name={routeStepIcon(navigationProgress.followingInstruction)}
                      size={17}
                      color={COLORS.textSecondary}
                    />
                    <Text style={styles.navigationFollowingText} numberOfLines={2}>
                      Ensuite : {navigationProgress.followingInstruction.text}
                    </Text>
                  </View>
                )}

                <View style={styles.navigationRemainingRow}>
                  <View style={styles.navigationRemainingMetric}>
                    <Text style={styles.navigationRemainingValue}>
                      {formatRouteDuration(navigationProgress.remainingDurationSeconds)}
                    </Text>
                    <Text style={styles.navigationRemainingLabel}>restantes</Text>
                  </View>
                  <View style={styles.navigationRemainingDivider} />
                  <View style={styles.navigationRemainingMetric}>
                    <Text style={styles.navigationRemainingValue}>
                      {formatRouteDistance(navigationProgress.remainingDistanceMeters)}
                    </Text>
                    <Text style={styles.navigationRemainingLabel}>à parcourir</Text>
                  </View>
                  <View style={styles.navigationRemainingDivider} />
                  <View style={styles.navigationRemainingMetric}>
                    <Text style={styles.navigationRemainingValue}>
                      {Math.round(navigationProgress.progressPercent)} %
                    </Text>
                    <Text style={styles.navigationRemainingLabel}>effectué</Text>
                  </View>
                </View>
                <View style={styles.navigationProgressTrack}>
                  <View
                    style={[
                      styles.navigationProgressBar,
                      { width: `${navigationProgress.progressPercent}%` },
                    ]}
                  />
                </View>

                {(routeLoading || navigationProgress.distanceFromRouteMeters >= 65) && (
                  <View style={styles.navigationRecalculating}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.navigationRecalculatingText}>
                      Recalcul de l’itinéraire EVEX…
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <>
                <View style={styles.routeSummary}>
                  <View style={styles.routeMetric}>
                    <View style={styles.routeMetricIcon}>
                      <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                    </View>
                    <View>
                      <Text style={styles.routeMetricValue}>
                        {formatRouteDuration(roadRoute.durationSeconds)}
                      </Text>
                      <Text style={styles.routeMetricLabel}>Durée estimée</Text>
                    </View>
                  </View>
                  <View style={styles.routeSummaryDivider} />
                  <View style={styles.routeMetric}>
                    <View style={styles.routeMetricIcon}>
                      <Ionicons name="speedometer-outline" size={18} color={COLORS.primary} />
                    </View>
                    <View>
                      <Text style={styles.routeMetricValue}>
                        {formatRouteDistance(roadRoute.distanceMeters)}
                      </Text>
                      <Text style={styles.routeMetricLabel}>Par la route</Text>
                    </View>
                  </View>
                  {routeLoading && <ActivityIndicator size="small" color={COLORS.primary} />}
                </View>

                <TouchableOpacity
                  style={styles.directionsToggle}
                  onPress={() => setShowDirections((current) => !current)}
                >
                  <View style={styles.directionsToggleText}>
                    <Ionicons name="list" size={18} color={COLORS.primary} />
                    <Text style={styles.directionsToggleTitle}>
                      Indications routières
                    </Text>
                    <Text style={styles.directionsCount}>
                      {roadRoute.instructions.length}
                    </Text>
                  </View>
                  <Ionicons
                    name={showDirections ? 'chevron-up' : 'chevron-down'}
                    size={19}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>

                {showDirections && (
                  <ScrollView
                    style={styles.directionsList}
                    contentContainerStyle={styles.directionsListContent}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                  >
                    {roadRoute.instructions.map((instruction, index) => (
                      <View key={instruction.id} style={styles.directionStep}>
                        <View style={styles.directionTimeline}>
                          <View style={styles.directionIcon}>
                            <Ionicons
                              name={routeStepIcon(instruction)}
                              size={17}
                              color={COLORS.primary}
                            />
                          </View>
                          {index < roadRoute.instructions.length - 1 && (
                            <View style={styles.directionLine} />
                          )}
                        </View>
                        <View style={styles.directionContent}>
                          <Text style={styles.directionText}>{instruction.text}</Text>
                          {instruction.maneuverType !== 'arrive' && (
                            <Text style={styles.directionMeta}>
                              {formatRouteDistance(instruction.distanceMeters)} ·{' '}
                              {formatRouteDuration(instruction.durationSeconds)}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </>
            ) : (
              <View>
                <View style={styles.routeMessageRow}>
                  <Ionicons name="warning-outline" size={20} color="#D97706" />
                  <Text style={styles.routeMessageText}>
                    {routeError || 'Itinéraire routier indisponible.'}
                  </Text>
                </View>
                <TouchableOpacity style={styles.retryRouteButton} onPress={retryRoute}>
                  <Ionicons name="refresh" size={17} color={COLORS.primary} />
                  <Text style={styles.retryRouteText}>Recalculer</Text>
                </TouchableOpacity>
              </View>
            )}

            {routeError && roadRoute && (
              <TouchableOpacity style={styles.routeWarning} onPress={retryRoute}>
                <Ionicons name="warning-outline" size={16} color="#D97706" />
                <Text style={styles.routeWarningText}>Actualisation impossible · Réessayer</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.liveStatus}>
          <View style={[styles.liveDot, locationError && styles.liveDotError]} />
          <Text style={styles.liveText}>
            {locationError
              ? locationError
              : position
                ? `${navigationActive ? 'Navigation EVEX active' : 'Position GPS en direct'}${
                    accuracy ? ` · précision ${Math.round(accuracy)} m` : ''
                  }`
                : 'Recherche de votre position…'}
          </Text>
        </View>

        {locationError && (
          <TouchableOpacity style={styles.settingsButton} onPress={() => Linking.openSettings()}>
            <Ionicons name="settings-outline" size={18} color={COLORS.primary} />
            <Text style={styles.settingsText}>Ouvrir les réglages</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.navigateButton, navigationActive && styles.navigateButtonActive]}
          onPress={toggleNavigation}
        >
          <Ionicons
            name={navigationActive ? 'stop-circle' : 'navigate'}
            size={22}
            color={COLORS.white}
          />
          <View>
            <Text style={styles.navigateTitle}>
              {navigationActive ? 'Arrêter la navigation' : 'Démarrer avec EVEX'}
            </Text>
            <Text style={styles.navigateSubtitle}>
              {navigationActive
                ? 'Le trajet reste affiché sur la carte'
                : 'Navigation intégrée dans l’application'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8EEF7' },
  userMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    borderColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.24,
    shadowRadius: 5,
    elevation: 7,
  },
  userMarkerActive: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
  },
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
  mapTypeButton: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.96)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 6,
  },
  mapTypeButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  sheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    maxHeight: '78%',
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
  routeCard: {
    marginTop: 14,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#F8FBFF',
  },
  routeMessageRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  routeMessageText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
    lineHeight: 18,
  },
  navigationGuidance: {
    gap: 12,
  },
  navigationManeuverRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navigationManeuverIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 5,
  },
  navigationInstructionBlock: {
    flex: 1,
    marginLeft: 13,
  },
  navigationDistanceToTurn: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
  },
  navigationInstructionText: {
    marginTop: 3,
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    lineHeight: 22,
    fontWeight: FONT_WEIGHTS.bold,
  },
  navigationFollowingRow: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
  },
  navigationFollowingText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
    lineHeight: 17,
  },
  navigationRemainingRow: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#DBEAFE',
    flexDirection: 'row',
    alignItems: 'center',
  },
  navigationRemainingMetric: {
    flex: 1,
    alignItems: 'center',
  },
  navigationRemainingValue: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
  },
  navigationRemainingLabel: {
    marginTop: 2,
    color: COLORS.textSecondary,
    fontSize: 9,
  },
  navigationRemainingDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#DBEAFE',
  },
  navigationProgressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: '#DBEAFE',
  },
  navigationProgressBar: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  navigationRecalculating: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  navigationRecalculatingText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  routeSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  routeMetric: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeMetricIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF3FF',
  },
  routeMetricValue: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
  },
  routeMetricLabel: {
    marginTop: 1,
    color: COLORS.textSecondary,
    fontSize: 9,
  },
  routeSummaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#DBEAFE',
  },
  directionsToggle: {
    marginTop: 11,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  directionsToggleText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  directionsToggleTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  directionsCount: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
    textAlign: 'center',
    color: COLORS.primary,
    backgroundColor: '#EAF3FF',
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.bold,
  },
  directionsList: {
    maxHeight: 190,
    marginTop: 10,
  },
  directionsListContent: {
    paddingBottom: 4,
  },
  directionStep: {
    minHeight: 54,
    flexDirection: 'row',
  },
  directionTimeline: {
    width: 34,
    alignItems: 'center',
  },
  directionIcon: {
    width: 30,
    height: 30,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF3FF',
  },
  directionLine: {
    width: 2,
    flex: 1,
    minHeight: 18,
    backgroundColor: '#BFDBFE',
  },
  directionContent: {
    flex: 1,
    paddingLeft: 9,
    paddingRight: 3,
    paddingBottom: 12,
  },
  directionText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xs,
    lineHeight: 18,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  directionMeta: {
    marginTop: 3,
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  retryRouteButton: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EAF3FF',
  },
  retryRouteText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  routeWarning: {
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  routeWarningText: {
    flex: 1,
    color: '#B45309',
    fontSize: 10,
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
  navigateButtonActive: {
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626',
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
