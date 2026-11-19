import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeOut, SlideInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import BoutonGlisser from '../anime/BoutonGlisser';
import CurseurPrix from '../anime/CurseurPrix';
import PressableAnime from '../anime/Pressable';
import { haptique } from '../anime/haptique';
import AnneauCompteur from '../course/AnneauCompteur';
import { Bouton } from '../ui';
import { fcfa } from '../../utils/format';
import { couleurs, ombres, polices } from '../../theme';
import type { DemandeChauffeur } from '../../types';

const ATTENTE_DEFAUT_S = 60;

/**
 * Nouvelle demande en plein écran (moment 12) : elle monte avec une double vibration et un anneau de temps restant.
 * Glisser pour accepter au prix du client, ou contre-proposer une seule fois dans la fourchette autorisée.
 */
export default function DemandePleinEcran({ demande, occupe, onAccepter, onContreProposer, onIgnorer, onFermer }: {
  demande: DemandeChauffeur | null; occupe: boolean;
  onAccepter: () => void; onContreProposer: (prix: number) => void; onIgnorer: () => void; onFermer: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [restant, setRestant] = useState(ATTENTE_DEFAUT_S);
  const [total, setTotal] = useState(ATTENTE_DEFAUT_S);
  const [contre, setContre] = useState(false);
  const [prix, setPrix] = useState(0);
  const id = demande?.courseId;

  // Nouvelle demande : vibration d'alerte (le son sera ajouté avec le fichier assets/sons/nouvelle-demande.mp3)
  useEffect(() => {
    if (!demande) return undefined;
    setContre(false);
    setPrix(demande.prixPropose);
    haptique.alerte();
    const v = setTimeout(() => haptique.alerte(), 350);
    return () => clearTimeout(v);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!demande) return undefined;
    const fin = demande.offresExpireAt ? new Date(demande.offresExpireAt).getTime() : Date.now() + ATTENTE_DEFAUT_S * 1000;
    const premier = Math.max(1, Math.round((fin - Date.now()) / 1000));
    setTotal(Math.max(premier, ATTENTE_DEFAUT_S));
    const maj = () => {
      const r = Math.max(0, Math.round((fin - Date.now()) / 1000));
      setRestant(r);
      if (r === 0) onFermer();
    };
    maj();
    const i = setInterval(maj, 1000);
    return () => clearInterval(i);
  }, [id, demande?.offresExpireAt]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!demande) return null;
  const d = demande;
  const fr = (v: number) => String(v).replace('.', ',');

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onFermer}>
      {/* Une fenêtre modale a sa propre racine : sans elle, les gestes (glisser, curseur) n'y fonctionnent pas */}
      <GestureHandlerRootView style={{ flex: 1 }}>
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}
        style={{ flex: 1, backgroundColor: 'rgba(2,31,64,0.55)', justifyContent: 'flex-end' }}>
        <Animated.View entering={SlideInDown.springify().damping(18).stiffness(160)}
          style={[{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '94%', paddingBottom: insets.bottom + 12 }, ombres.forte]}>
          {/* En-tête : service, temps restant, prix proposé */}
          <View style={{ backgroundColor: couleurs.primaire, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ gap: 6 }}>
                <Text style={{ fontFamily: polices.texteGras, fontSize: 13, color: couleurs.accent, letterSpacing: 1 }}>{t('chauffeur.nouvelleDemande').toUpperCase()}</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Puce texte={t('services.' + d.typeService)} />
                  {d.nbPlaces > 1 && <Puce texte={t('chauffeur.places', { n: d.nbPlaces })} />}
                  {d.tour > 1 && <Puce texte={t('chauffeur.relance')} />}
                </View>
              </View>
              <View style={{ backgroundColor: '#fff', borderRadius: 40, padding: 3 }}>
                <AnneauCompteur restant={restant} total={total} taille={62} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontFamily: polices.texte, fontSize: 13, color: '#C9D6E8' }}>{d.negociable ? t('chauffeur.prixClient') : t('course.prixFixe')}</Text>
                <Text style={{ fontFamily: polices.titre, fontSize: 38, color: '#fff', lineHeight: 46 }}>{fcfa(d.prixPropose)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="star" size={14} color={couleurs.jaune} />
                  <Text style={{ fontFamily: polices.texteGras, color: '#fff' }}>{d.clientPrenom} · {d.clientNote ? d.clientNote.toFixed(1) : '—'}</Text>
                </View>
                <Text style={{ fontFamily: polices.texteMoyen, fontSize: 13, color: '#C9D6E8' }}>{t('paiements.' + d.modePaiement)}</Text>
              </View>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }} bounces={false}>
            {/* Trajet : prise en charge puis destination */}
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <View style={{ alignItems: 'center', paddingTop: 4 }}>
                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: couleurs.primaire, borderWidth: 3, borderColor: couleurs.primaireClair }} />
                <View style={{ width: 2, flex: 1, backgroundColor: '#D7DEE8', marginVertical: 4 }} />
                <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: couleurs.accent }} />
              </View>
              <View style={{ flex: 1, gap: 18 }}>
                <View style={{ gap: 2 }}>
                  <Text style={{ fontFamily: polices.texteGras, fontSize: 13, color: couleurs.primaire }}>
                    {t('chauffeur.priseEnChargeA', { km: fr(d.distancePriseEnChargeKm) })}
                  </Text>
                  <Text style={{ fontFamily: polices.titreDemi, fontSize: 17, color: couleurs.texte }} numberOfLines={2}>{d.depart.adresse}</Text>
                  {d.depart.repere ? <Text style={{ fontFamily: polices.texte, fontSize: 13, color: couleurs.texteSecondaire }}>📍 {d.depart.repere}</Text> : null}
                </View>
                <View style={{ gap: 2 }}>
                  <Text style={{ fontFamily: polices.texteGras, fontSize: 13, color: couleurs.accentFonce }}>
                    {t('chauffeur.trajetDe', { km: fr(d.distanceKm), min: d.dureeMin })}
                  </Text>
                  <Text style={{ fontFamily: polices.titreDemi, fontSize: 17, color: couleurs.texte }} numberOfLines={2}>{d.arrivee.adresse}</Text>
                </View>
              </View>
            </View>

            {contre ? (
              <Animated.View entering={FadeInDown.springify().damping(16)} style={{ backgroundColor: couleurs.fond, borderRadius: 18, padding: 16, gap: 12 }}>
                <Text style={{ fontFamily: polices.titreDemi, fontSize: 15, color: couleurs.texte }}>{t('chauffeur.votreContre')}</Text>
                <CurseurPrix vue="chauffeur" min={d.prixMin} max={d.prixMax} reference={d.prixPropose} valeur={prix} onChange={setPrix} />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Bouton style={{ flex: 1 }} variante="contour" titre={t('commun.annuler')} onPress={() => setContre(false)} />
                  <Bouton style={{ flex: 1.4 }} variante="accent" titre={t('chauffeur.envoyerPrix', { prix: fcfa(prix) })} chargement={occupe}
                    desactive={prix === d.prixPropose} onPress={() => onContreProposer(prix)} />
                </View>
              </Animated.View>
            ) : (
              <View style={{ gap: 12 }}>
                <BoutonGlisser libelle={t('chauffeur.glisserAccepterCourt')} chargement={occupe} onValide={onAccepter} />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {d.negociable && (
                    <PressableAnime onPress={() => { haptique.selection(); setContre(true); }}
                      style={{ flex: 1, height: 54, borderRadius: 16, backgroundColor: couleurs.accentClair, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
                      <Ionicons name="swap-vertical" size={20} color={couleurs.accentFonce} />
                      <Text style={{ fontFamily: polices.texteGras, fontSize: 15, color: couleurs.accentFonce }}>{t('chauffeur.contreProposer')}</Text>
                    </PressableAnime>
                  )}
                  <PressableAnime onPress={onIgnorer}
                    style={{ flex: 1, height: 54, borderRadius: 16, backgroundColor: couleurs.fond, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
                    <Ionicons name="close" size={20} color={couleurs.texteSecondaire} />
                    <Text style={{ fontFamily: polices.texteGras, fontSize: 15, color: couleurs.texteSecondaire }}>{t('chauffeur.ignorer')}</Text>
                  </PressableAnime>
                </View>
                <Pressable onPress={onFermer} hitSlop={8} style={{ alignSelf: 'center', paddingVertical: 4 }}>
                  <Text style={{ fontFamily: polices.texteMoyen, fontSize: 13, color: couleurs.texteSecondaire }}>{t('chauffeur.voirPlusTard')}</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function Puce({ texte }: { texte: string }) {
  return (
    <View style={{ backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 }}>
      <Text style={{ fontFamily: polices.texteGras, fontSize: 12, color: '#fff' }}>{texte}</Text>
    </View>
  );
}
