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

import { BlurView } from 'expo-blur'; // Import important
import { Platform, StyleSheet } from 'react-native';

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarBackground: () => (
          <BlurView
            tint="light"
            intensity={80} // Réglage du flou (0 à 100)
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarStyle: {
          position: 'absolute',
          bottom: 25,
          left: 20,
          right: 20,
          height: 70,
          borderRadius: 35,
          // On rend le background transparent pour laisser voir le BlurView
          backgroundColor: 'transparent', 
          borderTopWidth: 0,
          overflow: 'hidden', // Important pour que le flou respecte l'arrondi
          
          // Ombre pour décoller la bulle du fond
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.1,
          shadowRadius: 15,
          elevation: 5,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginBottom: 8,
        },
        tabBarIcon: ({ focused, color }) => {
          let iconName: any;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'MyTickets') {
            iconName = focused ? 'ticket' : 'ticket-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      {/* Tes écrans restent les mêmes */}
      <Tab.Screen name="Home" component={HomeConnectedScreen} options={{ tabBarLabel: 'Accueil' }} />
      <Tab.Screen name="MyTickets" component={MyTicketsScreen} options={{ tabBarLabel: 'Tickets' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profil' }} />
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
