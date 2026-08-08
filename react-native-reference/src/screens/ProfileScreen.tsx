import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LoyaltySummary, RootStackParamList } from '../types';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/fonts';
import Button from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { getLoyaltySummary } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'MainTabs'>;

const menuItems = [
  { icon: 'person-outline', label: 'Informations personnelles' },
  { icon: 'settings-outline', label: 'Paramètres' },
  { icon: 'help-circle-outline', label: 'Aide & Support' },
];

export default function ProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const [loyalty, setLoyalty] = useState<LoyaltySummary | null>(user?.loyalty ?? null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(!user?.loyalty);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadLoyalty = async () => {
        try {
          const summary = await getLoyaltySummary();
          if (isActive) setLoyalty(summary);
        } catch {
          // Conserver les dernières données connues si le réseau est indisponible.
        } finally {
          if (isActive) setLoyaltyLoading(false);
        }
      };

      loadLoyalty();
      return () => {
        isActive = false;
      };
    }, [])
  );

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.navigate('PublicHome');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color={COLORS.white} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.first_name || ''} {user?.last_name || ''}</Text>
            <Text style={styles.userMember}>
              Membre depuis {user?.date_joined ? new Date(user.date_joined).getFullYear() : '...'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>EVEX XP</Text>
          <View style={styles.xpCard}>
            <View style={styles.xpHeader}>
              <View style={styles.xpIcon}>
                <Ionicons name="sparkles" size={24} color="#6B4F00" />
              </View>
              <View style={styles.xpHeaderText}>
                <Text style={styles.xpLevel}>
                  {loyalty?.level.label ?? 'Explorateur'}
                </Text>
                <Text style={styles.xpRule}>
                  +{loyalty?.xp_per_completed_trip ?? 100} XP par voyage terminé
                </Text>
              </View>
              {loyaltyLoading && !loyalty ? (
                <ActivityIndicator color="#6B4F00" />
              ) : (
                <Text style={styles.xpTotal}>{loyalty?.total_xp ?? 0} XP</Text>
              )}
            </View>

            <View style={styles.xpProgressTrack}>
              <View
                style={[
                  styles.xpProgressFill,
                  { width: `${loyalty?.level.progress_percent ?? 0}%` as any },
                ]}
              />
            </View>
            <Text style={styles.xpProgressLabel}>
              {loyalty?.level.next_level
                ? `${loyalty.level.xp_to_next_level} XP avant ${loyalty.level.next_level.label}`
                : 'Niveau maximum atteint'}
            </Text>

            {loyalty?.history?.slice(0, 3).map((item) => (
              <View key={item.id} style={styles.xpHistoryItem}>
                <View style={styles.xpHistoryIcon}>
                  <Ionicons
                    name={item.points >= 0 ? 'bus-outline' : 'return-down-back-outline'}
                    size={17}
                    color={item.points >= 0 ? COLORS.success : COLORS.error}
                  />
                </View>
                <Text style={styles.xpHistoryDescription} numberOfLines={1}>
                  {item.description}
                </Text>
                <Text style={item.points >= 0 ? styles.xpGain : styles.xpLoss}>
                  {item.points > 0 ? '+' : ''}{item.points} XP
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INFORMATIONS DE CONTACT</Text>
          <View style={styles.contactCard}>
            <View style={styles.contactItem}>
              <View style={styles.contactIcon}>
                <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>{user?.email || '...'}</Text>
              </View>
            </View>

            <View style={styles.contactDivider} />

            <View style={styles.contactItem}>
              <View style={styles.contactIcon}>
                <Ionicons name="call-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactLabel}>Téléphone</Text>
                <Text style={styles.contactValue}>{user?.phone_number ? user.phone_number : 'Non renseigné'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PARAMÈTRES</Text>
          <View style={styles.menuCard}>
            {menuItems.map((item, index) => (
              <View key={item.label}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => Alert.alert(item.label, 'Fonctionnalité à venir...')}
                >
                  <View style={styles.menuIcon}>
                    <Ionicons name={item.icon as any} size={20} color={COLORS.text} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
                {index < menuItems.length - 1 && <View style={styles.menuDivider} />}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Statistiques</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{loyalty?.completed_trips_count ?? 0}</Text>
                <Text style={styles.statLabel}>Voyages récompensés</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{loyalty?.total_xp ?? 0}</Text>
                <Text style={styles.statLabel}>XP cumulés</Text>
              </View>
            </View>
          </View>
        </View>

        <Button
          title="Déconnexion"
          onPress={handleLogout}
          variant="outline"
          icon={<Ionicons name="log-out-outline" size={20} color={COLORS.error} style={{ marginRight: 8 }} />}
          style={styles.logoutButton}
          textStyle={styles.logoutButtonText}
        />
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
    paddingBottom: 32,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.white,
    marginBottom: 4,
  },
  userMember: {
    fontSize: FONT_SIZES.base,
    color: 'rgba(255,255,255,0.8)',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  xpCard: {
    backgroundColor: '#FFF7D6',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F4D86B',
  },
  xpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  xpIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFE58A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  xpHeaderText: {
    flex: 1,
  },
  xpLevel: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#3D2B00',
  },
  xpRule: {
    marginTop: 2,
    fontSize: FONT_SIZES.xs,
    color: '#765E1A',
  },
  xpTotal: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#6B4F00',
    marginLeft: 10,
  },
  xpProgressTrack: {
    height: 9,
    borderRadius: 5,
    backgroundColor: '#F1E3AE',
    overflow: 'hidden',
    marginTop: 18,
  },
  xpProgressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#E8B900',
  },
  xpProgressLabel: {
    fontSize: FONT_SIZES.xs,
    color: '#765E1A',
    marginTop: 7,
    marginBottom: 8,
  },
  xpHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(107, 79, 0, 0.12)',
    paddingTop: 10,
    marginTop: 6,
  },
  xpHistoryIcon: {
    width: 28,
    alignItems: 'flex-start',
  },
  xpHistoryDescription: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: '#3D2B00',
  },
  xpGain: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.success,
    marginLeft: 8,
  },
  xpLoss: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.error,
    marginLeft: 8,
  },
  contactCard: {
    backgroundColor: `${COLORS.gray}4D`,
    borderRadius: 16,
    padding: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactContent: {
    flex: 1,
  },
  contactLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
  },
  contactDivider: {
    height: 1,
    backgroundColor: `${COLORS.gray}4D`,
    marginVertical: 12,
  },
  menuCard: {
    backgroundColor: `${COLORS.gray}4D`,
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
  },
  menuDivider: {
    height: 1,
    backgroundColor: `${COLORS.gray}4D`,
  },
  statsCard: {
    backgroundColor: `${COLORS.gray}4D`,
    borderRadius: 16,
    padding: 16,
  },
  statsTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  logoutButton: {
    backgroundColor: 'transparent',
    borderColor: COLORS.error,
    marginTop: 24,
  },
  logoutButtonText: {
    color: COLORS.error,
  },
});
