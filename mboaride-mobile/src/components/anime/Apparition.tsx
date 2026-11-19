import React, { PropsWithChildren } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';

/**
 * Apparition animée d'un élément. `rang` décale l'animation pour obtenir une cascade (listes d'offres, cartes).
 */
export default function Apparition({ children, rang = 0, effet = 'monte', style }: PropsWithChildren<{
  rang?: number; effet?: 'monte' | 'descend' | 'zoom'; style?: StyleProp<ViewStyle>;
}>) {
  const delai = Math.min(rang, 8) * 70;
  const entering = effet === 'zoom' ? ZoomIn.delay(delai).springify().damping(14)
    : effet === 'descend' ? FadeInUp.delay(delai).springify().damping(16)
      : FadeInDown.delay(delai).springify().damping(16);
  return <Animated.View entering={entering} style={style}>{children}</Animated.View>;
}
