import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackScreenProps } from '@react-navigation/stack';
import { colors } from '../theme/colors';
import { FIRST_LAUNCH_KEY, TOKEN_KEY } from '../utils/constants';
import { RootStackParamList } from '../types';
import { useAuth } from '../hooks/useAuth';

type Props = StackScreenProps<RootStackParamList, 'Splash'>;

export default function SplashScreen({ navigation }: Props) {
  const { role, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(async () => {
      const [token, onboarded] = await AsyncStorage.multiGet([TOKEN_KEY, FIRST_LAUNCH_KEY]);
      const sessionRole = role;
      if (token[1] && sessionRole) {
        if (sessionRole === 'CONDUCTEUR') navigation.replace('Conducteur');
        else if (sessionRole === 'EXPEDITEUR') navigation.replace('Expediteur');
        else navigation.replace('Passager');
        return;
      }
      if (!onboarded[1]) {
        navigation.replace('Onboarding');
        return;
      }
      navigation.replace('Auth');
    }, 1200);
    return () => clearTimeout(timer);
  }, [loading, navigation, role]);

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.logo}>CityShare</Text>
        <Text style={styles.tagline}>Voyagez & livrez, ensemble.</Text>
      </View>
      <ActivityIndicator color={colors.white} size="large" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  center: { alignItems: 'center' },
  logo: { color: colors.white, fontSize: 42, fontWeight: '900' },
  tagline: { color: colors.success, fontSize: 16, marginTop: 8 },
  loader: { position: 'absolute', bottom: 64 }
});
