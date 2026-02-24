import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../types';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/fonts';
import Button from '../components/Button';

type Props = NativeStackScreenProps<RootStackParamList, 'PublicHome'>;

const features = [
  { icon: 'bus', label: 'Trajets multiples' },
  { icon: 'shield-checkmark', label: '100% sécurisé' },
  { icon: 'card', label: 'Paiement facile' },
  { icon: 'location', label: 'Tout le Togo' },
];

export default function PublicHomeScreen({ navigation }: Props) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.heroContainer}>
        <Image
          source={{ uri: 'https://i.pinimg.com/1200x/e9/cd/9f/e9cd9fdd26dd8c095795557dd97f2faf.jpg?w=800' }}
          style={styles.heroImage}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.2)', 'rgba(255,255,255,1)']}
          style={styles.gradient}
        />
        


        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>Réserve ton ticket en toute simplicité</Text>
          <Text style={styles.heroSubtitle}>
            Voyagez partout au Togo avec confort et sécurité
          </Text>
        </View>
      </View>

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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  heroContainer: {
    height: 500,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  logoContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  logoBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  logoText: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.primary,
  },
  heroContent: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: FONT_SIZES['4xl'],
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: FONT_SIZES.base,
    color: COLORS.white,
    textAlign: 'center',
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  content: {
    padding: 24,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 32,
    gap: 12,
  },
  featureCard: {
    width: '48%',
    backgroundColor: `${COLORS.gray}80`,
    borderRadius: 16,
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
    borderRadius: 16,
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
