import { Platform } from 'react-native';
import { COLORS } from './colors';

export const RADII = {
  sm: 12,
  md: 20,
  lg: 26,
  xl: 28,
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
  primary: [COLORS.primary, COLORS.action] as const,
  hero: [COLORS.primary, COLORS.primary] as const,
  canvas: [COLORS.canvas, COLORS.canvas, COLORS.canvas] as const,
  glass: ['#FFFFFF', '#FAFCFF'] as const,
  success: ['#0F9F6E', '#38C793'] as const,
};

