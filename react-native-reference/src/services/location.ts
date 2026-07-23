import * as Location from 'expo-location';
import { City } from '../types';

export interface DetectedDepartureCity {
  city: City;
  latitude: number;
  longitude: number;
  detectedLabel: string;
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const findMatchingCity = (cities: City[], labels: string[]) => {
  const normalizedLabels = labels.map(normalize).filter(Boolean);
  return cities.find((city) => {
    const candidate = normalize(city.name);
    return normalizedLabels.some(
      (label) =>
        label === candidate ||
        label.startsWith(`${candidate} `) ||
        label.endsWith(` ${candidate}`) ||
        candidate.startsWith(`${label} `) ||
        candidate.endsWith(` ${label}`),
    );
  });
};

export async function detectCurrentDepartureCity(
  cities: City[],
): Promise<DetectedDepartureCity> {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new Error('Activez la localisation du téléphone pour voir les départs proches.');
  }

  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== Location.PermissionStatus.GRANTED) {
    throw new Error('Autorisez la localisation pour recommander les voyages au départ de votre ville.');
  }

  const current = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const addresses = await Location.reverseGeocodeAsync({
    latitude: current.coords.latitude,
    longitude: current.coords.longitude,
  });
  const address = addresses[0];
  const labels = [
    address?.city,
    address?.district,
    address?.subregion,
    address?.region,
  ].filter((label): label is string => Boolean(label));
  const city = findMatchingCity(cities, labels);

  if (!city) {
    const detected = labels[0] || 'votre position';
    throw new Error(`Aucun départ EVEX n’est encore enregistré pour ${detected}.`);
  }

  return {
    city,
    latitude: current.coords.latitude,
    longitude: current.coords.longitude,
    detectedLabel: labels[0] || city.name,
  };
}
