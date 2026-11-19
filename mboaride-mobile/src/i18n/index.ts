import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './fr.json';
import en from './en.json';

const CLE_LANGUE = 'mboaride.langue';

export const i18nPret = (async () => {
  const stockee = await AsyncStorage.getItem(CLE_LANGUE);
  const appareil = Localization.getLocales()[0]?.languageCode;
  const langue = stockee === 'fr' || stockee === 'en' ? stockee : appareil === 'en' ? 'en' : 'fr';
  await i18n.use(initReactI18next).init({
    // v3 : pas besoin d'Intl.PluralRules, absent de certains moteurs JavaScript mobiles (Hermes)
    compatibilityJSON: 'v3',
    resources: { fr: { translation: fr }, en: { translation: en } },
    lng: langue,
    fallbackLng: 'fr',
    interpolation: { escapeValue: false }
  });
})();

export async function changerLangue(langue: 'fr' | 'en') {
  await AsyncStorage.setItem(CLE_LANGUE, langue);
  await i18n.changeLanguage(langue);
}

export default i18n;
