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
  id: number;
  available_seats: number;
  date: string;
  trip: number;
  trip_info: {
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
  Auth: undefined;
  MainTabs: undefined;
  TripDetails: { trip: Trip };
  Payment: { trip: Trip };
  PaymentSuccess: undefined;
  PaymentFailed: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;