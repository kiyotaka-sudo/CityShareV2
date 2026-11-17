import { useEffect } from 'react';
import Constants from 'expo-constants';
import { userApi } from '../api/userApi';
import { isExpoGo } from '../utils/expoGo';

export function usePushToken(enabled: boolean) {
  useEffect(() => {
    if (!enabled || isExpoGo()) {
      return;
    }
    const register = async () => {
      try {
        const Notifications = await import('expo-notifications');
        const { status } = await Notifications.getPermissionsAsync();
        let finalStatus = status;
        if (finalStatus !== 'granted') {
          const requested = await Notifications.requestPermissionsAsync();
          finalStatus = requested.status;
        }
        if (finalStatus !== 'granted') {
          return;
        }
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        if (!projectId) {
          return;
        }
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        if (tokenData.data) {
          await userApi.updateFcmToken(tokenData.data);
        }
      } catch {
        // Ignoré en dev / sans EAS projectId
      }
    };
    register();
  }, [enabled]);
}