import { useState, useEffect } from 'react';
import { apiService, City, Company, Trip, Booking, DashboardStats, CompanyStats } from '../services/api';

// Hook pour les villes
export const useCities = () => {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        setLoading(true);
        const data = await apiService.getCities();
        setCities(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des villes');
      } finally {
        setLoading(false);
      }
    };

    fetchCities();
  }, []);

  return { cities, loading, error };
};

// Hook pour les compagnies
export const useCompanies = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        const data = await apiService.getCompanies();
        setCompanies(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des compagnies');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  const createCompany = async (companyData: Omit<Company, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newCompany = await apiService.createCompany(companyData);
      setCompanies(prev => [...prev, newCompany]);
      return newCompany;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de la compagnie');
      throw err;
    }
  };

  const updateCompany = async (id: number, companyData: Partial<Company>) => {
    try {
      const updatedCompany = await apiService.updateCompany(id, companyData);
      setCompanies(prev => prev.map(company => 
        company.id === id ? updatedCompany : company
      ));
      return updatedCompany;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour de la compagnie');
      throw err;
    }
  };

  const deleteCompany = async (id: number) => {
    try {
      await apiService.deleteCompany(id);
      setCompanies(prev => prev.filter(company => company.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression de la compagnie');
      throw err;
    }
  };

  return { 
    companies, 
    loading, 
    error, 
    createCompany, 
    updateCompany, 
    deleteCompany 
  };
};

// Hook pour les trajets
export const useTrips = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        setLoading(true);
        const data = await apiService.getTrips();
        setTrips(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des trajets');
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, []);

  const createTrip = async (tripData: Omit<Trip, 'id' | 'created_at' | 'updated_at' | 'company_name' | 'departure_city_name' | 'arrival_city_name' | 'bookings_count' | 'available_seats'>) => {
    try {
      const newTrip = await apiService.createTrip(tripData);
      setTrips(prev => [...prev, newTrip]);
      return newTrip;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du trajet');
      throw err;
    }
  };

  const updateTrip = async (id: number, tripData: Partial<Trip>) => {
    try {
      const updatedTrip = await apiService.updateTrip(id, tripData);
      setTrips(prev => prev.map(trip => 
        trip.id === id ? updatedTrip : trip
      ));
      return updatedTrip;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour du trajet');
      throw err;
    }
  };

  const deleteTrip = async (id: number) => {
    try {
      await apiService.deleteTrip(id);
      setTrips(prev => prev.filter(trip => trip.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression du trajet');
      throw err;
    }
  };

  const searchTrips = async (searchParams: {
    departure_city: string;
    arrival_city: string;
    travel_date: string;
    passengers: number;
  }) => {
    try {
      setLoading(true);
      const data = await apiService.searchTrips(searchParams);
      setTrips(data);
      setError(null);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la recherche de trajets');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { 
    trips, 
    loading, 
    error, 
    createTrip, 
    updateTrip, 
    deleteTrip,
    searchTrips
  };
};

// Hook pour les réservations
export const useBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        const data = await apiService.getBookings();
        setBookings(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des réservations');
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const createBooking = async (bookingData: Omit<Booking, 'id' | 'booking_date' | 'trip_details' | 'passenger_full_name'>) => {
    try {
      const newBooking = await apiService.createBooking(bookingData);
      setBookings(prev => [...prev, newBooking]);
      return newBooking;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de la réservation');
      throw err;
    }
  };

  const updateBooking = async (id: number, bookingData: Partial<Booking>) => {
    try {
      const updatedBooking = await apiService.updateBooking(id, bookingData);
      setBookings(prev => prev.map(booking => 
        booking.id === id ? updatedBooking : booking
      ));
      return updatedBooking;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour de la réservation');
      throw err;
    }
  };

  const deleteBooking = async (id: number) => {
    try {
      await apiService.deleteBooking(id);
      setBookings(prev => prev.filter(booking => booking.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression de la réservation');
      throw err;
    }
  };

  const confirmBooking = async (id: number) => {
    try {
      await apiService.confirmBooking(id);
      setBookings(prev => prev.map(booking => 
        booking.id === id ? { ...booking, status: 'confirmed' as const } : booking
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la confirmation de la réservation');
      throw err;
    }
  };

  const cancelBooking = async (id: number) => {
    try {
      await apiService.cancelBooking(id);
      setBookings(prev => prev.map(booking => 
        booking.id === id ? { ...booking, status: 'cancelled' as const } : booking
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'annulation de la réservation');
      throw err;
    }
  };

  return { 
    bookings, 
    loading, 
    error, 
    createBooking, 
    updateBooking, 
    deleteBooking,
    confirmBooking,
    cancelBooking
  };
};

// Hook pour les statistiques du dashboard admin
export const useDashboardStats = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await apiService.getDashboardStats();
        setStats(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des statistiques');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading, error };
};

// Hook pour les statistiques de la compagnie
export const useCompanyStats = (companyId: number) => {
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await apiService.getCompanyStats(companyId);
        setStats(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des statistiques');
      } finally {
        setLoading(false);
      }
    };

    if (companyId) {
      fetchStats();
    }
  }, [companyId]);

  return { stats, loading, error };
};
