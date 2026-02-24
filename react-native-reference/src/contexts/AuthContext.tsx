import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from '../services/api';
import { User } from '../types';
import * as Notifications from 'expo-notifications';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (userData: api.RegisterData) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
};

async function registerForPushNotificationsAsync() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.warn('Permissions de notification non accordées');
    return;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Au lancement : vérifier si un token existe et s'il est toujours valide
  useEffect(() => {
    registerForPushNotificationsAsync();

    const restoreSession = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const storedUser = await AsyncStorage.getItem('user');

        if (token && storedUser) {
          // Le token existe, on essaie de valider auprès du serveur
          try {
            const freshUser = await api.getCurrentUser();
            // Token valide → on met à jour avec les données fraîches
            setUser(freshUser);
            await AsyncStorage.setItem('user', JSON.stringify(freshUser));
            console.log('✅ Session restaurée pour:', freshUser.first_name);
          } catch (err) {
            // Token invalide/expiré → on essaie quand même avec les données locales
            // (utile si le serveur est temporairement injoignable)
            console.warn('⚠️ Impossible de valider le token, utilisation du cache local');
            setUser(JSON.parse(storedUser));
          }
        } else {
          // Pas de token → pas connecté
          console.log('👤 Aucune session trouvée');
          setUser(null);
        }
      } catch (error) {
        console.error('Erreur lors de la restauration de session:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await api.login({
        username: email,
        password: password,
      });
      
      if (!response.user || !response.token) {
        throw new Error('Réponse de connexion invalide');
      }

      setUser(response.user);
      await AsyncStorage.setItem('user', JSON.stringify(response.user));
      await AsyncStorage.setItem('token', response.token);

      Notifications.scheduleNotificationAsync({
        content: {
          title: "Connexion réussie ! 👋",
          body: `Bienvenue ${response.user.first_name} ${response.user.last_name} sur Evexticket !`,
          sound: 'default',
        },
        trigger: null,
      });

      return response.user;
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('Erreur lors de la connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: api.RegisterData) => {
    try {
      setIsLoading(true);
      const response = await api.register(userData);
      console.log('Register API Response:', JSON.stringify(response, null, 2));

      if (!response.token) {
        throw new Error('Réponse d\'inscription invalide');
      }

      // Le user peut venir de response.user (normalisé dans api.ts)
      const newUser = response.user;

      setUser(newUser);
      await AsyncStorage.setItem('user', JSON.stringify(newUser));
      await AsyncStorage.setItem('token', response.token);

      Notifications.scheduleNotificationAsync({
        content: {
          title: "Inscription réussie ! 🎉",
          body: `Bienvenue ${newUser?.first_name || ''} sur Evexticket !`,
          sound: 'default',
        },
        trigger: null,
      });

      return newUser;
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('Erreur lors de l\'inscription');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await api.logout();
      setUser(null);
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('token');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      // Même en cas d'erreur, on déconnecte localement
      setUser(null);
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('token');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;