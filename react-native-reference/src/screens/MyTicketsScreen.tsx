import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, Trip } from '../types';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/fonts';
import { formatCurrency } from '../utils/mockData';
import Button from '../components/Button';
import { getMyBookings } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'MainTabs'>;

export default function MyTicketsScreen({ navigation }: Props) {
  const [tickets, setTickets] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [hiddenTickets, setHiddenTickets] = useState<Set<number>>(new Set());
  const { user } = useAuth();

  useEffect(() => {
    loadTickets();
  }, [user]);

  // Fonction pour masquer un ticket
  const handleDeleteTicket = (ticketId: number) => {
    setHiddenTickets(prev => {
      const newHidden = new Set(prev);
      newHidden.add(ticketId);
      return newHidden;
    });
    console.log(`🗑️  Ticket ${ticketId} masqué de la liste`);
  };

  // Fonction pour verifier si un voyage est passe
  const isTravelPassed = (travelDate: string): boolean => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const parts = travelDate.split('-');
      if (parts.length !== 3) {
        console.warn('Format de date invalide:', travelDate);
        return false;
      }

      const travelDateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));

      return travelDateObj < today;
    } catch (error) {
      console.error('Erreur lors de la verification de la date:', error);
      return false;
    }
  };

  // Filtrer les tickets masques
  const visibleTickets = tickets.filter(ticket => !hiddenTickets.has(ticket.id));

  // Trier les tickets : valides d'abord, puis expires
  const sortedTickets = useMemo(() => {
    const valid = [];
    const expired = [];

    visibleTickets.forEach(ticket => {
      if (isTravelPassed(ticket.date)) {
        expired.push(ticket);
      } else {
        valid.push(ticket);
      }
    });

    // Trier les valides par date décroissante (plus récents en premier)
    valid.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Trier les expirés par date décroissante (plus récents en premier)
    expired.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return [...valid, ...expired];
  }, [visibleTickets]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      console.log('📥 Chargement des tickets...');
      
      if (!user) {
        console.log('👤 Utilisateur non connecté');
        setTickets([]);
        return;
      }
      
      const bookings = await getMyBookings();
      console.log('✅ Bookings reçus:', bookings, 'Type:', typeof bookings);

      // Vérifier que bookings est un tableau
      if (!Array.isArray(bookings)) {
        console.error('❌ Les bookings ne sont pas un tableau:', bookings);
        setTickets([]);
        return;
      }

      // Transformer les réservations en format Trip attendu par l'écran
      const transformedTickets = bookings.map((booking: any) => {
        console.log('📋 Transformation du booking:', booking.id, booking.seat_number);
        const tripDetails = booking.trip_details || booking.trip_info || {};
        return {
          id: booking.id,
          date: booking.scheduled_trip_date || 'Date non disponible',
          company: tripDetails.company_name || 'Compagnie inconnue',
          price: booking.total_price || tripDetails.price || 0,
          from: tripDetails.departure_city_name || 'Ville de départ',
          to: tripDetails.arrival_city_name || 'Ville d\'arrivée',
          departure: tripDetails.departure_time || 'Heure non disponible',
          arrival: tripDetails.arrival_time || 'Heure non disponible',
          seat_number: booking.seat_number || 'Siège non assigné',
          status: booking.status || 'Confirmé',
          trip_info: tripDetails
        };
      });
      
      console.log('✅ Tickets transformés:', transformedTickets.length);
      setTickets(transformedTickets);
    } catch (error) {
      console.error('💥 Erreur lors du chargement des tickets:', error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Tickets</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement de vos tickets...</Text>
        </View>
      ) : sortedTickets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="ticket-outline" size={48} color={COLORS.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>
            {tickets.length === 0 ? 'Aucun ticket' : 'Tous les tickets sont masqués'}
          </Text>
          <Text style={styles.emptyDescription}>
            {tickets.length === 0
              ? 'Vous n\'avez pas encore de réservation. Réservez votre premier voyage maintenant !'
              : 'Vous avez masqué tous vos tickets. Rechargez la page pour les afficher à nouveau.'}
          </Text>
          {tickets.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                // Masquer tous les tickets masqués
                setHiddenTickets(new Set());
              }}
              style={styles.unhideButton}
            >
              <Text style={styles.unhideButtonText}>Afficher tous les tickets</Text>
            </TouchableOpacity>
          )}
          {tickets.length === 0 && (
            <Button
              title="Réserver un trajet"
              onPress={() => navigation.navigate('Home' as any)}
              style={styles.emptyButton}
            />
          )}
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          <Text style={styles.sectionTitle}>BILLETS ACTIFS</Text>

          {/* Section Billets valides */}
          {sortedTickets.some(t => !isTravelPassed(t.date)) }

          {sortedTickets.map((ticket, index) => {
            const isExpired = isTravelPassed(ticket.date);

            // Ne pas afficher le titre des expirés ici, le faire avant le premier expiré
            return (
            <View key={ticket.id || index} style={styles.ticketCard}>
              {/* Badge INVALIDE pour les voyages passés - compact et sur le côté */}
              {isExpired && (
                <View style={styles.ticketCardHeader}>
                  <View style={styles.ticketCardHeaderLeft}>
                    <Ionicons name="calendar-outline" size={16} color={COLORS.white} />
                    <Text style={styles.ticketCardDate}>{ticket.date}</Text>
                  </View>
                  <View style={styles.invalidBadgeCompact}>
                    <Ionicons name="alert-circle" size={14} color={COLORS.warning} />
                    <Text style={styles.invalidBadgeCompactText}>Expiré</Text>
                  </View>
                </View>
              )}

              {!isExpired && (
                <View style={styles.ticketCardHeader}>
                  <View style={styles.ticketCardHeaderLeft}>
                    <Ionicons name="calendar-outline" size={16} color={COLORS.white} />
                    <Text style={styles.ticketCardDate}>{ticket.date}</Text>
                  </View>
                  <View style={styles.ticketCardBadge}>
                    <Text style={styles.ticketCardBadgeText}>{ticket.status}</Text>
                  </View>
                </View>
              )}

              <View style={styles.ticketCardBody}>
                <View style={styles.ticketCardInfo}>
                  <View>
                    <Text style={styles.ticketCardLabel}>Compagnie</Text>
                    <Text style={styles.ticketCardValue}>{ticket.company}</Text>
                  </View>
                  <View style={styles.ticketCardInfoRight}>
                    <Text style={styles.ticketCardLabel}>Prix</Text>
                    <Text style={styles.ticketCardPrice}>{formatCurrency(ticket.price)}</Text>
                  </View>
                </View>

                <View style={styles.ticketCardRoute}>
                  <View style={styles.ticketCardRouteItem}>
                    <Text style={styles.ticketCardRouteLabel}>Départ</Text>
                    <Text style={styles.ticketCardRouteCity}>{ticket.from}</Text>
                    <Text style={styles.ticketCardRouteTime}>{ticket.departure}</Text>
                  </View>

                  <View style={styles.ticketCardRouteLine}>
                    <View style={styles.ticketCardRouteDot} />
                  </View>

                  <View style={[styles.ticketCardRouteItem, styles.ticketCardRouteItem_end]}>
                    <Text style={styles.ticketCardRouteLabel}>Arrivée</Text>
                    <Text style={styles.ticketCardRouteCity}>{ticket.to}</Text>
                    <Text style={styles.ticketCardRouteTime}>{ticket.arrival}</Text>
                  </View>
                </View>

                <View style={styles.ticketCardSeat}>
                  <Text style={styles.ticketCardLabel}>Siège</Text>
                  <Text style={styles.ticketCardValue}>{ticket.seat_number}</Text>
                </View>

                <View style={styles.ticketCardActions}>
                  <Button
                    title="Voir le billet"
                    onPress={() => navigation.navigate('Ticket' as any, { trip: ticket })}
                    icon={<Ionicons name="ticket-outline" size={20} color={COLORS.white} style={{ marginRight: 8 }} />}
                    style={[styles.viewButton, { flex: 1 }]}
                  />
                  <TouchableOpacity
                    onPress={() => handleDeleteTicket(ticket.id)}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTitle: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.white,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${COLORS.gray}80`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  emptyButton: {
    height: 56,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  ticketCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  invalidBadge: {
    backgroundColor: '#EF4444', // Rouge
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  invalidBadgeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  invalidBadgeCompact: {
    backgroundColor: 'rgba(255, 149, 0, 0.12)',
    borderColor: 'rgba(255, 149, 0, 0.35)',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 4,
  },
  invalidBadgeCompactText: {
    fontSize: FONT_SIZES.xs || 12,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.warning,
  },
  ticketCardHeader: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  ticketCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ticketCardDate: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
  },
  ticketCardBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ticketCardBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.white,
  },
  ticketCardBody: {
    padding: 16,
  },
  ticketCardInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  ticketCardLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  ticketCardValue: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },
  ticketCardInfoRight: {
    alignItems: 'flex-end',
  },
  ticketCardPrice: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.primary,
  },
  ticketCardRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ticketCardRouteItem: {
    flex: 1,
  },
  ticketCardRouteItem_end: {
    alignItems: 'flex-end',
  },
  ticketCardRouteLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  ticketCardRouteCity: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: 2,
  },
  ticketCardRouteTime: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.medium,
  },
  ticketCardRouteLine: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.gray,
    marginHorizontal: 12,
    position: 'relative',
  },
  ticketCardRouteDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    position: 'absolute',
    top: -3,
    left: '50%',
    marginLeft: -4,
  },
  ticketCardSeat: {
    marginBottom: 16,
  },
  ticketCardActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  viewButton: {
    height: 48,
    borderRadius: 12,
  },
  deleteButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.grayLight,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  unhideButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  unhideButtonText: {
    color: COLORS.white,
    fontWeight: FONT_WEIGHTS.semibold,
    fontSize: FONT_SIZES.base,
    textAlign: 'center',
  },
});
