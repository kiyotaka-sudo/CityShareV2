import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, Linking, Modal, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackScreenProps } from '@react-navigation/stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, LinearTransition, ZoomIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Api } from '../../api';
import { messageErreur } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useEvenement } from '../../context/TempsReelContext';
import { useEnvoiPosition } from '../../hooks/useEnvoiPosition';
import CarteMboa, { PointCarte, VehiculeCarte } from '../../carte/CarteMboa';
import { AUCUN_VEHICULE } from '../../carte/types';
import { longueurTrace, projeter } from '../../carte/geo';
import BoutonSOS from '../../components/BoutonSOS';
import { Avatar, Bouton, Champ, Chargement } from '../../components/ui';
import PanneauGlissant from '../../components/anime/PanneauGlissant';
import PressableAnime from '../../components/anime/Pressable';
import PrixAnime from '../../components/anime/PrixAnime';
import BoutonGlisser from '../../components/anime/BoutonGlisser';
import CasesCode from '../../components/anime/CasesCode';
import Apparition from '../../components/anime/Apparition';
import { haptique } from '../../components/anime/haptique';
import EtoilesAnimees from '../../components/course/EtoilesAnimees';
import Confettis from '../../components/course/Confettis';
import { fcfa } from '../../utils/format';
import { couleurs, ombres, polices } from '../../theme';
import type { Course } from '../../types';
import type { Routes } from '../../navigation/RootNavigator';

const H = Dimensions.get('window').height;
const VITESSE_URBAINE_M_MIN = 400;
const ACTIFS = ['ACCEPTEE', 'CHAUFFEUR_ARRIVE', 'EN_COURS'];

/**
 * Course côté chauffeur, pensée pour la conduite : navigation intégrée sur la carte (itinéraire et distance restante),
 * ouverture dans Google Maps (BF-36), gros boutons à glisser (arrivée, fin de course), code en cases ou QR (BF-45),
 * encaissement des espèces, commission et note du client.
 */
export default function CourseChauffeur({ navigation, route }: StackScreenProps<Routes, 'CourseChauffeur'>) {
  const { t, i18n } = useTranslation();
  const { rafraichir } = useAuth();
  const { courseId } = route.params;
  const [c, setC] = useState<Course | null>(null);
  const [trace, setTrace] = useState<{ lat: number; lng: number }[]>([]);
  const [moi, setMoi] = useState<{ lat: number; lng: number } | null>(null);
  const [code, setCode] = useState('');
  const [erreurCode, setErreurCode] = useState(0);
  const [scan, setScan] = useState(false);
  const [permission, demanderPermission] = useCameraPermissions();
  const [note, setNote] = useState(0);
  const [commentaire, setCommentaire] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [fete, setFete] = useState(false);
  const statutPrecedent = useRef<string | null>(null);

  const charger = useCallback(async () => {
    try { setC(await Api.courses.detail(courseId)); } catch { /* réseau : prochain cycle */ }
  }, [courseId]);

  useEffect(() => { charger(); const id = setInterval(charger, 10000); return () => clearInterval(id); }, [charger]);
  useEnvoiPosition(!!c && ACTIFS.includes(c.statut), (lat, lng) => setMoi({ lat, lng }));
  useEvenement<any>('/user/queue/demandes', ['COURSE_ANNULEE', 'PAIEMENT', 'ESPECES_A_ENCAISSER'], (d) => {
    if (d.courseId === courseId) charger();
  });

  // Itinéraire du moment : vers le client avant la prise en charge, puis vers la destination
  const statut = c?.statut;
  useEffect(() => {
    if (!statut || !ACTIFS.includes(statut)) return;
    Api.chauffeur.itineraire(courseId).then((i) => setTrace(i.trace.map(([lat, lng]) => ({ lat, lng })))).catch(() => undefined);
  }, [statut === 'EN_COURS', !!statut && ACTIFS.includes(statut), !!moi]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!statut) return;
    const avant = statutPrecedent.current;
    statutPrecedent.current = statut;
    if (avant && avant !== statut && statut === 'TERMINEE') {
      haptique.succes();
      setFete(true);
      setTimeout(() => setFete(false), 3500);
    }
  }, [statut]);

  const executer = async (fn: () => Promise<unknown>) => {
    setOccupe(true);
    try { await fn(); await charger(); } catch (e) { haptique.erreur(); Alert.alert(t('erreurs.titre'), messageErreur(e)); } finally { setOccupe(false); }
  };

  const demarrer = async (valeur: string) => {
    setOccupe(true);
    try {
      await Api.chauffeur.demarrer(courseId, valeur);
      haptique.succes();
      setCode('');
      await charger();
    } catch {
      setErreurCode((n) => n + 1);
      setTimeout(() => setCode(''), 600);
    } finally { setOccupe(false); }
  };

  const saisirCode = (v: string) => {
    const propre = v.replace(/\D/g, '').slice(0, 4);
    setCode(propre);
    if (propre.length === 4) demarrer(propre);
  };

  const naviguer = () => {
    if (!c) return;
    const cible = c.statut === 'EN_COURS' ? c.arrivee : c.depart;
    const app = Platform.OS === 'android'
      ? `google.navigation:q=${cible.lat},${cible.lng}`
      : `comgooglemaps://?daddr=${cible.lat},${cible.lng}&directionsmode=driving`;
    const web = `https://www.google.com/maps/dir/?api=1&destination=${cible.lat},${cible.lng}&travelmode=driving`;
    Linking.openURL(app).catch(() => Linking.openURL(web));
  };

  const ouvrirScanner = async () => {
    if (!permission?.granted && !(await demanderPermission()).granted) return;
    setScan(true);
  };

  const scanne = ({ data }: { data: string }) => {
    setScan(false);
    const m = /^MBOARIDE:(\d+):(\d{4})$/.exec(data);
    if (!m || Number(m[1]) !== courseId) { Alert.alert(t('chauffeur.qrInvalide')); return; }
    setCode(m[2]);
    demarrer(m[2]);
  };

  const annuler = () => Alert.alert(t('course.annulerTitre'), t('chauffeur.annulerTexte'), [
    { text: t('commun.non'), style: 'cancel' },
    { text: t('commun.oui'), style: 'destructive', onPress: () => executer(async () => { await Api.chauffeur.annuler(courseId); navigation.goBack(); }) }
  ]);

  // Distance et temps restants sur l'itinéraire
  const longueur = useMemo(() => longueurTrace(trace), [trace]);
  const reste = useMemo(() => {
    if (longueur <= 0) return null;
    const parcouru = moi ? Math.min(longueur, projeter(trace, moi).abscisse) : 0;
    const m = Math.max(0, longueur - parcouru);
    return { m, min: Math.max(1, Math.round(m / VITESSE_URBAINE_M_MIN)) };
  }, [trace, longueur, moi]);

  if (!c) return <Chargement />;
  const actif = ACTIFS.includes(c.statut);
  const versClient = c.statut === 'ACCEPTEE' || c.statut === 'CHAUFFEUR_ARRIVE';
  const cible = c.statut === 'EN_COURS' ? c.arrivee : c.depart;
  const km = (m: number) => {
    const v = (m / 1000).toFixed(1);
    return i18n.language.startsWith('fr') ? v.replace('.', ',') : v;
  };

  const points: PointCarte[] = c.statut === 'EN_COURS'
    ? [{ id: 'a', type: 'arrivee', lat: c.arrivee.lat, lng: c.arrivee.lng }]
    : [{ id: 'd', type: 'depart', lat: c.depart.lat, lng: c.depart.lng }, { id: 'a', type: 'arrivee', lat: c.arrivee.lat, lng: c.arrivee.lng }];
  const vehicules: VehiculeCarte[] = moi && actif
    ? [{ id: 'moi', lat: moi.lat, lng: moi.lng, type: c.typeService === 'MOTO' ? 'MOTO' : c.typeService === 'RAMASSAGE' ? 'RAMASSAGE' : 'TAXI' }]
    : AUCUN_VEHICULE;
  const fin = c.statut === 'TERMINEE';
  const crans = fin ? ['92%'] : actif ? ['40%', '75%'] : ['45%'];
  const hauteurPanneau = (H * parseFloat(crans[0])) / 100;
  const phase = fin ? 'fin' : actif ? (versClient ? 'client' : 'trajet') : 'autre';

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <CarteMboa style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} trace={actif ? trace : undefined} nuit="auto"
        ajuster={!vehicules.length} suivre={vehicules.length ? 'moi' : undefined} aimanterSurTrace
        marges={{ haut: 190, bas: hauteurPanneau + 20 }} points={points} vehicules={vehicules} />

      {/* Bandeau de navigation : prochaine étape, distance restante, Google Maps */}
      {actif && (
        <SafeAreaView edges={['top']} pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 12, paddingTop: 6, gap: 10 }}>
          <Animated.View entering={FadeInDown.springify().damping(16)} layout={LinearTransition}
            style={[{ backgroundColor: couleurs.primaire, borderRadius: 22, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }, ombres.forte]}>
            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: versClient ? couleurs.accent : couleurs.vert, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={versClient ? 'person' : 'flag'} size={26} color="#fff" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: polices.texteGras, fontSize: 12, color: versClient ? couleurs.accent : '#8FD3A8', letterSpacing: 0.5 }}>
                {(c.statut === 'CHAUFFEUR_ARRIVE' ? t('chauffeur.clientPrevenu') : versClient ? t('chauffeur.versClient') : t('chauffeur.versDestination')).toUpperCase()}
              </Text>
              <Text style={{ fontFamily: polices.titreDemi, fontSize: 16, color: '#fff' }} numberOfLines={1}>{cible.adresse}</Text>
              {reste && c.statut !== 'CHAUFFEUR_ARRIVE' && (
                <Text style={{ fontFamily: polices.titre, fontSize: 22, color: '#fff' }}>{km(reste.m)} km · {reste.min} min</Text>
              )}
            </View>
            <PressableAnime onPress={naviguer} echelle={0.9} accessibilityLabel={t('chauffeur.ouvrirGoogleMaps')}
              style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="navigate" size={26} color={couleurs.primaire} />
            </PressableAnime>
          </Animated.View>
          <View pointerEvents="box-none" style={{ alignItems: 'flex-end' }}><BoutonSOS compact courseId={courseId} /></View>
        </SafeAreaView>
      )}

      <PanneauGlissant key={phase} crans={crans} index={0}>
        {/* Client et montant */}
        {(actif || fin) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar photo={c.client.photoUrl} nom={c.client.prenom} taille={52} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: polices.titreDemi, fontSize: 17, color: couleurs.texte }}>{c.client.prenom}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="star" size={13} color={couleurs.jaune} />
                <Text style={{ fontFamily: polices.texteMoyen, fontSize: 13, color: couleurs.texte }}>{c.client.noteMoyenne ? c.client.noteMoyenne.toFixed(1) : '—'}</Text>
                <Text style={{ fontFamily: polices.texte, fontSize: 13, color: couleurs.texteSecondaire }}>· {t('services.' + c.typeService)}{c.nbPlaces > 1 ? ` · ${c.nbPlaces}` : ''}</Text>
              </View>
            </View>
            {actif && (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <BoutonRond icone="call" libelle={t('course.appeler')} onPress={() => c.client.telephone && Linking.openURL('tel:' + c.client.telephone)} />
                <BoutonRond icone="chatbubble-ellipses" libelle={t('course.message')} onPress={() => navigation.navigate('Messagerie', { courseId, interlocuteur: c.client.prenom })} />
              </View>
            )}
          </View>
        )}

        {actif && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: couleurs.fond, borderRadius: 16, padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name={c.modePaiement === 'ESPECES' ? 'cash' : 'phone-portrait'} size={20} color={couleurs.vert} />
              <Text style={{ fontFamily: polices.texteMoyen, color: couleurs.texte }}>{t('paiements.' + c.modePaiement)}</Text>
            </View>
            <Text style={{ fontFamily: polices.titre, fontSize: 22, color: couleurs.primaire }}>{fcfa(c.prixFinal ?? c.montantAPayer)}</Text>
          </View>
        )}

        {c.depart.repere && versClient ? (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Ionicons name="location" size={18} color={couleurs.accent} />
            <Text style={{ flex: 1, fontFamily: polices.texteMoyen, color: couleurs.texte }}>{c.depart.repere}</Text>
          </View>
        ) : null}

        {/* Action principale selon l'étape */}
        {c.statut === 'ACCEPTEE' && (
          <BoutonGlisser libelle={t('chauffeur.glisserArrive')} couleurDepart={couleurs.accent} couleurArrivee={couleurs.vert} icone="location"
            chargement={occupe} onValide={() => executer(() => Api.chauffeur.arrivee(courseId))} />
        )}
        {versClient && (
          <Animated.View entering={FadeIn} layout={LinearTransition} style={{ gap: 12, backgroundColor: couleurs.fond, borderRadius: 18, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: polices.titreDemi, fontSize: 15, color: couleurs.texte }}>{t('chauffeur.codeClient')}</Text>
              <PressableAnime onPress={ouvrirScanner} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: couleurs.primaire, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Ionicons name="qr-code" size={16} color="#fff" />
                <Text style={{ fontFamily: polices.texteGras, color: '#fff' }}>{t('chauffeur.scanner')}</Text>
              </PressableAnime>
            </View>
            <CasesCode valeur={code} onChange={saisirCode} longueur={4} erreur={erreurCode} />
            <Text style={{ fontFamily: polices.texte, fontSize: 12, color: erreurCode ? couleurs.rouge : couleurs.texteSecondaire }}>
              {erreurCode ? t('chauffeur.codeFaux') : t('chauffeur.codeAide')}
            </Text>
          </Animated.View>
        )}
        {c.statut === 'EN_COURS' && (
          <BoutonGlisser libelle={t('chauffeur.glisserTerminer')} icone="flag" chargement={occupe}
            onValide={() => executer(() => Api.chauffeur.terminer(courseId))} />
        )}
        {versClient && (
          <Pressable onPress={annuler} style={{ alignSelf: 'center', padding: 6 }}>
            <Text style={{ fontFamily: polices.texteGras, color: couleurs.rouge }}>{t('course.annuler')}</Text>
          </Pressable>
        )}

        {fin && (
          <>
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Animated.View entering={ZoomIn.springify().damping(10)}
                style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: couleurs.vert, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="checkmark" size={44} color="#fff" />
              </Animated.View>
              <Text style={{ fontFamily: polices.titre, fontSize: 20, color: couleurs.texte }}>{t('chauffeur.courseTerminee')}</Text>
            </View>
            <Apparition rang={1}>
              <View style={{ backgroundColor: c.modePaiement === 'ESPECES' && c.statutPaiement !== 'PAYE' ? couleurs.accentClair : couleurs.vertClair, borderRadius: 20, padding: 18, alignItems: 'center', gap: 6 }}>
                <Text style={{ fontFamily: polices.texteGras, color: couleurs.texte }}>
                  {c.modePaiement === 'ESPECES' ? (c.statutPaiement === 'PAYE' ? t('chauffeur.especesEncaissees') : t('chauffeur.encaisser')) : `${t('paiements.' + c.modePaiement)} · ${t('paiementStatut.' + c.statutPaiement)}`}
                </Text>
                <PrixAnime valeur={c.montantAPayer} duree={1000} style={{ fontFamily: polices.titre, fontSize: 38, color: couleurs.primaire }} />
                {c.modePaiement === 'ESPECES' && c.statutPaiement !== 'PAYE' && (
                  <Bouton style={{ alignSelf: 'stretch' }} icone="cash" titre={t('chauffeur.especesRecues')} chargement={occupe}
                    onPress={() => executer(() => Api.chauffeur.especesRecues(courseId))} />
                )}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <Pastille libelle={t('chauffeur.commission')} valeur={fcfa(c.commission)} couleur={couleurs.texteSecondaire} />
                  <Pastille libelle={t('chauffeur.votreGain')} valeur={fcfa(c.gainChauffeur)} couleur={couleurs.vert} />
                </View>
              </View>
            </Apparition>
            {!c.dejaNote ? (
              <Apparition rang={2}>
                <View style={{ gap: 12 }}>
                  <Text style={{ fontFamily: polices.titreDemi, fontSize: 16, color: couleurs.texte, textAlign: 'center' }}>{t('course.noter', { prenom: c.client.prenom })}</Text>
                  <EtoilesAnimees note={note} onChange={setNote} />
                  {note > 0 && (
                    <Animated.View entering={FadeInDown.springify().damping(16)} style={{ gap: 10 }}>
                      <Champ placeholder={t('course.commentaire')} value={commentaire} onChangeText={setCommentaire} multiline maxLength={400} />
                      <Bouton titre={t('commun.envoyer')} chargement={occupe} onPress={() => executer(() => Api.courses.noter(courseId, note, commentaire || undefined))} />
                    </Animated.View>
                  )}
                </View>
              </Apparition>
            ) : (
              <Text style={{ fontFamily: polices.texteMoyen, color: couleurs.vert, textAlign: 'center' }}>{t('course.merciNote')}</Text>
            )}
            <Bouton titre={t('chauffeur.retourEnLigne')} icone="radio-button-on" onPress={() => { rafraichir(); navigation.goBack(); }} />
          </>
        )}

        {c.statut === 'ANNULEE' && (
          <View style={{ alignItems: 'center', gap: 12 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: couleurs.rougeClair, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={32} color={couleurs.rouge} />
            </View>
            <Text style={{ fontFamily: polices.texteMoyen, fontSize: 15, color: couleurs.texte, textAlign: 'center' }}>{t('chauffeur.clientAnnule')}</Text>
            <Bouton style={{ alignSelf: 'stretch' }} titre={t('commun.retourAccueil')} onPress={() => navigation.goBack()} />
          </View>
        )}
      </PanneauGlissant>

      {fete && <Confettis />}

      <Modal visible={scan} animationType="slide" onRequestClose={() => setScan(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <CameraView style={{ flex: 1 }} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={scanne} />
          <SafeAreaView style={{ padding: 16 }}><Bouton variante="contour" titre={t('commun.annuler')} onPress={() => setScan(false)} /></SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

function BoutonRond({ icone, libelle, onPress }: { icone: keyof typeof Ionicons.glyphMap; libelle: string; onPress: () => void }) {
  return (
    <PressableAnime onPress={onPress} echelle={0.9} accessibilityLabel={libelle}
      style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: couleurs.primaireClair, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icone} size={22} color={couleurs.primaire} />
    </PressableAnime>
  );
}

function Pastille({ libelle, valeur, couleur }: { libelle: string; valeur: string; couleur: string }) {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' }}>
      <Text style={{ fontFamily: polices.texte, fontSize: 11, color: couleurs.texteSecondaire }}>{libelle}</Text>
      <Text style={{ fontFamily: polices.texteGras, fontSize: 14, color: couleur }}>{valeur}</Text>
    </View>
  );
}
