import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { couleurs } from '../../theme';
import { haptique } from '../anime/haptique';

function Etoile({ rang, active, taille, onPress }: { rang: number; active: boolean; taille: number; onPress: () => void }) {
  const s = useSharedValue(1);
  useEffect(() => {
    if (active) s.value = withDelay(rang * 45, withSequence(withTiming(1.35, { duration: 110 }), withSpring(1, { damping: 8, stiffness: 260 })));
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable onPress={onPress} hitSlop={6} accessibilityLabel={`${rang + 1}`}>
      <Animated.View style={style}>
        <Ionicons name={active ? 'star' : 'star-outline'} size={taille} color={active ? couleurs.jaune : '#C9D1DC'} />
      </Animated.View>
    </Pressable>
  );
}

/** Étoiles de notation qui « sautent » l'une après l'autre au toucher (moment 10). */
export default function EtoilesAnimees({ note, onChange, taille = 40 }: { note: number; onChange: (n: number) => void; taille?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Etoile key={i} rang={i} active={i < note} taille={taille} onPress={() => { haptique.selection(); onChange(i + 1); }} />
      ))}
    </View>
  );
}
