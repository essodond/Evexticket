import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Loader2, Home, Ticket, User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import apiService from '../services/api';
import type { Booking } from '../services/api';

export default function MyTicketsMobile() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await apiService.getMyBookings();
        const confirmed = (Array.isArray(data) ? data : []).filter(b => b.status === 'confirmed');
        setBookings(confirmed.sort((a, b) => {
          const dateA = new Date(a.travel_date || '').getTime();
          const dateB = new Date(b.travel_date || '').getTime();
          return dateB - dateA;
        }));
      } catch (err: any) {
        console.error('Erreur:', err);
        setError(err.message || 'Impossible de charger vos tickets');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '00:00';
    return timeStr.substring(0, 5);
  };

  const handleDelete = async (bookingId: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce ticket ?')) return;
    try {
      await apiService.cancelBooking(bookingId);
      setBookings(prev => prev.filter(b => b.id !== bookingId));
    } catch (err: any) {
      alert('Erreur: ' + (err.message || 'Impossible de supprimer'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-32">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white p-4 pb-32 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="bg-white px-4 py-5 border-b border-gray-100">
        <h1 className="text-3xl font-bold text-gray-900">Mes Tickets</h1>
      </div>

      {/* Active Tickets Section */}
      <div className="px-4 py-5">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-5">
          Billets Actifs
        </h2>

        {bookings.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-200">
            <p className="text-gray-500">Aucun ticket actif</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const trip = booking.trip_details || {};
              const qrData = JSON.stringify({
                booking_id: booking.id,
                seat: booking.seat_number,
                date: booking.travel_date,
              });

              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm relative overflow-hidden"
                >
                  {/* Notches (ticket perforations) */}
                  <div className="absolute left-0 top-1/3 w-6 h-6 bg-gray-50 rounded-full -ml-3"></div>
                  <div className="absolute right-0 top-1/3 w-6 h-6 bg-gray-50 rounded-full -mr-3"></div>

                  {/* Date + Status Row */}
                  <div className="flex items-center justify-between mb-4 pb-0">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
                      </svg>
                      <span className="text-gray-600 font-medium">{formatDate(booking.travel_date || '')}</span>
                    </div>
                    <span className="bg-green-50 text-green-600 text-xs font-semibold px-3 py-1 rounded-full">Confirmé</span>
                  </div>

                  {/* Company + Price */}
                  <div className="flex justify-between mb-4 mt-4">
                    <div>
                      <p className="text-gray-500 text-xs mb-1">Compagnie</p>
                      <p className="text-gray-900 font-bold">{trip.company_name || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500 text-xs mb-1">Prix</p>
                      <p className="text-gray-900 font-bold">{booking.total_price || '0'} FCFA</p>
                    </div>
                  </div>

                  {/* Departure - Bus - Arrival */}
                  <div className="flex justify-between items-center mb-4 py-3">
                    <div className="flex-1">
                      <p className="text-gray-500 text-xs mb-1">Départ</p>
                      <p className="text-gray-900 font-bold text-sm">{trip.departure_city_name || 'N/A'}</p>
                      <p className="text-gray-600 text-sm">{formatTime(trip.departure_time || '')}</p>
                    </div>
                    
                    {/* Bus icon + line */}
                    <div className="flex flex-col items-center flex-1 px-2">
                      <svg className="w-8 h-6 text-blue-700 mb-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5H6.5c-.66 0-1.22.42-1.42 1.01L4 11v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-4.99zM6.5 7h11l1.96 2.5H4.54L6.5 7zm11 9H6.5v-2h11v2z"/>
                      </svg>
                      <div className="w-16 h-px bg-gray-300"></div>
                    </div>

                    <div className="flex-1 text-right">
                      <p className="text-gray-500 text-xs mb-1">Arrivée</p>
                      <p className="text-gray-900 font-bold text-sm">{trip.arrival_city_name || 'N/A'}</p>
                      <p className="text-gray-600 text-sm">{formatTime(trip.arrival_time || '')}</p>
                    </div>
                  </div>

                  {/* Seat + QR */}
                  <div className="flex justify-between items-end mb-4 py-3 border-t border-gray-100 pt-4">
                    <div>
                      <p className="text-gray-500 text-xs mb-1">Siège</p>
                      <p className="text-gray-900 font-bold text-lg">{booking.seat_number || 'N/A'}</p>
                    </div>
                    <div className="bg-white p-1 border border-gray-200 rounded">
                      <QRCodeSVG value={qrData} size={65} level="L" includeMargin={false} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate('/ticket-detail', { state: { booking } })}
                      className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 rounded-full flex items-center justify-center gap-2 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
                      </svg>
                      Voir le billet
                    </button>
                    <button
                      onClick={() => handleDelete(booking.id)}
                      className="p-3 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                    >
                      <Trash2 className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3">
        <div className="flex justify-around items-center">
          <button
            onClick={() => navigate('/home')}
            className="flex flex-col items-center gap-1 py-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Home className="w-6 h-6" />
            <span className="text-xs font-medium">Accueil</span>
          </button>
          
          <button
            className="flex flex-col items-center gap-1 py-2 text-blue-700 transition-colors"
          >
            <Ticket className="w-6 h-6 fill-current" />
            <span className="text-xs font-bold">Mes Tickets</span>
          </button>
          
          <button
            onClick={() => navigate('/profile')}
            className="flex flex-col items-center gap-1 py-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <User className="w-6 h-6" />
            <span className="text-xs font-medium">Profil</span>
          </button>
        </div>
      </div>
    </div>
  );
}
