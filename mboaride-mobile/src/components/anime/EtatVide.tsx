import React, { ReactNode, useEffect } from 'react';
import { Image, ImageSourcePropType, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { cancelAnimation, Easing, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { couleurs, polices } from '../../theme';
import { useReduireAnimations } from './useReduireAnimations';

/**
 * Illustrations des états vides (section 8.5 du plan). Quand un fichier est fourni dans assets/images,
 * il suffit de l'ajouter ici : `aucuneCourse: require('../../../assets/images/etat-aucune-course.png')`.
 */
export const ILLUSTRATIONS: Partial<Record<string, ImageSourcePropType>> = {};

/**
 * État vide illustré : une icône qui flotte doucement dans un halo aux couleurs du logo,
 * un titre et une action facultative. Remplace l'écran blanc ou la simple phrase.
 */
export default function EtatVide({ texte, titre, icone = 'file-tray-outline', illustration, couleur = couleurs.primaire, action }: {
  texte: string; titre?: string; icone?: keyof typeof Ionicons.glyphMap; illustration?: string; couleur?: string; action?: ReactNode;
}) {
  const reduire = useReduireAnimations();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduire) { cancelAnimation(y); y.value = 0; return; }
    y.value = withRepeat(withSequence(withTiming(-6, { duration: 1400, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) })), -1);
  }, [reduire]); // eslint-disable-line react-hooks/exhaustive-deps
  const flotte = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const image = illustration ? ILLUSTRATIONS[illustration] : undefined;

  return (
    <Animated.View entering={FadeIn.duration(300)} style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, gap: 10 }}>
      {image ? (
        <Animated.View style={flotte}><Image source={image} style={{ width: 220, height: 165 }} resizeMode="contain" /></Animated.View>
      ) : (
        <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: couleur + '12' }} />
          <View style={{ position: 'absolute', width: 86, height: 86, borderRadius: 43, backgroundColor: couleur + '1F' }} />
          <View style={{ position: 'absolute', right: 10, top: 14, width: 14, height: 14, borderRadius: 7, backgroundColor: couleurs.accent }} />
          <View style={{ position: 'absolute', left: 14, bottom: 18, width: 9, height: 9, borderRadius: 5, backgroundColor: couleurs.jaune }} />
          <Animated.View style={flotte}><Ionicons name={icone} size={46} color={couleur} /></Animated.View>
        </View>
      )}
      {titre ? <Text style={{ fontFamily: polices.titreDemi, fontSize: 17, color: couleurs.texte, textAlign: 'center' }}>{titre}</Text> : null}
      <Text style={{ fontFamily: polices.texte, fontSize: 14, lineHeight: 20, color: couleurs.texteSecondaire, textAlign: 'center' }}>{texte}</Text>
      {action ? <View style={{ marginTop: 8, alignSelf: 'stretch' }}>{action}</View> : null}
    </Animated.View>
  );
}
