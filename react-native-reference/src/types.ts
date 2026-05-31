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
    departure_city?: City | number | string;
    arrival_city?: City | number | string;
    arrival_city_name: string;
    arrival_time: string;
    available_seats: number;
    bookings_count: number;
    bus_type: string;
    capacity: number;
    company_name: string;
    departure_city_name: string;
    departure_time: string;
    duration: number;
    id: number;
    price: string;
    stops: TripStop[];
  };
  seats: Seat[];
}

export type PaymentMethod = 'flooz' | 'tmoney';

export interface TripStop {
  id: number;
  trip: number;
  city: City | number;
  city_name?: string;
  arrival_time: string;
  departure_time: string;
  boarding_zones?: BoardingZone[];
}

export interface BoardingZone {
  id: number;
  trip_stop: number;
  name: string;
  location: string;
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
  PaymentSuccess: undefined;
  PaymentFailed: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  MyTickets: undefined;
  Profile: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
