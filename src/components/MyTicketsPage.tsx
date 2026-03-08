import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import type { Booking } from '../services/api';
import { Ticket, Calendar, MapPin, ChevronRight, Loader2, TicketX, Bus, CreditCard, Search, Clock, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function MyTicketsPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await apiService.getMyBookings();
        setBookings(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error('Erreur chargement tickets:', err);
        setError(err.message || 'Impossible de charger vos tickets');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const isTravelPassed = (dateStr: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return new Date(dateStr) < today;
    } catch {
      return false;
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const date = b.travel_date || (b as any).scheduled_trip_date || '';
    if (filter === 'upcoming') return !isTravelPassed(date);
    if (filter === 'past') return isTravelPassed(date);
    return true;
  });

  const sortedBookings = [...filteredBookings].sort((a, b) => {
    const dateA = a.travel_date || (a as any).scheduled_trip_date || '';
    const dateB = b.travel_date || (b as any).scheduled_trip_date || '';
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  const formatTime = (time: string) => {
    if (!time) return '--:--';
    return time.substring(0, 5);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Chargement de vos tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Ticket className="w-7 h-7 text-blue-600" />
            Mes Tickets
          </h1>
          <p className="text-gray-500 mt-1 ml-10">{bookings.length} réservation{bookings.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Stats cards */}
        {bookings.length > 0 && (() => {
          const upcomingCount = bookings.filter(b => !isTravelPassed(b.travel_date || (b as any).scheduled_trip_date || '')).length;
          const pastCount = bookings.filter(b => isTravelPassed(b.travel_date || (b as any).scheduled_trip_date || '')).length;
          const totalSpent = bookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0);
          // Most frequent route
          const routes = bookings.map(b => {
            const td = b.trip_details || ({} as any);
            return `${td.departure_city_name || '?'} → ${td.arrival_city_name || '?'}`;
          });
          const routeCount: Record<string, number> = {};
          routes.forEach(r => { routeCount[r] = (routeCount[r] || 0) + 1; });
          const favRoute = Object.entries(routeCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

          return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Ticket size={16} className="text-blue-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
                <p className="text-xs text-gray-400">Total voyages</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <Calendar size={16} className="text-emerald-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{upcomingCount}</p>
                <p className="text-xs text-gray-400">À venir</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                    <CreditCard size={16} className="text-amber-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{totalSpent.toLocaleString()}</p>
                <p className="text-xs text-gray-400">FCFA dépensés</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                    <MapPin size={16} className="text-purple-600" />
                  </div>
                </div>
                <p className="text-sm font-bold text-gray-900 truncate">{favRoute}</p>
                <p className="text-xs text-gray-400">Trajet fréquent</p>
              </div>
            </div>
          );
        })()}

        {/* Filtres */}
        <div className="flex gap-2 mb-5">
          {[
            { key: 'all', label: 'Tous', count: bookings.length },
            { key: 'upcoming', label: 'À venir', count: bookings.filter(b => !isTravelPassed(b.travel_date || (b as any).scheduled_trip_date || '')).length },
            { key: 'past', label: 'Passés', count: bookings.filter(b => isTravelPassed(b.travel_date || (b as any).scheduled_trip_date || '')).length },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as any)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                filter === f.key
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {f.label}
              <span className={`ml-1.5 text-xs ${filter === f.key ? 'text-blue-200' : 'text-gray-400'}`}>
                ({f.count})
              </span>
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {sortedBookings.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <TicketX className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Aucun ticket</h3>
            <p className="text-gray-500 mb-6">
              {filter !== 'all'
                ? 'Aucun ticket dans cette catégorie.'
                : 'Vous n\'avez pas encore de réservation.'}
            </p>
            <button
              onClick={() => navigate('/home')}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
              Réserver un trajet
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedBookings.map((booking) => {
              const tripDetails = booking.trip_details || ({} as any);
              const date = booking.travel_date || (booking as any).scheduled_trip_date || '';
              const isPast = isTravelPassed(date);
              const from = tripDetails.departure_city_name || tripDetails.departure_city_display || '—';
              const to = tripDetails.arrival_city_name || tripDetails.arrival_city_display || '—';
              const depTime = formatTime(tripDetails.departure_time || '');
              const arrTime = formatTime(tripDetails.arrival_time || '');
              const company = tripDetails.company_name || 'Compagnie';
              const price = Number(booking.total_price).toLocaleString();
              const seatNum = booking.seat_number || '—';
              const ticketNo = `EVX-${String(booking.id).padStart(5, '0')}`;
              const dateLabel = date ? new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

              return (
                <div
                  key={booking.id}
                  className={`group relative transition-all duration-300 hover:-translate-y-1 ${isPast ? 'opacity-65' : ''}`}
                >
                  <div className="flex rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow border border-gray-200/60">

                    {/* ═══════════ LEFT: Main ticket ═══════════ */}
                    <div className="flex-1 bg-white relative overflow-hidden">

                      {/* Top blue banner */}
                      <div className={`flex items-center justify-between px-5 py-2.5 ${isPast ? 'bg-gray-400' : 'bg-blue-600'}`}>
                        <div className="flex items-center gap-2">
                          <Bus size={16} className="text-white/80" />
                          <span className="text-white font-bold text-sm tracking-wide uppercase">Bus Ticket</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isPast && (
                            <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded font-bold uppercase">
                              Expiré
                            </span>
                          )}
                          <div className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${
                            isPast ? 'bg-white/20 text-white' : 'bg-white text-blue-600'
                          }`}>
                            {seatNum}
                          </div>
                        </div>
                      </div>

                      {/* Ticket body */}
                      <div className="px-5 py-4 relative">
                        {/* Content: Info+Bus left  |  QR right */}
                        <div className="flex gap-5">

                          {/* Left: Info grid with bus in the middle */}
                          <div className="flex-1 flex items-center gap-4">
                            {/* Column 1: N°, Heure, De */}
                            <div className="flex-1 space-y-3">
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">N°</p>
                                <p className="text-sm font-bold text-gray-800 mt-0.5">{ticketNo}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Heure</p>
                                <p className="text-sm font-bold text-gray-800 mt-0.5">{depTime} → {arrTime}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">De</p>
                                <p className="text-sm font-bold text-gray-800 mt-0.5">{from}</p>
                              </div>
                            </div>

                            {/* Bus icon centered between the two info columns */}
                            <div className="hidden md:flex items-center justify-center flex-shrink-0">
                              <Bus size={80} strokeWidth={0.7} className={isPast ? 'text-gray-200' : 'text-blue-100'} />
                            </div>

                            {/* Column 2: Date, Compagnie, Destination */}
                            <div className="flex-1 space-y-3">
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Date</p>
                                <p className="text-sm font-bold text-gray-800 mt-0.5">{dateLabel}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Compagnie</p>
                                <p className="text-sm font-bold text-gray-800 mt-0.5">{company}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Destination</p>
                                <p className="text-sm font-bold text-gray-800 mt-0.5">{to}</p>
                              </div>
                            </div>
                          </div>

                          {/* Right: QR Code only */}
                          <div className="flex flex-col items-center justify-center flex-shrink-0">
                            <div className={`p-2 bg-white rounded-lg border ${isPast ? 'border-gray-200 opacity-50' : 'border-gray-200'}`}>
                              <QRCodeSVG
                                value={`EVEX-${booking.id}-${seatNum}-${from}-${to}-${dateLabel}`}
                                size={80}
                                level="L"
                                bgColor="transparent"
                                fgColor={isPast ? '#9ca3af' : '#1e3a5f'}
                              />
                            </div>
                            <p className="text-[8px] text-gray-400 mt-1 uppercase tracking-widest">{ticketNo}</p>
                          </div>
                        </div>

                        {/* Bottom row: price + route highlight */}
                        <div className={`mt-4 flex items-center justify-between rounded-lg px-4 py-2.5 ${isPast ? 'bg-gray-100' : 'bg-blue-50'}`}>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-semibold ${isPast ? 'text-gray-500' : 'text-blue-600'}`}>{from}</span>
                            <div className="flex items-center gap-1">
                              <div className={`w-1.5 h-1.5 rounded-full ${isPast ? 'bg-gray-400' : 'bg-blue-400'}`} />
                              <div className={`w-8 h-px ${isPast ? 'bg-gray-300' : 'bg-blue-300'}`} />
                              <Bus size={14} className={isPast ? 'text-gray-400' : 'text-blue-500'} />
                              <div className={`w-8 h-px ${isPast ? 'bg-gray-300' : 'bg-blue-300'}`} />
                              <div className={`w-1.5 h-1.5 rounded-full ${isPast ? 'bg-gray-400' : 'bg-blue-500'}`} />
                            </div>
                            <span className={`text-xs font-semibold ${isPast ? 'text-gray-500' : 'text-blue-600'}`}>{to}</span>
                          </div>
                          <span className={`text-lg font-extrabold ${isPast ? 'text-gray-500' : 'text-blue-700'}`}>{price} <span className="text-xs font-normal">FCFA</span></span>
                        </div>

                        {/* Barcode */}
                        <div className="flex items-end gap-[1.5px] mt-3 h-7">
                          {Array.from({ length: 90 }).map((_, i) => (
                            <div
                              key={i}
                              className="bg-gray-800 rounded-sm"
                              style={{
                                width: i % 3 === 0 ? '2px' : '1px',
                                height: `${10 + ((i * 7 + i * i) % 14)}px`,
                                opacity: isPast ? 0.1 : 0.22,
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Action button for active tickets */}
                      {!isPast && (
                        <div className="px-5 pb-4">
                          <button
                            onClick={() => navigate('/confirmation', { state: { booking } })}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
                          >
                            <Ticket size={15} />
                            Voir le billet
                            <ChevronRight size={15} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* ═══════════ VERTICAL PERFORATION ═══════════ */}
                    <div className="relative w-6 flex-shrink-0 bg-white">
                      {/* Top notch */}
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-4 bg-gradient-to-br from-blue-50 to-green-50 rounded-b-full" />
                      {/* Bottom notch */}
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-4 bg-gradient-to-br from-blue-50 to-green-50 rounded-t-full" />
                      {/* Dashed line */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="h-full border-l-2 border-dashed border-gray-300" />
                      </div>
                    </div>

                    {/* ═══════════ RIGHT: Stub ═══════════ */}
                    <div className={`w-36 flex-shrink-0 relative overflow-hidden ${isPast ? 'bg-gray-100' : 'bg-blue-50'}`}>
                      {/* Seat badge */}
                      <div className={`mx-3 mt-4 py-2 rounded-lg text-center ${isPast ? 'bg-gray-300' : 'bg-blue-600'}`}>
                        <p className={`text-[9px] uppercase tracking-widest ${isPast ? 'text-gray-600' : 'text-blue-200'}`}>Siège</p>
                        <p className="text-2xl font-black text-white leading-none mt-0.5">{seatNum}</p>
                      </div>

                      {/* Stub info */}
                      <div className="px-3 mt-3 space-y-2">
                        <div>
                          <p className="text-[9px] text-gray-400 uppercase tracking-wider">N°</p>
                          <p className="text-[11px] font-bold text-gray-700">{ticketNo}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-400 uppercase tracking-wider">Date</p>
                          <p className="text-[11px] font-bold text-gray-700">{dateLabel}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-400 uppercase tracking-wider">Heure</p>
                          <p className="text-[11px] font-bold text-gray-700">{depTime}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-400 uppercase tracking-wider">De</p>
                          <p className="text-[11px] font-bold text-gray-700 truncate">{from}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-400 uppercase tracking-wider">Dest.</p>
                          <p className="text-[11px] font-bold text-gray-700 truncate">{to}</p>
                        </div>
                      </div>

                      {/* Status at bottom */}
                      <div className="absolute bottom-3 left-3 right-3">
                        <div className={`text-center py-1 rounded text-[9px] font-bold uppercase tracking-wider ${
                          booking.status === 'confirmed'
                            ? isPast ? 'bg-gray-300 text-gray-600' : 'bg-emerald-100 text-emerald-700'
                            : booking.status === 'cancelled'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {booking.status === 'confirmed' ? (isPast ? 'Expiré' : '✓ Confirmé') : booking.status === 'cancelled' ? 'Annulé' : booking.status}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-8 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex flex-col md:flex-row items-center gap-6 p-6">
            <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Search size={24} className="text-blue-600" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-semibold text-gray-900">Prêt pour un nouveau voyage ?</h3>
              <p className="text-sm text-gray-500 mt-0.5">Recherchez et réservez votre prochain trajet en quelques clics</p>
            </div>
            <button
              onClick={() => navigate('/home')}
              className="px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm flex-shrink-0"
            >
              Réserver un trajet
            </button>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock size={13} className="text-blue-600" />
              <p className="text-xs font-semibold text-blue-600">Conseil</p>
            </div>
            <p className="text-xs text-gray-500">Arrivez 15 min avant le départ pour un embarquement serein.</p>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Download size={13} className="text-emerald-600" />
              <p className="text-xs font-semibold text-emerald-600">Bon à savoir</p>
            </div>
            <p className="text-xs text-gray-500">Téléchargez votre billet pour un accès hors ligne pendant le voyage.</p>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Ticket size={13} className="text-amber-600" />
              <p className="text-xs font-semibold text-amber-600">Rappel</p>
            </div>
            <p className="text-xs text-gray-500">Conservez votre ticket jusqu'à la fin de votre trajet.</p>
          </div>
        </div>
      </div>
    </div>
  );
}



