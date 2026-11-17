import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';

export default function QRCodeDisplay({ value }: { value: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <QRCode value={value} size={150} color={colors.primary} backgroundColor={colors.white} />
      <Text style={styles.label}>{t('trip_detail.qr_instruction')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', backgroundColor: colors.white, padding: 18, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  label: { marginTop: 12, color: colors.textSecondary, fontWeight: '600' }
});
