import React, { useEffect } from 'react';
import { DimensionValue, StyleProp, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

/** Bloc de chargement avec reflet animé, affiché à la place d'un écran blanc en réseau lent (BNF-02). */
export function Squelette({ largeur = '100%', hauteur = 16, rayon = 8, style }: {
  largeur?: DimensionValue; hauteur?: number; rayon?: number; style?: StyleProp<ViewStyle>;
}) {
  const x = useSharedValue(-1);
  useEffect(() => {
    x.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }), -1, false);
  }, [x]);
  const reflet = useAnimatedStyle(() => ({ transform: [{ translateX: `${x.value * 100}%` }] }));
  return (
    <View style={[{ width: largeur, height: hauteur, borderRadius: rayon, backgroundColor: '#E7EBF0', overflow: 'hidden' }, style]}>
      <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }, reflet]}>
        <LinearGradient colors={['transparent', 'rgba(255,255,255,0.7)', 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
      </Animated.View>
    </View>
  );
}

/** Carte de chargement type (avatar + deux lignes). */
export function SqueletteCarte() {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      <Squelette largeur={48} hauteur={48} rayon={24} />
      <View style={{ flex: 1, gap: 8 }}>
        <Squelette largeur="60%" />
        <Squelette largeur="90%" hauteur={12} />
      </View>
    </View>
  );
}
