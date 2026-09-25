import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { MainTabParamList, RootStackParamList } from '../types';

// Screens
import AuthScreen from '../screens/AuthScreen';
import CompaniesScreen from '../screens/CompaniesScreen';
import CompanyDetailsScreen from '../screens/CompanyDetailsScreen';
import HomeConnectedScreen from '../screens/HomeConnectedScreen';
import MyTicketsScreen from '../screens/MyTicketsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import PaymentScreen from '../screens/PaymentScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PublicHomeScreen from '../screens/PublicHomeScreen';
import SplashScreen from '../screens/SplashScreen';
import StartTrackingScreen from '../screens/StartTrackingScreen';
import StationMapScreen from '../screens/StationMapScreen';
import TicketAssistantScreen from '../screens/TicketAssistantScreen';
import TicketScreen from '../screens/TicketScreen';
import TrackBusScreen from '../screens/TrackBusScreen';
import TripDetailsScreen from '../screens/TripDetailsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#0075E8',
        tabBarHideOnKeyboard: true,
        tabBarLabelPosition: 'below-icon',
        tabBarInactiveTintColor: '#999999',
        tabBarStyle: {
          position: 'absolute', left: 20, right: 20, bottom: Math.max(insets.bottom, 20),
          height: 74, paddingTop: 13, paddingBottom: 12, borderRadius: 32,
          backgroundColor: '#F5FAFF', borderTopWidth: 0, borderWidth: 1, borderColor: '#FFFFFF',
          shadowColor: '#203654', shadowOffset: { width: 0, height: 14 },
          shadowOpacity: 0.16, shadowRadius: 22, elevation: 12,
        },
        tabBarBackground: () => (
          <LinearGradient colors={['#EDF6FF', '#FFFFFF']} style={{ flex: 1, borderRadius: 32 }} />
        ),
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 0,
        },
        tabBarIcon: ({ color }) => {
          let iconName: any;
          if (route.name === 'Home') {
            iconName = 'home-outline';
          } else if (route.name === 'Companies') {
            iconName = 'business-outline';
          } else if (route.name === 'MyTickets') {
            iconName = 'ticket-outline';
          } else if (route.name === 'Profile') {
            iconName = 'person-outline';
          } else if (route.name === 'Notifications') {
            iconName = 'notifications-outline';
          }
          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      {/* Tes écrans restent les mêmes */}
      <Tab.Screen name="Home" component={HomeConnectedScreen as React.ComponentType<any>} options={{ tabBarLabel: 'Accueil' }} />
      <Tab.Screen name="Companies" component={CompaniesScreen as React.ComponentType<any>} options={{ tabBarLabel: 'Compagnies' }} />
      <Tab.Screen name="MyTickets" component={MyTicketsScreen as React.ComponentType<any>} options={{ tabBarLabel: 'Tickets' }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen as React.ComponentType<any>} options={{ tabBarLabel: 'Alertes' }} />
      <Tab.Screen name="Profile" component={ProfileScreen as React.ComponentType<any>} options={{ tabBarLabel: 'Profil' }} />
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

        // Splash screen minimum 3s pour laisser l'animation se jouer
        setTimeout(() => {
          setIsLoading(false);
        }, 3000);
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
        name="TrackBus"
        component={TrackBusScreen}
        options={{
          animation: 'slide_from_bottom',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="StartTracking"
        component={StartTrackingScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="StationMap"
        component={StationMapScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="CompanyDetails"
        component={CompanyDetailsScreen}
        options={{ animation: 'slide_from_right' }}
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
      <Stack.Screen
        name="TicketAssistant"
        component={TicketAssistantScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
}
