import React, { useEffect, useRef } from 'react';
import { Linking, Pressable, StyleSheet, Text, View, Animated } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { RootStackParamList } from '../../types';
import { useLocation } from '../../hooks/useLocation';
import { useAuth } from '../../hooks/useAuth';
import { sosApi } from '../../api/sosApi';

type Props = StackScreenProps<RootStackParamList, 'SOS'>;

export default function SOSScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const pulse = useRef(new Animated.Value(1)).current;
  const { location, address } = useLocation();

  const contactName = user?.contactUrgenceNom?.trim();
  const contactTel = user?.contactUrgenceTel?.trim();
  const hasContact = Boolean(contactName && contactTel);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.18, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true })
      ])
    ).start();
  }, [pulse]);

  useEffect(() => {
    sosApi
      .create({
        latitude: location?.coords.latitude,
        longitude: location?.coords.longitude,
        address
      })
      .catch(() => undefined);
  }, [address, location]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.circle, { transform: [{ scale: pulse }] }]}>
        <Text style={styles.sos}>SOS</Text>
      </Animated.View>
      <Text style={styles.title}>{t('sos.alert_sent')}</Text>
      <Text style={styles.info}>
        {t('sos.emergency_contact')}:{' '}
        {hasContact ? `${contactName} · ${contactTel}` : t('sos.no_emergency_contact')}
      </Text>
      <Text style={styles.info}>
        {t('sos.last_position')}: {address || '—'}
      </Text>
      <View style={styles.buttons}>
        <Pressable style={styles.cancel} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>{t('sos.cancel_alert')}</Text>
        </Pressable>
        {hasContact && (
          <Pressable style={styles.callContact} onPress={() => Linking.openURL(`tel:${contactTel}`)}>
            <Text style={styles.callText}>{t('sos.call_contact')}</Text>
          </Pressable>
        )}
        <Pressable style={styles.call} onPress={() => Linking.openURL('tel:117')}>
          <Text style={styles.callText}>{t('sos.call_117')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  circle: { width: 164, height: 164, borderRadius: 82, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', marginBottom: 42 },
  sos: { color: colors.white, fontSize: 44, fontWeight: '900' },
  title: { color: colors.white, fontSize: 28, fontWeight: '900', marginBottom: 16 },
  info: { color: colors.white, textAlign: 'center', opacity: 0.9, marginBottom: 10, fontWeight: '700', paddingHorizontal: 12 },
  buttons: { position: 'absolute', left: 16, right: 16, bottom: 42, gap: 12 },
  cancel: { borderWidth: 1, borderColor: colors.white, borderRadius: 12, padding: 15, alignItems: 'center' },
  cancelText: { color: colors.white, fontWeight: '900' },
  callContact: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  call: { backgroundColor: colors.danger, borderRadius: 12, padding: 16, alignItems: 'center' },
  callText: { color: colors.white, fontWeight: '900' }
});
