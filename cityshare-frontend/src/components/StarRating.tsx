import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface Props {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
}

export default function StarRating({ value, onChange, size = 22 }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable key={star} onPress={() => onChange?.(star)} disabled={!onChange} hitSlop={8}>
          <Ionicons name={star <= value ? 'star' : 'star-outline'} size={size} color={colors.star} />
        </Pressable>
      ))}
      {!onChange && <Text style={styles.value}>{value.toFixed(1)}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  value: { marginLeft: 4, color: colors.textSecondary, fontWeight: '700' }
});
