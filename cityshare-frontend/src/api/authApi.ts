import api from './axiosConfig';
import { AuthResponse, UserRole } from '../types';

export interface LoginPayload {
  telephone: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  nom: string;
  prenom?: string;
  email: string;
  role: UserRole;
}

export const authApi = {
  login: async (payload: LoginPayload) => {
    const { data } = await api.post<AuthResponse>('/auth/login', payload);
    return data;
  },
  register: async (payload: RegisterPayload) => {
    const [prenom, ...nomRest] = payload.nom.trim().split(/\s+/);
    const { data } = await api.post<AuthResponse>('/auth/register', {
      ...payload,
      prenom: payload.prenom ?? prenom,
      nom: nomRest.join(' ') || payload.nom
    });
    return data;
  },
  me: async () => {
    const { data } = await api.get<AuthResponse['user']>('/auth/me');
    return data;
  }
};
