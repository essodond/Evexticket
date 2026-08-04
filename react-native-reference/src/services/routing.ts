export type RoutingCoordinate = {
  latitude: number;
  longitude: number;
};

export type RouteInstruction = {
  id: string;
  text: string;
  roadName: string;
  distanceMeters: number;
  durationSeconds: number;
  coordinate: RoutingCoordinate;
  routeIndex: number;
  maneuverType: string;
  maneuverModifier?: string;
};

export type DrivingRoute = {
  coordinates: RoutingCoordinate[];
  distanceMeters: number;
  durationSeconds: number;
  instructions: RouteInstruction[];
};

type OsrmManeuver = {
  type?: string;
  modifier?: string;
  exit?: number;
  location?: [number, number];
};

type OsrmStep = {
  distance?: number;
  duration?: number;
  name?: string;
  maneuver?: OsrmManeuver;
};

type OsrmRoute = {
  distance?: number;
  duration?: number;
  geometry?: {
    coordinates?: [number, number][];
  };
  legs?: Array<{
    steps?: OsrmStep[];
  }>;
};

type OsrmResponse = {
  code?: string;
  message?: string;
  routes?: OsrmRoute[];
};

const DEFAULT_ROUTING_API_URL = 'https://router.project-osrm.org';
const ROUTING_TIMEOUT_MS = 15_000;

const routingApiUrl = (
  process.env.EXPO_PUBLIC_ROUTING_API_URL || DEFAULT_ROUTING_API_URL
).replace(/\/$/, '');

const directionLabel = (modifier?: string) => {
  switch (modifier) {
    case 'uturn':
      return 'faites demi-tour';
    case 'sharp right':
      return 'tournez franchement à droite';
    case 'right':
      return 'tournez à droite';
    case 'slight right':
      return 'restez légèrement à droite';
    case 'straight':
      return 'continuez tout droit';
    case 'slight left':
      return 'restez légèrement à gauche';
    case 'left':
      return 'tournez à gauche';
    case 'sharp left':
      return 'tournez franchement à gauche';
    default:
      return 'continuez';
  }
};

const roadSuffix = (roadName: string) => roadName ? ` sur ${roadName}` : '';

const instructionText = (step: OsrmStep) => {
  const maneuver = step.maneuver || {};
  const roadName = step.name?.trim() || '';
  const direction = directionLabel(maneuver.modifier);

  switch (maneuver.type) {
    case 'depart':
      return roadName ? `Partez sur ${roadName}` : 'Prenez la route';
    case 'arrive':
      return 'Vous êtes arrivé à destination';
    case 'roundabout':
    case 'rotary': {
      const exit = maneuver.exit ? ` la ${maneuver.exit}e sortie` : ' la sortie indiquée';
      return `Au rond-point, prenez${exit}${roadSuffix(roadName)}`;
    }
    case 'merge':
      return `Rejoignez${roadSuffix(roadName)} en restant ${
        maneuver.modifier?.includes('left') ? 'à gauche' : 'à droite'
      }`;
    case 'fork':
      return `À l’embranchement, ${direction}${roadSuffix(roadName)}`;
    case 'on ramp':
      return `Prenez la bretelle${roadSuffix(roadName)}`;
    case 'off ramp':
      return `Prenez la sortie${roadSuffix(roadName)}`;
    case 'end of road':
      return `Au bout de la route, ${direction}${roadSuffix(roadName)}`;
    case 'continue':
    case 'new name':
      return `${direction.charAt(0).toUpperCase()}${direction.slice(1)}${roadSuffix(roadName)}`;
    default:
      return `${direction.charAt(0).toUpperCase()}${direction.slice(1)}${roadSuffix(roadName)}`;
  }
};

const asCoordinate = (value?: [number, number]): RoutingCoordinate | null => {
  if (!value || value.length !== 2) return null;
  const [longitude, latitude] = value;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
};

const parseRoute = (route: OsrmRoute): DrivingRoute => {
  const coordinates = (route.geometry?.coordinates || [])
    .map(asCoordinate)
    .filter((coordinate): coordinate is RoutingCoordinate => coordinate !== null);

  if (coordinates.length < 2) {
    throw new Error('Le service n’a pas renvoyé un tracé routier valide.');
  }

  const nearestRouteIndex = (coordinate: RoutingCoordinate) => {
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    coordinates.forEach((routeCoordinate, index) => {
      const latitudeDelta = routeCoordinate.latitude - coordinate.latitude;
      const longitudeDelta = routeCoordinate.longitude - coordinate.longitude;
      const squaredDistance = latitudeDelta ** 2 + longitudeDelta ** 2;
      if (squaredDistance < nearestDistance) {
        nearestDistance = squaredDistance;
        nearestIndex = index;
      }
    });

    return nearestIndex;
  };

  const instructions = (route.legs || [])
    .flatMap((leg) => leg.steps || [])
    .map((step, index): RouteInstruction | null => {
      const coordinate = asCoordinate(step.maneuver?.location);
      if (!coordinate) return null;
      return {
        id: `${index}-${coordinate.latitude}-${coordinate.longitude}`,
        text: instructionText(step),
        roadName: step.name?.trim() || '',
        distanceMeters: Number(step.distance) || 0,
        durationSeconds: Number(step.duration) || 0,
        coordinate,
        routeIndex: nearestRouteIndex(coordinate),
        maneuverType: step.maneuver?.type || 'turn',
        maneuverModifier: step.maneuver?.modifier,
      };
    })
    .filter((instruction): instruction is RouteInstruction => instruction !== null);

  return {
    coordinates,
    distanceMeters: Number(route.distance) || 0,
    durationSeconds: Number(route.duration) || 0,
    instructions,
  };
};

export async function getDrivingRoute(
  origin: RoutingCoordinate,
  destination: RoutingCoordinate,
  signal?: AbortSignal,
): Promise<DrivingRoute> {
  const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
  const query = 'alternatives=2&steps=true&overview=full&geometries=geojson';
  const requestUrl = `${routingApiUrl}/route/v1/driving/${coordinates}?${query}`;
  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), ROUTING_TIMEOUT_MS);
  const abortFromCaller = () => timeoutController.abort();
  signal?.addEventListener('abort', abortFromCaller, { once: true });

  try {
    const response = await fetch(requestUrl, { signal: timeoutController.signal });
    const payload = (await response.json()) as OsrmResponse;

    if (!response.ok || payload.code !== 'Ok' || !payload.routes?.length) {
      throw new Error(
        payload.code === 'NoRoute'
          ? 'Aucun itinéraire routier n’a été trouvé vers cette gare.'
          : payload.message || 'Le calcul de l’itinéraire est momentanément indisponible.',
      );
    }

    return parseRoute(payload.routes[0]);
  } catch (error) {
    if (timeoutController.signal.aborted) {
      throw new Error(
        signal?.aborted
          ? 'Le calcul de l’itinéraire a été annulé.'
          : 'Le calcul de l’itinéraire prend trop de temps. Réessayez.',
      );
    }
    throw error instanceof Error
      ? error
      : new Error('Impossible de calculer l’itinéraire routier.');
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}

export function formatRouteDistance(distanceMeters: number) {
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`;
  return `${(distanceMeters / 1000).toFixed(distanceMeters < 10_000 ? 1 : 0)} km`;
}

export function formatRouteDuration(durationSeconds: number) {
  const totalMinutes = Math.max(1, Math.round(durationSeconds / 60));
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
}
