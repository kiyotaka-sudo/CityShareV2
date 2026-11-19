import React, { useEffect } from 'react';
import { Image, Text, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { couleurs, mouvement, polices } from '../../theme';
import type { EstimationService } from '../../types';
import PressableAnime from './Pressable';
import PrixAnime from './PrixAnime';
import { fcfa } from '../../utils/format';

const IMAGES = {
  DEPOT: require('../../../assets/images/service-taxi.webp'),
  RAMASSAGE: require('../../../assets/images/service-ramassage.webp'),
  MOTO: require('../../../assets/images/service-moto.webp')
};

/** Carte d'un service (dépôt, ramassage, moto) : sélection animée, prix qui défile, badges. */
export default function CarteService({ service, selectionne, onPress }: {
  service: EstimationService; selectionne: boolean; onPress: () => void;
}) {
  const { t } = useTranslation();
  const actif = useSharedValue(selectionne ? 1 : 0);
  useEffect(() => { actif.value = withTiming(selectionne ? 1 : 0, { duration: 220 }); }, [selectionne, actif]);

  const style = useAnimatedStyle(() => ({
    borderColor: interpolateColor(actif.value, [0, 1], ['#EEF1F5', couleurs.primaire]),
    backgroundColor: interpolateColor(actif.value, [0, 1], ['#FFFFFF', '#F4F7FC']),
    transform: [{ scale: withSpring(selectionne ? 1 : 0.985, mouvement.ressort) }]
  }));
  const vehicule = useAnimatedStyle(() => ({ transform: [{ scale: 0.9 + actif.value * 0.12 }, { translateX: actif.value * 2 }] }));
  const prix = service.prixReference - service.reduction;

  return (
    <PressableAnime onPress={onPress} disabled={!service.disponible} vibration="selection" echelle={0.97}>
      <Animated.View style={[{ borderWidth: 2, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
        opacity: service.disponible ? 1 : 0.45 }, style]}>
        <View style={{ width: 78, height: 58, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={vehicule}>
            <Image source={IMAGES[service.typeService]} style={{ width: 78, height: 54 }} resizeMode="contain" />
          </Animated.View>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={{ fontFamily: polices.titreDemi, fontSize: 16, color: couleurs.texte }}>{t('services.' + service.typeService)}</Text>
            {service.recommande && (
              <View style={{ backgroundColor: couleurs.vertClair, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
                <Text style={{ fontFamily: polices.texteGras, fontSize: 11, color: couleurs.vert }}>{t('reservation.recommande')}</Text>
              </View>
            )}
          </View>
          <Text style={{ fontFamily: polices.texte, fontSize: 13, color: couleurs.texteSecondaire }} numberOfLines={2}>
            {service.disponible ? t('services.desc_' + service.typeService) : t('erreursServices.' + service.motifIndisponible)}
          </Text>
          {service.disponible && (
            <Text style={{ fontFamily: polices.texteMoyen, fontSize: 12, color: service.chauffeursProches ? couleurs.primaire : couleurs.texteSecondaire }}>
              {service.chauffeursProches ? t('reservation.chauffeursProches', { n: service.chauffeursProches }) : t('reservation.aucunProche')}
            </Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <PrixAnime valeur={prix} style={{ fontFamily: polices.titre, fontSize: 18, color: couleurs.texte }} />
          {service.reduction > 0 && <Text style={{ fontFamily: polices.texte, fontSize: 12, color: couleurs.texteSecondaire, textDecorationLine: 'line-through' }}>{fcfa(service.prixReference)}</Text>}
          {service.typeService === 'RAMASSAGE' && <Text style={{ fontFamily: polices.texte, fontSize: 12, color: couleurs.texteSecondaire }}>{t('reservation.parPlace', { prix: fcfa(service.prixParPlace) })}</Text>}
        </View>
      </Animated.View>
    </PressableAnime>
  );
}
