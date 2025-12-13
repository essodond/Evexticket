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
        return 'Connexion';
      case 'register':
        return 'Créer un compte';
      case 'forgot':
        return 'Mot de passe oublié';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'login':
        return 'Connectez-vous pour réserver vos billets';
      case 'register':
        return 'Rejoignez EVEX et voyagez en toute simplicité';
      case 'forgot':
        return 'Entrez votre email pour réinitialiser votre mot de passe';
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{getTitle()}</Text>
          <Text style={styles.description}>{getDescription()}</Text>
        </View>

        <View style={styles.form}>
          {mode === 'register' && (
            <Input
              label="Nom complet"
              placeholder="Jean Dupont"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              leftIcon={<Ionicons name="person-outline" size={20} color={COLORS.textSecondary} />}
            />
          )}

          {mode === 'register' && (
            <Input
              label="Numéro de téléphone"
              placeholder="+228 XX XX XX XX"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              keyboardType="phone-pad"
              leftIcon={<Ionicons name="call-outline" size={20} color={COLORS.textSecondary} />}
            />
          )}

          <Input
            label={mode === 'login' ? 'Email ou numéro de téléphone' : 'Email'}
            placeholder={mode === 'login' ? 'email@exemple.com ou +228 XX XX XX XX' : 'exemple@email.com'}
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            keyboardType={mode === 'login' ? 'default' : 'email-address'}
            autoCapitalize="none"
            leftIcon={<Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} />}
          />

          {mode !== 'forgot' && (
            <Input
              label="Mot de passe"
              placeholder="••••••••"
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              secureTextEntry
              leftIcon={<Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} />}
            />
          )}

          {mode === 'login' && (
            <TouchableOpacity
              onPress={() => setMode('forgot')}
              style={styles.forgotLink}
            >
              <Text style={styles.forgotLinkText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>
          )}

          <Button
            title={
              mode === 'login'
                ? 'Se connecter'
                : mode === 'register'
                ? 'Créer mon compte'
                : 'Réinitialiser'
            }
            onPress={handleSubmit}
            style={styles.submitButton}
            loading={isLoading}
          />
        </View>

        <View style={styles.switchModeContainer}>
          {mode === 'login' ? (
            <Text style={styles.switchModeText}>
              Pas encore de compte ?{' '}
              <Text
                style={styles.switchModeLink}
                onPress={() => setMode('register')}
              >
                S'inscrire
              </Text>
            </Text>
          ) : (
            <Text style={styles.switchModeText}>
              Déjà inscrit ?{' '}
              <Text
                style={styles.switchModeLink}
                onPress={() => setMode('login')}
              >
                Se connecter
              </Text>
            </Text>
          )}

          {/* Social login buttons */}
          <View style={styles.socialContainer}>
            <Text style={styles.socialText}>Ou continuer avec</Text>
            <View style={styles.socialButtons}>
              <TouchableOpacity style={styles.socialButton} onPress={() => console.log('Google login')}>
                
                <Ionicons name="logo-google" size={24} color="#DB4437" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton} onPress={() => console.log('Apple login')}>
                <Ionicons name="logo-apple" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.gray}80`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  titleContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: FONT_SIZES['3xl'],
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: 8,
  },
  description: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  form: {
    marginBottom: 24,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotLinkText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.primary,
  },
  submitButton: {
    height: 56,
    borderRadius: 16,
  },
  switchModeContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  switchModeText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  switchModeLink: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  socialContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  socialText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
