import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { BounceInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { couleurs, ombres, polices } from '../../theme';
import { haptique } from '../anime/haptique';

/** « Votre chauffeur est arrivé » : bannière verte qui tombe en rebondissant, avec une vibration et une icône qui sonne. */
export default function BanniereArrivee({ titre, texte }: { titre: string; texte: string }) {
  const cloche = useSharedValue(0);
  useEffect(() => {
    haptique.succes();
    const id = setTimeout(() => haptique.alerte(), 450);
    cloche.value = withRepeat(withSequence(withTiming(-14, { duration: 90 }), withTiming(14, { duration: 90 }), withTiming(0, { duration: 90 }), withTiming(0, { duration: 1400 })), -1);
    return () => clearTimeout(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${cloche.value}deg` }] }));
  return (
    <Animated.View entering={BounceInDown.duration(700)} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: couleurs.vert, borderRadius: 18, padding: 14 }, ombres.moyenne]}>
      <Animated.View style={[{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }, style]}>
        <Ionicons name="notifications" size={22} color="#fff" />
      </Animated.View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: polices.titreDemi, fontSize: 16, color: '#fff' }}>{titre}</Text>
        <Text style={{ fontFamily: polices.texte, fontSize: 13, color: '#E2F3E8' }}>{texte}</Text>
      </View>
    </Animated.View>
  );
}
