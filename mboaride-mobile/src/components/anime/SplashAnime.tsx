import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming
} from 'react-native-reanimated';
import { couleurs, polices } from '../../theme';

const LARGEUR_ROUTE = Math.min(220, Dimensions.get('window').width * 0.55);

/**
 * Ouverture animée (1,2 s) : le pin du logo tombe et rebondit, la route aux couleurs du logo se dessine,
 * puis « MboaRide » apparaît avant un fondu vers l'application.
 */
export default function SplashAnime({ onFin }: { onFin: () => void }) {
  const chute = useSharedValue(-160);
  const echelle = useSharedValue(0.6);
  const route = useSharedValue(0);
  const texte = useSharedValue(0);
  const fondu = useSharedValue(1);

  useEffect(() => {
    chute.value = withSpring(0, { damping: 9, stiffness: 140, mass: 0.9 });
    echelle.value = withSequence(withTiming(1.08, { duration: 380 }), withSpring(1, { damping: 10 }));
    route.value = withDelay(380, withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }));
    texte.value = withDelay(650, withTiming(1, { duration: 350 }));
    fondu.value = withDelay(1250, withTiming(0, { duration: 300 }, (fini) => {
      if (fini) runOnJS(onFin)();
    }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pin = useAnimatedStyle(() => ({ transform: [{ translateY: chute.value }, { scale: echelle.value }] }));
  const bande = useAnimatedStyle(() => ({ width: LARGEUR_ROUTE * route.value }));
  const nom = useAnimatedStyle(() => ({ opacity: texte.value, transform: [{ translateY: (1 - texte.value) * 12 }] }));
  const conteneur = useAnimatedStyle(() => ({ opacity: fondu.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.fond, conteneur]} pointerEvents="none">
      <Animated.Image source={require('../../../assets/logo-pin.png')} style={[styles.pin, pin]} resizeMode="contain" />
      <View style={{ width: LARGEUR_ROUTE, height: 6, marginTop: 18, alignItems: 'center' }}>
        <Animated.View style={[styles.route, bande]}>
          {[couleurs.vert, couleurs.jaune, couleurs.accent, couleurs.primaire].map((c) => <View key={c} style={{ flex: 1, backgroundColor: c }} />)}
        </Animated.View>
      </View>
      <Animated.Text style={[styles.nom, nom]}>MboaRide</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fond: { backgroundColor: couleurs.blanc, alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  pin: { width: 110, height: 140 },
  route: { height: 6, borderRadius: 3, overflow: 'hidden', flexDirection: 'row' },
  nom: { marginTop: 20, fontFamily: polices.titre, fontSize: 34, color: couleurs.primaire, letterSpacing: 0.5 }
});
