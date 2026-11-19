import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { Api } from '../api';

/** Expo Go ne gère plus les notifications distantes : on ne les active que dans un build de l'application. */
const estExpoGo = () => Constants.appOwnership === 'expo';

export async function configurerNotifications() {
  if (estExpoGo()) return;
  const Notifications = await import('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true })
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', { name: 'MboaRide', importance: Notifications.AndroidImportance.HIGH });
  }
}

/** Enregistre le jeton push de l'appareil (BF-65) ; sans lui, le serveur bascule sur le SMS (BF-66). */
export function usePushToken(connecte: boolean) {
  useEffect(() => {
    if (!connecte || estExpoGo()) return;
    (async () => {
      try {
        const Notifications = await import('expo-notifications');
        let { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
        if (status !== 'granted') return;
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
        if (data) await Api.moi.pushToken(data);
      } catch {
        // pas de projet EAS en développement : le SMS de secours prend le relais
      }
    })();
  }, [connecte]);
}
