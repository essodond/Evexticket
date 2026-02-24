import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/fonts';

export default function SplashScreen() {
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const logoRotate = useSharedValue(-10);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);

  useEffect(() => {
    // Logo : fade in + scale spring + légère rotation
    logoOpacity.value = withTiming(1, { duration: 600 });
    logoScale.value = withSpring(1, {
      damping: 12,
      stiffness: 90,
    });
    logoRotate.value = withSpring(0, {
      damping: 12,
      stiffness: 90,
    });

    // Pulsation douce du logo après l'entrée
    setTimeout(() => {
      logoScale.value = withSequence(
        withTiming(1.08, { duration: 400 }),
        withTiming(1, { duration: 400 })
      );
    }, 900);

    // Texte : apparition avec slide up
    textOpacity.value = withDelay(500, withTiming(1, { duration: 600 }));
    textTranslateY.value = withDelay(500, withSpring(0, { damping: 14, stiffness: 80 }));
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value },
      { rotate: `${logoRotate.value}deg` },
    ],
    opacity: logoOpacity.value,
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
        <View style={styles.logoShadow}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
        <Text style={styles.appName}>EVEX Ticket</Text>
        <Text style={styles.subtitle}>Réservation simplifiée</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 32,
  },
  logoShadow: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  logoImage: {
    width: 150,
    height: 150,
  },
  textContainer: {
    alignItems: 'center',
  },
  appName: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
});
