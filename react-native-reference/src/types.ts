import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SeatStatus } from './components/SeatSelection';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  date_joined?: string;
  loyalty?: LoyaltySummary;
  role?: 'CLIENT' | 'AGENT_GUICHET' | 'ADMIN_COMPAGNIE' | 'SUPER_ADMIN';
  company_id?: number | null;
}

export interface LoyaltyLevelPreview {
  key: string;
  label: string;
  minimum_xp: number;
}

export interface LoyaltyLevel extends LoyaltyLevelPreview {
  progress_percent: number;
  xp_to_next_level: number;
  next_level: LoyaltyLevelPreview | null;
}

export interface LoyaltyTransaction {
  id: number;
  points: number;
  event_type: 'trip_completed' | 'trip_reversed' | 'adjustment';
  description: string;
  booking_id: number | null;
  created_at: string;
}

export interface LoyaltySummary {
  total_xp: number;
  xp_per_completed_trip: number;
  completed_trips_count: number;
  level: LoyaltyLevel;
  history?: LoyaltyTransaction[];
}

export type TrackingStatus = 'not_started' | 'live' | 'offline' | 'stopped';

export interface TrackingPosition {
  id?: number;
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  speed_kmh: number | null;
  heading: number | null;
  recorded_at: string;
}

export interface TrackingStop {
  id: string;
  trip_stop_id: number | null;
  sequence: number;
  city_name: string;
  station_name: string;
  latitude: number | null;
  longitude: number | null;
  status: 'passed' | 'next' | 'upcoming';
}

export interface TrackingSnapshot {
  scheduled_trip_id: number;
  status: TrackingStatus;
  is_active: boolean;
  is_stale: boolean;
  route: {
    departure_city: string;
    arrival_city: string;
    departure_time: string;
    planned_arrival_at: string;
  };
  current_position: TrackingPosition | null;
  estimated_arrival_at: string | null;
  eta_minutes: number | null;
  delay_minutes: number;
  distance_remaining_km: number | null;
  stops: TrackingStop[];
  approach_alert: {
    active: boolean;
    stop_name: string | null;
    distance_km: number | null;
  };
  history: TrackingPosition[];
  updated_at: string | null;
  server_time: string;
}

export interface ManageableTrackingTrip {
  id: number;
  date: string;
  departure_time: string;
  departure_city: string;
  arrival_city: string;
  company_name: string;
  tracking_active: boolean;
}

export interface DriverLocationPayload {
  latitude: number;
  longitude: number;
  accuracy_m?: number | null;
  speed_mps?: number | null;
  heading?: number | null;
  recorded_at: string;
}

export interface City {
  id: number;
  name: string;
}

export interface Company {
  id: number;
  name: string;
  logo_url?: string;
}

export interface Seat {
  id: string;
  status: SeatStatus;
  number: number;
}

export interface Trip {
  id: number | string;
  available_seats: number;
  date: string;
  trip: number;
  seat_number?: string;
  payment_status?: string;
  transaction_id?: string;
  trip_info: {
    company?: number;
    departure_city?: City | number | string;
    arrival_city?: City | number | string;
    arrival_city_name: string;
    arrival_time: string;
    available_seats: number;
    bookings_count: number;
    bus_type: string;
    capacity: number;
    company_name: string;
    company_logo?: string | null;
    departure_city_name: string;
    departure_time: string;
    duration: number;
    id: number;
    price: string;
    stops: TripStop[];
    departure_station?: StationDestination | null;
  };
  seats: Seat[];
}

export type PaymentMethod = 'flooz' | 'tmoney';

export interface TripStop {
  id: number;
  trip?: number;
  city: City | number;
  city_name?: string;
  sequence?: number;
  segment_price?: string | null;
  arrival_time?: string;
  departure_time?: string;
  boarding_zones?: BoardingZone[];
}

export interface BoardingZone {
  id: number;
  trip_stop: number;
  city?: number;
  city_name?: string;
  name: string;
  description?: string;
  location?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
}

export interface StationDestination {
  id?: string;
  name: string;
  address?: string;
  city_name: string;
  latitude: number;
  longitude: number;
  source?: 'boarding_zone' | 'agency';
}

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  PublicHome: undefined;
  Auth: undefined;
  MainTabs: undefined;
  TripDetails: { trip: Trip };
  Payment: { trip: Trip; selectedSeat?: string | null };
  Ticket: { trip: Trip };
  TrackBus: { tripId?: string | number };
  StartTracking: { tripId?: string | number };
  StationMap: { station: StationDestination };
  CompanyDetails: { companyId: number; preferredCityName?: string };
  TicketAssistant: { bookingId: number; reference?: string };
  PaymentSuccess: undefined;
  PaymentFailed: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Companies: undefined;
  MyTickets: undefined;
  Profile: undefined;
  Notifications: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
