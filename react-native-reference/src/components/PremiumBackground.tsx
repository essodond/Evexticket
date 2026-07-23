import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GRADIENTS } from '../constants/theme';

export default function PremiumBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={GRADIENTS.canvas} style={StyleSheet.absoluteFill} />
      <View style={[styles.orb, styles.orbTop]} />
      <View style={[styles.orb, styles.orbBottom]} />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbTop: {
    width: 260,
    height: 260,
    top: -110,
    right: -100,
    backgroundColor: 'rgba(85,185,255,0.18)',
  },
  orbBottom: {
    width: 300,
    height: 300,
    bottom: -170,
    left: -130,
    backgroundColor: 'rgba(36,107,253,0.10)',
  },
});
