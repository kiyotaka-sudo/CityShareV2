import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { couleurs, polices } from '../../theme';

/** Progression du trajet (moment 9) : « 6 min · 2,1 km restants » et une barre qui avance en douceur. */
export default function BarreProgression({ progression, libelle, icone = 'flag' }: {
  progression: number; libelle: string; icone?: keyof typeof Ionicons.glyphMap;
}) {
  const p = useSharedValue(progression);
  useEffect(() => { p.value = withTiming(Math.max(0, Math.min(1, progression)), { duration: 1200 }); }, [progression]); // eslint-disable-line react-hooks/exhaustive-deps
  const rempli = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name={icone} size={16} color={couleurs.accent} />
        <Text style={{ fontFamily: polices.texteGras, fontSize: 14, color: couleurs.texte }}>{libelle}</Text>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: '#EEF1F5', overflow: 'hidden' }}>
        <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: couleurs.primaire }, rempli]} />
      </View>
    </View>
  );
}
