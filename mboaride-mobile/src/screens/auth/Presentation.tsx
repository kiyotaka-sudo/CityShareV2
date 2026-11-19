import React, { useRef, useState } from 'react';
import { Dimensions, FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { interpolate, SharedValue, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, Extrapolation } from 'react-native-reanimated';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { Bouton } from '../../components/ui';
import PressableAnime from '../../components/anime/Pressable';
import { couleurs, polices } from '../../theme';
import type { Routes } from '../../navigation/RootNavigator';

const { width: L } = Dimensions.get('window');

/** Diapositives de présentation. Les illustrations définitives remplaceront les pictogrammes (plan, § 8.4). */
const DIAPOS: { cle: string; icones: (keyof typeof Ionicons.glyphMap)[]; degrade: [string, string] }[] = [
  { cle: '1', icones: ['car', 'people', 'bicycle'], degrade: [couleurs.primaire, '#0B4A8F'] },
  { cle: '2', icones: ['pricetag', 'swap-vertical', 'cash'], degrade: [couleurs.accent, '#FFB347'] },
  { cle: '3', icones: ['shield-checkmark', 'share-social', 'alert-circle'], degrade: [couleurs.vert, '#2E9E5B'] }
];

const FlatListAnimee = Animated.createAnimatedComponent(FlatList<(typeof DIAPOS)[number]>);

/** Présentation de MboaRide en 3 écrans à faire glisser, avec indicateur de page animé. */
export default function Presentation({ navigation, route }: StackScreenProps<Routes, 'Presentation'>) {
  const { t } = useTranslation();
  const defilement = useSharedValue(0);
  const liste = useRef<FlatList>(null);
  const [page, setPage] = useState(0);
  const auDefilement = useAnimatedScrollHandler((e) => { defilement.value = e.contentOffset.x; });
  const suite = () => navigation.replace('Telephone', { langue: route.params.langue });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: couleurs.blanc }}>
      <View style={{ alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 8 }}>
        <PressableAnime onPress={suite} hitSlop={12}>
          <Text style={{ fontFamily: polices.texteGras, color: couleurs.texteSecondaire, fontSize: 15 }}>{t('presentation.passer')}</Text>
        </PressableAnime>
      </View>
      <FlatListAnimee
        ref={liste}
        data={DIAPOS}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={auDefilement}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / L))}
        keyExtractor={(d) => d.cle}
        renderItem={({ item, index }) => <Diapo diapo={item} index={index} defilement={defilement} />}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
        {DIAPOS.map((d, i) => <Point key={d.cle} index={i} defilement={defilement} />)}
      </View>
      <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
        <Bouton
          titre={page === DIAPOS.length - 1 ? t('presentation.commencer') : t('presentation.suivant')}
          variante={page === DIAPOS.length - 1 ? 'accent' : 'primaire'}
          onPress={() => (page === DIAPOS.length - 1 ? suite() : liste.current?.scrollToIndex({ index: page + 1 }))}
        />
      </View>
    </SafeAreaView>
  );
}

function Diapo({ diapo, index, defilement }: { diapo: (typeof DIAPOS)[number]; index: number; defilement: SharedValue<number> }) {
  const { t } = useTranslation();
  const entree = [(index - 1) * L, index * L, (index + 1) * L];
  const illustration = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(defilement.value, entree, [0.6, 1, 0.6], Extrapolation.CLAMP) },
      { rotate: `${interpolate(defilement.value, entree, [-12, 0, 12], Extrapolation.CLAMP)}deg` }
    ],
    opacity: interpolate(defilement.value, entree, [0, 1, 0], Extrapolation.CLAMP)
  }));
  const textes = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(defilement.value, entree, [L * 0.3, 0, -L * 0.3], Extrapolation.CLAMP) }],
    opacity: interpolate(defilement.value, entree, [0, 1, 0], Extrapolation.CLAMP)
  }));
  return (
    <View style={{ width: L, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 36 }}>
      <Animated.View style={illustration}>
        <LinearGradient colors={diapo.degrade} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ width: 230, height: 230, borderRadius: 115, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={diapo.icones[0]} size={92} color="#fff" />
          <View style={{ position: 'absolute', top: 26, right: 18, backgroundColor: '#fff', borderRadius: 26, padding: 10 }}>
            <Ionicons name={diapo.icones[1]} size={30} color={diapo.degrade[0]} />
          </View>
          <View style={{ position: 'absolute', bottom: 22, left: 14, backgroundColor: '#fff', borderRadius: 26, padding: 10 }}>
            <Ionicons name={diapo.icones[2]} size={30} color={diapo.degrade[0]} />
          </View>
        </LinearGradient>
      </Animated.View>
      <Animated.View style={[{ gap: 12, alignItems: 'center' }, textes]}>
        <Text style={{ fontFamily: polices.titre, fontSize: 26, color: couleurs.primaire, textAlign: 'center' }}>{t(`presentation.titre${diapo.cle}`)}</Text>
        <Text style={{ fontFamily: polices.texte, fontSize: 16, lineHeight: 24, color: couleurs.texteSecondaire, textAlign: 'center' }}>{t(`presentation.texte${diapo.cle}`)}</Text>
      </Animated.View>
    </View>
  );
}

function Point({ index, defilement }: { index: number; defilement: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const entree = [(index - 1) * L, index * L, (index + 1) * L];
    return {
      width: interpolate(defilement.value, entree, [8, 26, 8], Extrapolation.CLAMP),
      opacity: interpolate(defilement.value, entree, [0.35, 1, 0.35], Extrapolation.CLAMP)
    };
  });
  return <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: couleurs.primaire }, style]} />;
}
