import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, Linking, Pressable, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, LinearTransition, ZoomIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Api } from '../../api';
import { messageErreur } from '../../api/client';
import { useEvenement } from '../../context/TempsReelContext';
import { useAuth } from '../../context/AuthContext';
import CarteMboa, { PointCarte, VehiculeCarte } from '../../carte/CarteMboa';
import { AUCUN_VEHICULE } from '../../carte/types';
import { longueurTrace, projeter } from '../../carte/geo';
import BoutonSOS from '../../components/BoutonSOS';
import { Avatar, Bouton, Champ, Chargement } from '../../components/ui';
import PanneauGlissant from '../../components/anime/PanneauGlissant';
import PressableAnime from '../../components/anime/Pressable';
import PrixAnime from '../../components/anime/PrixAnime';
import Apparition from '../../components/anime/Apparition';
import { SqueletteCarte } from '../../components/anime/Squelette';
import { haptique } from '../../components/anime/haptique';
import AnneauCompteur from '../../components/course/AnneauCompteur';
import CarteOffre from '../../components/course/CarteOffre';
import CodeVerification from '../../components/course/CodeVerification';
import BanniereArrivee from '../../components/course/BanniereArrivee';
import BarreProgression from '../../components/course/BarreProgression';
import PlaqueImmatriculation from '../../components/course/PlaqueImmatriculation';
import EtoilesAnimees from '../../components/course/EtoilesAnimees';
import Confettis from '../../components/course/Confettis';
import { fcfa, dateHeure } from '../../utils/format';
import { couleurs, ombres, polices } from '../../theme';
import type { Course, Offre, Paiement, TypeService } from '../../types';
import type { Routes } from '../../navigation/RootNavigator';
import { useRetourAccueil } from '../../hooks/useRetourAccueil';

const FILE = '/user/queue/courses';
const H = Dimensions.get('window').height;
const VITESSE_URBAINE_M_MIN = 400; // ≈ 24 km/h en ville, pour estimer un temps restant sans ETA serveur
const COMMENTAIRES_RAPIDES = ['ponctuel', 'prudent', 'propre', 'courtois', 'itineraire'] as const;

type Phase = 'recherche' | 'approche' | 'trajet' | 'fin' | 'autre';

const typeCarte = (t: TypeService): VehiculeCarte['type'] => (t === 'MOTO' ? 'MOTO' : t === 'RAMASSAGE' ? 'RAMASSAGE' : 'TAXI');

/**
 * Course côté client, sur une carte plein écran avec panneau glissant :
 * radar et offres en cascade (moment 6), chauffeur qui roule le long de la route (7), code retourné (8),
 * progression du trajet (9), puis fin de course avec confettis, notation et reçu (10).
 */
export default function CourseClient({ navigation, route }: StackScreenProps<Routes, 'CourseClient'>) {
  useRetourAccueil();
  const { t, i18n } = useTranslation();
  const { rafraichir } = useAuth();
  const { courseId } = route.params;
  const [course, setCourse] = useState<Course | null>(null);
  const [offres, setOffres] = useState<Offre[]>([]);
  const [position, setPosition] = useState<{ lat: number; lng: number; cap?: number; eta?: number } | null>(null);
  const [trace, setTrace] = useState<{ lat: number; lng: number }[]>([]);
  const [proches, setProches] = useState<VehiculeCarte[]>(AUCUN_VEHICULE);
  const [restant, setRestant] = useState(0);
  const [attenteTotale, setAttenteTotale] = useState(60);
  const [paiement, setPaiement] = useState<Paiement | null>(null);
  const [note, setNote] = useState(0);
  const [rapides, setRapides] = useState<string[]>([]);
  const [commentaire, setCommentaire] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [fete, setFete] = useState(false);
  const statutPrecedent = useRef<string | null>(null);

  const charger = useCallback(async () => {
    try {
      const c = await Api.courses.detail(courseId);
      setCourse(c);
      if (c.chauffeur?.lat && c.chauffeur.lng) {
        setPosition((p) => (p ? p : { lat: c.chauffeur!.lat!, lng: c.chauffeur!.lng! }));
      }
      if (c.statut === 'RECHERCHE') setOffres(await Api.courses.offres(courseId));
      if (c.statut === 'TERMINEE' && c.modePaiement !== 'ESPECES' && c.statutPaiement !== 'PAYE') {
        Api.courses.paiement(courseId).then(setPaiement).catch(() => undefined);
      }
    } catch { /* réseau : on réessaie au prochain cycle */ }
  }, [courseId]);

  // Temps réel + relève périodique (secours en réseau faible)
  useEffect(() => {
    charger();
    const id = setInterval(charger, 5000);
    return () => clearInterval(id);
  }, [charger]);

  useEvenement<any>(FILE, ['NOUVELLE_OFFRE', 'CHAUFFEUR_ASSIGNE', 'STATUT', 'RELANCE', 'PAIEMENT', 'PAIEMENT_DEMANDE', 'POSITION'], (data, type) => {
    if (data?.courseId && data.courseId !== courseId && data.id !== courseId) return;
    if (type === 'POSITION') setPosition({ lat: data.lat, lng: data.lng, cap: data.cap, eta: data.etaMin });
    else if (type === 'NOUVELLE_OFFRE') setOffres((o) => [...o.filter((x) => x.id !== data.id), data]);
    else if (type === 'PAIEMENT_DEMANDE') setPaiement(data);
    else charger();
  });

  // Transitions marquantes : arrivée du chauffeur, fin de course
  useEffect(() => {
    if (!course) return;
    const avant = statutPrecedent.current;
    statutPrecedent.current = course.statut;
    // Fin vécue en direct, ou écran ouvert juste après la fin (depuis la notification ou l'accueil)
    const finRecente = !avant && course.statut === 'TERMINEE' && !course.dejaNote && !!course.finAt
      && Date.now() - new Date(course.finAt).getTime() < 2 * 60 * 1000;
    if ((avant && avant !== course.statut && course.statut === 'TERMINEE') || finRecente) {
      haptique.succes();
      setFete(true);
      setTimeout(() => setFete(false), 3500);
    }
    if (avant === 'RECHERCHE' && course.statut === 'ACCEPTEE') haptique.succes();
  }, [course?.statut]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compte à rebours de la négociation
  useEffect(() => {
    if (!course?.offresExpireAt || course.statut !== 'RECHERCHE') return undefined;
    const fin = new Date(course.offresExpireAt).getTime();
    const premier = Math.max(0, Math.round((fin - Date.now()) / 1000));
    setAttenteTotale((tot) => Math.max(premier, course.tourNegociation > 1 ? premier : tot, 1));
    const maj = () => setRestant(Math.max(0, Math.round((fin - Date.now()) / 1000)));
    maj();
    const id = setInterval(maj, 1000);
    return () => clearInterval(id);
  }, [course?.offresExpireAt, course?.statut]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pendant la recherche, les véhicules proches restent visibles autour du radar
  const enRecherche = course?.statut === 'RECHERCHE';
  useEffect(() => {
    if (!enRecherche || !course) { setProches(AUCUN_VEHICULE); return undefined; }
    const lire = () => Api.carte.vehiculesProches(course.depart.lat, course.depart.lng)
      .then((l) => setProches(l.map((v) => ({ id: v.id, type: v.type, lat: v.lat, lng: v.lng, cap: v.cap }))))
      .catch(() => undefined);
    lire();
    const id = setInterval(lire, 8000);
    return () => clearInterval(id);
  }, [enRecherche, course?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const action = async (fn: () => Promise<unknown>) => {
    setOccupe(true);
    try { await fn(); await charger(); } catch (e) { haptique.erreur(); Alert.alert(t('erreurs.titre'), messageErreur(e)); } finally { setOccupe(false); }
  };

  const annuler = () => {
    const frais = course && ['ACCEPTEE', 'CHAUFFEUR_ARRIVE'].includes(course.statut);
    Alert.alert(t('course.annulerTitre'), frais ? t('course.annulerFrais') : t('course.annulerTexte'), [
      { text: t('commun.non'), style: 'cancel' },
      { text: t('commun.oui'), style: 'destructive', onPress: () => action(() => Api.courses.annuler(courseId)) }
    ]);
  };

  const partager = async () => {
    try {
      const p = await Api.courses.partage(courseId);
      Alert.alert(t('course.partager'), t('course.partagerTexte'), [
        { text: 'SMS', onPress: () => Linking.openURL(`sms:?body=${encodeURIComponent(p.message)}`) },
        { text: t('course.autreApp'), onPress: () => Share.share({ message: p.message }) },
        { text: t('commun.annuler'), style: 'cancel' }
      ]);
    } catch (e) { Alert.alert(t('erreurs.titre'), messageErreur(e)); }
  };

  const phase: Phase = !course ? 'autre'
    : course.statut === 'RECHERCHE' ? 'recherche'
      : course.statut === 'EN_COURS' ? 'trajet'
        : ['ACCEPTEE', 'CHAUFFEUR_ARRIVE'].includes(course.statut) ? 'approche'
          : course.statut === 'TERMINEE' ? 'fin' : 'autre';

  // Itinéraire : chauffeur → client avant la prise en charge, puis départ → destination
  const aPosition = !!position;
  useEffect(() => {
    if (!course) return;
    if (phase === 'approche' && !position) { setTrace([]); return; }
    const de = phase === 'approche' && position ? position : course.depart;
    const vers = phase === 'approche' ? course.depart : course.arrivee;
    Api.carte.itineraire(de.lat, de.lng, vers.lat, vers.lng)
      .then((i) => setTrace(i.trace.map(([lat, lng]) => ({ lat, lng }))))
      .catch(() => setTrace([]));
  }, [course?.id, phase, aPosition]); // eslint-disable-line react-hooks/exhaustive-deps

  // Distance et temps restants le long de l'itinéraire (moment 9)
  const longueur = useMemo(() => longueurTrace(trace), [trace]);
  const suivi = useMemo(() => {
    if (!course || longueur <= 0 || (phase !== 'approche' && phase !== 'trajet')) return null;
    const parcouru = position ? Math.min(longueur, projeter(trace, position).abscisse) : 0;
    const resteM = Math.max(0, longueur - parcouru);
    // Le temps suit la distance restante sur la route (l'ETA du serveur est figée au moment de l'offre)
    const min = phase === 'trajet' && course.distanceKm > 0
        ? Math.max(1, Math.round(course.dureeMin * (resteM / longueur)))
        : Math.max(1, Math.round(resteM / VITESSE_URBAINE_M_MIN));
    return { progression: parcouru / longueur, resteM, min };
  }, [course, phase, trace, longueur, position]);

  if (!course) return <Chargement />;
  const ch = course.chauffeur;
  const km = (m: number) => {
    const v = (m / 1000).toFixed(1);
    return i18n.language.startsWith('fr') ? v.replace('.', ',') : v;
  };

  const points: PointCarte[] = [
    { id: 'd', type: 'depart', lat: course.depart.lat, lng: course.depart.lng },
    ...(phase !== 'approche' ? [{ id: 'a', type: 'arrivee' as const, lat: course.arrivee.lat, lng: course.arrivee.lng }] : [])
  ];
  const vehicules: VehiculeCarte[] = (phase === 'approche' || phase === 'trajet') && position
    ? [{ id: 'chauffeur', lat: position.lat, lng: position.lng, cap: position.cap, type: typeCarte(course.typeService) }]
    : phase === 'recherche' ? proches : AUCUN_VEHICULE;
  const suit = vehicules.length && (phase === 'approche' || phase === 'trajet') ? 'chauffeur' : undefined;

  const crans = phase === 'recherche' ? ['46%', '88%'] : phase === 'fin' ? ['92%'] : phase === 'approche' || phase === 'trajet' ? ['36%', '62%', '92%'] : ['44%'];
  const indexInitial = phase === 'approche' ? 1 : 0;
  const hauteurPanneau = H * parseFloat(crans[indexInitial]) / 100;

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <CarteMboa style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        points={points} vehicules={vehicules} trace={phase === 'recherche' ? undefined : trace}
        ajuster={!suit} suivre={suit} aimanterSurTrace radar={phase === 'recherche' ? course.depart : undefined}
        marges={{ haut: 130, bas: hauteurPanneau + 20 }} />

      <SafeAreaView edges={['top']} pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 8, gap: 10 }}>
        <View pointerEvents="box-none" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <PressableAnime onPress={() => navigation.navigate('Onglets')} accessibilityLabel={t('onglets.accueil')}
            style={[{ backgroundColor: '#fff', borderRadius: 24, width: 46, height: 46, alignItems: 'center', justifyContent: 'center' }, ombres.moyenne]}>
            <Ionicons name="home" size={22} color={couleurs.primaire} />
          </PressableAnime>
          {phase !== 'fin' && <BoutonSOS compact courseId={courseId} />}
        </View>
        {course.statut === 'CHAUFFEUR_ARRIVE' && (
          <BanniereArrivee titre={t('course.chauffeurArrive')} texte={t('course.chauffeurArriveTexte', { prenom: ch?.prenom ?? '' })} />
        )}
      </SafeAreaView>

      <PanneauGlissant key={phase} crans={crans} index={indexInitial}>
        {phase === 'recherche' && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <AnneauCompteur restant={restant} total={attenteTotale} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: polices.titreDemi, fontSize: 18, color: couleurs.texte }}>
                  {offres.length ? t('course.offresRecues', { count: offres.length }) : t('course.rechercheTitre')}
                </Text>
                <Text style={{ fontFamily: polices.texte, fontSize: 13, color: couleurs.texteSecondaire }}>
                  {proches.length ? t('course.chauffeursConsultent', { count: proches.length }) : t('course.rechercheChauffeur')}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: couleurs.fond, borderRadius: 16, padding: 12 }}>
              <Text style={{ fontFamily: polices.texteMoyen, fontSize: 13, color: couleurs.texteSecondaire }}>
                {course.negociable ? t('course.votreOffre') : t('course.prixFixe')}
              </Text>
              <Text style={{ fontFamily: polices.titre, fontSize: 18, color: couleurs.primaire }}>{fcfa(course.prixPropose)}</Text>
            </View>
            {course.tourNegociation > 1 && (
              <Animated.View key={course.tourNegociation} entering={ZoomIn.springify().damping(14)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: couleurs.accentClair, padding: 10, borderRadius: 14 }}>
                <Ionicons name="refresh" size={16} color={couleurs.accentFonce} />
                <Text style={{ flex: 1, fontFamily: polices.texteMoyen, fontSize: 13, color: couleurs.accentFonce }}>{t('course.relance')}</Text>
              </Animated.View>
            )}
            {offres.length === 0 ? (
              <View style={{ gap: 10, opacity: 0.7 }}><SqueletteCarte /></View>
            ) : (
              [...offres].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((o, i) => (
                <CarteOffre key={o.id} offre={o} rang={i} prixPropose={course.prixPropose} occupe={occupe}
                  onChoisir={() => action(() => Api.courses.choisir(courseId, o.id))} />
              ))
            )}
            {offres.length > 0 && <Text style={{ fontFamily: polices.texte, fontSize: 12, color: couleurs.texteSecondaire, textAlign: 'center' }}>{t('course.astuceAppuiLong')}</Text>}
            <Bouton variante="contour" titre={t('course.annuler')} onPress={annuler} />
          </>
        )}

        {(phase === 'approche' || phase === 'trajet') && ch && (
          <>
            <Animated.View layout={LinearTransition} style={{ gap: 4 }}>
              <Text style={{ fontFamily: polices.titre, fontSize: 20, color: couleurs.texte }}>
                {course.statut === 'CHAUFFEUR_ARRIVE' ? t('course.chauffeurArrive')
                  : phase === 'approche' ? t('course.chauffeurEnRoute', { min: suivi?.min ?? '…' })
                    : t('course.versDestination')}
              </Text>
              <Text style={{ fontFamily: polices.texte, fontSize: 13, color: couleurs.texteSecondaire }} numberOfLines={1}>
                {phase === 'trajet' ? course.arrivee.adresse : course.depart.adresse}
              </Text>
            </Animated.View>

            {suivi && course.statut !== 'CHAUFFEUR_ARRIVE' && (
              <BarreProgression progression={suivi.progression}
                icone={phase === 'trajet' ? 'flag' : 'car'}
                libelle={t('course.restant', { min: suivi.min, km: km(suivi.resteM) })} />
            )}

            <Apparition>
              <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 20, padding: 14, borderWidth: 1, borderColor: '#EEF1F5' }, ombres.legere]}>
                <View>
                  <Avatar photo={ch.photoUrl} nom={ch.prenom} taille={58} />
                  <View style={{ position: 'absolute', bottom: -6, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 2,
                    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, borderWidth: 1, borderColor: '#EEF1F5' }}>
                    <Ionicons name="star" size={11} color={couleurs.jaune} />
                    <Text style={{ fontFamily: polices.texteGras, fontSize: 11, color: couleurs.texte }}>{ch.noteMoyenne.toFixed(1)}</Text>
                  </View>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontFamily: polices.texteGras, fontSize: 16, color: couleurs.texte }}>{ch.prenom} {ch.nom}</Text>
                  <Text style={{ fontFamily: polices.texte, fontSize: 13, color: couleurs.texteSecondaire }} numberOfLines={1}>
                    {[ch.vehicule?.marque, ch.vehicule?.modele, ch.vehicule?.couleur].filter(Boolean).join(' · ')}
                  </Text>
                  <PlaqueImmatriculation numero={ch.vehicule?.immatriculation} />
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontFamily: polices.titre, fontSize: 18, color: couleurs.primaire }}>{fcfa(course.montantAPayer)}</Text>
                  <Text style={{ fontFamily: polices.texte, fontSize: 12, color: couleurs.texteSecondaire }}>{t('paiements.' + course.modePaiement)}</Text>
                </View>
              </View>
            </Apparition>

            {phase === 'approche' && course.codeVerification && (
              <Apparition rang={1}><CodeVerification courseId={course.id} code={course.codeVerification} /></Apparition>
            )}

            <Apparition rang={2}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                <ActionRonde icone="call" libelle={t('course.appeler')} onPress={() => ch.telephone && Linking.openURL('tel:' + ch.telephone)} />
                <ActionRonde icone="chatbubble-ellipses" libelle={t('course.message')} onPress={() => navigation.navigate('Messagerie', { courseId, interlocuteur: ch.prenom })} />
                <ActionRonde icone="share-social" libelle={t('course.partager')} onPress={partager} />
              </View>
            </Apparition>

            {course.typeService === 'RAMASSAGE' && (
              <View style={{ flexDirection: 'row', gap: 8, backgroundColor: couleurs.vertClair, padding: 12, borderRadius: 14 }}>
                <Ionicons name="information-circle" size={18} color={couleurs.vert} />
                <Text style={{ flex: 1, fontFamily: polices.texte, fontSize: 13, color: couleurs.vert }}>{t('reservation.avertissementRamassage')}</Text>
              </View>
            )}
            {phase === 'approche' && <Bouton variante="contour" titre={t('course.annuler')} onPress={annuler} />}
          </>
        )}

        {phase === 'fin' && (
          <FinCourse course={course} paiement={paiement} occupe={occupe} note={note} setNote={setNote} rapides={rapides}
            basculer={(c) => setRapides((r) => (r.includes(c) ? r.filter((x) => x !== c) : [...r, c]))}
            commentaire={commentaire} setCommentaire={setCommentaire} action={action}
            terminer={() => { rafraichir(); navigation.navigate('Onglets'); }} />
        )}

        {course.statut === 'PLANIFIEE' && (
          <View style={{ alignItems: 'center', gap: 12, paddingVertical: 8 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: couleurs.primaireClair, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="calendar" size={30} color={couleurs.primaire} />
            </View>
            <Text style={{ fontFamily: polices.texte, fontSize: 15, color: couleurs.texte, textAlign: 'center' }}>{t('course.planifieeLe', { date: dateHeure(course.datePlanifiee) })}</Text>
            <Bouton variante="contour" titre={t('course.annuler')} onPress={annuler} style={{ alignSelf: 'stretch' }} />
          </View>
        )}

        {(course.statut === 'ANNULEE' || course.statut === 'EXPIREE') && (
          <Animated.View entering={FadeInDown.springify().damping(16)} style={{ alignItems: 'center', gap: 12, paddingVertical: 8 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: course.statut === 'EXPIREE' ? couleurs.accentClair : couleurs.rougeClair, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={course.statut === 'EXPIREE' ? 'time' : 'close'} size={32} color={course.statut === 'EXPIREE' ? couleurs.accentFonce : couleurs.rouge} />
            </View>
            <Text style={{ fontFamily: polices.texteMoyen, fontSize: 15, color: couleurs.texte, textAlign: 'center' }}>
              {course.statut === 'EXPIREE' ? t('course.aucunChauffeur') : t('course.annulee')}
            </Text>
            {course.fraisAnnulation > 0 && <Text style={{ fontFamily: polices.texte, color: couleurs.texteSecondaire }}>{t('course.fraisAppliques', { frais: fcfa(course.fraisAnnulation) })}</Text>}
            <Bouton titre={t('course.nouvelleDemande')} style={{ alignSelf: 'stretch' }} onPress={() => navigation.replace('Reservation', { arrivee: course.arrivee })} />
            <Bouton variante="contour" titre={t('commun.retourAccueil')} style={{ alignSelf: 'stretch' }} onPress={() => navigation.navigate('Onglets')} />
          </Animated.View>
        )}
      </PanneauGlissant>

      {fete && <Confettis />}
    </View>
  );
}

function ActionRonde({ icone, libelle, onPress }: { icone: keyof typeof Ionicons.glyphMap; libelle: string; onPress: () => void }) {
  return (
    <PressableAnime onPress={onPress} echelle={0.9} style={{ alignItems: 'center', gap: 6, minWidth: 72 }}>
      <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: couleurs.primaireClair, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icone} size={22} color={couleurs.primaire} />
      </View>
      <Text style={{ fontFamily: polices.texteMoyen, fontSize: 12, color: couleurs.texte }}>{libelle}</Text>
    </PressableAnime>
  );
}

/** Fin de course (moment 10) : coche de succès, montant qui défile, paiement, notation animée, reçu. */
function FinCourse({ course, paiement, occupe, note, setNote, rapides, basculer, commentaire, setCommentaire, action, terminer }: {
  course: Course; paiement: Paiement | null; occupe: boolean; note: number; setNote: (n: number) => void;
  rapides: string[]; basculer: (c: string) => void; commentaire: string; setCommentaire: (s: string) => void;
  action: (fn: () => Promise<unknown>) => Promise<void>; terminer: () => void;
}) {
  const { t } = useTranslation();
  const [montant, setMontant] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setMontant(course.montantAPayer), 350);
    return () => clearTimeout(id);
  }, [course.montantAPayer]);
  const ch = course.chauffeur;
  const envoyerNote = () => {
    const textes = rapides.map((c) => t('course.rapide.' + c));
    const texte = [...textes, commentaire.trim()].filter(Boolean).join(' · ');
    return action(() => Api.courses.noter(course.id, note, texte || undefined));
  };

  return (
    <>
      <View style={{ alignItems: 'center', gap: 6, paddingTop: 6 }}>
        <Animated.View entering={ZoomIn.springify().damping(10).stiffness(160)}
          style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: couleurs.vert, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="checkmark" size={50} color="#fff" />
        </Animated.View>
        <Animated.Text entering={FadeIn.delay(200)} style={{ fontFamily: polices.titre, fontSize: 22, color: couleurs.texte }}>{t('course.arriveTitre')}</Animated.Text>
        <Text style={{ fontFamily: polices.texte, fontSize: 13, color: couleurs.texteSecondaire, textAlign: 'center' }} numberOfLines={2}>{course.arrivee.adresse}</Text>
      </View>

      <Apparition rang={1}>
        <View style={{ backgroundColor: couleurs.fond, borderRadius: 20, padding: 16, alignItems: 'center', gap: 4 }}>
          <Text style={{ fontFamily: polices.texteMoyen, fontSize: 13, color: couleurs.texteSecondaire }}>{t('course.total')}</Text>
          <PrixAnime valeur={montant} duree={1200} style={{ fontFamily: polices.titre, fontSize: 36, color: couleurs.primaire }} />
          <Text style={{ fontFamily: polices.texteMoyen, fontSize: 13, color: course.statutPaiement === 'PAYE' ? couleurs.vert : couleurs.texteSecondaire }}>
            {t('paiements.' + course.modePaiement)} · {t('paiementStatut.' + course.statutPaiement)}
          </Text>
          {paiement?.statut === 'EN_ATTENTE' && paiement.message ? <Text style={{ fontFamily: polices.texte, color: couleurs.texte, textAlign: 'center' }}>{paiement.message}</Text> : null}
          {paiement?.paymentUrl && paiement.statut === 'EN_ATTENTE' && (
            <Bouton titre={t('course.ouvrirPaiement')} style={{ alignSelf: 'stretch' }} onPress={() => Linking.openURL(paiement.paymentUrl!)} />
          )}
          {course.statutPaiement === 'ECHEC' && (
            <View style={{ gap: 8, alignSelf: 'stretch', paddingTop: 6 }}>
              <Bouton titre="MTN MoMo" onPress={() => action(() => Api.courses.payer(course.id, 'MTN_MOMO'))} />
              <Bouton variante="accent" titre="Orange Money" onPress={() => action(() => Api.courses.payer(course.id, 'ORANGE_MONEY'))} />
              <Bouton variante="contour" titre={t('course.payerEspeces')} onPress={() => action(() => Api.courses.payerEspeces(course.id))} />
            </View>
          )}
        </View>
      </Apparition>

      {!course.dejaNote ? (
        <Apparition rang={2}>
          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {ch && <Avatar photo={ch.photoUrl} nom={ch.prenom} taille={44} />}
              <Text style={{ flex: 1, fontFamily: polices.titreDemi, fontSize: 16, color: couleurs.texte }}>{t('course.noter', { prenom: ch?.prenom })}</Text>
            </View>
            <EtoilesAnimees note={note} onChange={setNote} />
            {note > 0 && (
              <Animated.View entering={FadeInDown.springify().damping(16)} style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {COMMENTAIRES_RAPIDES.map((c) => {
                    const sel = rapides.includes(c);
                    return (
                      <PressableAnime key={c} vibration="selection" onPress={() => basculer(c)}
                        style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1.5,
                          borderColor: sel ? couleurs.primaire : '#E5E9F0', backgroundColor: sel ? couleurs.primaireClair : '#fff' }}>
                        <Text style={{ fontFamily: polices.texteMoyen, fontSize: 13, color: sel ? couleurs.primaire : couleurs.texte }}>{t('course.rapide.' + c)}</Text>
                      </PressableAnime>
                    );
                  })}
                </View>
                <Champ placeholder={t('course.commentaire')} value={commentaire} onChangeText={setCommentaire} multiline maxLength={400} />
                <Bouton titre={t('commun.envoyer')} chargement={occupe} onPress={envoyerNote} />
              </Animated.View>
            )}
          </View>
        </Apparition>
      ) : (
        <Animated.View entering={ZoomIn} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, backgroundColor: couleurs.vertClair, borderRadius: 14 }}>
          <Ionicons name="heart" size={18} color={couleurs.vert} />
          <Text style={{ fontFamily: polices.texteMoyen, color: couleurs.vert }}>{t('course.merciNote')}</Text>
        </Animated.View>
      )}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable onPress={async () => {
          try { Linking.openURL((await Api.courses.recu(course.id)).url); } catch (e) { Alert.alert(t('erreurs.titre'), messageErreur(e)); }
        }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 16, borderWidth: 1.5, borderColor: couleurs.primaire }}>
          <Ionicons name="document-text-outline" size={18} color={couleurs.primaire} />
          <Text style={{ fontFamily: polices.texteGras, color: couleurs.primaire }}>{t('course.recu')}</Text>
        </Pressable>
        <Bouton style={{ flex: 1 }} titre={t('commun.terminer')} onPress={terminer} />
      </View>
    </>
  );
}
