import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Ecran, Vide } from '../../components/ui';
import PressableAnime from '../../components/anime/Pressable';
import Apparition from '../../components/anime/Apparition';
import { haptique } from '../../components/anime/haptique';
import { CARTE_NATIVE } from '../../carte/CarteMboa';
import { couleurs, ombres, polices } from '../../theme';

/** Style dont les tuiles sont les mêmes que celles de la carte MboaRide (OpenFreeMap) : elles servent ensuite hors ligne. */
const STYLE_HORS_LIGNE = 'https://tiles.openfreemap.org/styles/liberty';
const VILLES = [
  { id: 'yaounde', nom: 'Yaoundé', bornes: [11.42, 3.78, 11.6, 3.96] as [number, number, number, number] },
  { id: 'douala', nom: 'Douala', bornes: [9.62, 3.96, 9.82, 4.13] as [number, number, number, number] }
];
const ZOOM_MIN = 10;
const ZOOM_MAX = 16;

type Etat = { etat: 'absent' | 'telechargement' | 'pret'; pourcentage: number; octets: number; packId?: string };

// Module natif chargé seulement dans l'application installée (absent d'Expo Go)
const Hors = CARTE_NATIVE ? require('../../carte/horsLigne').OfflineManager : null; // eslint-disable-line @typescript-eslint/no-require-imports

const mo = (octets: number) => `${(octets / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;

/**
 * Cartes hors ligne (réseau faible, BNF-02) : téléchargement des tuiles de Yaoundé et Douala sur le téléphone.
 * La carte reste alors lisible sans connexion ; les itinéraires et les prix demandent toujours le réseau.
 */
export default function CartesHorsLigne() {
  const { t } = useTranslation();
  const [etats, setEtats] = useState<Record<string, Etat>>({});

  const lire = useCallback(async () => {
    if (!Hors) return;
    const packs = await Hors.getPacks().catch(() => []);
    const suivant: Record<string, Etat> = {};
    for (const v of VILLES) suivant[v.id] = { etat: 'absent', pourcentage: 0, octets: 0 };
    for (const p of packs) {
      const ville = p.metadata?.ville as string | undefined;
      if (!ville || !suivant[ville]) continue;
      const s = await p.status().catch(() => null);
      suivant[ville] = {
        etat: s?.state === 'complete' || (s?.percentage ?? 0) >= 100 ? 'pret' : 'telechargement',
        pourcentage: s?.percentage ?? 0, octets: s?.completedResourceSize ?? 0, packId: p.id
      };
      if (s && s.state !== 'complete' && s.percentage < 100) {
        Hors.addListener(p.id, (_: unknown, st: { percentage: number; completedResourceSize: number; state: string }) => maj(ville, st, p.id), () => undefined).catch(() => undefined);
      }
    }
    setEtats(suivant);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const maj = (ville: string, st: { percentage: number; completedResourceSize: number; state: string }, packId?: string) => {
    const fini = st.state === 'complete' || st.percentage >= 100;
    setEtats((e) => ({ ...e, [ville]: { etat: fini ? 'pret' : 'telechargement', pourcentage: st.percentage, octets: st.completedResourceSize, packId: packId ?? e[ville]?.packId } }));
    if (fini) haptique.succes();
  };

  useEffect(() => { lire(); }, [lire]);

  const telecharger = async (v: typeof VILLES[number]) => {
    if (!Hors) return;
    haptique.moyen();
    setEtats((e) => ({ ...e, [v.id]: { etat: 'telechargement', pourcentage: 0, octets: 0 } }));
    try {
      const pack = await Hors.createPack(
        { mapStyle: STYLE_HORS_LIGNE, bounds: v.bornes, minZoom: ZOOM_MIN, maxZoom: ZOOM_MAX, metadata: { ville: v.id } },
        (_: unknown, st: { percentage: number; completedResourceSize: number; state: string }) => maj(v.id, st),
        () => undefined
      );
      setEtats((e) => ({ ...e, [v.id]: { ...e[v.id], packId: pack.id } }));
    } catch (err) {
      haptique.erreur();
      Alert.alert(t('erreurs.titre'), String((err as Error)?.message ?? err));
      setEtats((e) => ({ ...e, [v.id]: { etat: 'absent', pourcentage: 0, octets: 0 } }));
    }
  };

  const supprimer = (v: typeof VILLES[number]) => {
    const id = etats[v.id]?.packId;
    if (!Hors || !id) return;
    Alert.alert(t('hors.supprimerTitre', { ville: v.nom }), t('hors.supprimerTexte'), [
      { text: t('commun.annuler'), style: 'cancel' },
      { text: t('commun.supprimer'), style: 'destructive', onPress: async () => {
        await Hors.deletePack(id).catch(() => undefined);
        setEtats((e) => ({ ...e, [v.id]: { etat: 'absent', pourcentage: 0, octets: 0 } }));
      } }
    ]);
  };

  if (!Hors) {
    return <Ecran titre={t('hors.titre')}><Vide texte={t('hors.indisponible')} icone="cloud-offline-outline" /></Ecran>;
  }

  return (
    <Ecran titre={t('hors.titre')}>
      <View style={{ flexDirection: 'row', gap: 10, backgroundColor: couleurs.primaireClair, borderRadius: 16, padding: 14 }}>
        <Ionicons name="information-circle" size={20} color={couleurs.primaire} />
        <Text style={{ flex: 1, fontFamily: polices.texte, fontSize: 14, lineHeight: 20, color: couleurs.primaireFonce }}>{t('hors.explication')}</Text>
      </View>
      {VILLES.map((v, i) => {
        const e = etats[v.id] ?? { etat: 'absent', pourcentage: 0, octets: 0 };
        return (
          <Apparition key={v.id} rang={i}>
            <View style={[{ backgroundColor: '#fff', borderRadius: 20, padding: 16, gap: 12 }, ombres.legere]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: e.etat === 'pret' ? couleurs.vertClair : couleurs.primaireClair }}>
                  <Ionicons name={e.etat === 'pret' ? 'checkmark-circle' : 'map'} size={22} color={e.etat === 'pret' ? couleurs.vert : couleurs.primaire} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: polices.titreDemi, fontSize: 16, color: couleurs.texte }}>{v.nom}</Text>
                  <Text style={{ fontFamily: polices.texte, fontSize: 13, color: couleurs.texteSecondaire }}>
                    {e.etat === 'pret' ? t('hors.pret', { taille: mo(e.octets) })
                      : e.etat === 'telechargement' ? t('hors.enCours', { pct: Math.floor(e.pourcentage), taille: mo(e.octets) })
                        : t('hors.absent')}
                  </Text>
                </View>
                {e.etat === 'absent' && (
                  <PressableAnime onPress={() => telecharger(v)} accessibilityLabel={t('hors.telecharger', { ville: v.nom })}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: couleurs.primaire, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 }}>
                    <Ionicons name="download" size={16} color="#fff" />
                    <Text style={{ fontFamily: polices.texteGras, color: '#fff' }}>{t('hors.telechargerCourt')}</Text>
                  </PressableAnime>
                )}
                {e.etat === 'pret' && (
                  <PressableAnime onPress={() => supprimer(v)} accessibilityLabel={t('commun.supprimer')}
                    style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: couleurs.rougeClair, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="trash" size={18} color={couleurs.rouge} />
                  </PressableAnime>
                )}
              </View>
              {e.etat === 'telechargement' && <Progression pct={e.pourcentage} />}
            </View>
          </Apparition>
        );
      })}
    </Ecran>
  );
}

function Progression({ pct }: { pct: number }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withTiming(Math.min(100, pct) / 100, { duration: 400 }); }, [pct]); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: '#EEF1F5', overflow: 'hidden' }}>
      <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: couleurs.accent }, style]} />
    </View>
  );
}
