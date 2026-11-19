import React, { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Api } from '../api';
import { adresseInverse, rechercherAdresse } from '../utils/geocodage';
import type { Lieu as LieuFavori, Point, Repere } from '../types';
import { couleurs, espace } from '../theme';
import { Bouton, Champ, s } from './ui';
import CarteMboa from '../carte/CarteMboa';

interface Suggestion { cle: string; titre: string; detail?: string; icone: keyof typeof Ionicons.glyphMap; point: Point }

/**
 * Choix d'un lieu : position GPS, lieux favoris (BF-35), repères populaires (BF-33/34), adresses OpenStreetMap,
 * ou pointage sur la carte. Le client peut préciser un repère libre (« devant la pharmacie »).
 */
export default function ChoixLieu({ visible, titre, position, avecPrecision, onChoix, onFermer }: {
  visible: boolean; titre: string; position?: { lat: number; lng: number } | null; avecPrecision?: boolean;
  onChoix: (p: Point) => void; onFermer: () => void;
}) {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [favoris, setFavoris] = useState<LieuFavori[]>([]);
  const [reperes, setReperes] = useState<Repere[]>([]);
  const [adresses, setAdresses] = useState<Suggestion[]>([]);
  const [choisi, setChoisi] = useState<Point | null>(null);
  const [precision, setPrecision] = useState('');
  const [modeCarte, setModeCarte] = useState(false);
  const [pointCarte, setPointCarte] = useState<{ lat: number; lng: number } | null>(null);
  const minuterie = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!visible) return;
    setQ(''); setChoisi(null); setPrecision(''); setModeCarte(false); setPointCarte(null);
    Api.moi.lieux().then(setFavoris).catch(() => undefined);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Repères les plus proches d'abord ; rechargés dès que la position GPS est connue
  useEffect(() => {
    if (!visible || q.trim().length >= 2) return;
    Api.reperes.rechercher(undefined, position?.lat, position?.lng).then((r) => setReperes(r.slice(0, 15))).catch(() => undefined);
  }, [visible, position?.lat, position?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    clearTimeout(minuterie.current);
    if (q.trim().length < 2) { setAdresses([]); return; }
    minuterie.current = setTimeout(async () => {
      Api.reperes.rechercher(q, position?.lat, position?.lng).then(setReperes).catch(() => undefined);
      const osm = await rechercherAdresse(q);
      setAdresses(osm.map((a, i) => ({ cle: 'osm' + i, titre: a.adresse.split(',')[0], detail: a.adresse, icone: 'location-outline', point: { lat: a.lat, lng: a.lng, adresse: a.adresse } })));
    }, 450);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const suggestions: Suggestion[] = [
    ...(position && !q ? [{ cle: 'gps', titre: t('lieu.maPosition'), icone: 'navigate' as const, point: { lat: position.lat, lng: position.lng, adresse: '' } }] : []),
    ...favoris.filter((f) => !q || f.libelle.toLowerCase().includes(q.toLowerCase()))
      .map((f) => ({ cle: 'fav' + f.id, titre: f.libelle, detail: f.adresse, icone: 'star' as const, point: { lat: f.latitude, lng: f.longitude, adresse: f.adresse } })),
    ...reperes.map((r) => ({ cle: 'rep' + r.id, titre: r.nom, detail: `${t('categories.' + r.categorie)} · ${r.ville}`, icone: 'flag' as const,
      point: { lat: r.lat, lng: r.lng, adresse: r.nom, repere: r.nom } })),
    ...adresses
  ];

  const selectionner = async (sug: Suggestion) => {
    let p = sug.point;
    if (!p.adresse) p = { ...p, adresse: await adresseInverse(p.lat, p.lng) };
    if (avecPrecision) setChoisi(p);
    else onChoix(p);
  };

  const validerCarte = async () => {
    if (!pointCarte) return;
    const adresse = await adresseInverse(pointCarte.lat, pointCarte.lng);
    const p = { ...pointCarte, adresse };
    setModeCarte(false);
    if (avecPrecision) setChoisi(p); else onChoix(p);
  };

  const proposerRepere = () => {
    if (!choisi || !precision.trim()) return;
    Alert.alert(t('lieu.proposerTitre'), t('lieu.proposerTexte', { nom: precision.trim() }), [
      { text: t('commun.annuler'), style: 'cancel' },
      { text: t('lieu.proposer'), onPress: () => Api.reperes.proposer({ nom: precision.trim(), categorie: 'AUTRE', ville: 'Yaoundé', lat: choisi.lat, lng: choisi.lng })
        .then(() => Alert.alert(t('lieu.merci'))).catch(() => undefined) }
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onFermer}>
      <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: couleurs.fond }}>
        <View style={s.entete}>
          <Pressable onPress={onFermer} hitSlop={12}><Ionicons name="close" size={26} color={couleurs.texte} /></Pressable>
          <Text style={s.enteteTitre}>{titre}</Text>
        </View>
        {modeCarte ? (
          <View style={{ flex: 1 }}>
            <CarteMboa centre={position ?? undefined} ajuster={false} zoom={15} onPress={(c) => setPointCarte(c)}
              points={pointCarte ? [{ id: 'p', type: 'arrivee', ...pointCarte }] : []} />
            <View style={{ padding: espace.m, gap: espace.s, backgroundColor: '#fff' }}>
              <Text style={s.secondaire}>{t('lieu.toucherCarte')}</Text>
              <Bouton titre={t('commun.valider')} onPress={validerCarte} desactive={!pointCarte} />
            </View>
          </View>
        ) : choisi ? (
          <View style={{ padding: espace.m, gap: espace.m }}>
            <Text style={s.gras}>{choisi.adresse}</Text>
            <Champ libelle={t('lieu.precision')} placeholder={t('lieu.precisionExemple')} value={precision} onChangeText={setPrecision} maxLength={120} />
            <Bouton titre={t('commun.valider')} onPress={() => onChoix({ ...choisi, repere: precision.trim() || choisi.repere })} />
            {precision.trim().length > 3 && <Bouton variante="contour" petit icone="flag-outline" titre={t('lieu.proposerRepere')} onPress={proposerRepere} />}
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <View style={{ padding: espace.m, gap: espace.s }}>
              <Champ placeholder={t('lieu.rechercher')} value={q} onChangeText={setQ} autoFocus />
              <Pressable onPress={() => setModeCarte(true)} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Ionicons name="map-outline" size={20} color={couleurs.primaire} /><Text style={{ color: couleurs.primaire, fontWeight: '600' }}>{t('lieu.surCarte')}</Text>
              </Pressable>
            </View>
            <FlatList data={suggestions} keyExtractor={(i) => i.cle} keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#EEF0EF' }} />}
              renderItem={({ item }) => (
                <Pressable style={s.ligne} onPress={() => selectionner(item)}>
                  <Ionicons name={item.icone} size={22} color={item.icone === 'star' ? couleurs.jaune : couleurs.primaire} />
                  <View style={{ flex: 1 }}><Text style={s.ligneTexte}>{item.titre}</Text>{item.detail ? <Text style={s.sousTexte} numberOfLines={1}>{item.detail}</Text> : null}</View>
                </Pressable>
              )} />
          </View>
        )}
      </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
