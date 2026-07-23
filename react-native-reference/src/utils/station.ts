import { BoardingZone, StationDestination, TripStop } from '../types';

const finiteCoordinate = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const stationFromZone = (
  zone: BoardingZone | undefined,
  fallbackCity: string,
): StationDestination | null => {
  if (!zone) return null;
  const latitude = finiteCoordinate(zone.latitude);
  const longitude = finiteCoordinate(zone.longitude);
  if (latitude === null || longitude === null) return null;

  return {
    id: String(zone.id),
    name: zone.name,
    address: zone.description || zone.location || '',
    city_name: zone.city_name || fallbackCity,
    latitude,
    longitude,
    source: 'boarding_zone',
  };
};

export function findDepartureStation(payload: any): StationDestination | null {
  const tripInfo = payload?.trip_info || payload?.trip_details || payload || {};
  const direct = tripInfo.departure_station || payload?.departure_station;
  if (direct) {
    const latitude = finiteCoordinate(direct.latitude);
    const longitude = finiteCoordinate(direct.longitude);
    if (latitude !== null && longitude !== null) {
      return {
        id: direct.id ? String(direct.id) : undefined,
        name: direct.name || 'Gare de départ',
        address: direct.address || direct.description || '',
        city_name:
          direct.city_name ||
          tripInfo.departure_city_name ||
          payload?.departure_city_name ||
          'Ville de départ',
        latitude,
        longitude,
        source: direct.source || 'agency',
      };
    }
  }

  const stops: TripStop[] = payload?.stops || tripInfo?.stops || [];
  const originStopId = String(payload?.origin_stop || payload?.origin_stop_id || '');
  const departureCity =
    tripInfo.departure_city_name || payload?.departure_city_name || payload?.from || '';
  const origin =
    stops.find((stop) => originStopId && String(stop.id) === originStopId) ||
    stops.find((stop) => stop.city_name === departureCity) ||
    stops[0];
  if (!origin) return null;

  const zone = origin.boarding_zones?.find(
    (item) =>
      finiteCoordinate(item.latitude) !== null &&
      finiteCoordinate(item.longitude) !== null,
  );
  return stationFromZone(zone, origin.city_name || departureCity);
}
