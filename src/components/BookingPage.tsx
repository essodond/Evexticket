import React, { useState } from 'react';
import { ArrowLeft, CheckCircle } from 'lucide-react';

interface Trip {
  id: string;
  company?: string;
  departure?: string;
  arrival?: string;
  departure_city_name?: string;
  arrival_city_name?: string;
  departure_time?: string;
  arrival_time?: string;
  duration?: number | string;
  price?: number;
  available_seats?: number;
  availableSeats?: number;
  capacity?: number;
  totalSeats?: number;
}

interface BookingPageProps {
  trip: Trip;
  searchData: any;
  onBack: () => void;
  onProceedToPayment: (bookingData: any) => void;
}

const BookingPage: React.FC<BookingPageProps> = ({ trip, searchData, onBack, onProceedToPayment }) => {
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [passengerInfo, setPassengerInfo] = useState({ firstName: '', lastName: '', phone: '', email: '' });

  const formatDuration = (value?: number | string) => {
    if (value === undefined || value === null || value === '') return '-';
    if (typeof value === 'string' && /\d+h/.test(value)) return value;
    const minutes = typeof value === 'number' ? value : parseInt(String(value), 10);
    if (isNaN(minutes)) return String(value);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h <= 0) return `${m}m`;
    return `${h}h${m.toString().padStart(2, '0')}`;
  };

  const generateSeats = () => {
    const seats: { number: number; isOccupied: boolean; isSelected: boolean }[] = [];
    const seatsCount = Number(trip.totalSeats ?? trip.capacity ?? 50) || 50;
    const cap = Number(trip.capacity ?? trip.totalSeats ?? seatsCount);
    const avail = Number(trip.available_seats ?? trip.availableSeats ?? cap);
    let occupiedCount = 0;
    if (!isNaN(cap) && !isNaN(avail) && cap > avail) {
      occupiedCount = Math.min(Math.max(cap - avail, 0), cap);
    } else {
      occupiedCount = Math.min(5, seatsCount);
    }
    const occupiedSeats = new Set<number>(Array.from({ length: occupiedCount }, (_, i) => i + 1));
    for (let i = 1; i <= seatsCount; i++) {
      seats.push({ number: i, isOccupied: occupiedSeats.has(i), isSelected: selectedSeat === i });
    }
    return seats;
  };

  const seats = generateSeats();

  const handleSeatSelect = (n: number) => {
    const seat = seats.find(s => s.number === n);
    if (!seat || seat.isOccupied) return;
    setSelectedSeat(n);
  };

  const handleProceed = () => {
    if (!selectedSeat) return;
    if (!passengerInfo.firstName || !passengerInfo.lastName || !passengerInfo.phone) return;
    onProceedToPayment({ trip, selectedSeat, passengerInfo, searchData });
  };
                      trip.departure_city_name || trip.departure || (searchData?.departure || '')
                    )} {'\u2192'} {(
                      trip.arrival_city_name || trip.arrival || (searchData?.arrival || '')
                    )}
    import React, { useState } from 'react';
    import { ArrowLeft, CheckCircle } from 'lucide-react';

    interface Trip {
      id: string;
      company?: string;
      departure?: string;
      arrival?: string;
      departure_city_name?: string;
      arrival_city_name?: string;
      departure_time?: string;
      arrival_time?: string;
      duration?: number | string;
      price?: number;
      available_seats?: number;
      availableSeats?: number;
      capacity?: number;
      totalSeats?: number;
    }

    interface BookingPageProps {
      trip: Trip;
      searchData: any;
      onBack: () => void;
      onProceedToPayment: (bookingData: any) => void;
    }

    const BookingPage: React.FC<BookingPageProps> = ({ trip, searchData, onBack, onProceedToPayment }) => {
      const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
      const [passengerInfo, setPassengerInfo] = useState({ firstName: '', lastName: '', phone: '', email: '' });

      const formatDuration = (value?: number | string) => {
        if (value === undefined || value === null || value === '') return '-';
        if (typeof value === 'string' && /\d+h/.test(value)) return value;
        const minutes = typeof value === 'number' ? value : parseInt(String(value), 10);
        if (isNaN(minutes)) return String(value);
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        if (h <= 0) return `${m}m`;
        return `${h}h${m.toString().padStart(2, '0')}`;
      };

      const generateSeats = () => {
        const seats: { number: number; isOccupied: boolean; isSelected: boolean }[] = [];
        const seatsCount = Number(trip.totalSeats ?? trip.capacity ?? 50) || 50;
        const cap = Number(trip.capacity ?? trip.totalSeats ?? seatsCount);
        const avail = Number(trip.available_seats ?? trip.availableSeats ?? cap);
        let occupiedCount = 0;
        if (!isNaN(cap) && !isNaN(avail) && cap > avail) {
          occupiedCount = Math.min(Math.max(cap - avail, 0), cap);
        } else {
          occupiedCount = Math.min(5, seatsCount);
        }
        const occupiedSeats = new Set<number>(Array.from({ length: occupiedCount }, (_, i) => i + 1));
        for (let i = 1; i <= seatsCount; i++) {
          seats.push({ number: i, isOccupied: occupiedSeats.has(i), isSelected: selectedSeat === i });
        }
        return seats;
      };

      const seats = generateSeats();

      const handleSeatSelect = (n: number) => {
        const seat = seats.find(s => s.number === n);
        if (!seat || seat.isOccupied) return;
        setSelectedSeat(n);
      };

      const handleProceed = () => {
        if (!selectedSeat) return;
        if (!passengerInfo.firstName || !passengerInfo.lastName || !passengerInfo.phone) return;
        onProceedToPayment({ trip, selectedSeat, passengerInfo, searchData });
      };

      return (
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <button onClick={onBack} className="flex items-center text-gray-600 hover:text-blue-600 transition-colors">
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Retour
                </button>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">TB</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">TogoBus</span>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-md border p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Récapitulatif du trajet</h2>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Compagnie</span>
                      <span className="font-medium">{trip.company}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Trajet</span>
                      <span className="font-medium">{trip.departure_city_name ?? trip.departure ?? searchData?.departure} → {trip.arrival_city_name ?? trip.arrival ?? searchData?.arrival}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date</span>
                      <span className="font-medium">{searchData?.date ? new Date(searchData.date).toLocaleDateString('fr-FR') : '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Heure</span>
                      <span className="font-medium">{trip.departure_time ?? '-'} - {trip.arrival_time ?? '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Durée</span>
                      <span className="font-medium">{formatDuration(trip.duration)}</span>
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex justify-between text-lg">
                        <span className="font-semibold">Prix par personne</span>
                        <span className="font-bold text-green-600">{trip.price ? Number(trip.price).toLocaleString('fr-FR') : '-'} CFA</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md border p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Informations du passager</h2>
                  <form className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                        <input type="text" value={passengerInfo.firstName} onChange={(e) => setPassengerInfo({...passengerInfo, firstName: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                        <input type="text" value={passengerInfo.lastName} onChange={(e) => setPassengerInfo({...passengerInfo, lastName: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                      <input type="tel" value={passengerInfo.phone} onChange={(e) => setPassengerInfo({...passengerInfo, phone: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="+228 XX XX XX XX" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email (optionnel)</label>
                      <input type="email" value={passengerInfo.email} onChange={(e) => setPassengerInfo({...passengerInfo, email: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="votre@email.com" />
                    </div>
                  </form>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md border p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Choisissez votre siège</h2>

                <div className="flex items-center justify-center space-x-6 mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-green-500 rounded border-2 border-green-600"></div>
                    <span className="text-sm">Disponible</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-blue-500 rounded border-2 border-blue-600"></div>
                    <span className="text-sm">Sélectionné</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gray-400 rounded border-2 border-gray-500"></div>
                    <span className="text-sm">Occupé</span>
                  </div>
                </div>

                <div className="max-w-md mx-auto">
                  <div className="mb-4 text-center">
                    <div className="w-12 h-6 bg-gray-300 rounded mx-auto mb-2"></div>
                    <span className="text-xs text-gray-500">Chauffeur</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {seats.map((seat) => (
                      <button key={seat.number} onClick={() => handleSeatSelect(seat.number)} disabled={seat.isOccupied} className={`
                          w-10 h-10 rounded border-2 text-sm font-medium transition-colors relative
                          ${seat.isOccupied 
                            ? 'bg-gray-400 border-gray-500 cursor-not-allowed' 
                            : seat.isSelected 
                              ? 'bg-blue-500 border-blue-600 text-white' 
                              : 'bg-green-500 border-green-600 text-white hover:bg-green-600'
                          }
                        `}>
                        {seat.isSelected && <CheckCircle className="w-3 h-3 absolute -top-1 -right-1" />}
                        {seat.number}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedSeat && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-2 text-blue-800">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Siège {selectedSeat} sélectionné</span>
                    </div>
                  </div>
                )}

                <button onClick={handleProceed} disabled={!selectedSeat || !passengerInfo.firstName || !passengerInfo.lastName || !passengerInfo.phone} className="w-full mt-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">Procéder au paiement</button>
              </div>
            </div>
          </main>
        </div>
      );
    };

    export default BookingPage;