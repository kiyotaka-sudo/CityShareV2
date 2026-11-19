import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';

const extra = (Constants.expoConfig?.extra ?? {}) as { apiUrl?: string; wsUrl?: string };

/**
 * En développement, le backend tourne sur le même ordinateur que le serveur Expo : on réutilise l'adresse IP
 * utilisée par Expo Go (ex. 10.171.122.206:8081 → http://10.171.122.206:8080/api). Plus besoin de modifier .env
 * à chaque changement de réseau. EXPO_PUBLIC_API_URL reste prioritaire (production, serveur distant).
 */
function urlDev(): string | undefined {
  const hote = Constants.expoConfig?.hostUri?.split(':')[0];
  return hote ? `http://${hote}:8080/api` : undefined;
}

export const API_URL = extra.apiUrl || urlDev() || 'http://localhost:8080/api';
export const WS_URL = extra.wsUrl || API_URL.replace(/\/api$/, '/ws');
/** URL racine du serveur (photos publiées sous /uploads/public). */
export const SERVEUR_URL = API_URL.replace(/\/api$/, '');

const CLE_TOKEN = 'mboaride.token';
let token: string | null = null;
let surDeconnexion: (() => void) | null = null;

export const session = {
  async charger() {
    token = await AsyncStorage.getItem(CLE_TOKEN);
    return token;
  },
  async definir(t: string | null) {
    token = t;
    if (t) await AsyncStorage.setItem(CLE_TOKEN, t);
    else await AsyncStorage.removeItem(CLE_TOKEN);
  },
  jeton: () => token,
  surExpiration(fn: () => void) {
    surDeconnexion = fn;
  }
};

export const api = axios.create({ baseURL: API_URL, timeout: 20000 });

api.interceptors.request.use((config) => {
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['Accept-Language'] = i18n.language?.startsWith('en') ? 'en' : 'fr';
  return config;
});

type ConfigRelance = InternalAxiosRequestConfig & { _essai?: number };

/**
 * Réseau faible (BNF-02) : les lectures et mises à jour idempotentes sont relancées automatiquement
 * (3 essais, attente progressive) en cas de coupure ou d'erreur serveur.
 */
api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as ConfigRelance | undefined;
  if (error.response?.status === 401 && token) {
    await session.definir(null);
    surDeconnexion?.();
    return Promise.reject(error);
  }
  const idempotent = config && ['get', 'put', 'delete'].includes((config.method ?? '').toLowerCase());
  const relancable = !error.response || error.response.status >= 500;
  if (config && idempotent && relancable && (config._essai ?? 0) < 3) {
    config._essai = (config._essai ?? 0) + 1;
    await new Promise((r) => setTimeout(r, 1000 * 2 ** (config._essai! - 1)));
    return api(config);
  }
  return Promise.reject(error);
});

/** Message d'erreur lisible (déjà traduit par l'API dans la langue de l'utilisateur). */
export function messageErreur(e: unknown): string {
  const err = e as AxiosError<{ message?: string; errors?: string[] }>;
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.message === 'Network Error' || err?.code === 'ECONNABORTED') return i18n.t('erreurs.reseau');
  return i18n.t('erreurs.inconnue');
}

export function urlPhoto(chemin?: string | null) {
  if (!chemin) return undefined;
  return chemin.startsWith('http') ? chemin : SERVEUR_URL + chemin;
}
