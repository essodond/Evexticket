// Shared lightweight types used across components to avoid duplicate declarations
//
// Convention:
//   - Types that map directly to Django REST API responses use snake_case (e.g. is_active, created_at).
//   - Frontend-only types use camelCase.
//   - Interfaces that bridge both layers may include both; the preferred key is snake_case.

export interface City {
  id: number | string;
  name: string;
  region?: string;
  is_active?: boolean;
  created_at?: string;
}

export interface Company {
  id: number | string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  trips_count?: number;
}

export interface Trip {
  id: number | string;
  company?: number;
  company_name?: string;
  departure_city?: number;
  departure_city_name?: string;
  arrival_city?: number;
  arrival_city_name?: string;
  departure_time?: string;
  arrival_time?: string;
  date?: string;
  price?: number;
  duration?: number;
  bus_type?: string;
  capacity?: number;
  is_active?: boolean;
  created_at?: string;
  // Legacy aliases kept for backward compatibility with older API responses
  departure?: string;
  arrival?: string;
  origin?: string;
  destination?: string;
}

export interface User {
  id: number | string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  is_staff?: boolean;
  is_company_admin?: boolean;
  is_active?: boolean;
  date_joined?: string;
}

export interface DashboardStats {
  total_users?: number;
  total_companies?: number;
  total_trips?: number;
  total_bookings?: number;
  total_revenue?: number;
  monthly_growth?: number;
}

/** Raw data submitted by the search form before normalization */
export interface SearchFormData {
  departure: string;
  arrival: string;
  date: string;
  passengers?: number;
}


export interface PassengerInfo {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

export interface SearchData {
  departure_city: string;
  arrival_city: string;
  travel_date: string;
  date: string;
  passengers: number;
  /** Raw departure label shown in the UI (may differ from departure_city) */
  departure?: string;
  /** Raw arrival label shown in the UI (may differ from arrival_city) */
  arrival?: string;
  origin_stop?: string | number;
  destination_stop?: string | number;
  origin_stop_id?: string | number;
  destination_stop_id?: string | number;
  originStop?: string | number;
  destinationStop?: string | number;
}

export interface BookingData {
  trip: Trip;
  selectedSeat: number;
  passengerInfo: PassengerInfo;
  searchData: SearchData | null;
}

export interface PaymentData {
  transactionId: string;
  selectedSeat: number;
  passengerInfo: PassengerInfo;
  paymentMethod: string;
  booking: { id: number | string; status?: string };
}

export default {};
