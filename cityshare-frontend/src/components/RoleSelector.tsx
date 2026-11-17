import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import { UserRole } from '../types';

interface Props {
  value: UserRole;
  onChange: (role: UserRole) => void;
}

const roles: { role: UserRole; icon: string; labelKey: string }[] = [
  { role: 'PASSAGER', icon: '🧍', labelKey: 'auth.role_passager' },
  { role: 'CONDUCTEUR', icon: '🚗', labelKey: 'auth.role_conducteur' },
  { role: 'EXPEDITEUR', icon: '📦', labelKey: 'auth.role_expediteur' }
];

export default function RoleSelector({ value, onChange }: Props) {
  const { t } = useTranslation();
  return (
    <View>
      <Text style={styles.label}>{t('auth.role_select')}</Text>
      <View style={styles.row}>
        {roles.map((item) => {
          const selected = value === item.role;
          return (
            <Pressable key={item.role} onPress={() => onChange(item.role)} style={[styles.card, selected && styles.cardSelected]}>
              <Text style={styles.icon}>{item.icon}</Text>
              <Text style={[styles.text, selected && styles.textSelected]}>{t(item.labelKey)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textPrimary, fontWeight: '700', marginBottom: 10 },
  row: { flexDirection: 'row', gap: 8 },
  card: { flex: 1, minHeight: 82, borderWidth: 1, borderColor: colors.border, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, padding: 8 },
  cardSelected: { borderColor: colors.primary, backgroundColor: '#E8F5E9' },
  icon: { fontSize: 24, marginBottom: 6, color: colors.primary, fontWeight: '900' },
  text: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  textSelected: { color: colors.primary }
});
