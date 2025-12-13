import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, Trip } from '../types';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/fonts';
import { formatCurrency } from '../utils/mockData';
import Button from '../components/Button';

type Props = NativeStackScreenProps<RootStackParamList, 'MainTabs'>;

export default function MyTicketsScreen({ navigation }: Props) {
  const [tickets, setTickets] = useState<Trip[]>([]);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const savedTickets = await AsyncStorage.getItem('bookedTickets');
      if (savedTickets) {
        setTickets(JSON.parse(savedTickets));
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
    }
  };

  if (tickets.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mes Tickets</Text>
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="ticket-outline" size={48} color={COLORS.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>Aucun ticket</Text>
          <Text style={styles.emptyDescription}>
            Vous n'avez pas encore de réservation. Réservez votre premier voyage maintenant !
          </Text>
          <Button
            title="Réserver un trajet"
            onPress={() => navigation.navigate('Home' as any)}
            style={styles.emptyButton}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Tickets</Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={styles.sectionTitle}>BILLETS ACTIFS</Text>

        {tickets.map((ticket, index) => (
          <View key={index} style={styles.ticketCard}>
            <View style={styles.ticketCardHeader}>
              <View style={styles.ticketCardHeaderLeft}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.white} />
                <Text style={styles.ticketCardDate}>{ticket.date}</Text>
              </View>
              <View style={styles.ticketCardBadge}>
                <Text style={styles.ticketCardBadgeText}>Confirmé</Text>
              </View>
            </View>

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

              <Button
                title="Voir le billet"
                onPress={() => navigation.navigate('Ticket' as any, { trip: ticket })}
                icon={<Ionicons name="ticket-outline" size={20} color={COLORS.white} style={{ marginRight: 8 }} />}
                style={styles.viewButton}
              />
            </View>
          </View>
        ))}
      </ScrollView>
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
  viewButton: {
    height: 48,
    borderRadius: 12,
  },
});
