import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/fonts';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'PublicHome'>;

const features = [
  { icon: 'bus', label: 'Trajets multiples' },
  { icon: 'shield-checkmark', label: '100% sécurisé' },
  { icon: 'card', label: 'Paiement facile' },
  { icon: 'location', label: 'Tout le Togo' },
];

export default function PublicHomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <ScreenHeader title="Voyagez en toute simplicité" subtitle="Réservez votre prochain trajet à travers le Togo." />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}>
        <View style={styles.content}>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={styles.featureIcon}>
                  <Ionicons name={feature.icon as any} size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.featureLabel}>{feature.label}</Text>
              </View>
            ))}
          </View>

          <Button
            title="Réserver mon ticket"
            onPress={() => navigation.navigate('Auth')}
            style={styles.ctaButton}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('Auth')}
            style={styles.loginLink}
          >
            <Text style={styles.loginLinkText}>
              Déjà inscrit ? <Text style={styles.loginLinkTextBold}>Se connecter</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  content: {
    padding: 20,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 32,
    gap: 12,
  },
  featureCard: {
    flexBasis: '46%',
    flexGrow: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 26,
    padding: 16,
    alignItems: 'center',
  },
  featureIcon: {
    width: 48,
    height: 48,
    backgroundColor: `${COLORS.primary}1A`,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    textAlign: 'center',
  },
  ctaButton: {
    height: 56,
    borderRadius: 28,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loginLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  loginLinkTextBold: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.semibold,
  },
});
