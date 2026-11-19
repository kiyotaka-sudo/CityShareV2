import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolate, interpolateColor, runOnJS, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { couleurs, mouvement, polices } from '../../theme';
import { haptique } from './haptique';

const HAUTEUR = 64;
const MARGE = 6;
const POUCE = HAUTEUR - MARGE * 2;
const SEUIL = 0.82;

/**
 * Bouton « glisser pour… » (moment 11, comme Uber Driver) : évite les validations accidentelles en conduisant.
 * Le fond se remplit de la couleur d'arrivée pendant le glissement ; au-delà de 82 % l'action est validée.
 */
export default function BoutonGlisser({ libelle, onValide, couleurDepart = couleurs.primaire, couleurArrivee = couleurs.vert,
  icone = 'chevron-forward', chargement, desactive }: {
  libelle: string; onValide: () => void; couleurDepart?: string; couleurArrivee?: string;
  icone?: keyof typeof Ionicons.glyphMap; chargement?: boolean; desactive?: boolean;
}) {
  const [largeur, setLargeur] = useState(0);
  const x = useSharedValue(0);
  const invite = useSharedValue(0);
  const course = Math.max(1, largeur - POUCE - MARGE * 2);

  // Petit mouvement d'invitation du pouce, répété, tant que rien ne se passe
  useEffect(() => {
    invite.value = withRepeat(withSequence(withTiming(10, { duration: 380 }), withSpring(0, mouvement.ressortVif), withTiming(0, { duration: 1400 })), -1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Après une action (chargement terminé), le pouce revient au départ
  useEffect(() => {
    if (!chargement) x.value = withSpring(0, mouvement.ressort);
  }, [chargement]); // eslint-disable-line react-hooks/exhaustive-deps

  const valider = () => { haptique.succes(); onValide(); };
  const geste = Gesture.Pan()
    .enabled(!desactive && !chargement)
    .activeOffsetX([-4, 4])
    .onBegin(() => { runOnJS(haptique.leger)(); })
    .onUpdate((e) => { x.value = Math.min(course, Math.max(0, e.translationX)); })
    .onEnd(() => {
      if (x.value >= course * SEUIL) {
        x.value = withSpring(course, mouvement.ressortVif);
        runOnJS(valider)();
      } else {
        x.value = withSpring(0, mouvement.ressort);
      }
    });

  const fond = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(x.value / course, [0, 1], [couleurDepart, couleurArrivee])
  }));
  const pouce = useAnimatedStyle(() => ({ transform: [{ translateX: x.value + (x.value === 0 ? invite.value : 0) }] }));
  const texte = useAnimatedStyle(() => ({ opacity: interpolate(x.value / course, [0, 0.6], [1, 0]) }));
  const trainee = useAnimatedStyle(() => ({ width: x.value + POUCE + MARGE }));

  return (
    <Animated.View onLayout={(e: LayoutChangeEvent) => setLargeur(e.nativeEvent.layout.width)}
      style={[{ height: HAUTEUR, borderRadius: HAUTEUR / 2, justifyContent: 'center', overflow: 'hidden', opacity: desactive ? 0.5 : 1 }, fond]}>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: HAUTEUR / 2, backgroundColor: 'rgba(255,255,255,0.14)' }, trainee]} />
      <Animated.View style={[{ position: 'absolute', left: POUCE + MARGE * 2, right: 16, alignItems: 'center' }, texte]}>
        <Text style={{ fontFamily: polices.texteGras, fontSize: 17, color: '#fff' }} numberOfLines={1}>{libelle}</Text>
      </Animated.View>
      <GestureDetector gesture={geste}>
        <Animated.View accessibilityRole="button" accessibilityLabel={libelle}
          accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={() => { if (!desactive && !chargement) valider(); }}
          style={[{ position: 'absolute', left: MARGE, width: POUCE, height: POUCE, borderRadius: POUCE / 2, backgroundColor: '#fff',
            alignItems: 'center', justifyContent: 'center' }, pouce]}>
          <View style={{ flexDirection: 'row' }}>
            <Ionicons name={chargement ? 'hourglass' : icone} size={26} color={couleurDepart} />
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
