import type { Region } from 'react-native-maps';

const MIN_REGION_DELTA = 0.0005;
const MAX_LATITUDE_DELTA = 120;
const MAX_LONGITUDE_DELTA = 180;

const clamp = (value: number, minimum: number, maximum: number) => (
  Math.max(minimum, Math.min(maximum, value))
);

export const zoomMapRegion = (region: Region, delta: number): Region => {
  const scale = delta > 0 ? 0.5 : 2;
  const latitudeDelta = Number.isFinite(region.latitudeDelta) && region.latitudeDelta > 0
    ? region.latitudeDelta
    : 0.035;
  const longitudeDelta = Number.isFinite(region.longitudeDelta) && region.longitudeDelta > 0
    ? region.longitudeDelta
    : 0.035;

  return {
    ...region,
    latitudeDelta: clamp(
      latitudeDelta * scale,
      MIN_REGION_DELTA,
      MAX_LATITUDE_DELTA,
    ),
    longitudeDelta: clamp(
      longitudeDelta * scale,
      MIN_REGION_DELTA,
      MAX_LONGITUDE_DELTA,
    ),
  };
};
