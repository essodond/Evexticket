import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Trip, TripStop, BoardingZone } from '../types';
import { Platform, NativeModules } from 'react-native';

export interface LoginData {
  username: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  password2: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

interface TripsResponse {
  trips: Trip[];
}

interface SearchTripsParams {
  departure_city?: string;
  arrival_city?: string;
  departure_date?: string;
}

const API_BASE_URL = 'http://192.168.1.64:8000/api';
console.log('API_BASE_URL utilisée:', API_BASE_URL);
const TIMEOUT = 20000; // 20s pour éviter des attentes prolongées

async function handleResponse(response: Response) {
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  let data;
  
  try {
    data = isJson ? await response.json() : await response.text();
    console.log('📝 handleResponse - Données brute:', data);
  } catch (parseError) {
    console.error('❌ Erreur de parsing de la réponse:', parseError);
    data = null;
  }

  if (!response.ok) {
    console.error('🚨 handleResponse - Erreur de réponse:', {
      status: response.status,
      statusText: response.statusText,
      data: data,
      contentType: contentType
    });
    
    if (isJson && data) {
      if (data.detail) {
        throw new Error(data.detail);
      }
      if (data.message) {
        throw new Error(data.message);
      }
      if (typeof data === 'object') {
        const firstError = Object.values(data)[0];
        if (Array.isArray(firstError) && firstError[0]) {
          throw new Error(firstError[0]);
        } else if (typeof firstError === 'string') {
          throw new Error(firstError);
        }
      }
    }
    
    const errorMessage = `Erreur ${response.status}: ${response.statusText}`;
    throw new Error(errorMessage);
  }

  console.log('✅ handleResponse - Réponse valide:', data);
  return data;
}

async function fetchWithTimeout(
  resource: string,
  options: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('La requête a pris trop de temps à répondre');
      }
      if (error.message === 'Network request failed') {
        throw new Error('Impossible de se connecter au serveur. Vérifiez votre connexion internet.');
      }
    }
    throw error;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const token = await AsyncStorage.getItem('token');
    const primaryUrl = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Token ${token}` } : {}),
      ...options.headers,
    } as Record<string, string>;

    // Log de la requête
    console.log('🌐 API Request:', {
      url: primaryUrl,
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.parse(options.body as string) : undefined
    });

    try {
      const response = await fetchWithTimeout(primaryUrl, { ...options, headers });
      
      // Log de la réponse
      console.log('🌐 API Response:', {
        url: primaryUrl,
        status: response.status,
        statusText: response.statusText
      });
      
      const responseData = await handleResponse(response);
      console.log('📋 API Response Data:', responseData);
      
      return responseData;
    } catch (primaryErr) {
      console.error('❌ API Request Error:', primaryErr);
      throw primaryErr;
    }
  } catch (error) {
    console.error('💥 Global API Error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Une erreur inattendue est survenue');
  }
}

export async function login(data: LoginData): Promise<AuthResponse> {
  try {
    // Construire le payload selon l'identifiant fourni (email ou téléphone)
    const payload: any = { password: data.password };
    if (data.username && data.username.includes('@')) {
      payload.email = data.username;
    } else if (data.username) {
      payload.phone = data.username;
    }
    // Ajouter aussi username en repli possible
    payload.username = data.username;

    const response = await request<AuthResponse>('/login/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await AsyncStorage.setItem('token', response.token);
    return response;
  } catch (error) {
    console.error('Erreur de connexion:', error);
    throw error;
  }
}

export async function register(data: RegisterData): Promise<AuthResponse> {
  try {
    const response = await request<AuthResponse>('/register/', {
      method: 'POST',
      body: JSON.stringify({
        email: data.email,
        username: data.username,
        password: data.password,
        password2: data.password2,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
      }),
    });
    await AsyncStorage.setItem('token', response.token);
    return response;
  } catch (error) {
    console.error('Erreur d\'inscription:', error);
    throw error;
  }
}

export async function logout(): Promise<void> {
  try {
    await AsyncStorage.removeItem('token');
  } catch (error) {
    console.error('Erreur de déconnexion:', error);
    throw error;
  }
}

export async function getCurrentUser(): Promise<User> {
  try {
    return await request<User>('/me/');
  } catch (error) {
    console.error('Erreur de récupération du profil:', error);
    throw error;
  }
}

export async function getTrips(params?: SearchTripsParams): Promise<Trip[]> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.departure_city) {
      searchParams.append('departure_city', params.departure_city);
    }
    if (params?.arrival_city) {
      searchParams.append('arrival_city', params.arrival_city);
    }
    if (params?.departure_date) {
      searchParams.append('departure_date', params.departure_date);
    }

    const queryString = searchParams.toString();
    const endpoint = `/scheduled_trips/${queryString ? `?${queryString}` : ''}`;

    const response = await request<any>(endpoint);
    // Le backend peut renvoyer soit une liste brute, soit un objet
    if (Array.isArray(response)) {
      return response as Trip[];
    }
    if (response && Array.isArray(response.trips)) {
      return response.trips as Trip[];
    }
    if (response && Array.isArray(response.results)) {
      return response.results as Trip[];
    }
    if (response && Array.isArray(response.data)) {
      return response.data as Trip[];
    }
    // Fallback: aucune forme reconnue

    throw new Error('Réponse inattendue du serveur pour la liste des trajets');
  } catch (error) {
    console.error('Erreur de récupération des voyages:', error);
    throw error;
  }
}

export async function getTripDetails(tripId: string): Promise<Trip> {
  try {
    const response = await request<Trip>(`/scheduled_trips/${tripId}/`);
    return response;
  } catch (error) {
    console.error(`Error fetching trip details for ${tripId}:`, error);
    throw error;
  }
};

export async function getTripStops(tripId: string): Promise<TripStop[]> {
  try {
    const response = await request<TripStop[]>(`/scheduled_trips/${tripId}/stops/`);
    // Gérer les formats de réponse du backend
    if (Array.isArray(response)) {
      return response as TripStop[];
    }
    if (response && Array.isArray((response as any).results)) {
      return (response as any).results as TripStop[];
    }
    throw new Error('Réponse inattendue du serveur pour la liste des arrêts');
  } catch (error) {
    console.error(`Erreur de récupération des arrêts pour le trajet ${tripId}:`, error);
    throw error;
  }
}

export interface SegmentPriceResponse {
  price: number;
}

export async function getSegmentPrice(
  tripId: string | number,
  originStopId: string | number,
  destinationStopId: string | number
): Promise<SegmentPriceResponse> {
  try {
    const endpoint = `/scheduled_trips/${tripId}/price/?origin_stop_id=${originStopId}&destination_stop_id=${destinationStopId}`;
    const response = await request<SegmentPriceResponse>(endpoint);
    return response;
  } catch (error) {
    console.error(
      `Erreur lors de la récupération du prix du segment pour le trajet ${tripId} entre ${originStopId} et ${destinationStopId}:`,
      error
    );
    throw error;
  }
}

export interface BookingData {
  trip: string;
  passenger_name: string;
  passenger_email: string;
  passenger_phone: string;
  seat_number: string;
  origin_stop: string | number | null;
  destination_stop: string | number | null;
  payment_method: string;
  price?: number;
}

export async function createBooking(data: BookingData): Promise<any> {
  try {
    const response = await request<any>('/bookings/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  } catch (error) {
    console.error('Erreur lors de la création de la réservation:', error);
    throw error;
  }
}

export async function getMyBookings(): Promise<any[]> {
  try {
    console.log('📡 Appel API vers /my-bookings/');
    const response = await request<any>('/my-bookings/', {
      method: 'GET',
    });
    console.log('✅ Réponse brute des réservations:', JSON.stringify(response, null, 2));

    // Gérer les différents formats de réponse du backend
    if (Array.isArray(response)) {
      console.log('✅ Format: tableau direct');
      return response;
    }
    if (response && Array.isArray(response.results)) {
      console.log('✅ Format: objet avec results (pagination)');
      return response.results;
    }
    if (response && Array.isArray(response.data)) {
      console.log('✅ Format: objet avec data');
      return response.data;
    }

    console.warn('⚠️  Format de réponse inattendu:', response);
    // Retourner un tableau vide plutôt que undefined
    return [];
  } catch (error) {
    console.error('💥 Erreur lors de la récupération des réservations:', error);
    // Retourner un tableau vide plutôt que de lever l'erreur
    return [];
  }
}

export interface City {
  id: number;
  name: string;
}

export async function getCities(): Promise<City[]> {
  try {
    const response = await request<any>('/cities/');
    // Gérer les formats de réponse du backend
    if (Array.isArray(response)) {
      return response as City[];
    }
    if (response && Array.isArray(response.results)) {
      return response.results as City[];
    }
    if (response && Array.isArray(response.data)) {
      return response.data as City[];
    }
    throw new Error('Réponse inattendue du serveur pour la liste des villes');
  } catch (error) {
    console.error('Erreur de récupération des villes:', error);
    throw error;
  }
}