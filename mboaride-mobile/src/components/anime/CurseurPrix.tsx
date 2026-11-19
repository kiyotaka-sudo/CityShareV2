import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { couleurs, mouvement, ombres, polices } from '../../theme';
import { fcfa } from '../../utils/format';
import PrixAnime from './PrixAnime';
import { haptique } from './haptique';

const PAS = 50;
const POUCE = 30;

/**
 * Curseur de négociation encadrée (BF-23) : glissement aimanté par pas de 50 FCFA, vibration à chaque cran,
 * jauge de la fourchette [P_ref × (1 − α) ; P_ref × (1 + β)] et repère du prix de référence.
 */
export default function CurseurPrix({ min, max, reference, valeur, onChange, vue = 'client' }: {
  min: number; max: number; reference: number; valeur: number; onChange: (v: number) => void;
  /** Côté chauffeur, la référence est l'offre du client et un prix plus haut le rend moins attractif. */
  vue?: 'client' | 'chauffeur';
}) {
  const { t } = useTranslation();
  const [largeur, setLargeur] = useState(0);
  const x = useSharedValue(0);
  const depart = useSharedValue(0);
  const cran = useSharedValue(valeur);
  const etendue = Math.max(PAS, max - min);
  const versX = (v: number) => ((v - min) / etendue) * largeur;

  useEffect(() => {
    if (largeur > 0) {
      x.value = withSpring(versX(valeur), mouvement.ressort);
      cran.value = valeur;
    }
  }, [valeur, largeur, min, max]); // eslint-disable-line react-hooks/exhaustive-deps

  const emettre = (v: number) => {
    haptique.selection();
    onChange(v);
  };

  // Seuls les glissements horizontaux pilotent le curseur ; les verticaux restent au panneau qui défile
  const geste = Gesture.Pan()
    .activeOffsetX([-6, 6])
    .failOffsetY([-14, 14])
    .onBegin(() => { depart.value = x.value; })
    .onUpdate((e) => {
      const nx = Math.min(largeur, Math.max(0, depart.value + e.translationX));
      x.value = nx;
      const brut = min + (nx / Math.max(1, largeur)) * etendue;
      const v = Math.min(max, Math.max(min, Math.round(brut / PAS) * PAS));
      if (v !== cran.value) {
        cran.value = v;
        runOnJS(emettre)(v);
      }
    })
    .onFinalize(() => {
      x.value = withSpring(((cran.value - min) / etendue) * largeur, mouvement.ressortVif);
    });

  const pouce = useAnimatedStyle(() => ({ transform: [{ translateX: x.value - POUCE / 2 }] }));
  const rempli = useAnimatedStyle(() => ({ width: x.value }));
  const pctRef = largeur > 0 ? versX(reference) : 0;
  const ecart = valeur - reference;

  return (
    <View style={{ gap: 14 }}>
      <View style={{ alignItems: 'center', gap: 2 }}>
        <PrixAnime valeur={valeur} style={{ fontFamily: polices.titre, fontSize: 34, color: couleurs.primaire }} />
        {vue === 'client' ? (
          <Text style={{ fontFamily: polices.texteMoyen, fontSize: 13, color: ecart >= 0 ? couleurs.vert : couleurs.accentFonce }}>
            {ecart === 0 ? t('reservation.prixEgalReference') : ecart > 0 ? t('reservation.prixPlusAttractif') : t('reservation.prixMoinsAttractif')}
          </Text>
        ) : (
          <Text style={{ fontFamily: polices.texteMoyen, fontSize: 13, color: ecart <= 0 ? couleurs.vert : couleurs.accentFonce }}>
            {ecart === 0 ? t('chauffeur.prixEgalClient') : ecart > 0 ? t('chauffeur.prixAuDessus', { ecart: fcfa(ecart) }) : t('chauffeur.prixEnDessous')}
          </Text>
        )}
      </View>
      <GestureDetector gesture={geste}>
        <View style={{ height: POUCE + 16, justifyContent: 'center' }} onLayout={(e: LayoutChangeEvent) => setLargeur(e.nativeEvent.layout.width)}>
          <LinearGradient colors={[couleurs.accentClair, couleurs.vertClair]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
            style={{ height: 10, borderRadius: 5 }} />
          <Animated.View style={[{ position: 'absolute', left: 0, height: 10, borderRadius: 5, backgroundColor: couleurs.primaire }, rempli]} />
          {largeur > 0 && (
            <View style={{ position: 'absolute', left: pctRef - 1, height: 22, width: 2, backgroundColor: couleurs.texte, opacity: 0.35, borderRadius: 1 }} />
          )}
          <Animated.View style={[{ position: 'absolute', left: 0, width: POUCE, height: POUCE, borderRadius: POUCE / 2, backgroundColor: '#fff',
            borderWidth: 4, borderColor: couleurs.primaire }, ombres.moyenne, pouce]} />
        </View>
      </GestureDetector>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={legende}>{fcfa(min)}</Text>
        <Text style={legende}>{vue === 'client' ? t('reservation.reference') : t('chauffeur.client')} {fcfa(reference)}</Text>
        <Text style={legende}>{fcfa(max)}</Text>
      </View>
    </View>
  );
}

const legende = { fontFamily: polices.texte, fontSize: 12, color: couleurs.texteSecondaire };
