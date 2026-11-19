import React, { PropsWithChildren } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { mouvement } from '../../theme';
import { haptique } from './haptique';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Zone touchable qui s'enfonce légèrement (effet ressort) avec un retour haptique. */
export default function PressableAnime({ children, style, echelle = 0.96, vibration = 'leger', onPressIn, onPressOut, ...props }:
  PropsWithChildren<Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; echelle?: number; vibration?: keyof typeof haptique | null }>) {
  const s = useSharedValue(1);
  const anime = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AnimatedPressable
      {...props}
      onPressIn={(e) => {
        s.value = withSpring(echelle, mouvement.ressortVif);
        if (vibration && !props.disabled) haptique[vibration]();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.value = withSpring(1, mouvement.ressort);
        onPressOut?.(e);
      }}
      style={[style, anime]}>
      {children}
    </AnimatedPressable>
  );
}
