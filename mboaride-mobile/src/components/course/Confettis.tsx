import React, { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { couleurs } from '../../theme';

const COULEURS = [couleurs.primaire, couleurs.accent, couleurs.vert, couleurs.jaune];
const { width: L, height: H } = Dimensions.get('window');

function Piece({ x, delai, couleur, rotation, largeur, derive }: { x: number; delai: number; couleur: string; rotation: number; largeur: number; derive: number }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withDelay(delai, withTiming(1, { duration: 2600, easing: Easing.out(Easing.quad) })); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({
    opacity: p.value < 0.85 ? 1 : (1 - p.value) / 0.15,
    transform: [
      { translateX: x + Math.sin(p.value * 6) * derive },
      { translateY: -30 + p.value * H * 0.9 },
      { rotate: `${rotation + p.value * 720}deg` }
    ]
  }));
  return <Animated.View style={[{ position: 'absolute', top: 0, left: 0, width: largeur, height: largeur * 0.45, borderRadius: 2, backgroundColor: couleur }, style]} />;
}

/** Pluie de confettis aux couleurs du logo (moment 10), sans fichier Lottie : 60 pièces animées par Reanimated. */
export default function Confettis() {
  const pieces = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    x: Math.random() * L, delai: Math.random() * 500, couleur: COULEURS[i % COULEURS.length],
    rotation: Math.random() * 360, largeur: 8 + Math.random() * 8, derive: 10 + Math.random() * 30
  })), []);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => <Piece key={i} {...p} />)}
    </View>
  );
}
