import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { couleurs } from '../../theme';
import { useReduireAnimations } from '../anime/useReduireAnimations';

const TAILLE = 220;
const DUREE = 2400;

function Onde({ delai, fixe }: { delai: number; fixe: boolean }) {
  const p = useSharedValue(fixe ? delai / DUREE : 0);
  useEffect(() => {
    if (fixe) { cancelAnimation(p); p.value = delai / DUREE; return; }
    p.value = withDelay(delai, withRepeat(withTiming(1, { duration: DUREE, easing: Easing.out(Easing.quad) }), -1, false));
  }, [fixe]); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - p.value),
    transform: [{ scale: 0.15 + p.value * 0.85 }]
  }));
  return (
    <Animated.View pointerEvents="none" style={[{
      position: 'absolute', width: TAILLE, height: TAILLE, borderRadius: TAILLE / 2,
      backgroundColor: 'rgba(247,139,3,0.18)', borderWidth: 2, borderColor: couleurs.accent
    }, style]} />
  );
}

/**
 * Radar de recherche d'un chauffeur (moment 6) : trois ondes orange concentriques
 * qui partent du point de départ, autour d'un point central qui respire.
 */
export default function RadarRecherche() {
  const reduire = useReduireAnimations();
  const pouls = useSharedValue(1);
  useEffect(() => {
    if (reduire) { cancelAnimation(pouls); pouls.value = 1; return; }
    pouls.value = withRepeat(withTiming(1.18, { duration: 700, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [reduire]); // eslint-disable-line react-hooks/exhaustive-deps
  const centre = useAnimatedStyle(() => ({ transform: [{ scale: pouls.value }] }));
  return (
    <View pointerEvents="none" style={{ width: TAILLE, height: TAILLE, alignItems: 'center', justifyContent: 'center' }}>
      <Onde delai={0} fixe={reduire} />
      <Onde delai={DUREE / 3} fixe={reduire} />
      <Onde delai={(2 * DUREE) / 3} fixe={reduire} />
      <Animated.View style={[{
        width: 22, height: 22, borderRadius: 11, backgroundColor: couleurs.primaire, borderWidth: 4, borderColor: '#fff',
        shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 5
      }, centre]} />
    </View>
  );
}
