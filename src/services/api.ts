// Configuration de l'API
// Ce fichier centralise toutes les requêtes HTTP vers le backend Django (DRF).
// Rappels de conventions utilisées :
// - L'URL de base est définie par API_BASE_URL.
// - Les méthodes retournent déjà le JSON parsé.
// - Si le backend renvoie un objet paginé { count, next, results: [...] },
//   la méthode normalize et retourne directement `results` pour simplifier l'appelant.
// - L'authentification peut être gérée via un token stocké en localStorage (authToken).
//   Le token est ajouté dans l'en-tête Authorization: 'Token <token>' par request().
// - La méthode request utilise `credentials: 'include'` pour supporter la SessionAuthentication
//   si le backend utilise des cookies.
const API_BASE_URL = 'http://127.0.0.1:8000/api';

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
    
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      // DRF TokenAuthentication expects "Token <key>"
      defaultHeaders['Authorization'] = `Token ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      // Permet d'envoyer les cookies si SessionAuthentication est utilisée
      credentials: 'include',
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        // essayer de parser le body pour obtenir un message d'erreur
        let errorData: any = null;
        try {
          errorData = await response.json();
        } catch (e) {
          try {
            errorData = await response.text();
          } catch (e2) {
            errorData = null;
          }
        }

        const message = (errorData && (errorData.detail || errorData.error || JSON.stringify(errorData))) || `HTTP error! status: ${response.status}`;
        const err: any = new Error(message);
        err.status = response.status;
        err.data = errorData;
        throw err;
      }

      const data = await response.json();

      // DRF pagination: responses for list endpoints may be { count, next, previous, results: [...] }
      // Normalize by returning the inner `results` array when present so callers can always expect an array.
      if (data && typeof data === 'object' && Array.isArray((data as any).results)) {
        return (data as any).results as T;
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Stocker le token dans localStorage et mettre l'en-tête Authorization
  setAuthToken(token: string | null) {
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
      try {
        localStorage.removeItem('username');
      } catch (e) {
        // ignore
      }
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

  // Utilisateurs (endpoints administratifs)
  // Remarque: ces endpoints doivent exister côté backend Django (/users/)
  async getUsers(): Promise<any[]> {
    return this.request<any[]>('/users/');
  }

  async getUser(id: number): Promise<any> {
    return this.request<any>(`/users/${id}/`);
  }

  async updateUser(id: number, user: Partial<any>): Promise<any> {
    return this.request<any>(`/users/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  }

  // Statistiques
  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/dashboard/stats/');
  }

  // Authentification (pour l'instant, simulation)
  async login(username: string, password: string): Promise<{ token: string; user: any }> {
    // Obtenir token via endpoint DRF authtoken
    const tokenResp = await fetch(`${API_BASE_URL}/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: username, password }),
    });

    if (!tokenResp.ok) {
      const errorData = await tokenResp.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Erreur lors de la connexion');
    }

    const tokenData = await tokenResp.json();
    const token = tokenData.token;
    this.setAuthToken(token);

    // Récupérer les informations utilisateur
    let user = { username };
    try {
      const me = await this.request<any>('/me/');
      user = me;
      try { localStorage.setItem('user', JSON.stringify(user)); } catch (e) {}
    } catch (e) {
      // fallback
    }

    // Persist username for UI (profile initial)
    try { localStorage.setItem('username', username); } catch (e) {}

    return { token, user };
  }

  // Récupérer l'utilisateur courant à partir de l'API (/me/)
  async getMe(): Promise<any> {
    return this.request<any>('/me/');
  }

  async register(userData: {
    username: string;
    email: string;
    password: string;
    password2: string;
    first_name: string;
    last_name: string;
  }): Promise<{ token: string; user: any }> {
    // Appel réel à l'API Django pour l'inscription
    const response = await fetch(`${API_BASE_URL}/register/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Erreur lors de la création du compte');
    }

    const data = await response.json();
    // Si l'endpoint retourne un token (nous l'ajoutons côté backend), le stocker
    const token = data.token;
    if (token) {
      this.setAuthToken(token);
    }

    // Récupérer les informations utilisateur
    let user = null;
    try {
      user = await this.request<any>('/me/');
      try { localStorage.setItem('user', JSON.stringify(user)); } catch (e) {}
    } catch (e) {
      // ignore
    }

    return { token, user };
  }
}

// Instance singleton du service API
export const apiService = new ApiService();

// Export par défaut
export default apiService;
