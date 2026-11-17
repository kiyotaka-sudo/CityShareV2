import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import api from '../../api/axiosConfig';
import { colors } from '../../theme/colors';
import { API_BASE_URL, LANG_KEY } from '../../utils/constants';
import { RootStackParamList } from '../../types';

type Props = StackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'fr';
  const [testing, setTesting] = useState(false);

  const changeLang = async (lang: 'fr' | 'en') => {
    await i18n.changeLanguage(lang);
    await AsyncStorage.setItem(LANG_KEY, lang);
  };

  const testApi = async () => {
    setTesting(true);
    try {
      await api.get('/trajets', { params: { depart: 'Yaoundé', arrivee: 'Ntui' }, timeout: 8000 });
      Alert.alert('CityShare', `${t('settings.api_ok')}\n${API_BASE_URL}`);
    } catch {
      Alert.alert('CityShare', `${t('settings.api_fail')}\n${API_BASE_URL}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('profile.settings')}</Text>
      <Text style={styles.label}>{t('settings.api_url')}</Text>
      <Text style={styles.apiUrl}>{API_BASE_URL}</Text>
      <Pressable style={styles.testBtn} onPress={testApi} disabled={testing}>
        <Text style={styles.testBtnText}>{testing ? t('common.loading') : t('settings.test_api')}</Text>
      </Pressable>
      <Text style={styles.hint}>
        Après changement du .env : fermez Expo Go, relancez `npx expo start -c` sur le PC, rescannez le QR.
      </Text>
      <Text style={styles.label}>{t('settings.language_title')}</Text>
      <View style={styles.row}>
        <Pressable onPress={() => changeLang('fr')} style={[styles.card, currentLang === 'fr' && styles.active]}>
          <Text style={styles.flag}>🇫🇷</Text>
          <Text style={[styles.text, currentLang === 'fr' && styles.activeText]}>{t('settings.french')}</Text>
        </Pressable>
        <Pressable onPress={() => changeLang('en')} style={[styles.card, currentLang === 'en' && styles.active]}>
          <Text style={styles.flag}>🇬🇧</Text>
          <Text style={[styles.text, currentLang === 'en' && styles.activeText]}>{t('settings.english')}</Text>
        </Pressable>
      </View>
      <Pressable style={styles.back} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>{t('common.back')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, paddingTop: 60, paddingHorizontal: 16 },
  title: { color: colors.textPrimary, fontSize: 26, fontWeight: '900', marginBottom: 20 },
  label: { color: colors.textPrimary, fontWeight: '900', marginBottom: 8, marginTop: 12 },
  apiUrl: { color: colors.primary, fontWeight: '700', fontSize: 13, marginBottom: 10 },
  testBtn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  testBtnText: { color: colors.white, fontWeight: '900' },
  hint: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 10, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 12 },
  card: { flex: 1, minHeight: 104, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  active: { borderColor: colors.primary, borderWidth: 2, backgroundColor: '#E8F5E9' },
  flag: { fontSize: 28, marginBottom: 8 },
  text: { color: colors.textSecondary, fontWeight: '800' },
  activeText: { color: colors.primary },
  back: { marginTop: 28, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  backText: { color: colors.white, fontWeight: '900' }
});
