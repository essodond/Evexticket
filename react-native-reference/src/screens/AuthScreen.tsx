import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
  TextInput,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { useAuth } from '../contexts/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;
type AuthMode = 'login' | 'register';

export default function AuthScreen({ navigation }: Props) {
  const [mode, setMode] = useState<AuthMode>('login');
  const { login, register, isLoading } = useAuth();

  // États partagés
  const [phone, setPhone] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  // Étapes du carrousel d'inscription
  const [step, setStep] = useState<number>(1);

  const formatTgPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '').replace(/^228/, '');
    const parts = digits.match(/.{1,2}/g) || [];
    return '+228 ' + parts.join(' ');
  };

  const handleLogin = async () => {
    try {
      if (!phone) return Alert.alert('Erreur', 'Veuillez saisir votre numéro de téléphone');
      if (!pin || pin.length !== 4) return Alert.alert('Erreur', 'Le code PIN doit faire 4 chiffres');
      await login(phone, pin);
      navigation.replace('MainTabs');
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Échec de la connexion');
    }
  };

  const handleRegisterFlow = async () => {
    try {
      if (!name || !phone || !pin) return Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      const [first_name, ...rest] = name.trim().split(' ');
      const last_name = rest.join(' ');

      await register({ first_name, last_name, phone, pin, email: email || '' });
      navigation.replace('MainTabs');
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : "Échec de l'inscription");
    }
  };

  // Composant réutilisable pour l'en-tête de chaque étape d'inscription
  const EvexBusHeader = () => (
    <View style={styles.evexHeaderContainer}>
      <Ionicons name="bus" size={28} color="#28A745" />
      <Text style={styles.evexHeaderText}>EVEX BUS</Text>
    </View>
  );

  const renderRegisterStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <EvexBusHeader />
            <Text style={styles.stepTitle}>Commençons !</Text>
            <Text style={styles.stepSubtitle}>Dites-nous qui vous êtes.</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Votre Nom Complet</Text>
              <TextInput
                style={styles.grayInput}
                placeholder="Ex: Amavi KOFFI"
                placeholderTextColor="#A0AAB5"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email (optionnel)</Text>
              <TextInput
                style={styles.grayInput}
                placeholder="exemple@mail.com"
                placeholderTextColor="#A0AAB5"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Illustration Carte d'identité */}
            <View style={styles.illustrationContainer}>
              <Ionicons name="card-outline" size={90} color="#333" />
            </View>
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContainer}>
            <EvexBusHeader />
            <Text style={styles.stepTitle}>Numéro de Téléphone</Text>
            <Text style={styles.stepSubtitle}>Indiquez votre numéro de compte.</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Numéro de Téléphone</Text>
              <View style={styles.phoneInputContainer}>
                <View style={styles.countryCodeBadge}>
                  <Text style={styles.countryCodeText}>🇹🇬 +228</Text>
                </View>
                <TextInput
                  style={[styles.grayInput, { flex: 1, borderRadius: 0, borderTopRightRadius: 14, borderBottomRightRadius: 14 }]}
                  placeholder="90 12 34 56"
                  placeholderTextColor="#A0AAB5"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  maxLength={8}
                />
              </View>
            </View>

            {/* Illustration SIM & Réseau */}
            <View style={[styles.illustrationContainer, { flexDirection: 'row', gap: 15 }]}>
              <Ionicons name="hardware-chip-outline" size={80} color="#333" />
              <Ionicons name="radio-outline" size={80} color="#333" />
            </View>
          </View>
        );
             case 3:
        return (
          <View style={styles.stepContainer}>
            <EvexBusHeader />
            <Text style={styles.stepTitle}>Code PIN</Text>
            <Text style={styles.stepSubtitle}>Créez votre code PIN à 4 chiffres</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Code PIN de sécurité</Text>
              <TextInput
                style={styles.grayInput}
                placeholder="••••"
                placeholderTextColor="#A0AAB5"
                value={pin}
                onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={4}
                textAlign="center"
              />
            </View>

            {/* Illustration Clé */}
            <View style={styles.illustrationContainer}>
              <Text style={styles.illustrationLabel}>Sécurité</Text>
              <Ionicons name="key-outline" size={90} color="#F59E0B" style={{ transform: [{ rotate: '-45deg' }] }} />
            </View>
          </View>
        );
             case 4:
        return (
          <View style={styles.stepContainer}>
            <EvexBusHeader />
            <Text style={styles.stepTitle}>Confirmation Gratuite</Text>

            <View style={styles.phoneConfirmationBox}>
              <Text style={styles.phoneConfirmationText}>Verification :</Text>
              <Text style={styles.phoneDisplay}>{formatTgPhone(phone || '')}</Text>
            </View>

            <Text style={styles.stepSubtitle}>C'est presque fini !</Text>

            {/* Illustration Ticket */}
            <View style={styles.illustrationContainer}>
              <Ionicons name="ticket-outline" size={90} color="#28A745" />
            </View>
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContainer}>
            <EvexBusHeader />
            <Text style={styles.stepTitle}>Code PIN</Text>
            <Text style={styles.stepSubtitle}>Créez votre code PIN à 4 chiffres</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Code PIN de sécurité</Text>
              <TextInput
                style={styles.grayInput}
                placeholder="••••"
                placeholderTextColor="#A0AAB5"
                value={pin}
                onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={4}
                textAlign="center"
              />
            </View>

            {/* Illustration Clé */}
            <View style={styles.illustrationContainer}>
              <Text style={styles.illustrationLabel}>Sécurité</Text>
              <Ionicons name="key-outline" size={90} color="#F59E0B" style={{ transform: [{ rotate: '-45deg' }] }} />
            </View>
          </View>
        );
      case 4:
        return (
          <View style={styles.stepContainer}>
            <EvexBusHeader />
            <Text style={styles.stepTitle}>Confirmation Gratuite</Text>

            <View style={styles.phoneConfirmationBox}>
              <Text style={styles.phoneConfirmationText}>Verification :</Text>
              <Text style={styles.phoneDisplay}>{formatTgPhone(phone || '')}</Text>
            </View>

            <Text style={styles.stepSubtitle}>C'est presque fini !</Text>

            {/* Illustration Ticket */}
            <View style={styles.illustrationContainer}>
              <Ionicons name="ticket-outline" size={90} color="#28A745" />
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor="#007AFF" />

      {/* Header Bleu Supérieur */}
      <View style={styles.blueHeader}>
        <View style={styles.headerTopBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.brandingContainer}>
          <View style={styles.logoContainer}>
            <Ionicons name="infinite-outline" size={40} color="#FFF" />
          </View>
          <Text style={styles.mainTitle}>{mode === 'login' ? 'Se Connecter' : "S'inscrire"}</Text>
        </View>
      </View>

      <View style={styles.formCardContainer}>
        <ScrollView style={styles.cardScrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
          
          {mode === 'login' ? (
            /* --- INTERFACE DE CONNEXION (ADAPTÉE TÉLÉPHONE + PIN) --- */
            <View style={styles.loginForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Numéro de téléphone</Text>
                <View style={styles.phoneInputContainer}>
                  <View style={styles.countryCodeBadge}>
                    <Text style={styles.countryCodeText}>🇹🇬 +228</Text>
                  </View>
                  <TextInput
                    style={[styles.grayInput, { flex: 1, borderRadius: 0, borderTopRightRadius: 14, borderBottomRightRadius: 14 }]}
                    placeholder="90 12 34 56"
                    placeholderTextColor="#A0AAB5"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    maxLength={8}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Code PIN</Text>
                <TextInput
                  style={styles.grayInput}
                  placeholder="••••"
                  placeholderTextColor="#A0AAB5"
                  value={pin}
                  onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, 4))}
                  secureTextEntry
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>

              <TouchableOpacity style={styles.forgotLink}>
                <Text style={styles.forgotLinkText}>Code PIN oublié ?</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={isLoading}>
                <Text style={styles.primaryButtonText}>Se Connecter</Text>
              </TouchableOpacity>

              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Ou</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-google" size={22} color="#EA4335" style={styles.socialIcon} />
                <Text style={styles.socialButtonText}>Continuer avec Google</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-apple" size={22} color="#000000" style={styles.socialIcon} />
                <Text style={styles.socialButtonText}>Continuer avec Apple</Text>
              </TouchableOpacity>

              <View style={styles.footerContainer}>
                <Text style={styles.footerText}>
                  Pas encore de compte ?{' '}
                  <Text style={styles.footerLink} onPress={() => { setMode('register'); setStep(1); }}>
                    S'inscrire
                  </Text>
                </Text>
              </View>
            </View>
          ) : (
            /* --- INTERFACE D'INSCRIPTION (CARROUSEL AVEC ILLUSTRATIONS) --- */
            <View style={styles.form}>
              <View style={styles.progressContainer}>
                {/* 4 petits traits de progression comme sur la maquette */}
                {[1, 2, 3, 4].map((i) => (
                  <View key={i} style={[styles.progressSegment, { backgroundColor: i <= step ? '#007AFF' : '#E5E9F0' }]} />
                ))}
                <Text style={styles.progressText}>{`${step}/4`}</Text>
              </View>

              {renderRegisterStep()}

              <View style={styles.carouselNavigationRow}>
                <TouchableOpacity
                  onPress={() => {
                    if (step > 1) setStep(step - 1);
                    else setMode('login');
                  }}
                  style={styles.navButtonSecondary}
                >
                  <Text style={styles.navButtonSecondaryText}>PRÉCÉDENT</Text>
                </TouchableOpacity>

                {step < 4 ? (
                  <TouchableOpacity onPress={() => setStep(step + 1)} style={styles.navButtonPrimary}>
                    <Text style={styles.navButtonPrimaryText}>SUIVANT</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={handleRegisterFlow} style={[styles.navButtonPrimary, { backgroundColor: '#28A745', borderColor: '#28A745' }]}>
                    <Text style={styles.navButtonPrimaryText}>CONFIRM</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.footerContainer}>
                <Text style={styles.footerText}>
                  Déjà inscrit ? <Text style={styles.footerLink} onPress={() => setMode('login')}>Se connecter</Text>
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#007AFF',
  },
  blueHeader: {
    backgroundColor: '#007AFF',
    paddingBottom: 40,
  },
  headerTopBar: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    flexDirection: 'row',
  },
  backButton: {
    padding: 5,
  },
  brandingContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  logoContainer: {
    marginBottom: 8,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  formCardContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -20,
    overflow: 'hidden',
  },
  cardScrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 40,
  },
  form: {
    width: '100%',
  },

  /* --- CHMPS DE SAISIE (STYLE GRIS ÉPURÉ) --- */
  loginForm: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
    width: '100%',
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  grayInput: {
    backgroundColor: '#F5F7FA',
    height: 56,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333333',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 14,
  },
  countryCodeBadge: {
    paddingHorizontal: 16,
    height: 56,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#EAEAEA',
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  
  /* --- BOUTONS ET LIENS --- */
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotLinkText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  primaryButton: {
    height: 56,
    backgroundColor: '#007AFF',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#EAEAEA',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#999999',
    fontSize: 14,
  },
  socialButton: {
    flexDirection: 'row',
    height: 56,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  socialIcon: {
    marginRight: 10,
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333333',
  },
  footerContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#666666',
  },
  footerLink: {
    color: '#007AFF',
    fontWeight: '600',
  },

  /* --- STYLE SPÉCIFIQUE CARROUSEL D'INSCRIPTION --- */
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 6,
  },
  progressSegment: {
    flex: 1,
    height: 6,
    borderRadius: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '700',
    marginLeft: 8,
  },
  stepContainer: {
    alignItems: 'center',
    width: '100%',
  },
  evexHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  evexHeaderText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    letterSpacing: 0.5,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 15,
    color: '#7A7A7A',
    marginBottom: 24,
    textAlign: 'center',
  },
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    minHeight: 120,
  },
  illustrationLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  phoneConfirmationBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#A0A0A0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  phoneConfirmationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  phoneDisplay: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  carouselNavigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
  },
  navButtonSecondary: {
    flex: 1,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#E5E9F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonSecondaryText: {
    color: '#4A5568',
    fontWeight: '700',
    fontSize: 15,
  },
  navButtonPrimary: {
    flex: 1,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});