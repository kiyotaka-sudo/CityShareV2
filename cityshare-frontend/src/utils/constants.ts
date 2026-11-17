import Constants from 'expo-constants';
import { colors, radius, spacing } from '../theme/colors';

const extra = Constants.expoConfig?.extra ?? {};

/**
 * URL API : EXPO_PUBLIC_API_URL dans .env (recharger Expo avec `npx expo start -c` après changement).
 * Ordre : variable Expo → app.config.js extra → localhost (émulateur uniquement).
 */
export const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ||
  (extra.apiUrl as string | undefined) ||
  'http://localhost:8080/api';

export const WS_URL =
  (process.env.EXPO_PUBLIC_WS_URL as string | undefined) ||
  (extra.wsUrl as string | undefined) ||
  API_BASE_URL.replace(/\/api\/?$/, '') + '/ws';

if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log('[CityShare] API:', API_BASE_URL, '| WS:', WS_URL);
}
export const TOKEN_KEY = 'cityshare_token';
export const USER_KEY = 'cityshare_user';
export const ROLE_KEY = 'cityshare_role';
export const FIRST_LAUNCH_KEY = 'onboarded';
export const LANG_KEY = 'cityshare_lang';

export const COLORS = colors;
export const theme = { colors, radius, spacing };

export const popularRoutes = ['Yaoundé → Ntui', 'Yaoundé → Obala', 'Douala → Bafia'];
