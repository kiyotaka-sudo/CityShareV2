import AsyncStorage from '@react-native-async-storage/async-storage';
import { ROLE_KEY, TOKEN_KEY, USER_KEY } from './constants';
import { User } from '../types';

export const tokenStorage = {
  getToken: () => AsyncStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => AsyncStorage.setItem(TOKEN_KEY, token),
  clearToken: () => AsyncStorage.removeItem(TOKEN_KEY),
  getRole: () => AsyncStorage.getItem(ROLE_KEY),
  setRole: (role: string) => AsyncStorage.setItem(ROLE_KEY, role),
  getUser: async (): Promise<User | null> => {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  setUser: (user: User) => AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
  clearUser: () => AsyncStorage.removeItem(USER_KEY),
  clearSession: async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, ROLE_KEY]);
  }
};
