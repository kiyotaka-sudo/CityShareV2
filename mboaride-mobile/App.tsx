import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, LogBox, View } from 'react-native';

// Réseau faible (BNF-02) : MapLibre relance seul les tuiles et polices en échec ; ces délais dépassés
// ne sont pas des bogues et ne doivent pas masquer l'écran en développement.
LogBox.ignoreLogs([/MapLibre Native \[ERROR\].*(timed out|connection was lost|Failed to load|not connected to the internet|appears to be offline|network connection was lost)/]);
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { ToastProvider } from './src/components/anime/Toast';
import SplashAnime from './src/components/anime/SplashAnime';
import { i18nPret } from './src/i18n';
import { AuthProvider } from './src/context/AuthContext';
import { TempsReelProvider } from './src/context/TempsReelContext';
import RootNavigator, { navigationRef } from './src/navigation/RootNavigator';
import { couleurs } from './src/theme';
import { configurerNotifications } from './src/hooks/usePushToken';

export default function App() {
  const [pret, setPret] = useState(false);
  const [splash, setSplash] = useState(true);
  const [policesChargees, erreurPolices] = useFonts({ Poppins_600SemiBold, Poppins_700Bold, Inter_400Regular, Inter_500Medium, Inter_600SemiBold });

  useEffect(() => {
    (async () => {
      await i18nPret;
      await configurerNotifications();
      setPret(true);
    })();
  }, []);

  // Sans les polices (erreur de chargement), l'application démarre avec la police système
  if (!pret || (!policesChargees && !erreurPolices)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: couleurs.blanc, gap: 24 }}>
        <Image source={require('./assets/logo.png')} style={{ width: 220, height: 107 }} resizeMode="contain" accessibilityLabel="MboaRide" />
        <ActivityIndicator color={couleurs.accent} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <ToastProvider>
            <AuthProvider>
              <TempsReelProvider>
                <NavigationContainer ref={navigationRef}>
                  <StatusBar style="dark" />
                  <RootNavigator />
                </NavigationContainer>
              </TempsReelProvider>
            </AuthProvider>
          </ToastProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
      {splash && <SplashAnime onFin={() => setSplash(false)} />}
    </GestureHandlerRootView>
  );
}
