import axios from 'axios';
import i18n from '../i18n';
import { API_BASE_URL } from './constants';

interface ApiErrorBody {
  messageFr?: string;
  messageEn?: string;
  message_fr?: string;
  message_en?: string;
  errors?: string[];
}

export function getApiErrorMessage(error: unknown): string {
  const lang = i18n.language?.startsWith('en') ? 'en' : 'fr';

  if (axios.isAxiosError(error)) {
    if (!error.response) {
      const hint = API_BASE_URL.includes('localhost')
        ? lang === 'en'
          ? `Cannot reach server at ${API_BASE_URL}. On a physical phone, set EXPO_PUBLIC_API_URL in .env to your PC IP (ipconfig), then run: npx expo start -c`
          : `Serveur inaccessible (${API_BASE_URL}). Sur téléphone, mettez l’IP du PC dans .env (ipconfig), puis : npx expo start -c`
        : lang === 'en'
          ? `Cannot reach server at ${API_BASE_URL}. Check backend is running, same Wi‑Fi/hotspot, and Windows firewall allows port 8080.`
          : `Serveur inaccessible (${API_BASE_URL}). Vérifiez que le backend tourne, le même réseau/hotspot, et le pare-feu Windows (port 8080).`;
      return hint;
    }

    const data = error.response.data as ApiErrorBody | undefined;
    const fr = data?.messageFr ?? data?.message_fr;
    const en = data?.messageEn ?? data?.message_en;
    if (fr || en) {
      return lang === 'en' ? en ?? fr ?? '' : fr ?? en ?? '';
    }
    if (data?.errors?.length) {
      return data.errors.join('\n');
    }

    if (error.response.status === 403) {
      const fallback =
        lang === 'en'
          ? 'Access denied. Log out and sign in with the correct account (driver to publish, passenger to book).'
          : 'Accès refusé. Déconnectez-vous puis reconnectez-vous avec le bon compte (conducteur pour publier, passager pour réserver).';
      return fr || en || fallback;
    }
    if (error.response.status === 401) {
      return lang === 'en' ? 'Session expired. Please log in again.' : 'Session expirée. Reconnectez-vous.';
    }
  }

  return lang === 'en' ? 'An error occurred' : 'Une erreur est survenue';
}
