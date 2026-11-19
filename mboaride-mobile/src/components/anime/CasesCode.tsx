import React, { useEffect, useRef } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming, ZoomIn } from 'react-native-reanimated';
import { couleurs, polices } from '../../theme';
import { haptique } from './haptique';

/**
 * Saisie du code OTP en cases séparées : chaque chiffre « tombe » dans sa case,
 * la rangée tremble quand `erreur` change (mauvais code).
 */
export default function CasesCode({ valeur, onChange, longueur = 6, erreur }: {
  valeur: string; onChange: (v: string) => void; longueur?: number; erreur?: number;
}) {
  const champ = useRef<TextInput>(null);
  const secousse = useSharedValue(0);

  useEffect(() => {
    if (!erreur) return;
    haptique.erreur();
    secousse.value = withSequence(
      withTiming(-12, { duration: 50 }), withTiming(12, { duration: 50 }), withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }), withTiming(0, { duration: 50 }));
  }, [erreur, secousse]);

  const rangee = useAnimatedStyle(() => ({ transform: [{ translateX: secousse.value }] }));

  return (
    <Pressable onPress={() => champ.current?.focus()}>
      <Animated.View style={[{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, rangee]}>
        {Array.from({ length: longueur }).map((_, i) => {
          const chiffre = valeur[i];
          const active = i === valeur.length;
          return (
            <View key={i} style={{
              flex: 1, aspectRatio: 0.85, maxWidth: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
              backgroundColor: chiffre ? couleurs.primaireClair : couleurs.blanc,
              borderWidth: 2, borderColor: erreur && valeur.length === longueur ? couleurs.rouge : active ? couleurs.accent : chiffre ? couleurs.primaire : couleurs.bord
            }}>
              {chiffre ? (
                <Animated.Text entering={ZoomIn.springify().damping(12)} style={{ fontFamily: polices.titre, fontSize: 26, color: couleurs.primaire }}>
                  {chiffre}
                </Animated.Text>
              ) : active ? <Text style={{ width: 2, height: 26, backgroundColor: couleurs.accent }} /> : null}
            </View>
          );
        })}
      </Animated.View>
      <TextInput
        ref={champ}
        value={valeur}
        onChangeText={(v) => {
          const propre = v.replace(/\D/g, '').slice(0, longueur);
          if (propre.length > valeur.length) haptique.selection();
          onChange(propre);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={longueur}
        autoFocus
        caretHidden
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
      />
    </Pressable>
  );
}
