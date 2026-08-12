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

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
).replace(/\/$/, '');

// Types pour les données
export type ApiId = string | number;

export interface City {
  id: ApiId;
  name: string;
  region: string;
  is_active: boolean;
  created_at: string;
}

export interface Company {
  id: ApiId;
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
  is_active: boolean;
  is_deleted?: boolean;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
  trips_count?: number;
}

export type CompanyFilter = 'active' | 'deleted' | 'all';

export interface Trip {
  id: ApiId;
  company: ApiId;
  company_name: string;
  departure_city: ApiId;
  departure_city_name: string;
  arrival_city: ApiId;
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
  scheduled_trip_id?: ApiId;
  trip_id?: ApiId;
  seats?: any[];
  stops?: any[];
  badge?: string | null;
  badge_label?: string | null;
  booking_closed?: boolean;
}

export interface Booking {
  id: ApiId;
  trip: ApiId;
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
  user?: ApiId;
}

export type QosOperator = 'flooz' | 'tmoney';

export interface InitiateQosPaymentPayload {
  voyage_id: number | string;
  numero_siege: number | string;
  client_nom: string;
  client_telephone: string;
  montant_billet: number | string;
  montant_total?: number | string;
  operateur: QosOperator;
  ville_depart?: string;
  ville_arrivee?: string;
}

export interface InitiateQosPaymentResponse {
  reference_evex: string;
  transaction_id: string;
  montant_billet: number;
  frais_evex: number;
  montant_total: number;
  operateur: QosOperator;
  siege: string;
  expires_dans: string;
}

export interface VerifyQosPaymentResponse {
  reference: string;
  statut: 'en_attente' | 'paye' | 'echoue' | 'expire' | 'rembourse';
  montant_total: number;
  frais_evex: number;
  montant_billet: number;
  siege: string;
  paye: boolean;
  message: string;
}

export interface DashboardStats {
  total_bookings: number;
  bookings_this_week: number;
  bookings_this_month: number;
  total_revenue: number;
  revenue_this_week: number;
  revenue_this_month: number;
  active_trips: number;
  active_companies: number;
  total_users: number;
  monthly_bookings?: Array<{ month: string; total_bookings: number }>;
  monthly_revenue?: Array<{ month: string; total_revenue: number }>;
  booking_status_counts?: {
    confirmed: number;
    pending: number;
    cancelled: number;
  };
  top_companies?: Array<{ company_name: string; trips: number; revenue: number }>;
}

export interface CompanyStats {
  total_bookings: number;
  mobile_bookings: number;
  guichet_sales: number;
  total_revenue: number;
  mobile_revenue: number;
  guichet_revenue: number;
  active_clients: number;
  scheduled_trips: number;
  average_occupancy: number;
  agency_performance: Array<{
    id: number | string;
    name: string;
    tickets: number;
    revenue: number;
    active: boolean;
  }>;
  sales_analytics: Array<{
    date: string;
    tickets: number;
    revenue: number;
  }>;
  recent_guichet_sales: any[];
}

export interface PlatformAdminUser {
  id: ApiId;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  role: 'SUPER_ADMIN' | 'ADMIN_COMPAGNIE' | 'AGENT_GUICHET' | 'CLIENT';
  company_id?: ApiId | null;
  company_name?: string | null;
  is_active: boolean;
  last_login?: string | null;
  date_joined: string;
}

export interface PlatformAdminCompany {
  id: ApiId;
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  website?: string | null;
  logo?: string | null;
  is_active: boolean;
  commission_rate: number;
  created_at: string;
  updated_at: string;
  admins: PlatformAdminUser[];
  counts: { agencies: number; counters: number; agents: number; routes: number; voyages: number };
  wallet: { pending: number; paid: number };
  agencies?: Array<{ id: string; name: string; city: string; address: string; active: boolean; counters: number }>;
  recent_trips?: PlatformAdminVoyage[];
}

export interface PlatformAdminVoyage {
  id: ApiId;
  company_id: ApiId;
  company_name: string;
  route: string;
  departure_city: string;
  arrival_city: string;
  date: string;
  departure_time: string;
  arrival_time: string;
  capacity: number;
  sold_seats: number;
  available_seats: number;
  occupancy_rate: number;
  price: number;
  is_active: boolean;
  is_past: boolean;
}

export interface PlatformAdminTicket {
  id: string;
  source: 'booking' | 'mobile' | 'guichet';
  channel: 'application' | 'guichet';
  reference: string;
  client_name: string;
  client_email?: string | null;
  client_phone: string;
  company_id: ApiId;
  company_name: string;
  route: string;
  travel_date?: string | null;
  departure_time?: string | null;
  voyage_id?: ApiId | null;
  seat: string | number;
  amount: number;
  payment_method: string;
  status: string;
  payment_status?: string | null;
  control_status?: string;
  sale_location?: string | null;
  can_cancel: boolean;
  can_refund: boolean;
  can_edit: boolean;
  created_at: string;
  numero_siege?: string | number;
  client_nom?: string;
  client_telephone?: string;
  statut_controle?: string;
}

export type UnifiedTicket = PlatformAdminTicket;

export interface TicketOperation {
  id: ApiId;
  action: string;
  operation?: 'sale' | 'cancel' | 'refund' | 'update' | null;
  reason?: string | null;
  source?: string | null;
  object_id: string;
  object: string;
  user: string;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  ip_address?: string | null;
  timestamp: string;
}

export interface PlatformAdminDashboard {
  overview: {
    companies: number; active_companies: number; users: number; active_users: number;
    agencies: number; counters: number; routes: number; upcoming_trips: number;
    tickets: number; gross_revenue: number; month_revenue: number; evex_revenue: number;
    company_due: number; occupancy_rate: number;
  };
  monthly: Array<{ month: string; key: string; tickets: number; revenue: number; users: number }>;
  top_companies: Array<{ id: ApiId; name: string; tickets: number; revenue: number; active: boolean }>;
  alerts: Array<{ tone: string; title: string; value: number }>;
  recent_activity: Array<{ id: ApiId; action: string; model: string; object: string; user: string; timestamp: string }>;
}

export interface AICopilotResponse {
  answer: string;
  suggestions: string[];
  provider: 'openai' | 'fallback';
  metrics: {
    confirmed_bookings: number;
    revenue_fcfa: number;
    upcoming_trips: number;
    active_companies: number;
    average_rating: number;
    high_risk_bookings: number;
  };
}

export interface AITripInsights {
  scheduled_trip_id: ApiId;
  occupancy_forecast_percent: number;
  current_occupancy_percent: number;
  predicted_delay_minutes: number;
  reported_delay_minutes: number;
  confidence_percent: number;
  delay_message: string;
  updated_at: string;
}

export interface AIBookingRisk {
  booking_id: ApiId;
  score: number;
  level: 'low' | 'medium' | 'high';
  flags: string[];
  reviewed: boolean;
  updated_at: string;
}

export interface AIReviewAnalysis {
  summary: { positive: number; neutral: number; negative: number; urgent: number };
  reviews: Array<{
    review_id: ApiId;
    sentiment: 'positive' | 'neutral' | 'negative';
    category: string;
    urgency: number;
    summary: string;
    provider: string;
  }>;
}

export interface AIVoiceCommandResponse {
  intent: 'search_trip';
  provider: 'openai' | 'fallback';
  criteria: Record<string, unknown>;
  trips: Array<{
    id: ApiId;
    date: string;
    available_seats: number;
    trip_info: {
      company_name: string;
      departure_city_name: string;
      arrival_city_name: string;
      departure_time: string;
      price: number | string;
    };
  }>;
}

export interface PlatformAdminFinance {
  totals: { gross: number; evex: number; company_due: number; pending_payouts: number; refunds: number };
  monthly: PlatformAdminDashboard['monthly'];
  companies: Array<{ id: ApiId; name: string; gross: number; evex: number; company_revenue: number; pending_payout: number }>;
  channels: Array<{ name: string; tickets: number; revenue: number }>;
}

export interface PlatformAdminAnalytics {
  monthly: PlatformAdminDashboard['monthly'];
  routes: Array<{ route: string; company: string; bookings: number; voyages: number; capacity: number }>;
  cities: Array<{ name: string; departures: number }>;
  roles: Array<{ name: string; value: number }>;
}

export interface PlatformAdminAudit {
  id: ApiId;
  action: string;
  model: string;
  object_id: string;
  object: string;
  user: string;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  ip_address?: string | null;
  timestamp: string;
}

export interface PlatformAdminSettings {
  service_fee: number;
  default_commission_rate: number;
  cancellation_delay_hours: number;
  email_notifications: boolean;
  sms_notifications: boolean;
  maintenance_mode: boolean;
  updated_at?: string;
}

export interface GuichetAgent {
  id: ApiId;
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  actif: boolean;
  nb_ventes_aujourd_hui: number;
  nb_ventes_total: number;
  agence: { id: string; nom: string } | null;
  guichet: { id: string; code: string; nom: string } | null;
  est_gestionnaire: boolean;
}

export interface AgencyManager {
  id: ApiId;
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  actif: boolean;
}

export interface Agency {
  id: string;
  nom: string;
  ville: { id: ApiId; nom: string; region: string };
  adresse: string;
  telephone: string;
  latitude: string | null;
  longitude: string | null;
  gestionnaire: AgencyManager | null;
  nb_personnel: number;
  nb_guichets: number;
  billets_vendus_mois: number;
  statut: 'active' | 'inactive';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgencyPayload {
  nom: string;
  ville_id: ApiId;
  adresse: string;
  telephone: string;
  latitude?: number | null;
  longitude?: number | null;
  gestionnaire_id?: ApiId | null;
  is_active?: boolean;
}

export interface AgencyCounter {
  id: string;
  code: string;
  nom: string;
  emplacement: string;
  nb_agents: number;
  billets_vendus_mois: number;
  revenu_mois: number;
  statut: 'active' | 'inactive';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgencyCounterPayload {
  code: string;
  nom: string;
  emplacement?: string;
  is_active?: boolean;
}

export interface GuichetTrip {
  id: ApiId;
  trip_id?: ApiId;
  trajet: string;
  date: string;
  heure_depart: string;
  heure_arrivee?: string;
  prix: number;
  places_total: number;
  places_libres: number;
  places_occupees?: number;
  statut: 'actif' | 'inactif';
}

export interface GuichetSale {
  reference_vente: string;
  client_nom: string;
  client_telephone: string;
  voyage_id: ApiId;
  trajet: string;
  date_voyage: string;
  heure_depart: string;
  numero_siege: number;
  montant_billet: number;
  frais_evex: number;
  montant_total: number;
  mode_paiement: 'cash' | 'flooz' | 'tmoney';
  statut: 'valide' | 'annule' | 'utilise';
  agence: string | null;
  guichet: string | null;
  created_at: string;
  annulable: boolean;
}

export interface GuichetControl {
  id: string;
  reference: string | null;
  source: 'guichet' | 'mobile' | null;
  resultat: 'valide' | 'invalide' | 'deja_utilise';
  message: string;
  voyage_id: ApiId;
  created_at: string;
}

export interface GuichetDashboardData {
  agent: {
    id: ApiId;
    nom: string;
    prenom: string;
    email: string;
    compagnie: string;
    agence: { id: string; nom: string; ville: string; adresse: string } | null;
    guichet: { id: string; code: string; nom: string } | null;
    affectation_complete: boolean;
  };
  billets_vendus: number;
  montant_collecte: number;
  voyages_actifs: number;
  stats_aujourd_hui: {
    billets_vendus: number;
    montant_collecte: number;
    voyages_actifs: number;
    paiements: Record<string, { billets: number; montant: number }>;
  };
  voyages_du_jour: GuichetTrip[];
  ventes_recentes: GuichetSale[];
  controles_recents: GuichetControl[];
}

export interface GuichetSeatMap {
  voyage_id: ApiId;
  voyage: { trajet: string; date: string; heure_depart: string; prix: number };
  sieges: Array<{ id: string | null; numero: number; statut: 'libre' | 'occupe' | 'reserve' }>;
  resume: { total: number; libres: number; occupes: number };
}

export interface GuichetSaleReceipt {
  reference_vente: string;
  qr_code_data: Record<string, unknown>;
  qr_code_base64: string;
  client_nom: string;
  client_telephone: string;
  voyage: { trajet: string; heure_depart: string; date: string };
  siege: number;
  montant_billet: number;
  frais_evex: number;
  montant_total: number;
  mode_paiement: string;
  agence: string | null;
  guichet: string | null;
  created_at: string;
}

export interface GuichetSalesHistory {
  total_billets: number;
  total_valides: number;
  total_annules: number;
  total_montant: number;
  ventes: GuichetSale[];
}

export interface GuichetScanResult {
  resultat: 'valide' | 'invalide' | 'deja_utilise';
  message: string;
  reference: string | null;
  source: 'guichet' | 'mobile' | null;
  voyage_id: ApiId | null;
  client_nom: string | null;
  numero_siege: number | null;
}

export interface GuichetControlsHistory {
  total: number;
  valides: number;
  invalides: number;
  deja_utilises: number;
  controles: GuichetControl[];
}

export interface TripSearchParams {
  departure_city: string;
  arrival_city: string;
  travel_date: string;
  passengers: number;
}

/** Default request timeout — avoids indefinite hangs on Render.com free-tier cold starts */
const REQUEST_TIMEOUT_MS = 60_000; // 60s pour gérer les cold starts (Render prend 30s+ à redémarrer)

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

        let message = (errorData && (errorData.detail || errorData.error || JSON.stringify(errorData))) || `HTTP error! status: ${response.status}`;
        let retryAfterSeconds: number | undefined;
        if (response.status === 429) {
          const headerWait = Number(response.headers.get('Retry-After'));
          const detailWait = Number(String(message).match(/(\d+)\s*seconds?/i)?.[1]);
          retryAfterSeconds = Math.max(
            1,
            Number.isFinite(headerWait) && headerWait > 0
              ? Math.ceil(headerWait)
              : Number.isFinite(detailWait) && detailWait > 0
                ? Math.ceil(detailWait)
                : 60,
          );
          message = `Trop de demandes ont été envoyées. Réessayez dans ${retryAfterSeconds} seconde${retryAfterSeconds > 1 ? 's' : ''}.`;
        }
        const err: any = new Error(message);
        err.status = response.status;
        err.data = errorData;
        err.retryAfterSeconds = retryAfterSeconds;
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
  async getCompanies(filter: CompanyFilter = 'active'): Promise<Company[]> {
    return this.request<Company[]>(`/companies/?filter=${encodeURIComponent(filter)}`);
  }

  async getCompany(id: ApiId): Promise<Company> {
    return this.request<Company>(`/companies/${id}/`);
  }

  async createCompany(company: Omit<Company, 'id' | 'created_at' | 'updated_at'>): Promise<Company> {
    return this.request<Company>('/companies/', {
      method: 'POST',
      body: JSON.stringify(company),
    });
  }

  async updateCompany(id: ApiId, company: Partial<Company>): Promise<Company> {
    return this.request<Company>(`/companies/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(company),
    });
  }

  async deleteCompany(id: ApiId): Promise<void> {
    return this.request<void>(`/companies/${id}/`, {
      method: 'DELETE',
    });
  }

  async restoreCompany(id: ApiId): Promise<Company> {
    return this.request<Company>(`/companies/${id}/restore/`, {
      method: 'POST',
    });
  }

  async hardDeleteCompany(id: ApiId, password: string): Promise<{ detail: string }> {
    return this.request<{ detail: string }>(`/companies/${id}/hard-delete/`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  // Trajets
  async getRoutes(companyId?: ApiId): Promise<Trip[]> {
    const query = companyId ? `?company_id=${encodeURIComponent(String(companyId))}` : '';
    return this.request<Trip[]>(`/trips/${query}`);
  }

  async getRoute(id: ApiId): Promise<Trip> {
    return this.request<Trip>(`/trips/${id}/`);
  }

  // Backwards-compatible aliases expected by frontend components/hooks
  async getTrip(id: ApiId): Promise<Trip> {
    return this.getRoute(id);
  }

  async getTrips(companyId?: ApiId): Promise<Trip[]> {
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

  async updateRoute(id: ApiId, trip: Partial<Trip>): Promise<Trip> {
    return this.request<Trip>(`/trips/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(trip),
    });
  }

  async updateTrip(id: ApiId, trip: Partial<Trip>): Promise<Trip> {
    return this.updateRoute(id, trip);
  }

  async deleteRoute(id: ApiId): Promise<void> {
    return this.request<void>(`/trips/${id}/`, {
      method: 'DELETE',
    });
  }

  async deleteTrip(id: ApiId): Promise<void> {
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
          trip_id: item.trip_info.id,
          id: item.id,
          date: item.date,
          is_active: item.is_active ?? item.trip_info.is_active,
          available_seats: item.available_seats ?? item.trip_info.available_seats,
          badge: item.badge ?? item.trip_info.badge ?? null,
          badge_label: item.badge_label ?? item.trip_info.badge_label ?? null,
          booking_closed: item.booking_closed ?? item.trip_info.booking_closed ?? false,
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
  async getScheduledTrips(companyId?: ApiId): Promise<ScheduledTrip[]> {
    const query = companyId ? `?company_id=${encodeURIComponent(String(companyId))}` : '';
    const raw = await this.request<any[]>(`/scheduled_trips/${query}`);
    return this.flattenScheduledTrips(raw);
  }

  async getScheduledTrip(id: ApiId): Promise<ScheduledTrip> {
    const raw = await this.request<any>(`/scheduled_trips/${id}/`);
    return this.flattenScheduledTrips([raw])[0];
  }

  async createScheduledTrip(scheduledTrip: Omit<ScheduledTrip, 'arrival_city_name' | 'available_seats' | 'bookings_count' | 'company_name' | 'created_at' | 'departure_city_name' | 'id' | 'updated_at'>): Promise<ScheduledTrip> {
    return this.request<ScheduledTrip>('/scheduled_trips/', {
      method: 'POST',
      body: JSON.stringify(scheduledTrip),
    });
  }

  async updateScheduledTrip(id: ApiId, scheduledTrip: Partial<ScheduledTrip>): Promise<ScheduledTrip> {
    return this.request<ScheduledTrip>(`/scheduled_trips/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(scheduledTrip),
    });
  }

  async deleteScheduledTrip(id: ApiId): Promise<void> {
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
  async getBookedSeats(tripId: ApiId, travelDate: string): Promise<string[]> {
    const q = `?trip_id=${encodeURIComponent(String(tripId))}&travel_date=${encodeURIComponent(String(travelDate))}`;
    return this.request<string[]>(`/booked_seats/${q}`);
  }

  async getAvailability(
    tripId: ApiId,
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

  async getCompanyBookings(companyId: ApiId): Promise<Booking[]> {
    return this.request<Booking[]>(`/companies/${companyId}/bookings/`);
  }

  async getBooking(id: ApiId): Promise<Booking> {
    return this.request<Booking>(`/bookings/${id}/`);
  }

  async createBooking(booking: Omit<Booking, 'id' | 'booking_date' | 'trip_details' | 'passenger_full_name'>): Promise<Booking> {
    return this.request<Booking>('/bookings/', {
      method: 'POST',
      body: JSON.stringify(booking),
    });
  }

  async initiateQosPayment(payload: InitiateQosPaymentPayload): Promise<InitiateQosPaymentResponse> {
    const [firstname = '', ...lastnameParts] = String(payload.client_nom || '').trim().split(' ');
    const amount = Number(payload.montant_total ?? payload.montant_billet);
    const ticketAmount = Number(payload.montant_billet);
    const operator = payload.operateur === 'flooz' ? 'MOOV' : 'TOGOCEL';
    const method = payload.operateur === 'flooz' ? 'moov' : 'togocel';

    const response = await this.request<any>('/payments/pay/', {
      method: 'POST',
      body: JSON.stringify({
        operator,
        phone_number: payload.client_telephone,
        method,
        phone: payload.client_telephone,
        amount,
        firstname: firstname || payload.client_nom || 'Client',
        lastname: lastnameParts.join(' ') || 'EvexTicket',
      }),
    });
    const transaction = response.transaction || {};
    const paidAmount = Number(transaction.amount || amount);

    return {
      reference_evex: transaction.transref,
      transaction_id: transaction.transref,
      montant_billet: ticketAmount,
      frais_evex: Math.max(paidAmount - ticketAmount, 0),
      montant_total: paidAmount,
      operateur: payload.operateur,
      siege: String(payload.numero_siege),
      expires_dans: '5 minutes',
    };
  }

  async verifyQosPayment(reference: string): Promise<VerifyQosPaymentResponse> {
    const response = await this.request<any>('/payments/status/', {
      method: 'POST',
      body: JSON.stringify({ transref: reference }),
    });
    const transaction = response.transaction || {};
    const amount = Number(transaction.amount || 0);
    const isPaid = transaction.status === 'success';

    return {
      reference,
      statut: isPaid ? 'paye' : transaction.status === 'pending' ? 'en_attente' : 'echoue',
      montant_total: amount,
      frais_evex: 0,
      montant_billet: amount,
      siege: '',
      paye: isPaid,
      message: isPaid ? 'Paiement confirme' : 'Paiement en attente',
    };
  }

  async updateBooking(id: ApiId, booking: Partial<Booking>): Promise<Booking> {
    return this.request<Booking>(`/bookings/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(booking),
    });
  }

  async deleteBooking(id: ApiId): Promise<void> {
    return this.request<void>(`/bookings/${id}/`, {
      method: 'DELETE',
    });
  }

  async confirmBooking(id: ApiId): Promise<{ status: string }> {
    return this.request<{ status: string }>(`/bookings/${id}/confirm/`, {
      method: 'POST',
    });
  }

  async cancelBooking(id: ApiId): Promise<{ status: string }> {
    return this.request<{ status: string }>(`/bookings/${id}/cancel/`, {
      method: 'POST',
    });
  }

  // Utilisateurs (endpoints administratifs)
  // Remarque: ces endpoints doivent exister côté backend Django (/users/)
  async getUsers(): Promise<any[]> {
    return this.request<any[]>('/users/');
  }

  async getUser(id: ApiId): Promise<any> {
    return this.request<any>(`/users/${id}/`);
  }

  async updateUser(id: ApiId, user: Partial<any>): Promise<any> {
    return this.request<any>(`/users/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  }

  async deleteUser(id: ApiId): Promise<void> {
    return this.request<void>(`/users/${id}/`, {
      method: 'DELETE',
    });
  }

  // Statistiques
  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/dashboard/stats/');
  }

  // Administration générale de la plateforme
  async getPlatformAdminDashboard(): Promise<PlatformAdminDashboard> {
    return this.request<PlatformAdminDashboard>('/platform-admin/dashboard/');
  }

  async getPlatformAdminCompanies(filters?: { q?: string; status?: string }): Promise<PlatformAdminCompany[]> {
    const params = new URLSearchParams();
    if (filters?.q) params.set('q', filters.q);
    if (filters?.status) params.set('status', filters.status);
    return this.request<PlatformAdminCompany[]>(`/platform-admin/companies/${params.size ? `?${params}` : ''}`);
  }

  async createPlatformAdminCompany(payload: Record<string, unknown>): Promise<PlatformAdminCompany> {
    return this.request<PlatformAdminCompany>('/platform-admin/companies/', { method: 'POST', body: JSON.stringify(payload) });
  }

  async getPlatformAdminCompany(id: ApiId): Promise<PlatformAdminCompany> {
    return this.request<PlatformAdminCompany>(`/platform-admin/companies/${id}/`);
  }

  async updatePlatformAdminCompany(id: ApiId, payload: Partial<PlatformAdminCompany>): Promise<PlatformAdminCompany> {
    return this.request<PlatformAdminCompany>(`/platform-admin/companies/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) });
  }

  async setPlatformAdminCompanyStatus(id: ApiId, isActive: boolean, reason = ''): Promise<PlatformAdminCompany> {
    return this.request<PlatformAdminCompany>(`/platform-admin/companies/${id}/status/`, { method: 'PATCH', body: JSON.stringify({ is_active: isActive, reason }) });
  }

  async createPlatformCompanyAdmin(companyId: ApiId, payload: Record<string, unknown>): Promise<PlatformAdminUser> {
    return this.request<PlatformAdminUser>(`/platform-admin/companies/${companyId}/admins/`, { method: 'POST', body: JSON.stringify(payload) });
  }

  async getPlatformAdminUsers(filters?: { q?: string; role?: string; status?: string; company?: string }): Promise<PlatformAdminUser[]> {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => { if (value) params.set(key, value); });
    return this.request<PlatformAdminUser[]>(`/platform-admin/users/${params.size ? `?${params}` : ''}`);
  }

  async createPlatformAdminUser(payload: Record<string, unknown>): Promise<PlatformAdminUser> {
    return this.request<PlatformAdminUser>('/platform-admin/users/', { method: 'POST', body: JSON.stringify(payload) });
  }

  async setPlatformAdminUserStatus(id: ApiId, isActive: boolean, reason = ''): Promise<PlatformAdminUser> {
    return this.request<PlatformAdminUser>(`/platform-admin/users/${id}/status/`, { method: 'PATCH', body: JSON.stringify({ is_active: isActive, reason }) });
  }

  async resetPlatformAdminUserPassword(id: ApiId, newPassword: string): Promise<{ detail: string }> {
    return this.request<{ detail: string }>(`/platform-admin/users/${id}/reset-password/`, { method: 'POST', body: JSON.stringify({ new_password: newPassword }) });
  }

  async revokePlatformAdminUserSessions(id: ApiId): Promise<{ detail: string; tokens_deleted: number }> {
    return this.request<{ detail: string; tokens_deleted: number }>(`/platform-admin/users/${id}/revoke-sessions/`, { method: 'POST' });
  }

  async getPlatformAdminVoyages(filters?: { q?: string; company?: string; status?: string; date?: string }): Promise<PlatformAdminVoyage[]> {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => { if (value) params.set(key, value); });
    return this.request<PlatformAdminVoyage[]>(`/platform-admin/voyages/${params.size ? `?${params}` : ''}`);
  }

  async setPlatformAdminVoyageStatus(id: ApiId, isActive: boolean, reason = ''): Promise<PlatformAdminVoyage> {
    return this.request<PlatformAdminVoyage>(`/platform-admin/voyages/${id}/status/`, { method: 'PATCH', body: JSON.stringify({ is_active: isActive, reason }) });
  }

  async getPlatformAdminTickets(filters?: { q?: string; source?: string; status?: string; company?: string; date?: string }): Promise<PlatformAdminTicket[]> {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => { if (value) params.set(key, value); });
    return this.request<PlatformAdminTicket[]>(`/platform-admin/tickets/${params.size ? `?${params}` : ''}`);
  }

  async getPlatformAdminFinance(): Promise<PlatformAdminFinance> {
    return this.request<PlatformAdminFinance>('/platform-admin/finance/');
  }

  async getPlatformAdminAnalytics(): Promise<PlatformAdminAnalytics> {
    return this.request<PlatformAdminAnalytics>('/platform-admin/analytics/');
  }

  async getPlatformAdminAudit(filters?: { q?: string; action?: string }): Promise<PlatformAdminAudit[]> {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => { if (value) params.set(key, value); });
    return this.request<PlatformAdminAudit[]>(`/platform-admin/audit/${params.size ? `?${params}` : ''}`);
  }

  async getPlatformAdminSettings(): Promise<PlatformAdminSettings> {
    return this.request<PlatformAdminSettings>('/platform-admin/settings/');
  }

  async updatePlatformAdminSettings(payload: Partial<PlatformAdminSettings>): Promise<PlatformAdminSettings> {
    return this.request<PlatformAdminSettings>('/platform-admin/settings/', { method: 'PATCH', body: JSON.stringify(payload) });
  }

  async downloadPlatformAdminExport(resource: 'companies' | 'users' | 'tickets' | 'finance'): Promise<void> {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${this.baseURL}/platform-admin/exports/${resource}/`, {
      headers: token ? { Authorization: `Token ${token}` } : {},
    });
    if (!response.ok) throw new Error('Impossible de générer cet export.');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `evex-${resource}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  // Guichet (agent)
  async getGuichetDashboard(): Promise<GuichetDashboardData> {
    return this.request<GuichetDashboardData>('/guichet/dashboard/');
  }

  async getGuichetVoyagesDisponibles(date?: string): Promise<GuichetTrip[]> {
    const q = date ? `?date=${encodeURIComponent(date)}` : '';
    return this.request<GuichetTrip[]>(`/guichet/voyages/disponibles/${q}`);
  }

  async getGuichetSieges(voyageId: string): Promise<GuichetSeatMap> {
    return this.request<GuichetSeatMap>(`/guichet/voyages/${voyageId}/sieges/`);
  }

  async creerVenteGuichet(payload: { voyage_id: string; numero_siege: number; client_nom: string; client_telephone: string; mode_paiement: 'cash' | 'flooz' | 'tmoney' }): Promise<GuichetSaleReceipt> {
    return this.request<GuichetSaleReceipt>('/guichet/ventes/creer/', { method: 'POST', body: JSON.stringify(payload) });
  }

  async annulerVenteGuichet(ref: string): Promise<any> {
    return this.request<any>(`/guichet/ventes/${encodeURIComponent(ref)}/annuler/`, { method: 'DELETE' });
  }

  async scannerQrGuichet(payload: { qr_code_data: string | Record<string, unknown> }): Promise<GuichetScanResult> {
    return this.request<GuichetScanResult>('/guichet/controle/scanner/', { method: 'POST', body: JSON.stringify(payload) });
  }

  async historiqueVentesGuichet(filters?: { date_debut?: string; date_fin?: string; statut?: string; mode_paiement?: string; q?: string }): Promise<GuichetSalesHistory> {
    const params = new URLSearchParams();
    if (filters?.date_debut) params.set('date_debut', filters.date_debut);
    if (filters?.date_fin) params.set('date_fin', filters.date_fin);
    if (filters?.statut) params.set('statut', filters.statut);
    if (filters?.mode_paiement) params.set('mode_paiement', filters.mode_paiement);
    if (filters?.q) params.set('q', filters.q);
    const query = params.toString();
    return this.request<GuichetSalesHistory>(`/guichet/ventes/historique/${query ? `?${query}` : ''}`);
  }

  async historiqueControlesGuichet(filters?: { date?: string; resultat?: string }): Promise<GuichetControlsHistory> {
    const params = new URLSearchParams();
    if (filters?.date) params.set('date', filters.date);
    if (filters?.resultat) params.set('resultat', filters.resultat);
    const query = params.toString();
    return this.request<GuichetControlsHistory>(`/guichet/controle/historique/${query ? `?${query}` : ''}`);
  }

  async getCompanyTickets(filters?: { q?: string; source?: string; status?: string; date?: string; voyage?: string }): Promise<UnifiedTicket[]> {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => { if (value) params.set(key, value); });
    return this.request<UnifiedTicket[]>(`/guichet/billets/${params.size ? `?${params}` : ''}`);
  }

  async actionCompanyTicket(
    source: UnifiedTicket['source'],
    id: string,
    action: 'cancel' | 'refund' | 'update',
    reason = '',
    changes?: { client_name: string; client_phone: string; client_email?: string },
  ): Promise<{ detail: string; ticket: UnifiedTicket }> {
    return this.request<{ detail: string; ticket: UnifiedTicket }>(
      `/guichet/billets/${encodeURIComponent(source)}/${encodeURIComponent(id)}/action/`,
      { method: 'POST', body: JSON.stringify({ action, reason, changes }) },
    );
  }

  async getCompanyTicketOperations(filters?: { operation?: string }): Promise<TicketOperation[]> {
    const params = new URLSearchParams();
    if (filters?.operation) params.set('operation', filters.operation);
    return this.request<TicketOperation[]>(`/guichet/billets/operations/${params.size ? `?${params}` : ''}`);
  }

  async passagersVoyage(voyageId: string): Promise<UnifiedTicket[]> {
    return this.request<UnifiedTicket[]>(`/guichet/voyages/${voyageId}/passagers/`);
  }

  // Agents guichet (company admin)
  async getGuichetAgents(): Promise<GuichetAgent[]> {
    return this.request<GuichetAgent[]>('/guichet/agents/');
  }

  async createGuichetAgent(payload: { nom: string; prenom: string; telephone: string; email: string; password: string; }): Promise<any> {
    return this.request<any>('/guichet/agents/creer/', { method: 'POST', body: JSON.stringify(payload) });
  }

  async setGuichetAgentActive(agentId: ApiId, actif: boolean): Promise<{ status: string; actif: boolean }> {
    return this.request<{ status: string; actif: boolean }>(`/guichet/agents/${agentId}/activer/`, {
      method: 'PATCH',
      body: JSON.stringify({ actif }),
    });
  }

  async getCompanyAgencies(filters?: { ville_id?: ApiId; statut?: 'active' | 'inactive' }): Promise<Agency[]> {
    const params = new URLSearchParams();
    if (filters?.ville_id) params.set('ville_id', String(filters.ville_id));
    if (filters?.statut) params.set('statut', filters.statut);
    const query = params.toString();
    return this.request<Agency[]>(`/compagnie/agences/${query ? `?${query}` : ''}`);
  }

  async getCompanyAgency(id: string): Promise<Agency> {
    return this.request<Agency>(`/compagnie/agences/${encodeURIComponent(id)}/`);
  }

  async createCompanyAgency(payload: AgencyPayload): Promise<Agency> {
    return this.request<Agency>('/compagnie/agences/creer/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateCompanyAgency(id: string, payload: Partial<AgencyPayload>): Promise<Agency> {
    return this.request<Agency>(`/compagnie/agences/${encodeURIComponent(id)}/modifier/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async assignCompanyAgencyManager(id: string, gestionnaireId: ApiId | null): Promise<Agency> {
    return this.request<Agency>(`/compagnie/agences/${encodeURIComponent(id)}/affecter-gestionnaire/`, {
      method: 'PATCH',
      body: JSON.stringify({ gestionnaire_id: gestionnaireId }),
    });
  }

  async deactivateCompanyAgency(id: string): Promise<{ status: string; detail: string }> {
    return this.request<{ status: string; detail: string }>(`/compagnie/agences/${encodeURIComponent(id)}/supprimer/`, {
      method: 'DELETE',
    });
  }

  async getAgencyCounters(agencyId: string): Promise<AgencyCounter[]> {
    return this.request<AgencyCounter[]>(`/compagnie/agences/${encodeURIComponent(agencyId)}/guichets/`);
  }

  async createAgencyCounter(agencyId: string, payload: AgencyCounterPayload): Promise<AgencyCounter> {
    return this.request<AgencyCounter>(`/compagnie/agences/${encodeURIComponent(agencyId)}/guichets/creer/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateAgencyCounter(agencyId: string, counterId: string, payload: Partial<AgencyCounterPayload>): Promise<AgencyCounter> {
    return this.request<AgencyCounter>(`/compagnie/agences/${encodeURIComponent(agencyId)}/guichets/${encodeURIComponent(counterId)}/modifier/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deactivateAgencyCounter(agencyId: string, counterId: string): Promise<{ status: string; detail: string }> {
    return this.request<{ status: string; detail: string }>(`/compagnie/agences/${encodeURIComponent(agencyId)}/guichets/${encodeURIComponent(counterId)}/supprimer/`, {
      method: 'DELETE',
    });
  }

  async assignCompanyAgent(agentId: ApiId, agencyId: string | null, counterId: string | null): Promise<GuichetAgent> {
    return this.request<GuichetAgent>(`/compagnie/agents/${agentId}/affectation/`, {
      method: 'PATCH',
      body: JSON.stringify({ agence_id: agencyId, guichet_id: counterId }),
    });
  }

  async getCompanyStats(id: ApiId): Promise<CompanyStats> {
    return this.request<CompanyStats>(`/companies/${id}/stats/`);
  }

  async getMyBookings(): Promise<Booking[]> {
    // This endpoint will need to be created in the backend.
    // It should return a list of bookings for the currently authenticated user.
    return this.request<Booking[]>('/my-bookings/');
  }

  // Authentification (pour l'instant, simulation)
  async login(username: string, password: string): Promise<{ token: string; user: any }> {
    return this.loginClient(username, password);
  }

  async loginClient(identifier: string, secret: string): Promise<{ token: string; user: any }> {
    const payload = identifier.includes('@')
      ? { email: identifier, password: secret }
      : { phone: identifier, pin: secret };
    const resp = await this.request<{ token: string; user: any }>('/auth/client/login/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setAuthToken(resp.token);
    try { localStorage.setItem('username', identifier); } catch (e) { }
    return resp;
  }

  async askManagementCopilot(question: string): Promise<AICopilotResponse> {
    return this.request<AICopilotResponse>('/ai/copilot/', {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
  }

  async getAITripInsights(scheduledTripId: ApiId): Promise<AITripInsights> {
    return this.request<AITripInsights>(`/ai/trips/${scheduledTripId}/insights/`);
  }

  async reportAITripDelay(scheduledTripId: ApiId, reportedDelayMinutes: number): Promise<AITripInsights> {
    return this.request<AITripInsights>(`/ai/trips/${scheduledTripId}/insights/`, {
      method: 'PATCH',
      body: JSON.stringify({ reported_delay_minutes: reportedDelayMinutes }),
    });
  }

  async getAIBookingRisk(bookingId: ApiId): Promise<AIBookingRisk> {
    return this.request<AIBookingRisk>(`/ai/bookings/${bookingId}/risk/`);
  }

  async getAIReviewAnalysis(): Promise<AIReviewAnalysis> {
    return this.request<AIReviewAnalysis>('/ai/reviews/analysis/');
  }

  async interpretGuichetVoiceCommand(transcript: string): Promise<AIVoiceCommandResponse> {
    return this.request<AIVoiceCommandResponse>('/ai/voice-command/', {
      method: 'POST',
      body: JSON.stringify({ transcript }),
    });
  }

  async loginUnifiedEmail(email: string, password: string): Promise<{ token: string; user: any }> {
    const resp = await this.request<{ token: string; user: any }>('/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setAuthToken(resp.token);
    try { localStorage.setItem('username', email); } catch (e) { }
    return resp;
  }

  async loginCompanyAdmin(email: string, password: string): Promise<{ token: string; user: any }> {
    const resp = await this.request<{ token: string; user: any }>('/auth/company/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setAuthToken(resp.token);
    try { localStorage.setItem('username', email); } catch (e) { }
    return resp;
  }

  async loginGuichetAgent(email: string, password: string): Promise<{ token: string; user: any }> {
    const resp = await this.request<{ token: string; user: any }>('/auth/guichet/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setAuthToken(resp.token);
    try { localStorage.setItem('username', email); } catch (e) { }
    return resp;
  }

  async loginSuperAdmin(email: string, password: string): Promise<{ token: string; user: any }> {
    const resp = await this.request<{ token: string; user: any }>('/auth/admin/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setAuthToken(resp.token);
    try { localStorage.setItem('username', email); } catch (e) { }
    return resp;
  }

  async loginLegacy(username: string, password: string): Promise<{ token: string; user: any }> {
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
    first_name: string;
    last_name: string;
    phone: string;
    pin: string;
    email?: string | null;
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
