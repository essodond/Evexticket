import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';
import { GRADIENTS, RADII, SHADOWS } from '../constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  contentStyle?: ViewStyle | ViewStyle[];
  intensity?: number;
  dark?: boolean;
}

export default function GlassCard({
  children,
  style,
  contentStyle,
  intensity = 72,
  dark = false,
}: GlassCardProps) {
  return (
    <View style={[styles.shell, dark && styles.shellDark, style]}>
      <BlurView intensity={intensity} tint={dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={dark ? ['rgba(8,26,58,0.76)', 'rgba(20,57,111,0.54)'] : GRADIENTS.glass}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.glass,
    ...SHADOWS.soft,
  },
  shellDark: {
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: COLORS.glassDark,
  },
  content: {
    padding: 20,
  },
});

