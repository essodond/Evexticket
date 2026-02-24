import React, { useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList, MainTabParamList } from '../types';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';

// Screens
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import PublicHomeScreen from '../screens/PublicHomeScreen';
import AuthScreen from '../screens/AuthScreen';
import HomeConnectedScreen from '../screens/HomeConnectedScreen';
import TripDetailsScreen from '../screens/TripDetailsScreen';
import PaymentScreen from '../screens/PaymentScreen';
import TicketScreen from '../screens/TicketScreen';
import MyTicketsScreen from '../screens/MyTicketsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeConnectedScreen}
        options={{
          tabBarLabel: 'Accueil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MyTickets"
        component={MyTicketsScreen}
        options={{
          tabBarLabel: 'Mes Tickets',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ticket" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const hasLaunched = await AsyncStorage.getItem('hasLaunched');
        setIsFirstLaunch(hasLaunched === null);
        
        // Splash screen minimum 2s
        setTimeout(() => {
          setIsLoading(false);
        }, 2000);
      } catch (error) {
        console.error('Error checking first launch:', error);
        setIsLoading(false);
      }
    };

    checkFirstLaunch();
  }, []);

  // Attendre que le splash et l'auth soient prêts
  if (isLoading || authLoading) {
    return <SplashScreen />;
  }

  // Déterminer l'écran initial en fonction de l'état de connexion
  const getInitialRoute = () => {
    if (user) {
      // Utilisateur connecté → directement sur l'app
      return 'MainTabs';
    }
    if (isFirstLaunch) {
      return 'Onboarding';
    }
    return 'PublicHome';
  };

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: false,
      }}
      initialRouteName={getInitialRoute()}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="PublicHome" component={PublicHomeScreen} />
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen 
        name="TripDetails" 
        component={TripDetailsScreen}
        options={{
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen 
        name="Payment" 
        component={PaymentScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen 
        name="Ticket" 
        component={TicketScreen}
        options={{
          animation: 'fade',
        }}
      />
    </Stack.Navigator>
  );
}
