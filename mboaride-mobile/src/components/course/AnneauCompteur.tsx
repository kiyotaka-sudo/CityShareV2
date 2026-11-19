import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { couleurs, polices } from '../../theme';

const CercleAnime = Animated.createAnimatedComponent(Circle);

/**
 * Anneau de compte à rebours (moment 6) : l'arc orange se vide en continu, la couleur vire au rouge
 * dans les 10 dernières secondes.
 */
export default function AnneauCompteur({ restant, total, taille = 64, epaisseur = 6 }: {
  restant: number; total: number; taille?: number; epaisseur?: number;
}) {
  const r = (taille - epaisseur) / 2;
  const circonference = 2 * Math.PI * r;
  const ratio = useSharedValue(total > 0 ? restant / total : 0);

  useEffect(() => {
    // Le compteur avance chaque seconde : on glisse linéairement vers la valeur suivante
    ratio.value = withTiming(total > 0 ? Math.max(0, restant - 1) / total : 0, { duration: 1000, easing: Easing.linear });
  }, [restant, total]); // eslint-disable-line react-hooks/exhaustive-deps

  const props = useAnimatedProps(() => ({ strokeDashoffset: circonference * (1 - ratio.value) }));
  const urgent = restant <= 10;

  return (
    <View style={{ width: taille, height: taille, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={taille} height={taille} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={taille / 2} cy={taille / 2} r={r} stroke="#EEF1F5" strokeWidth={epaisseur} fill="none" />
        <CercleAnime cx={taille / 2} cy={taille / 2} r={r} stroke={urgent ? couleurs.rouge : couleurs.accent} strokeWidth={epaisseur}
          strokeLinecap="round" fill="none" strokeDasharray={`${circonference} ${circonference}`} animatedProps={props} />
      </Svg>
      <Text style={{ fontFamily: polices.titre, fontSize: taille * 0.28, color: urgent ? couleurs.rouge : couleurs.texte, fontVariant: ['tabular-nums'] }}>
        {restant}
      </Text>
    </View>
  );
}
