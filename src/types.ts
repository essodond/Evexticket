// Shared lightweight types used across components to avoid duplicate declarations
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
  isActive?: boolean;
  is_active?: boolean;
  createdAt?: string;
  created_at?: string;
  updated_at?: string;
  trips_count?: number;
}

export interface Trip {
  id: number | string;
  companyId?: number | string;
  company?: number;
  company_name?: string;
  companyName?: string;
  departureCity?: number | string;
  departure_city?: number;
  departure_city_name?: string;
  arrivalCity?: number | string;
  arrival_city?: number;
  arrival_city_name?: string;
  departureTime?: string;
  departure_time?: string;
  arrivalTime?: string;
  arrival_time?: string;
  price?: number;
  duration?: number;
  busType?: string;
  bus_type?: string;
  capacity?: number;
  isActive?: boolean;
  is_active?: boolean;
  createdAt?: string;
  created_at?: string;
}

export interface User {
  id: number | string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: 'user' | 'company' | 'admin';
  isActive?: boolean;
  createdAt?: string;
  is_staff?: boolean;
  is_company_admin?: boolean;
}

export interface DashboardStats {
  total_users?: number;
  totalUsers?: number;
  total_companies?: number;
  total_trips?: number;
  total_bookings?: number;
  total_revenue?: number;
  monthly_growth?: number;
  totalRevenue?: number;
  monthlyGrowth?: number;
}

export default {};
