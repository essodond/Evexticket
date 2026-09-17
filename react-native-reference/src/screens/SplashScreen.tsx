import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/fonts';

export default function SplashScreen() {
  const videoScale = useSharedValue(0.94);
  const videoOpacity = useSharedValue(0);
  const logoRotate = useSharedValue(-3);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);

  const player = useVideoPlayer(require('../../assets/splash-animation.mp4'), (p) => {
    p.loop = false;
    p.muted = false;
    p.volume = 1.0;
    p.play();
  });

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
        <VideoView
          player={player}
          style={styles.video}
          contentFit="contain"
          nativeControls={false}
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
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.white,
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
