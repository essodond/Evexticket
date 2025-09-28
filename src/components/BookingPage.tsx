import React, { useState } from 'react';
// BOOKING PAGE
// Étape de saisie des informations passager et sélection de siège.
// Le parent (ResultsPage/App) fournit `trip` et `searchData`. Après validation,
// on appelle `onProceedToPayment` pour passer à la page de paiement.
import { ArrowLeft, User, CheckCircle } from 'lucide-react';

interface Trip {
  id: string;
  company: string;
  departure: string;
  arrival: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  price: number;
  availableSeats: number;
  totalSeats: number;
  rating: number;
  amenities: string[];
}

interface BookingPageProps {
  trip: Trip;
  searchData: any;
  onBack: () => void;
  onProceedToPayment: (bookingData: any) => void;
}

const BookingPage: React.FC<BookingPageProps> = ({ trip, searchData, onBack, onProceedToPayment }) => {
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [passengerInfo, setPassengerInfo] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: ''
  });

  // Generate seat layout (50 seats in a typical bus)
  const generateSeats = () => {
    const seats = [];
    const occupiedSeats = [1, 3, 7, 12, 18, 25, 31, 37, 42]; // Mock occupied seats
    
    for (let i = 1; i <= trip.totalSeats; i++) {
      seats.push({
        number: i,
        isOccupied: occupiedSeats.includes(i),
        isSelected: selectedSeat === i
      });
    }
    return seats;
  };

  const seats = generateSeats();

  const handleSeatSelect = (seatNumber: number) => {
    const seat = seats.find(s => s.number === seatNumber);
    if (!seat?.isOccupied) {
      setSelectedSeat(seatNumber);
    }
  };

  const handleProceed = () => {
    if (selectedSeat && passengerInfo.firstName && passengerInfo.lastName && passengerInfo.phone) {
      onProceedToPayment({
        trip,
        selectedSeat,
        passengerInfo,
        searchData
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={onBack}
              className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
            >
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
          {/* Trip Summary */}
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
                  <span className="font-medium">{trip.departure} → {trip.arrival}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date</span>
                  <span className="font-medium">{new Date(searchData.date).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Heure</span>
                  <span className="font-medium">{trip.departureTime} - {trip.arrivalTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Durée</span>
                  <span className="font-medium">{trip.duration}</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold">Prix par personne</span>
                    <span className="font-bold text-green-600">{trip.price.toLocaleString()} CFA</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Passenger Information */}
            <div className="bg-white rounded-xl shadow-md border p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Informations du passager</h2>
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                    <input
                      type="text"
                      value={passengerInfo.firstName}
                      onChange={(e) => setPassengerInfo({...passengerInfo, firstName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                    <input
                      type="text"
                      value={passengerInfo.lastName}
                      onChange={(e) => setPassengerInfo({...passengerInfo, lastName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                  <input
                    type="tel"
                    value={passengerInfo.phone}
                    onChange={(e) => setPassengerInfo({...passengerInfo, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+228 XX XX XX XX"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email (optionnel)</label>
                  <input
                    type="email"
                    value={passengerInfo.email}
                    onChange={(e) => setPassengerInfo({...passengerInfo, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="votre@email.com"
                  />
                </div>
              </form>
            </div>
          </div>

          {/* Seat Selection */}
          <div className="bg-white rounded-xl shadow-md border p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Choisissez votre siège</h2>
            
            {/* Legend */}
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

            {/* Bus Layout */}
            <div className="max-w-md mx-auto">
              {/* Driver Area */}
              <div className="mb-4 text-center">
                <div className="w-12 h-6 bg-gray-300 rounded mx-auto mb-2"></div>
                <span className="text-xs text-gray-500">Chauffeur</span>
              </div>

              {/* Seats Grid */}
              <div className="grid grid-cols-4 gap-2">
                {seats.map((seat) => (
                  <button
                    key={seat.number}
                    onClick={() => handleSeatSelect(seat.number)}
                    disabled={seat.isOccupied}
                    className={`
                      w-10 h-10 rounded border-2 text-sm font-medium transition-colors relative
                      ${seat.isOccupied 
                        ? 'bg-gray-400 border-gray-500 cursor-not-allowed' 
                        : seat.isSelected 
                          ? 'bg-blue-500 border-blue-600 text-white' 
                          : 'bg-green-500 border-green-600 text-white hover:bg-green-600'
                      }
                    `}
                  >
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

            {/* Proceed Button */}
            <button
              onClick={handleProceed}
              disabled={!selectedSeat || !passengerInfo.firstName || !passengerInfo.lastName || !passengerInfo.phone}
              className="w-full mt-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Procéder au paiement
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BookingPage;