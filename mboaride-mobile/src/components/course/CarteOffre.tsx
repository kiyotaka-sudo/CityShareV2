import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, LinearTransition, SlideInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Avatar, Bouton } from '../ui';
import PressableAnime from '../anime/Pressable';
import { haptique } from '../anime/haptique';
import PlaqueImmatriculation from './PlaqueImmatriculation';
import { fcfa } from '../../utils/format';
import { couleurs, ombres, polices } from '../../theme';
import type { Offre } from '../../types';

/**
 * Offre d'un chauffeur (moment 6) : elle monte depuis le bas avec une vibration.
 * Un appui long déplie le détail du chauffeur (véhicule, plaque, distance).
 */
export default function CarteOffre({ offre, rang, prixPropose, occupe, onChoisir }: {
  offre: Offre; rang: number; prixPropose: number; occupe: boolean; onChoisir: () => void;
}) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState(false);
  const ch = offre.chauffeur;
  const contre = offre.type === 'CONTRE_PROPOSITION';
  const ecart = offre.prix - prixPropose;

  useEffect(() => { haptique.moyen(); }, []);

  return (
    <Animated.View entering={SlideInDown.delay(Math.min(rang, 5) * 90).springify().damping(17)} exiting={FadeOut.duration(180)} layout={LinearTransition}>
      <PressableAnime echelle={0.98} vibration={null} onLongPress={() => { haptique.leger(); setDetail((d) => !d); }} delayLongPress={350}
        style={[{ backgroundColor: '#fff', borderRadius: 20, padding: 14, gap: 10, borderWidth: 1.5,
          borderColor: contre ? couleurs.accent : '#EEF1F5' }, ombres.legere]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar photo={ch.photoUrl} nom={ch.prenom} taille={50} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: polices.texteGras, fontSize: 15, color: couleurs.texte }} numberOfLines={1}>{ch.prenom} {ch.nom.charAt(0)}.</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="star" size={13} color={couleurs.jaune} />
              <Text style={{ fontFamily: polices.texteMoyen, fontSize: 13, color: couleurs.texte }}>{ch.noteMoyenne.toFixed(1)}</Text>
              <Text style={{ fontFamily: polices.texte, fontSize: 12, color: couleurs.texteSecondaire }}>({ch.nbNotes})</Text>
            </View>
            <Text style={{ fontFamily: polices.texte, fontSize: 12, color: couleurs.texteSecondaire }} numberOfLines={1}>
              {[ch.vehicule?.marque, ch.vehicule?.modele, ch.vehicule?.couleur].filter(Boolean).join(' ')}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={{ fontFamily: polices.titre, fontSize: 19, color: couleurs.primaire }}>{fcfa(offre.prix)}</Text>
            {contre ? (
              <View style={{ backgroundColor: couleurs.accentClair, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
                <Text style={{ fontFamily: polices.texteGras, fontSize: 11, color: couleurs.accentFonce }}>
                  {t('course.contreProposition')}{ecart !== 0 ? ` ${ecart > 0 ? '+' : ''}${ecart}` : ''}
                </Text>
              </View>
            ) : (
              <View style={{ backgroundColor: couleurs.vertClair, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
                <Text style={{ fontFamily: polices.texteGras, fontSize: 11, color: couleurs.vert }}>{t('course.prixAccepte')}</Text>
              </View>
            )}
          </View>
        </View>

        {detail && (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={{ gap: 8, paddingTop: 2 }}>
            <PlaqueImmatriculation numero={ch.vehicule?.immatriculation} petite />
            <Text style={{ fontFamily: polices.texte, fontSize: 13, color: couleurs.texteSecondaire }}>
              {t('course.distancePriseEnCharge', { km: offre.distancePriseEnChargeKm.toFixed(1) })}
            </Text>
          </Animated.View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 }}>
            <Ionicons name="time-outline" size={16} color={couleurs.primaire} />
            <Text style={{ fontFamily: polices.texteGras, fontSize: 13, color: couleurs.primaire }}>{t('course.arriveeDans', { min: offre.etaMin })}</Text>
          </View>
          <Bouton petit titre={t('course.choisir')} chargement={occupe} onPress={onChoisir} />
        </View>
      </PressableAnime>
    </Animated.View>
  );
}
