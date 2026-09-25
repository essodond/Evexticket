import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native-gesture-handler';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { COLORS } from '../constants/colors';

interface Props {
  storageKey: string;
  children: React.ReactNode;
}

export default function SwipeToHideCard({ storageKey, children }: Props) {
  const [hidden, setHidden] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setHidden(null);
    AsyncStorage.getItem(storageKey)
      .then((value) => { if (active) setHidden(value === 'hidden'); })
      .catch(() => { if (active) setHidden(false); });
    return () => { active = false; };
  }, [storageKey]);

  const hideCard = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await AsyncStorage.setItem(storageKey, 'hidden');
      setHidden(true);
    } catch {
      Alert.alert('Impossible de masquer la carte', 'Votre choix n’a pas pu être enregistré. Veuillez réessayer.');
    } finally {
      setSaving(false);
    }
  };

  if (hidden !== false) return null;

  return (
    <ReanimatedSwipeable
      containerStyle={styles.container}
      friction={2}
      rightThreshold={36}
      dragOffsetFromRightEdge={18}
      overshootLeft={false}
      overshootRight={false}
      renderRightActions={() => (
        <Pressable
          style={styles.hideAction}
          onPress={hideCard}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Masquer la carte de localisation"
          accessibilityState={{ disabled: saving, busy: saving }}
        >
          <Ionicons name="eye-off-outline" size={24} color={COLORS.white} />
          <Text style={styles.hideLabel}>Masquer</Text>
        </Pressable>
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 27, borderRadius: 25, overflow: 'hidden' },
  hideAction: {
    width: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.error,
  },
  hideLabel: { color: COLORS.white, fontSize: 12, fontWeight: '600' },
});
