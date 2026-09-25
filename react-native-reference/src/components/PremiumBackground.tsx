import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GRADIENTS } from '../constants/theme';

export default function PremiumBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={GRADIENTS.canvas} style={StyleSheet.absoluteFill} />
    </View>
  );
}

const styles = StyleSheet.create({
});
