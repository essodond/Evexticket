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

function resolveApiBaseUrl(): string {
  // 1) Priorité à l'override via environnement (Vite)
  const envOrigin = (import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined;
  if (envOrigin && envOrigin.trim().length > 0) {
    const clean = envOrigin.replace(/\/$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }

  // 2) Déduire à partir de l'hôte courant (utile en LAN depuis un téléphone)
  try {
    const host = typeof window !== 'undefined' ? window.location.hostname : undefined;
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:8000/api`;
    }
  } catch (_) { }

  // 3) Repli par défaut en développement local
  return 'http://127.0.0.1:8000/api';
}

const API_BASE_URL = resolveApiBaseUrl();

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
  departure_city_display?: string;
  arrival_city_display?: string;
}

export interface ScheduledTrip extends Trip {
  date: string;
  scheduled_trip_id?: number;
  seats?: any[];
  stops?: any[];
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
  total_bookings: number;
  total_revenue: number;
  active_clients: number;
  scheduled_trips: number;
}

export interface TripSearchParams {
  departure_city: string;
  arrival_city: string;
  travel_date: string;
  passengers: number;
}

/** Default request timeout — avoids indefinite hangs on Render.com free-tier cold starts */
const REQUEST_TIMEOUT_MS = 12_000;

// Classe de service API
class ApiService {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Fire-and-forget backend warmup.
   * Call on app startup to preemptively wake the Render.com free-tier server before the user
   * needs it. The 60-second window is intentionally long so the server has time to fully start.
   */
  warmup(): void {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60_000);
    fetch(`${this.baseURL}/cities/`, { signal: controller.signal })
      .catch(() => { })
      .finally(() => clearTimeout(timeoutId));
  }

  // Méthode générique pour les requêtes
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

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
      // Allow caller to override signal; otherwise use our timeout controller
      signal: options.signal ?? controller.signal,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
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

      // Some endpoints (DELETE) may return 204 No Content — response.json() would throw.
      // Read body as text first and handle empty body gracefully.
      const text = await response.text();
      if (!text) {
        // No content — return nullish value (caller should handle void/null)
        return (null as unknown) as T;
      }

      let data: any;
      try {
        data = JSON.parse(text);
      } catch (e) {
        // If response is not JSON for some reason, return raw text
        return (text as unknown) as T;
      }

      // DRF pagination: responses for list endpoints may be { count, next, previous, results: [...] }
      // Normalize by returning the inner `results` array when present so callers can always expect an array.
      if (data && typeof data === 'object' && Array.isArray((data as any).results)) {
        return (data as any).results as T;
      }

      return data;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('La requête a expiré. Vérifiez votre connexion ou réessayez.');
      }
      console.error('API request failed:', error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Stocker le token dans localStorageet mettre l'en-tête Authorization
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

  // Trajets
  async getRoutes(companyId?: number): Promise<Trip[]> {
    const query = companyId ? `?company_id=${encodeURIComponent(String(companyId))}` : '';
    return this.request<Trip[]>(`/trips/${query}`);
  }

  async getRoute(id: number): Promise<Trip> {
    return this.request<Trip>(`/trips/${id}/`);
  }

  // Backwards-compatible aliases expected by frontend components/hooks
  async getTrip(id: number): Promise<Trip> {
    return this.getRoute(id);
  }

  async getTrips(companyId?: number): Promise<Trip[]> {
    return this.getRoutes(companyId);
  }

  async createRoute(trip: Omit<Trip, 'arrival_city_name' | 'available_seats' | 'bookings_count' | 'company_name' | 'created_at' | 'departure_city_name' | 'id' | 'updated_at'>): Promise<Trip> {
    return this.request<Trip>('/trips/', {
      method: 'POST',
      body: JSON.stringify(trip),
    });
  }

  async createTrip(trip: Omit<Trip, 'arrival_city_name' | 'available_seats' | 'bookings_count' | 'company_name' | 'created_at' | 'departure_city_name' | 'id' | 'updated_at'>): Promise<Trip> {
    return this.createRoute(trip);
  }

  async updateRoute(id: number, trip: Partial<Trip>): Promise<Trip> {
    return this.request<Trip>(`/trips/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(trip),
    });
  }

  async updateTrip(id: number, trip: Partial<Trip>): Promise<Trip> {
    return this.updateRoute(id, trip);
  }

  async deleteRoute(id: number): Promise<void> {
    return this.request<void>(`/trips/${id}/`, {
      method: 'DELETE',
    });
  }

  async deleteTrip(id: number): Promise<void> {
    return this.deleteRoute(id);
  }

  /**
   * Flatten scheduled trip objects: the backend returns { id, trip_info: {...}, date, ... }
   * but the frontend expects flat objects with all Trip fields + scheduled trip fields.
   */
  private flattenScheduledTrips(data: any[]): ScheduledTrip[] {
    if (!Array.isArray(data)) return [];
    return data.map((item: any) => {
      if (item && item.trip_info && typeof item.trip_info === 'object') {
        return {
          ...item.trip_info,
          scheduled_trip_id: item.id,
          id: item.trip_info.id, // keep route/trip id as id
          date: item.date,
          available_seats: item.available_seats ?? item.trip_info.available_seats,
          seats: item.seats,
          stops: item.stops,
          departure_city_display: item.departure_city_display || item.trip_info.departure_city_name,
          arrival_city_display: item.arrival_city_display || item.trip_info.arrival_city_name,
        };
      }
      return item;
    });
  }

  async searchScheduledTrips(params: TripSearchParams): Promise<ScheduledTrip[]> {
    const raw = await this.request<any[]>('/scheduled_trips/search/', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return this.flattenScheduledTrips(raw);
  }

  // Voyages datés
  async getScheduledTrips(companyId?: number): Promise<ScheduledTrip[]> {
    const query = companyId ? `?company_id=${encodeURIComponent(String(companyId))}` : '';
    const raw = await this.request<any[]>(`/scheduled_trips/${query}`);
    return this.flattenScheduledTrips(raw);
  }

  async getScheduledTrip(id: number): Promise<ScheduledTrip> {
    return this.request<ScheduledTrip>(`/scheduled_trips/${id}/`);
  }

  async createScheduledTrip(scheduledTrip: Omit<ScheduledTrip, 'arrival_city_name' | 'available_seats' | 'bookings_count' | 'company_name' | 'created_at' | 'departure_city_name' | 'id' | 'updated_at'>): Promise<ScheduledTrip> {
    return this.request<ScheduledTrip>('/scheduled_trips/', {
      method: 'POST',
      body: JSON.stringify(scheduledTrip),
    });
  }

  async updateScheduledTrip(id: number, scheduledTrip: Partial<ScheduledTrip>): Promise<ScheduledTrip> {
    return this.request<ScheduledTrip>(`/scheduled_trips/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(scheduledTrip),
    });
  }

  async deleteScheduledTrip(id: number): Promise<void> {
    return this.request<void>(`/scheduled_trips/${id}/`, {
      method: 'DELETE',
    });
  }

  // Réservations
  async getBookings(): Promise<Booking[]> {
    return this.request<Booking[]>('/bookings/');
  }

  /**
   * Retourne une liste de numéros de sièges (strings) déjà réservés pour un trajet et une date.
   */
  async getBookedSeats(tripId: number, travelDate: string): Promise<string[]> {
    const q = `?trip_id=${encodeURIComponent(String(tripId))}&travel_date=${encodeURIComponent(String(travelDate))}`;
    return this.request<string[]>(`/booked_seats/${q}`);
  }

  async getAvailability(
    tripId: number,
    travelDate: string,
    originStop?: number | string | null,
    destinationStop?: number | string | null,
  ): Promise<{ occupied_seats: string[]; available_seats: number; capacity: number }> {
    const params = new URLSearchParams({
      trip_id: String(tripId),
      travel_date: travelDate,
    });
    if (originStop !== undefined && originStop !== null) params.append('origin_stop', String(originStop));
    if (destinationStop !== undefined && destinationStop !== null) params.append('destination_stop', String(destinationStop));
    const q = `?${params.toString()}`;
    return this.request<{ occupied_seats: string[]; available_seats: number; capacity: number }>(`/availability/${q}`);
  }

  async getCompanyBookings(companyId: number): Promise<Booking[]> {
    return this.request<Booking[]>(`/companies/${companyId}/bookings/`);
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

  async deleteUser(id: number): Promise<void> {
    return this.request<void>(`/users/${id}/`, {
      method: 'DELETE',
    });
  }

  // Statistiques
  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/dashboard/stats/');
  }

  async getCompanyStats(id: number): Promise<CompanyStats> {
    return this.request<CompanyStats>(`/companies/${id}/stats/`);
  }

  async getMyBookings(): Promise<Booking[]> {
    // This endpoint will need to be created in the backend.
    // It should return a list of bookings for the currently authenticated user.
    return this.request<Booking[]>('/my-bookings/');
  }

  // Authentification (pour l'instant, simulation)
  async login(username: string, password: string): Promise<{ token: string; user: any }> {
    // Obtenir token via endpoint DRF authtoken (email ou téléphone)
    const payload: any = { password };
    if (username && username.includes('@')) {
      payload.email = username;
    } else if (username) {
      payload.phone = username;
    }
    // Fournir également username comme repli éventuel
    payload.username = username;

    const loginController = new AbortController();
    const loginTimeoutId = setTimeout(() => loginController.abort(), REQUEST_TIMEOUT_MS);
    let tokenResp: Response;
    try {
      tokenResp = await fetch(`${API_BASE_URL}/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: loginController.signal,
        body: JSON.stringify(payload),
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error('La connexion a expiré. Réessayez dans quelques secondes.');
      }
      throw err;
    } finally {
      clearTimeout(loginTimeoutId);
    }

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
      try { localStorage.setItem('user', JSON.stringify(user)); } catch (e) { }
    } catch (e) {
      // fallback
    }

    // Persist username for UI (profile initial)
    try { localStorage.setItem('username', username); } catch (e) { }

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
    phone?: string;
  }): Promise<{ token: string; user: any }> {
    // Appel réel à l'API Django pour l'inscription
    const regController = new AbortController();
    const regTimeoutId = setTimeout(() => regController.abort(), REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: regController.signal,
        body: JSON.stringify(userData),
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error('La connexion a expiré. Réessayez dans quelques secondes.');
      }
      throw err;
    } finally {
      clearTimeout(regTimeoutId);
    }

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
      try { localStorage.setItem('user', JSON.stringify(user)); } catch (e) { }
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
