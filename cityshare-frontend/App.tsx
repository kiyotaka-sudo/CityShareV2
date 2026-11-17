import 'react-native-gesture-handler';
import { i18nReady } from './src/i18n';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AppNavigator, { navigationRef } from './src/navigation/AppNavigator';
import { isExpoGo } from './src/utils/expoGo';
import { AuthProvider } from './src/context/AuthContext';
import { TripProvider } from './src/context/TripContext';
import { setUnauthorizedHandler } from './src/api/axiosConfig';
import { colors } from './src/theme/colors';
import { useAuth } from './src/hooks/useAuth';
import { usePushToken } from './src/hooks/usePushToken';

function PushRegistrar() {
  const { token } = useAuth();
  usePushToken(!!token);
  return null;
}

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const prepare = async () => {
      if (!isExpoGo()) {
        const Notifications = await import('expo-notifications');
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowAlert: true,
            shouldShowBanner: true,
            shouldShowList: true
          })
        });
      }
      await i18nReady;
      setUnauthorizedHandler(() => {
        navigationRef.current?.reset({ index: 0, routes: [{ name: 'Auth' }] });
      });
      setReady(true);
    };
    prepare();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PushRegistrar />
        <TripProvider>
          <NavigationContainer ref={navigationRef}>
            <StatusBar style="dark" />
            <AppNavigator />
          </NavigationContainer>
        </TripProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
