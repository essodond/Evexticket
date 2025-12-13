import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/fonts';
import Button from '../components/Button';
import { useAuth } from '../contexts/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'MainTabs'>;

const menuItems = [
  { icon: 'person-outline', label: 'Informations personnelles' },
  { icon: 'settings-outline', label: 'Paramètres' },
  { icon: 'help-circle-outline', label: 'Aide & Support' },
];

export default function ProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuth();

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
            <Text style={styles.userName}>{user?.first_name || 'Utilisateur'}</Text>
            <Text style={styles.userMember}>
              Membre depuis {user?.date_joined ? new Date(user.date_joined).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) : '...'}
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
                <Text style={styles.statValue}>3</Text>
                <Text style={styles.statLabel}>Voyages</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>21000 XOF</Text>
                <Text style={styles.statLabel}>Dépensés</Text>
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
