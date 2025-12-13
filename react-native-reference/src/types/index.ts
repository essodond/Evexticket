export interface Trip {
  id: string;
  company: string;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  price: number;
  seatsLeft: number;
  date: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export type PaymentMethod = 'flooz' | 'tmoney' | 'card';

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  PublicHome: undefined;
  Auth: undefined;
  MainTabs: undefined;
  TripDetails: { trip: Trip };
  Payment: { trip: Trip };
  Ticket: { trip: Trip };
};

export type MainTabParamList = {
  Home: undefined;
  MyTickets: undefined;
  Profile: undefined;
};
