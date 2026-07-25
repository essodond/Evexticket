import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  showValue?: boolean;
}

export default function StarRating({
  value,
  onChange,
  size = 18,
  showValue = false,
}: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.round(value);
        const icon = (
          <Ionicons
            name={filled ? 'star' : 'star-outline'}
            size={size}
            color="#F5A524"
          />
        );
        return onChange ? (
          <TouchableOpacity
            key={star}
            onPress={() => onChange(star)}
            hitSlop={8}
            accessibilityLabel={`${star} étoile${star > 1 ? 's' : ''}`}
          >
            {icon}
          </TouchableOpacity>
        ) : (
          <View key={star}>{icon}</View>
        );
      })}
      {showValue && (
        <Text style={styles.value}>{Number(value || 0).toFixed(1)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  value: {
    marginLeft: 4,
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
});
