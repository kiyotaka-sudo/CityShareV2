import React from 'react';
import { Image, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { Bouton } from '../../components/ui';
import { changerLangue } from '../../i18n';
import { couleurs, espace } from '../../theme';
import type { Routes } from '../../navigation/RootNavigator';

const AVANTAGES: { cle: string; icone: keyof typeof Ionicons.glyphMap }[] = [
  { cle: 'depot', icone: 'car' }, { cle: 'ramassage', icone: 'people' },
  { cle: 'moto', icone: 'bicycle' }, { cle: 'securite', icone: 'shield-checkmark' }
];

/** Écran d'accueil : logo, avantages et choix de la langue (BF-02, BNF-08). */
export default function Bienvenue({ navigation }: StackScreenProps<Routes, 'Bienvenue'>) {
  const { t } = useTranslation();
  const choisir = async (langue: 'fr' | 'en') => {
    await changerLangue(langue);
    navigation.navigate('Presentation', { langue });
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: couleurs.blanc, padding: espace.l, justifyContent: 'space-between' }}>
      <View style={{ marginTop: 40, gap: espace.l }}>
        <Image source={require('../../../assets/logo.png')} style={{ width: 240, height: 117 }} resizeMode="contain" accessibilityLabel="MboaRide" />
        <Text style={{ color: couleurs.primaire, fontSize: 20, lineHeight: 28, fontWeight: '600' }}>{t('bienvenue.slogan')}</Text>
        <View style={{ gap: 14 }}>
          {AVANTAGES.map(({ cle, icone }) => (
            <View key={cle} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: couleurs.accentClair, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={icone} size={20} color={couleurs.accent} />
              </View>
              <Text style={{ color: couleurs.texte, fontSize: 16, flex: 1 }}>{t('bienvenue.' + cle)}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={{ gap: espace.m }}>
        <View style={{ flexDirection: 'row', height: 4, borderRadius: 2, overflow: 'hidden' }}>
          <View style={{ flex: 1, backgroundColor: couleurs.vert }} /><View style={{ flex: 1, backgroundColor: couleurs.jaune }} />
          <View style={{ flex: 1, backgroundColor: couleurs.accent }} /><View style={{ flex: 1, backgroundColor: couleurs.primaire }} />
        </View>
        <Bouton titre="Continuer en français" onPress={() => choisir('fr')} />
        <Bouton variante="contour" titre="Continue in English" onPress={() => choisir('en')} />
      </View>
    </SafeAreaView>
  );
}
