import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/fonts';
import { formatCurrency } from '../utils/mockData';
import { getMyBookings } from '../services/api';

interface TicketItem {
  id: number;
  reference: string;
  passenger_name: string;
  date: string;
  company: string;
  company_logo?: string | null;
  price: number;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  seat_number: string;
  status: string;
  scheduled_trip?: number | null;
  origin_stop?: number | string | null;
  destination_stop?: number | string | null;
  trip_info?: any;
}
import { useAuth } from '../contexts/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'MainTabs'>;

export default function MyTicketsScreen({ navigation }: Props) {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hiddenTickets, setHiddenTickets] = useState<Set<number>>(new Set());
  const { user } = useAuth();

  useEffect(() => {
    loadTickets();
  }, [user]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      if (!user) return setTickets([]);
      const bookings = await getMyBookings();
      
      if (!Array.isArray(bookings)) return setTickets([]);

      const transformedTickets = bookings.map((booking: any) => {
        const tripDetails = booking.trip_details || booking.trip_info || {};
        return {
          id: booking.id,
          reference: booking.reference || booking.ticket_reference || `EVEX-${String(booking.id).padStart(6, '0')}`,
          passenger_name: booking.passenger_full_name || booking.passenger_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
          date: booking.scheduled_trip_date || booking.travel_date || 'Date non disponible',
          company: tripDetails.company_name || 'Compagnie inconnue',
          company_logo: tripDetails.company_logo || tripDetails.company_logo_url || null,
          price: booking.total_price || tripDetails.price || 0,
          from: tripDetails.departure_city_name || 'Ville de départ',
          to: tripDetails.arrival_city_name || 'Ville d\'arrivée',
          departure: tripDetails.departure_time || '00:00',
          arrival: tripDetails.arrival_time || '00:00',
          seat_number: booking.seat_number || '?',
          status: booking.status || 'Confirmé',
          scheduled_trip: booking.scheduled_trip || null,
          origin_stop: booking.origin_stop || null,
          destination_stop: booking.destination_stop || null,
          trip_info: tripDetails,
        };
      });
      setTickets(transformedTickets);
    } catch (error) {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const isTravelPassed = (travelDate: string): boolean => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const parts = travelDate.split('-');
      const travelDateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return travelDateObj < today;
    } catch { return false; }
  };

  const visibleTickets = tickets.filter(ticket => !hiddenTickets.has(ticket.id));

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER BLEU ARRONDI */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Tickets</Text>
        <Text style={styles.headerSubtitle}>{visibleTickets.length} voyage(s) enregistré(s)</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>BILLETS ACTIFS</Text>

        {visibleTickets.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="ticket-outline" size={40} color="#CBD5E1" />
            <Text style={styles.emptyText}>Aucun ticket trouvé</Text>
          </View>
        ) : (
          visibleTickets.map((ticket) => {
            const isExpired = isTravelPassed(ticket.date);
            return (
              <View key={ticket.id} style={styles.ticketWrapper}>
                <View style={styles.ticketNotchLeft} />
                <View style={styles.ticketNotchRight} />
                <View style={[styles.ticketCard, isExpired && styles.expiredCard]}>
                  
                  {/* Header du ticket (Date & Statut) */}
                  <View style={[styles.cardHeader, isExpired ? styles.expiredHeader : styles.activeHeader]}>
                    <View style={styles.headerRow}>
                      <Ionicons name="calendar-outline" size={16} color={COLORS.white} />
                      <Text style={styles.cardDateText}>{ticket.date}</Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusBadgeText}>
                        {isExpired ? 'EXPIRÉ' : ticket.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Effet de perforation */}
                  <View style={styles.perforationRow}>
                    <View style={styles.leftNotch} />
                    <View style={styles.dashedLine} />
                    <View style={styles.rightNotch} />
                  </View>

                  {/* Corps du ticket */}
                  <View style={styles.cardBody}>
                    <View style={styles.topInfo}>
                      <View>
                        <Text style={styles.label}>COMPAGNIE</Text>
                        <Text style={styles.companyName}>{ticket.company}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.label}>PRIX</Text>
                        <Text style={styles.priceText}>{formatCurrency(ticket.price)}</Text>
                      </View>
                    </View>

                    {/* Trajet Visuel */}
                    <View style={styles.routeContainer}>
                      <View style={styles.routeSegment}>
                        <Text style={styles.timeText}>{ticket.departure.substring(0, 5)}</Text>
                        <Text style={styles.cityText} numberOfLines={1}>{ticket.from}</Text>
                      </View>

                      <View style={styles.routeVisual}>
                        <View style={styles.routeIconsRow}>
                          <Ionicons name="location-outline" size={16} color={COLORS.primary} />
                          <View style={styles.routeLine} />
                          <Ionicons name="bus" size={16} color={COLORS.primary} />
                          <View style={styles.routeLine} />
                          <Ionicons name="flag-outline" size={16} color={COLORS.primary} />
                        </View>
                        <Text style={styles.routeLabel}>Direct</Text>
                      </View>

                      <View style={[styles.routeSegment, { alignItems: 'flex-end' }]}> 
                        <Text style={styles.timeText}>{ticket.arrival.substring(0, 5)}</Text>
                        <Text style={styles.cityText} numberOfLines={1}>{ticket.to}</Text>
                      </View>
                    </View>

                    <View style={styles.bottomInfo}>
                      <View>
                        <Text style={styles.label}>SIÈGE</Text>
                        <Text style={styles.seatText}>{ticket.seat_number}</Text>
                      </View>
                      <View style={styles.qrPlaceholder}>
                        <Ionicons name="qr-code-outline" size={30} color="#1E293B" />
                      </View>
                    </View>

                    <View style={styles.actionsRow}>
                      <TouchableOpacity 
                        style={styles.mainActionButton}
                        onPress={() => navigation.navigate('Ticket' as any, { trip: ticket })}
                      >
                        <Ionicons name="ticket-outline" size={20} color={COLORS.white} />
                        <Text style={[styles.mainActionText, { marginLeft: 10 }]}>Voir le billet</Text>
                      </TouchableOpacity>

                      {!isExpired && ticket.scheduled_trip && (
                        <TouchableOpacity
                          style={styles.iconActionButton}
                          onPress={() => navigation.navigate('TrackBus', { tripId: ticket.scheduled_trip! })}
                        >
                          <Ionicons name="navigate-circle-outline" size={22} color={COLORS.primary} />
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={styles.iconActionButton}
                        onPress={() =>
                          navigation.navigate('TicketAssistant', {
                            bookingId: ticket.id,
                            reference: ticket.reference,
                          })
                        }
                      >
                        <Ionicons name="sparkles" size={20} color={COLORS.primary} />
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.iconActionButton}
                        onPress={() => setHiddenTickets(prev => new Set(prev).add(ticket.id))}
                      >
                        <Ionicons name="trash-outline" size={20} color="#64748B" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.white,
  },
  
  
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  content: {
    flex: 1,
    marginTop: 8,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 18,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.5,
    marginBottom: 15,
  },
  ticketWrapper: {
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
    overflow: 'visible',
  },
  ticketNotchLeft: {
    position: 'absolute',
    left: -18,
    top: 56,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    zIndex: 1,
  },
  ticketNotchRight: {
    position: 'absolute',
    right: -18,
    top: 56,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    zIndex: 1,
  },
  ticketCard: {
    backgroundColor: COLORS.white,
    borderRadius: 32,
    overflow: 'hidden',
  },
  expiredCard: { opacity: 0.75 },
  aiActionButton: {
    width: 46,
    height: 46,
    marginLeft: 10,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  activeHeader: { backgroundColor: COLORS.primary },
  expiredHeader: { backgroundColor: '#94A3B8' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardDateText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  statusBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusBadgeText: { color: COLORS.white, fontSize: 11, fontWeight: '800' },
  perforationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
    backgroundColor: 'white',
  },
  leftNotch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
    marginLeft: -11,
  },
  rightNotch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
    marginRight: -11,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginHorizontal: 10,
  },
  cardBody: { padding: 20 },
  topInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  label: { fontSize: 10, fontWeight: '700', color: '#94A3B8', marginBottom: 6 },
  companyName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  priceText: { fontSize: 16, fontWeight: '900', color: COLORS.primary },
  routeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 18,
    marginBottom: 15,
  },
  routeSegment: {
    flex: 1,
    minWidth: 0,
  },
  routeItem: { flex: 2, paddingHorizontal: 4 },
  timeText: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  cityText: { fontSize: 11, fontWeight: '700', color: '#475569', marginTop: 4 },
  routeVisual: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  routeLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#BFDBFE',
    marginHorizontal: 6,
  },
  routeLabel: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  busIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  routeIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentLine: {
    width: 18,
    height: 2,
    backgroundColor: COLORS.primary,
    opacity: 0.4,
    marginHorizontal: 6,
  },
  routeIconText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
    marginTop: 4,
  },
  bottomInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  seatText: { fontSize: 26, fontWeight: '900', color: '#0F172A' },
  qrPlaceholder: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsRow: { flexDirection: 'row', alignItems: 'center' },
  mainActionButton: {
    flex: 1,
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 18,
    paddingHorizontal: 16,
  },
  mainActionText: { color: COLORS.white, fontWeight: '800', fontSize: 15 },
  iconActionButton: {
    width: 46,
    height: 46,
    marginLeft: 12,
    borderRadius: 16,
    backgroundColor: '#F8FAFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deleteIconButton: {
    width: 46,
    height: 46,
    marginLeft: 12,
    borderRadius: 16,
    backgroundColor: '#F8FAFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F1F5F9',
    borderStyle: 'dashed',
  },
  emptyText: { color: '#94A3B8', marginTop: 10, fontWeight: '600' },
});
