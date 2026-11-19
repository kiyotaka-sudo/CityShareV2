import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Api } from '../../api';
import { messageErreur } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useEvenement } from '../../context/TempsReelContext';
import { useEnvoiPosition } from '../../hooks/useEnvoiPosition';
import { usePosition } from '../../hooks/usePosition';
import CarteMboa, { VehiculeCarte } from '../../carte/CarteMboa';
import { AUCUN_VEHICULE } from '../../carte/types';
import ChoixLieu from '../../components/ChoixLieu';
import { Bouton } from '../../components/ui';
import PanneauGlissant from '../../components/anime/PanneauGlissant';
import PressableAnime from '../../components/anime/Pressable';
import PrixAnime from '../../components/anime/PrixAnime';
import BoutonGlisser from '../../components/anime/BoutonGlisser';
import Apparition from '../../components/anime/Apparition';
import { haptique } from '../../components/anime/haptique';
import DemandePleinEcran from '../../components/chauffeur/DemandePleinEcran';
import { fcfa } from '../../utils/format';
import { couleurs, ombres, polices } from '../../theme';
import type { Course, DemandeChauffeur, GainsPeriode } from '../../types';
import type { Routes } from '../../navigation/RootNavigator';

const FILE = '/user/queue/demandes';

/**
 * Accueil chauffeur sur carte plein écran (sombre la nuit) : gains du jour animés, bouton « glisser pour passer en ligne »
 * (BF-53, moment 11), zones de forte demande qui pulsent (BF-56), mode ramassage (BF-16), demandes reçues (BF-54)
 * présentées en plein écran (moment 12) avec acceptation ou contre-proposition unique (BF-24).
 */
export default function AccueilChauffeur() {
  const { t } = useTranslation();
  const { utilisateur: u, mettreAJour, rafraichir } = useAuth();
  const nav = useNavigation<StackNavigationProp<Routes>>();
  const { position, actualiser } = usePosition();
  const [moi, setMoi] = useState(position);
  const [demandes, setDemandes] = useState<DemandeChauffeur[]>([]);
  const [actives, setActives] = useState<Course[]>([]);
  const [jour, setJour] = useState<GainsPeriode | null>(null);
  const [zones, setZones] = useState<{ lat: number; lng: number; demandes: number }[]>([]);
  const [voirZones, setVoirZones] = useState(true);
  const [ouverte, setOuverte] = useState<number | null>(null);
  const [vues, setVues] = useState<number[]>([]);
  const [choixDirection, setChoixDirection] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const ch = u?.chauffeur;
  const disponible = !!ch?.disponible;

  useEnvoiPosition(disponible || actives.length > 0, (lat, lng) => setMoi({ lat, lng }));
  useEffect(() => { if (position) setMoi(position); }, [position]);

  const charger = useCallback(async () => {
    Api.chauffeur.coursesActives().then(setActives).catch(() => undefined);
    Api.chauffeur.gains().then((g) => setJour(g.jour)).catch(() => undefined);
    if (disponible) Api.chauffeur.demandes().then(setDemandes).catch(() => undefined);
    else setDemandes([]);
  }, [disponible]);

  useFocusEffect(useCallback(() => {
    rafraichir();
    charger();
    const id = setInterval(charger, 6000);
    return () => clearInterval(id);
  }, [charger, rafraichir]));

  useEffect(() => {
    if (!voirZones) return undefined;
    const lire = () => Api.chauffeur.zonesDemande().then(setZones).catch(() => undefined);
    lire();
    const id = setInterval(lire, 60000);
    return () => clearInterval(id);
  }, [voirZones]);

  useEvenement<any>(FILE, ['NOUVELLE_DEMANDE', 'OFFRE_REJETEE', 'COURSE_ATTRIBUEE', 'COURSE_ANNULEE'], (data, type) => {
    if (type === 'NOUVELLE_DEMANDE') setDemandes((l) => [data, ...l.filter((d) => d.courseId !== data.courseId)]);
    else if (type === 'OFFRE_REJETEE' || type === 'COURSE_ANNULEE') setDemandes((l) => l.filter((d) => d.courseId !== data.courseId));
    else if (type === 'COURSE_ATTRIBUEE') {
      haptique.succes();
      charger();
      nav.navigate('CourseChauffeur', { courseId: data.id });
    }
  });

  // La plus récente demande sans réponse s'ouvre d'elle-même en plein écran (une seule fois)
  const enAttente = useMemo(() => demandes.filter((d) => !d.dejaRepondu && !d.datePlanifiee), [demandes]);
  useEffect(() => {
    if (ouverte !== null || !disponible) return;
    const nouvelle = enAttente.find((d) => !vues.includes(d.courseId));
    if (nouvelle) { setOuverte(nouvelle.courseId); setVues((v) => [...v, nouvelle.courseId]); }
  }, [enAttente, ouverte, disponible]); // eslint-disable-line react-hooks/exhaustive-deps
  const demandeOuverte = demandes.find((d) => d.courseId === ouverte && !d.dejaRepondu) ?? null;

  const executer = async (fn: () => Promise<unknown>) => {
    setOccupe(true);
    try { await fn(); } catch (e) { haptique.erreur(); Alert.alert(t('erreurs.titre'), messageErreur(e)); } finally { setOccupe(false); }
  };

  const passer = (enLigne: boolean) => executer(async () => {
    const p = enLigne ? await actualiser() : null;
    mettreAJour(await Api.chauffeur.disponibilite(enLigne, p?.lat, p?.lng));
    if (enLigne) setVoirZones(true);
  });

  const repondre = (d: DemandeChauffeur, prix?: number) => {
    const envoyer = (casque?: boolean) => executer(async () => {
      await Api.chauffeur.repondre(d.courseId, { type: prix ? 'CONTRE_PROPOSITION' : 'ACCEPTATION', prix, casqueConfirme: casque });
      setOuverte(null);
      setDemandes((l) => l.map((x) => (x.courseId === d.courseId ? { ...x, dejaRepondu: true } : x)));
    });
    if (d.typeService === 'MOTO') {
      Alert.alert(t('chauffeur.casqueTitre'), t('chauffeur.casqueQuestion'), [
        { text: t('commun.non'), style: 'cancel' }, { text: t('commun.oui'), onPress: () => envoyer(true) }
      ]);
    } else envoyer();
  };

  const ignorer = (d: DemandeChauffeur) => {
    setOuverte(null);
    setDemandes((l) => l.filter((x) => x.courseId !== d.courseId));
    Api.chauffeur.ignorer(d.courseId).catch(() => undefined);
  };

  const ramassage = (actif: boolean, places?: number, direction?: { lat: number; lng: number; adresse: string }) => executer(async () => {
    mettreAJour(await Api.chauffeur.ramassage({
      actif, placesLibres: places ?? (ch?.placesLibres || ch?.vehicule?.nbPlaces || 4),
      directionLibelle: direction?.adresse ?? ch?.directionLibelle, directionLat: direction?.lat ?? ch?.directionLat, directionLng: direction?.lng ?? ch?.directionLng
    }));
  });

  const vehicule: VehiculeCarte[] = useMemo(() => (moi && ch
    ? [{ id: 'moi', lat: moi.lat, lng: moi.lng, type: ch.typeService === 'MOTO' ? 'MOTO' : ch.modeRamassage ? 'RAMASSAGE' : 'TAXI' }]
    : AUCUN_VEHICULE), [moi?.lat, moi?.lng, ch?.typeService, ch?.modeRamassage]); // eslint-disable-line react-hooks/exhaustive-deps
  const zonesCarte = useMemo(() => (voirZones ? zones.map((z) => ({ lat: z.lat, lng: z.lng, intensite: z.demandes })) : []), [voirZones, zones]);

  if (!u || !ch) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text>{t('chauffeur.profilAbsent')}</Text></View>;
  }
  const bloque = u.statut !== 'ACTIF';

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <CarteMboa style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} centre={moi ?? undefined} ajuster={false} zoom={14}
        nuit="auto" vehicules={vehicule} zonesChaudes={zonesCarte} marges={{ bas: 260 }} />

      {/* Haut : gains du jour et zones de forte demande */}
      <SafeAreaView edges={['top']} pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 8 }}>
        <View pointerEvents="box-none" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <PressableAnime onPress={() => nav.navigate('Onglets', { screen: 'Gains' } as never)} echelle={0.95}
            style={[{ backgroundColor: couleurs.primaire, borderRadius: 22, paddingVertical: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }, ombres.moyenne]}>
            <View>
              <Text style={{ fontFamily: polices.texteMoyen, fontSize: 11, color: '#C9D6E8' }}>{t('chauffeur.gainsDuJour')}</Text>
              <PrixAnime valeur={jour?.gainsNets ?? 0} duree={900} style={{ fontFamily: polices.titre, fontSize: 20, color: '#fff' }} />
            </View>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="car" size={13} color={couleurs.accent} />
              <Text style={{ fontFamily: polices.texteGras, fontSize: 13, color: '#fff' }}>{jour?.nbCourses ?? 0}</Text>
            </View>
          </PressableAnime>
          <PressableAnime onPress={() => setVoirZones((v) => !v)} vibration="selection"
            style={[{ backgroundColor: voirZones ? couleurs.accent : '#fff', borderRadius: 22, paddingHorizontal: 14, height: 44, flexDirection: 'row', alignItems: 'center', gap: 6 }, ombres.moyenne]}>
            <Ionicons name="flame" size={18} color={voirZones ? '#fff' : couleurs.accent} />
            <Text style={{ fontFamily: polices.texteGras, fontSize: 13, color: voirZones ? '#fff' : couleurs.texte }}>{t('chauffeur.zonesDemande')}</Text>
          </PressableAnime>
        </View>
      </SafeAreaView>

      <PanneauGlissant crans={['34%', '62%', '90%']} index={0}>
        {bloque ? (
          <View style={{ flexDirection: 'row', gap: 12, backgroundColor: couleurs.accentClair, borderRadius: 18, padding: 16 }}>
            <Ionicons name={u.statut === 'INACTIF' ? 'time' : 'lock-closed'} size={26} color={couleurs.accentFonce} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontFamily: polices.titreDemi, fontSize: 16, color: couleurs.texte }}>{u.statut === 'INACTIF' ? t('chauffeur.enAttente') : t('chauffeur.suspendu')}</Text>
              <Text style={{ fontFamily: polices.texte, fontSize: 14, color: couleurs.texte }}>{u.statut === 'INACTIF' ? t('chauffeur.enAttenteTexte') : t('chauffeur.suspenduTexte')}</Text>
            </View>
          </View>
        ) : disponible ? (
          <Animated.View entering={FadeIn} layout={LinearTransition} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <PointEnLigne />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: polices.titre, fontSize: 20, color: couleurs.vert }}>{t('chauffeur.enLigne')}</Text>
              <Text style={{ fontFamily: polices.texte, fontSize: 13, color: couleurs.texteSecondaire }}>
                {enAttente.length ? t('chauffeur.demandesEnAttente', { count: enAttente.length }) : t('chauffeur.aucuneDemande')}
              </Text>
            </View>
            <PressableAnime onPress={() => passer(false)} disabled={occupe}
              style={{ paddingHorizontal: 16, height: 44, borderRadius: 22, backgroundColor: couleurs.fond, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="pause" size={16} color={couleurs.texte} />
              <Text style={{ fontFamily: polices.texteGras, color: couleurs.texte }}>{t('chauffeur.pause')}</Text>
            </PressableAnime>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn} layout={LinearTransition} style={{ gap: 10 }}>
            <Text style={{ fontFamily: polices.titreDemi, fontSize: 17, color: couleurs.texte }}>{t('chauffeur.horsLigne')}</Text>
            <BoutonGlisser libelle={t('chauffeur.glisserEnLigne')} icone="power" chargement={occupe} onValide={() => passer(true)} />
          </Animated.View>
        )}

        {!ch.documentsAJour && (
          <View style={{ flexDirection: 'row', gap: 8, backgroundColor: couleurs.rougeClair, padding: 12, borderRadius: 14 }}>
            <Ionicons name="document-text" size={18} color={couleurs.rouge} />
            <Text style={{ flex: 1, fontFamily: polices.texteMoyen, fontSize: 13, color: couleurs.rouge }}>{t('chauffeur.documentsInvalides')}</Text>
          </View>
        )}
        {u.solde < 0 && <Text style={{ fontFamily: polices.texteMoyen, fontSize: 13, color: couleurs.accentFonce }}>{t('chauffeur.soldeNegatif', { solde: fcfa(u.solde) })}</Text>}

        {actives.map((c) => (
          <Apparition key={c.id}>
            <PressableAnime onPress={() => nav.navigate('CourseChauffeur', { courseId: c.id })}
              style={{ backgroundColor: couleurs.primaire, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="navigate" size={22} color={couleurs.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: polices.texteGras, fontSize: 15, color: '#fff' }}>{t('statuts.' + c.statut)} · {c.client.prenom}</Text>
                <Text style={{ fontFamily: polices.texte, fontSize: 13, color: '#C9D6E8' }} numberOfLines={1}>{c.statut === 'EN_COURS' ? c.arrivee.adresse : c.depart.adresse}</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#fff" />
            </PressableAnime>
          </Apparition>
        ))}

        {/* Demandes : cartes compactes, un appui rouvre le plein écran */}
        {disponible && demandes.length > 0 && (
          <Text style={{ fontFamily: polices.titreDemi, fontSize: 16, color: couleurs.texte }}>{t('chauffeur.demandes')} ({demandes.length})</Text>
        )}
        {demandes.map((d, i) => (
          <Apparition key={d.courseId} rang={i}>
            <PressableAnime disabled={d.dejaRepondu} onPress={() => setOuverte(d.courseId)}
              style={[{ backgroundColor: '#fff', borderRadius: 18, padding: 14, gap: 6, borderWidth: 1, borderColor: '#EEF1F5' }, ombres.legere]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: polices.texteGras, fontSize: 13, color: couleurs.primaire }}>
                  {t('services.' + d.typeService)} · {t('chauffeur.priseEnChargeA', { km: String(d.distancePriseEnChargeKm).replace('.', ',') })}
                </Text>
                <Text style={{ fontFamily: polices.titre, fontSize: 18, color: couleurs.texte }}>{fcfa(d.prixPropose)}</Text>
              </View>
              <Text style={{ fontFamily: polices.texte, fontSize: 14, color: couleurs.texte }} numberOfLines={1}>{d.depart.adresse} → {d.arrivee.adresse}</Text>
              {d.dejaRepondu && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="checkmark-circle" size={16} color={couleurs.vert} />
                  <Text style={{ fontFamily: polices.texteGras, fontSize: 13, color: couleurs.vert }}>{t('chauffeur.offreEnvoyee')}</Text>
                </View>
              )}
            </PressableAnime>
          </Apparition>
        ))}

        {ch.typeService === 'TAXI' && !bloque && (
          <View style={{ backgroundColor: couleurs.fond, borderRadius: 18, padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: couleurs.vertClair, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="people" size={20} color={couleurs.vert} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: polices.texteGras, fontSize: 15, color: couleurs.texte }}>{t('chauffeur.modeRamassage')}</Text>
                <Text style={{ fontFamily: polices.texte, fontSize: 13, color: couleurs.texteSecondaire }}>{t('chauffeur.modeRamassageAide')}</Text>
              </View>
              <Switch value={ch.modeRamassage} trackColor={{ true: couleurs.vert }}
                onValueChange={(v) => { haptique.selection(); if (v && !ch.directionLat) setChoixDirection(true); else ramassage(v); }} />
            </View>
            {ch.modeRamassage && (
              <Animated.View entering={FadeInDown.springify().damping(16)} exiting={FadeOut} style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: polices.texteMoyen, color: couleurs.texte }}>{t('chauffeur.placesLibres')}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <Bouton petit variante="secondaire" titre="−" onPress={() => executer(async () => mettreAJour(await Api.chauffeur.places(Math.max(0, ch.placesLibres - 1))))} />
                    <Text style={{ fontFamily: polices.titre, fontSize: 20, color: couleurs.texte }}>{ch.placesLibres}</Text>
                    <Bouton petit variante="secondaire" titre="+" onPress={() => executer(async () => mettreAJour(await Api.chauffeur.places(ch.placesLibres + 1)))} />
                  </View>
                </View>
                <PressableAnime onPress={() => setChoixDirection(true)} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <Ionicons name="compass" size={20} color={couleurs.primaire} />
                  <Text style={{ flex: 1, fontFamily: polices.texte, color: couleurs.texte }} numberOfLines={1}>
                    {t('chauffeur.direction')} : <Text style={{ fontFamily: polices.texteGras }}>{ch.directionLibelle ?? '—'}</Text>
                  </Text>
                  <Text style={{ fontFamily: polices.texteGras, color: couleurs.primaire }}>{t('commun.modifier')}</Text>
                </PressableAnime>
              </Animated.View>
            )}
          </View>
        )}
      </PanneauGlissant>

      <DemandePleinEcran demande={demandeOuverte} occupe={occupe}
        onAccepter={() => demandeOuverte && repondre(demandeOuverte)}
        onContreProposer={(prix) => demandeOuverte && repondre(demandeOuverte, prix)}
        onIgnorer={() => demandeOuverte && ignorer(demandeOuverte)}
        onFermer={() => setOuverte(null)} />

      <ChoixLieu visible={choixDirection} titre={t('chauffeur.direction')} position={moi} onFermer={() => setChoixDirection(false)}
        onChoix={(p) => { setChoixDirection(false); ramassage(true, undefined, p); }} />
    </View>
  );
}

/** Point vert qui pulse : le chauffeur est visible des clients. */
function PointEnLigne() {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withRepeat(withTiming(1, { duration: 1400 }), -1, false); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const onde = useAnimatedStyle(() => ({ opacity: 0.5 * (1 - p.value), transform: [{ scale: 1 + p.value * 1.4 }] }));
  return (
    <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: couleurs.vert }, onde]} />
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: couleurs.vert, borderWidth: 3, borderColor: '#fff' }} />
    </View>
  );
}
