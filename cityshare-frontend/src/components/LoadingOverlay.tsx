import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';

export default function LoadingOverlay({ visible }: { visible: boolean }) {
  const { t } = useTranslation();
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.container}>
        <View style={styles.box}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.text}>{t('common.loading')}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  box: { backgroundColor: colors.white, padding: 20, borderRadius: 16, alignItems: 'center', gap: 12 },
  text: { color: colors.textPrimary, fontWeight: '600' }
});
