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
  date: string;
  company: string;
  price: number;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  seat_number: string;
  status: string;
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
          date: booking.scheduled_trip_date || booking.travel_date || 'Date non disponible',
          company: tripDetails.company_name || 'Compagnie inconnue',
          price: booking.total_price || tripDetails.price || 0,
          from: tripDetails.departure_city_name || 'Ville de départ',
          to: tripDetails.arrival_city_name || 'Ville d\'arrivée',
          departure: tripDetails.departure_time || '00:00',
          arrival: tripDetails.arrival_time || '00:00',
          seat_number: booking.seat_number || '?',
          status: booking.status || 'Confirmé',
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
                      <View style={styles.routeItem}>
                        <Text style={styles.timeText}>{ticket.departure.substring(0, 5)}</Text>
                        <Text style={styles.cityText} numberOfLines={1}>{ticket.from}</Text>
                      </View>

                      <View style={styles.routeVisual}>
                        <View style={styles.routeIconsRow}>
                          <Ionicons name="location-outline" size={18} color={COLORS.primary} />
                          <View style={styles.segmentLine} />
                          <Ionicons name="bus" size={18} color={COLORS.primary} />
                          <View style={styles.segmentLine} />
                          <Ionicons name="flag-outline" size={18} color={COLORS.primary} />
                        </View>
                        <Text style={styles.routeIconText}>Direct</Text>
                      </View>

                      <View style={[styles.routeItem, { alignItems: 'flex-end' }]}> 
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
                        <Ionicons name="qr-code-outline" size={36} color="#1E293B" />
                      </View>
                    </View>

                    {/* Boutons d'actions */}
                    <View style={styles.actionsRow}>
                      <TouchableOpacity 
                        style={styles.mainActionButton}
                        onPress={() => navigation.navigate('Ticket' as any, { trip: ticket })}
                      >
                        <Ionicons name="ticket-outline" size={20} color={COLORS.white} />
                        <Text style={[styles.mainActionText, { marginLeft: 10 }]}>Voir le billet</Text>
                      </TouchableOpacity>

                      {/* Suivre le bus — simulation : visible 3h avant le départ */}
                      {(() => {
                        const getMinutesUntilDeparture = (dateStr: string, timeStr: string) => {
                          try {
                            if (!dateStr || !timeStr) return Infinity;
                            const parts = dateStr.split('-').map((p: string) => parseInt(p, 10));
                            const [year, month, day] = parts;
                            const [h, m] = timeStr.split(':').map((s: string) => parseInt(s || '0', 10));
                            const dep = new Date(year, (month || 1) - 1, day, h || 0, m || 0);
                            return Math.round((dep.getTime() - Date.now()) / 60000);
                          } catch { return Infinity; }
                        };

                        const minutes = getMinutesUntilDeparture(ticket.date, ticket.departure);
                        const showTrack = minutes <= 180 && minutes > 0;
                        if (!showTrack) return null;
                        return (
                          <TouchableOpacity
                            style={[styles.mainActionButton, { marginLeft: 10, backgroundColor: '#06b6d4' }]}
                            onPress={() => navigation.navigate('TrackBus' as any, { tripId: String(ticket.id) })}
                          >
                            <Ionicons name="navigate" size={20} color={COLORS.white} />
                            <Text style={[styles.mainActionText, { marginLeft: 10 }]}>Suivre le bus</Text>
                          </TouchableOpacity>
                        );
                      })()}

                      <TouchableOpacity 
                        style={[styles.deleteIconButton, { marginLeft: 10 }]}
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
    borderRadius: 24,
    overflow: 'hidden',
  },
  expiredCard: { opacity: 0.8 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  activeHeader: { backgroundColor: COLORS.primary },
  expiredHeader: { backgroundColor: '#94A3B8' },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  cardDateText: { color: COLORS.white, fontWeight: '600', fontSize: 13 },
  statusBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: { color: COLORS.white, fontSize: 10, fontWeight: '800' },
  perforationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
    backgroundColor: 'white',
  },
  leftNotch: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    marginLeft: -10,
  },
  rightNotch: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    marginRight: -10,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderStyle: 'dashed',
    marginHorizontal: 10,
  },
  cardBody: { padding: 20 },
  topInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  label: { fontSize: 10, fontWeight: '700', color: '#94A3B8', marginBottom: 2 },
  companyName: { fontSize: 17, fontWeight: '700', color: '#1E293B' },
  priceText: { fontSize: 17, fontWeight: '800', color: COLORS.primary },
  routeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 18,
    marginBottom: 15,
  },
  routeItem: { flex: 2 },
  timeText: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  cityText: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  routeVisual: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  line: { width: '100%', height: 2, backgroundColor: COLORS.primary, opacity: 0.3, marginVertical: 8 },
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
  seatText: { fontSize: 26, fontWeight: '900', color: '#1E293B' },
  qrPlaceholder: { padding: 6, backgroundColor: '#F1F5F9', borderRadius: 10 },
  actionsRow: { flexDirection: 'row' },
  mainActionButton: {
    flex: 1,
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  mainActionText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  deleteIconButton: {
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 14,
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