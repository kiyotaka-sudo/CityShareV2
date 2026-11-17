import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './fr.json';
import en from './en.json';
import { LANG_KEY } from '../utils/constants';

const detectLanguage = async () => {
  const stored = await AsyncStorage.getItem(LANG_KEY);
  if (stored === 'fr' || stored === 'en') {
    return stored;
  }
  const deviceLanguage = Localization.getLocales()[0]?.languageCode;
  const language = deviceLanguage === 'en' ? 'en' : 'fr';
  await AsyncStorage.setItem(LANG_KEY, language);
  return language;
};

export const i18nReady = detectLanguage().then(async (lng): Promise<void> => {
  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      compatibilityJSON: 'v3',
      resources: {
        fr: { translation: fr },
        en: { translation: en }
      },
      lng,
      fallbackLng: 'fr',
      interpolation: {
        escapeValue: false
      }
    });
  }
});

export default i18n;
