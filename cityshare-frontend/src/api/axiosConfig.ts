import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';
import { API_BASE_URL, LANG_KEY } from '../utils/constants';
import { tokenStorage } from '../utils/tokenStorage';

let unauthorizedHandler: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: () => void) => {
  unauthorizedHandler = handler;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(async (config) => {
  const token = await tokenStorage.getToken();
  const language = (await AsyncStorage.getItem(LANG_KEY)) || i18n.language || 'fr';
  config.headers.Authorization = token ? `Bearer ${token}` : undefined;
  config.headers['Accept-Language'] = language.startsWith('en') ? 'en' : 'fr';
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await tokenStorage.clearSession();
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  }
);

export default api;
