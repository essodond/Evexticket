// Configuration de l'API
const API_BASE_URL = 'http://localhost:8000/api';

// Types pour les données
export interface City {
  id: number;
  name: string;
  region: string;
  is_active: boolean;
  created_at: string;
}

export interface Company {
  id: number;
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  trips_count?: number;
}

export interface Trip {
  id: number;
  company: number;
  company_name: string;
  departure_city: number;
  departure_city_name: string;
  arrival_city: number;
  arrival_city_name: string;
  departure_time: string;
  arrival_time: string;
  price: number;
  duration: number;
  bus_type: string;
  capacity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  bookings_count?: number;
  available_seats?: number;
}

export interface Booking {
  id: number;
  trip: number;
  trip_details?: Trip;
  passenger_name: string;
  passenger_email: string;
  passenger_phone: string;
  seat_number: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  payment_method: 'mobile_money' | 'bank_card' | 'cash';
  total_price: number;
  booking_date: string;
  travel_date: string;
  notes?: string;
  user?: number;
}

export interface DashboardStats {
  total_users: number;
  total_companies: number;
  total_trips: number;
  total_bookings: number;
  total_revenue: number;
  monthly_growth: number;
}

export interface CompanyStats {
  total_trips: number;
  total_bookings: number;
  total_revenue: number;
  active_trips: number;
  pending_bookings: number;
  monthly_growth: number;
}

export interface TripSearchParams {
  departure_city: string;
  arrival_city: string;
  travel_date: string;
  passengers: number;
}

// Classe de service API
class ApiService {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  // Méthode générique pour les requêtes
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Villes
  async getCities(): Promise<City[]> {
    return this.request<City[]>('/cities/');
  }

  // Compagnies
  async getCompanies(): Promise<Company[]> {
    return this.request<Company[]>('/companies/');
  }

  async getCompany(id: number): Promise<Company> {
    return this.request<Company>(`/companies/${id}/`);
  }

  async createCompany(company: Omit<Company, 'id' | 'created_at' | 'updated_at'>): Promise<Company> {
    return this.request<Company>('/companies/', {
      method: 'POST',
      body: JSON.stringify(company),
    });
  }

  async updateCompany(id: number, company: Partial<Company>): Promise<Company> {
    return this.request<Company>(`/companies/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(company),
    });
  }

  async deleteCompany(id: number): Promise<void> {
    return this.request<void>(`/companies/${id}/`, {
      method: 'DELETE',
    });
  }

  async getCompanyStats(id: number): Promise<CompanyStats> {
    return this.request<CompanyStats>(`/companies/${id}/stats/`);
  }

  // Trajets
  async getTrips(): Promise<Trip[]> {
    return this.request<Trip[]>('/trips/');
  }

  async getTrip(id: number): Promise<Trip> {
    return this.request<Trip>(`/trips/${id}/`);
  }

  async createTrip(trip: Omit<Trip, 'id' | 'created_at' | 'updated_at' | 'company_name' | 'departure_city_name' | 'arrival_city_name' | 'bookings_count' | 'available_seats'>): Promise<Trip> {
    return this.request<Trip>('/trips/', {
      method: 'POST',
      body: JSON.stringify(trip),
    });
  }

  async updateTrip(id: number, trip: Partial<Trip>): Promise<Trip> {
    return this.request<Trip>(`/trips/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(trip),
    });
  }

  async deleteTrip(id: number): Promise<void> {
    return this.request<void>(`/trips/${id}/`, {
      method: 'DELETE',
    });
  }

  async searchTrips(params: TripSearchParams): Promise<Trip[]> {
    return this.request<Trip[]>('/trips/search/', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Réservations
  async getBookings(): Promise<Booking[]> {
    return this.request<Booking[]>('/bookings/');
  }

  async getBooking(id: number): Promise<Booking> {
    return this.request<Booking>(`/bookings/${id}/`);
  }

  async createBooking(booking: Omit<Booking, 'id' | 'booking_date' | 'trip_details' | 'passenger_full_name'>): Promise<Booking> {
    return this.request<Booking>('/bookings/', {
      method: 'POST',
      body: JSON.stringify(booking),
    });
  }

  async updateBooking(id: number, booking: Partial<Booking>): Promise<Booking> {
    return this.request<Booking>(`/bookings/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(booking),
    });
  }

  async deleteBooking(id: number): Promise<void> {
    return this.request<void>(`/bookings/${id}/`, {
      method: 'DELETE',
    });
  }

  async confirmBooking(id: number): Promise<{ status: string }> {
    return this.request<{ status: string }>(`/bookings/${id}/confirm/`, {
      method: 'POST',
    });
  }

  async cancelBooking(id: number): Promise<{ status: string }> {
    return this.request<{ status: string }>(`/bookings/${id}/cancel/`, {
      method: 'POST',
    });
  }

  // Statistiques
  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/dashboard/stats/');
  }

  // Authentification (pour l'instant, simulation)
  async login(username: string, password: string): Promise<{ token: string; user: any }> {
    // Simulation d'authentification
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          token: 'mock-token-' + Date.now(),
          user: {
            id: 1,
            username,
            email: `${username}@togotrans.tg`,
            is_staff: username === 'admin'
          }
        });
      }, 1000);
    });
  }

  async register(userData: {
    username: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }): Promise<{ token: string; user: any }> {
    // Simulation d'inscription
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          token: 'mock-token-' + Date.now(),
          user: {
            id: Date.now(),
            username: userData.username,
            email: userData.email,
            first_name: userData.first_name,
            last_name: userData.last_name,
            is_staff: false
          }
        });
      }, 1000);
    });
  }
}

// Instance singleton du service API
export const apiService = new ApiService();

// Export par défaut
export default apiService;
