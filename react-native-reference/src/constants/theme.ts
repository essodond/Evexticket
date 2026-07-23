import { Platform } from 'react-native';

export const RADII = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 30,
  pill: 999,
};

export const SPACING = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const SHADOWS = {
  soft: Platform.select({
    ios: {
      shadowColor: '#123A78',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
    },
    android: { elevation: 4 },
    default: {
      shadowColor: '#123A78',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
    },
  }),
  floating: Platform.select({
    ios: {
      shadowColor: '#0A2A63',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.16,
      shadowRadius: 28,
    },
    android: { elevation: 10 },
    default: {
      shadowColor: '#0A2A63',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.16,
      shadowRadius: 28,
    },
  }),
};

export const GRADIENTS = {
  primary: ['#1247C7', '#246BFD', '#55B9FF'] as const,
  hero: ['#071A3A', '#103D83', '#246BFD'] as const,
  canvas: ['#F9FCFF', '#EDF5FF', '#F5F9FF'] as const,
  glass: ['rgba(255,255,255,0.76)', 'rgba(255,255,255,0.42)'] as const,
  success: ['#0F9F6E', '#38C793'] as const,
};

