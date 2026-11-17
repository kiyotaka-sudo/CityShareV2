import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';

export default function SOSButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable onPress={onPress} style={styles.button}>
      <Text style={styles.text}>{t('tracking.sos')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', elevation: 8 },
  text: { color: colors.white, fontWeight: '900', fontSize: 18 }
});
