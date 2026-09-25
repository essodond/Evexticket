import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import TravelHeaderArtwork from './TravelHeaderArtwork';

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export default function ScreenHeader({ title, subtitle, onBack, action, children }: Props) {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      {focused && <StatusBar style="light" />}
      <View style={[styles.artwork, { top: insets.top }]} pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <TravelHeaderArtwork />
      </View>
      <View style={styles.topRow}>
        {onBack && (
          <TouchableOpacity style={styles.back} onPress={onBack} accessibilityRole="button" accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={23} color={COLORS.white} />
          </TouchableOpacity>
        )}
        <Text style={styles.brand}>EVEX</Text>
        {action}
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, overflow: 'hidden' },
  artwork: { position: 'absolute', right: -30, width: 270, height: 170 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  brand: { flex: 1, fontSize: 23, fontWeight: '800', color: COLORS.white },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 25, fontWeight: '700', color: COLORS.white, marginTop: 14 },
  subtitle: { fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.85)', marginTop: 6 },
});
