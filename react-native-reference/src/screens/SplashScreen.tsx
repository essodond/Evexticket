import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Video } from 'expo-av';
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
  const videoScale = useSharedValue(0.8);
  const videoOpacity = useSharedValue(0);
  const logoRotate = useSharedValue(-8);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);

  useEffect(() => {
    // Vidéo : apparition douce + légère entrée
    videoOpacity.value = withTiming(1, { duration: 600 });
    videoScale.value = withSpring(1, {
      damping: 12,
      stiffness: 90,
    });
    logoRotate.value = withSpring(0, {
      damping: 12,
      stiffness: 90,
    });

    // Texte : apparition avec slide up
    textOpacity.value = withDelay(800, withTiming(1, { duration: 600 }));
    textTranslateY.value = withDelay(800, withSpring(0, { damping: 14, stiffness: 80 }));

    // Ajout d'une petite pulsation après l'entrée
    setTimeout(() => {
      videoScale.value = withSequence(
        withTiming(1.06, { duration: 300 }),
        withTiming(1, { duration: 300 })
      );
    }, 1100);
  }, []);

  const videoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: videoScale.value },
      { rotate: `${logoRotate.value}deg` },
    ],
    opacity: videoOpacity.value,
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.videoContainer, videoAnimatedStyle]}>
        <Video
          source={require('../../assets/splash-animation.mp4')}
          style={styles.video}
          resizeMode={Video.RESIZE_MODE_COVER}
          shouldPlay
          isLooping={false}
          useNativeControls={false}
          isMuted={false}
          volume={1.0}
        />
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
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.backgroundSecondary,
    overflow: 'hidden',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.backgroundSecondary,
  },
  textContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
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
