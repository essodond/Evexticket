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
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/fonts';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAuth } from '../contexts/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;
type AuthMode = 'login' | 'register' | 'forgot';

export default function AuthScreen({ navigation }: Props) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const { login, register, isLoading } = useAuth();

  const handleSubmit = async () => {
    try {
      if (mode === 'login') {
        const identifier = (formData.email?.trim() || formData.phone?.trim());
        if (!identifier) {
          Alert.alert('Erreur', 'Veuillez entrer votre email ou numéro de téléphone');
          return;
        }
        if (!formData.password) {
          Alert.alert('Erreur', 'Veuillez entrer votre mot de passe');
          return;
        }
        await login(identifier, formData.password);
        navigation.replace('MainTabs');
        return;
      }

      if (mode === 'register') {
        const name = formData.name?.trim();
        const email = formData.email?.trim();
        const phone = formData.phone?.trim();
        const password = formData.password;

        if (!name) {
          Alert.alert('Erreur', 'Veuillez entrer votre nom complet');
          return;
        }
        if (!email && !phone) {
          Alert.alert('Erreur', 'Veuillez entrer votre email ou numéro de téléphone');
          return;
        }
        if (!password || password.length < 6) {
          Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
          return;
        }

        const [first_name, ...rest] = name.split(' ');
        const last_name = rest.join(' ');
        const username = email || phone || first_name;

        await register({
          email: email || '',
          username,
          password,
          password2: password,
          first_name,
          last_name,
          phone,
        });
        navigation.replace('MainTabs');
        return;
      }

      if (mode === 'forgot') {
        Alert.alert('Info', 'La réinitialisation du mot de passe sera ajoutée bientôt.');
        return;
      }
    } catch (error) {
      Alert.alert('Erreur de connexion', error instanceof Error ? error.message : 'Échec de la connexion');
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'login':
        return 'Sign In';
      case 'register':
        return 'Create an Account';
      case 'forgot':
        return 'Forgot Password';
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary || '#0066FF'} />
      
      {/* 1. Header Bleu (Top Hero Section) */}
      <View style={styles.blueHeader}>
        <View style={styles.headerTopBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.brandingContainer}>
          {/* Logo Minimaliste (style double cercle infini de l'image) */}
          <View style={styles.logoContainer}>
            <Ionicons name="infinite-outline" size={36} color="#FFF" />
          </View>
          <Text style={styles.mainTitle}>{getTitle()}</Text>
        </View>
      </View>

      {/* 2. Carte Blanche du Formulaire */}
      <View style={styles.formCardContainer}>
        <ScrollView
          style={styles.cardScrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.form}>
            {mode === 'register' && (
              <Input
                label="Full Name"
                placeholder="Cameron Clerk"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
            )}

            {mode === 'register' && (
              <Input
                label="Phone Number"
                placeholder="+228 XX XX XX XX"
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                keyboardType="phone-pad"
              />
            )}

            <Input
              label={mode === 'login' ? 'Email or Phone Number' : 'Email'}
              placeholder={mode === 'login' ? 'cameronclerk01@gmail.com' : 'exemple@email.com'}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType={mode === 'login' ? 'default' : 'email-address'}
              autoCapitalize="none"
            />

            {mode !== 'forgot' && (
              <Input
                label="Password"
                placeholder="••••••••"
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                secureTextEntry
              />
            )}

            {mode === 'login' && (
              <TouchableOpacity
                onPress={() => setMode('forgot')}
                style={styles.forgotLink}
              >
                <Text style={styles.forgotLinkText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            <Button
              title={
                mode === 'login'
                  ? 'Sign In'
                  : mode === 'register'
                  ? 'Create Account'
                  : 'Reset Password'
              }
              onPress={handleSubmit}
              style={styles.submitButton}
              loading={isLoading}
            />
            
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Boutons Sociaux Style Large & Épuré */}
            <TouchableOpacity style={styles.socialButtonLarge} onPress={() => console.log('Google login')}>
              <Ionicons name="logo-google" size={20} color="#EA4335" style={{ marginRight: 10 }} />
              <Text style={styles.socialButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialButtonLarge} onPress={() => console.log('Apple login')}>
              <Ionicons name="logo-apple" size={20} color="#000" style={{ marginRight: 10 }} />
              <Text style={styles.socialButtonText}>Continue with Apple</Text>
            </TouchableOpacity>

            {/* Switch Mode en bas de carte */}
            <View style={styles.switchModeContainer}>
              {mode === 'login' ? (
                <Text style={styles.switchModeText}>
                  Don't have an account?{' '}
                  <Text style={styles.switchModeLink} onPress={() => setMode('register')}>
                    Sign Up
                  </Text>
                </Text>
              ) : (
                <Text style={styles.switchModeText}>
                  Already have an account?{' '}
                  <Text style={styles.switchModeLink} onPress={() => setMode('login')}>
                    Log In
                  </Text>
                </Text>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F9', // Fond gris très clair comme sur la maquette
  },
  // Style du bloc supérieur bleu
  blueHeader: {
    backgroundColor: COLORS.primary || '#0066FF',
    paddingBottom: 40,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerTopBar: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 54 : 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  brandingContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  logoContainer: {
    marginBottom: 12,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  // Conteneur qui fait remonter la carte blanche
  formCardContainer: {
    flex: 1,
    marginTop: -24, // Crée l'effet de chevauchement sur le fond bleu
    backgroundColor: COLORS.white || '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  cardScrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  form: {
    width: '100%',
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: -8,
  },
  forgotLinkText: {
    fontSize: FONT_SIZES.base || 14,
    color: COLORS.primary || '#0066FF',
    fontWeight: '500',
  },
  submitButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.primary || '#0066FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  // Séparateur "Or"
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    verticalAlign: 'middle',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#EAEAEA',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#999999',
    fontSize: 13,
  },
  // Boutons sociaux en largeur complète
  socialButtonLarge: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333333',
  },
  switchModeContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  switchModeText: {
    fontSize: 14,
    color: '#666666',
  },
  switchModeLink: {
    color: COLORS.primary || '#0066FF',
    fontWeight: '600',
  },
});