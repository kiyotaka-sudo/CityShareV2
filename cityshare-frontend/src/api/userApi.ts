import api from './axiosConfig';
import { User } from '../types';

export const userApi = {
  me: async (): Promise<User> => {
    const { data } = await api.get<User>('/auth/me');
    return data;
  },
  updateProfile: async (updates: Partial<Pick<User, 'nom' | 'prenom' | 'email'>>) => {
    const { data } = await api.patch<User>('/auth/me', updates);
    return data;
  },
  updatePhoto: async (photoUrl: string) => {
    const { data } = await api.patch<User>('/auth/me/photo', { photoUrl });
    return data;
  },
  updateFcmToken: async (fcmToken: string) => {
    const { data } = await api.patch<User>('/auth/me/fcm-token', { fcmToken });
    return data;
  },
  getUser: async (userId: number): Promise<User> => {
    const { data } = await api.get<User>(`/users/${userId}`);
    return data;
  },
  updateEmergencyContact: async (contactUrgenceNom: string, contactUrgenceTel: string) => {
    const { data } = await api.patch<User>('/auth/me', { contactUrgenceNom, contactUrgenceTel });
    return data;
  }
};
