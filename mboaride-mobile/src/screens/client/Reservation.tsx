import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '@gorhom/bottom-sheet';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Api } from '../../api';
import { messageErreur } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { usePosition } from '../../hooks/usePosition';
import { adresseInverse } from '../../utils/geocodage';
import { fcfa, isoLocal } from '../../utils/format';
import CarteMboa from '../../carte/CarteMboa';
import ChoixLieu from '../../components/ChoixLieu';
import { Bouton, Champ } from '../../components/ui';
import PanneauGlissant from '../../components/anime/PanneauGlissant';
import PressableAnime from '../../components/anime/Pressable';
import CarteService from '../../components/anime/CarteService';
import CurseurPrix from '../../components/anime/CurseurPrix';
import Apparition from '../../components/anime/Apparition';
import { SqueletteCarte } from '../../components/anime/Squelette';
import { useToast } from '../../components/anime/Toast';
import { haptique } from '../../components/anime/haptique';
import { couleurs, ombres, polices } from '../../theme';
import type { Estimation, EstimationService, ModePaiement, Point, TypeService } from '../../types';
import type { Routes } from '../../navigation/RootNavigator';

const MODES: { mode: ModePaiement; icone: keyof typeof Ionicons.glyphMap; couleur: string }[] = [
  { mode: 'ESPECES', icone: 'cash-outline', couleur: couleurs.vert },
  { mode: 'MTN_MOMO', icone: 'phone-portrait-outline', couleur: '#E0A800' },
  { mode: 'ORANGE_MONEY', icone: 'phone-portrait-outline', couleur: couleurs.accent },
  { mode: 'PORTEFEUILLE', icone: 'wallet-outline', couleur: couleurs.primaire }
];

/**
 * Réservation en un seul écran (BNF-08) : départ et destination (BF-08), itinéraire qui se dessine,
 * cartes de service avec prix de référence (BF-09), curseur de négociation encadrée (BF-23), options et paiement.
 */
export default function Reservation({ navigation, route }: StackScreenProps<Routes, 'Reservation'>) {
  const { t } = useTranslation();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { utilisateur } = useAuth();
  const { position } = usePosition();
  const panneau = useRef<BottomSheet>(null);
  const [depart, setDepart] = useState<Point | null>(null);
  const [arrivee, setArrivee] = useState<Point | null>(route.params?.arrivee ?? null);
  const [choix, setChoix] = useState<'depart' | 'arrivee' | null>(route.params?.arrivee ? null : 'arrivee');
  const [nbPlaces, setNbPlaces] = useState(1);
  const [estimation, setEstimation] = useState<Estimation | null>(null);
  const [trace, setTrace] = useState<{ lat: number; lng: number }[]>([]);
  const [service, setService] = useState<TypeService>(route.params?.service ?? 'DEPOT');
  const [prix, setPrix] = useState(0);
  const [mode, setMode] = useState<ModePaiement>('ESPECES');
  const [lady, setLady] = useState(false);
  const [promo, setPromo] = useState('');
  const [promoApplique, setPromoApplique] = useState('');
  const [planifier, setPlanifier] = useState<Date | null>(null);
  const [heurePlanif, setHeurePlanif] = useState('');
  const [options, setOptions] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  // Départ par défaut : position GPS avec adresse lisible
  useEffect(() => {
    if (position && !depart) {
      adresseInverse(position.lat, position.lng).then((adresse) => setDepart({ lat: position.lat, lng: position.lng, adresse }));
    }
  }, [position]); // eslint-disable-line react-hooks/exhaustive-deps

  // Estimation des 3 services + itinéraire dessiné sur la carte
  useEffect(() => {
    if (!depart || !arrivee) return;
    setChargement(true);
    Api.carte.itineraire(depart.lat, depart.lng, arrivee.lat, arrivee.lng)
      .then((i) => setTrace(i.trace.map(([lat, lng]) => ({ lat, lng })))).catch(() => setTrace([]));
    Api.courses.estimer({ depart, arrivee, nbPlaces, codePromo: promoApplique || undefined })
      .then((e) => {
        setEstimation(e);
        const courant = e.services.find((x) => x.typeService === service && x.disponible);
        const choisi = courant ?? e.services.find((x) => x.recommande && x.disponible) ?? e.services.find((x) => x.disponible);
        if (choisi) { setService(choisi.typeService); setPrix(choisi.prixReference); }
        if (e.messagePromo) toast('alerte', t('reservation.promoInvalide'));
        panneau.current?.snapToIndex(1);
      })
      .catch((e) => toast('erreur', t('erreurs.titre'), messageErreur(e)))
      .finally(() => setChargement(false));
  }, [depart?.lat, depart?.lng, arrivee?.lat, arrivee?.lng, nbPlaces, promoApplique]); // eslint-disable-line react-hooks/exhaustive-deps

  const choisi: EstimationService | undefined = useMemo(() => estimation?.services.find((x) => x.typeService === service), [estimation, service]);

  const selectionner = (svc: EstimationService) => {
    if (!svc.disponible) return;
    setService(svc.typeService);
    setPrix(svc.prixReference);
    if (svc.typeService === 'MOTO') setNbPlaces(1);
  };

  const datePlanifiee = (): Date | null => {
    if (!planifier) return null;
    const [h, m] = heurePlanif.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    const d = new Date(planifier);
    d.setHours(h, m, 0, 0);
    return d;
  };

  const commander = async () => {
    if (!depart || !arrivee || !choisi) return;
    const plan = datePlanifiee();
    if (planifier && !plan) { toast('alerte', t('reservation.heureInvalide')); return; }
    setEnvoi(true);
    try {
      const course = await Api.courses.demander({
        depart, arrivee, typeService: service, nbPlaces: service === 'MOTO' ? 1 : nbPlaces,
        prixPropose: choisi.negociable ? prix : undefined, modePaiement: mode, mboaLady: lady,
        datePlanifiee: plan ? isoLocal(plan) : undefined, codePromo: promoApplique || undefined
      });
      haptique.succes();
      navigation.replace('CourseClient', { courseId: course.id });
    } catch (e) {
      toast('erreur', t('erreurs.titre'), messageErreur(e));
    } finally {
      setEnvoi(false);
    }
  };

  const total = (choisi?.negociable ? prix : choisi?.prixReference ?? 0) - (choisi?.reduction ?? 0);
  const demain = new Date(Date.now() + 86400000);
  const points = [
    ...(depart ? [{ id: 'depart', type: 'depart' as const, lat: depart.lat, lng: depart.lng }] : []),
    ...(arrivee ? [{ id: 'arrivee', type: 'arrivee' as const, lat: arrivee.lat, lng: arrivee.lng }] : [])
  ];

  const pied = (
    <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 10, paddingBottom: insets.bottom + 10, borderTopWidth: 1, borderTopColor: '#EEF1F5' }}>
      <Bouton
        titre={!arrivee ? t('reservation.choisirDestination') : !choisi ? t('reservation.calcul')
          : planifier ? t('reservation.planifier') : t('reservation.commander', { prix: fcfa(total) })}
        onPress={arrivee ? commander : () => setChoix('arrivee')}
        chargement={envoi}
        desactive={!!arrivee && (!choisi?.disponible || !depart || chargement)}
        icone={arrivee ? 'flash' : 'search'}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <CarteMboa points={points} trace={trace} animerTrace ajuster centre={position ?? undefined} marges={{ haut: 120, bas: 420 }} />

      <SafeAreaView edges={['top']} pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 8 }}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <PressableAnime onPress={() => navigation.goBack()} style={[{ backgroundColor: '#fff', borderRadius: 22, padding: 10 }, ombres.moyenne]}>
            <Ionicons name="arrow-back" size={22} color={couleurs.texte} />
          </PressableAnime>
          {/* Départ et destination */}
          <Apparition effet="descend" style={{ flex: 1 }}>
            <View style={[{ backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 6 }, ombres.moyenne]}>
              <ChampLieu couleur={couleurs.primaire} libelle={t('reservation.depart')} valeur={depart?.adresse || t('reservation.localisation')}
                precision={depart?.repere ?? undefined} onPress={() => setChoix('depart')} />
              <View style={{ height: 1, backgroundColor: '#EEF1F5', marginLeft: 22 }} />
              <ChampLieu couleur={couleurs.accent} carre libelle={t('reservation.destination')} valeur={arrivee?.adresse}
                placeholder={t('accueil.ouAllezVous')} onPress={() => setChoix('arrivee')} />
            </View>
          </Apparition>
        </View>
      </SafeAreaView>

      <PanneauGlissant ref={panneau} crans={['30%', '58%', '92%']} index={arrivee ? 1 : 0} pied={pied}>
        {!arrivee ? (
          <View style={{ alignItems: 'center', gap: 8, paddingVertical: 16 }}>
            <Ionicons name="navigate-circle" size={48} color={couleurs.primaire} />
            <Text style={{ fontFamily: polices.titreDemi, fontSize: 17, color: couleurs.texte }}>{t('accueil.ouAllezVous')}</Text>
          </View>
        ) : chargement && !estimation ? (
          <View style={{ gap: 10 }}>{[0, 1, 2].map((i) => <SqueletteCarte key={i} />)}</View>
        ) : estimation && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: polices.titreDemi, fontSize: 17, color: couleurs.texte }}>{t('reservation.choisirService')}</Text>
              <Text style={{ fontFamily: polices.texteMoyen, fontSize: 13, color: couleurs.texteSecondaire }}>
                {t('reservation.trajet', { km: estimation.distanceKm, min: estimation.dureeMin })}
              </Text>
            </View>
            {estimation.services.map((svc, i) => (
              <Apparition key={svc.typeService} rang={i}>
                <CarteService service={svc} selectionne={svc.typeService === service} onPress={() => selectionner(svc)} />
              </Apparition>
            ))}

            {choisi && choisi.majorations.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {choisi.majorations.map((m) => (
                  <View key={m.code} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: couleurs.accentClair, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Ionicons name={m.code === 'PLUIE' ? 'rainy' : m.code === 'NUIT' ? 'moon' : m.code === 'DEMANDE' ? 'flame' : 'time'} size={13} color={couleurs.accentFonce} />
                    <Text style={{ fontFamily: polices.texteMoyen, fontSize: 12, color: couleurs.accentFonce }}>
                      {t('majorations.' + m.code, { defaultValue: m.libelle })} +{m.pct}%
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {service === 'RAMASSAGE' && (
              <Animated.View entering={FadeIn} exiting={FadeOut} style={{ backgroundColor: couleurs.vertClair, padding: 12, borderRadius: 14, flexDirection: 'row', gap: 8 }}>
                <Ionicons name="information-circle" size={18} color={couleurs.vert} />
                <Text style={{ flex: 1, fontFamily: polices.texte, color: couleurs.vert }}>{t('reservation.avertissementRamassage')}</Text>
              </Animated.View>
            )}

            {choisi?.negociable && (
              <Animated.View entering={FadeIn} layout={LinearTransition} style={{ backgroundColor: couleurs.fond, borderRadius: 18, padding: 16, gap: 6 }}>
                <Text style={{ fontFamily: polices.titreDemi, fontSize: 15, color: couleurs.texte }}>{t('reservation.votrePrix')}</Text>
                <CurseurPrix min={choisi.prixMin} max={choisi.prixMax} reference={choisi.prixReference} valeur={prix} onChange={setPrix} />
              </Animated.View>
            )}

            {/* Paiement */}
            <Text style={{ fontFamily: polices.titreDemi, fontSize: 15, color: couleurs.texte }}>{t('reservation.paiement')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {MODES.map(({ mode: m, icone, couleur }) => {
                const sel = mode === m;
                return (
                  <PressableAnime key={m} onPress={() => setMode(m)} vibration="selection"
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 2,
                      borderColor: sel ? couleurs.primaire : '#EEF1F5', backgroundColor: sel ? couleurs.primaireClair : '#fff' }}>
                    <Ionicons name={icone} size={17} color={couleur} />
                    <Text style={{ fontFamily: polices.texteGras, fontSize: 13, color: couleurs.texte }}>
                      {t('paiements.' + m)}{m === 'PORTEFEUILLE' ? ` · ${fcfa(utilisateur?.solde)}` : ''}
                    </Text>
                  </PressableAnime>
                );
              })}
            </View>

            {/* Options repliables */}
            <PressableAnime onPress={() => setOptions((o) => !o)} vibration="selection" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
              <Ionicons name="options-outline" size={18} color={couleurs.primaire} />
              <Text style={{ flex: 1, fontFamily: polices.texteGras, color: couleurs.primaire }}>{t('reservation.options')}</Text>
              <Ionicons name={options ? 'chevron-up' : 'chevron-down'} size={18} color={couleurs.primaire} />
            </PressableAnime>
            {options && (
              <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} layout={LinearTransition} style={{ gap: 14 }}>
                {service !== 'MOTO' && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: polices.texteMoyen, color: couleurs.texte }}>{service === 'RAMASSAGE' ? t('reservation.places') : t('reservation.passagers')}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                      <Bouton petit variante="secondaire" titre="−" onPress={() => setNbPlaces((n) => Math.max(1, n - 1))} />
                      <Text style={{ fontFamily: polices.titre, fontSize: 18 }}>{nbPlaces}</Text>
                      <Bouton petit variante="secondaire" titre="+" onPress={() => setNbPlaces((n) => Math.min(4, n + 1))} />
                    </View>
                  </View>
                )}
                {utilisateur?.genre === 'F' && service !== 'RAMASSAGE' && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Switch value={lady} onValueChange={(v) => { setLady(v); haptique.selection(); }} trackColor={{ true: couleurs.primaire }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: polices.texteGras, color: couleurs.texte }}>Mboa Lady</Text>
                      <Text style={{ fontFamily: polices.texte, fontSize: 13, color: couleurs.texteSecondaire }}>{t('reservation.lady')}</Text>
                    </View>
                  </View>
                )}
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                  <View style={{ flex: 1 }}><Champ libelle={t('reservation.codePromo')} value={promo} onChangeText={setPromo} autoCapitalize="characters" /></View>
                  <Bouton petit variante="secondaire" titre={t('commun.appliquer')} onPress={() => setPromoApplique(promo.trim())} />
                </View>
                <Text style={{ fontFamily: polices.texteGras, color: couleurs.texte }}>{t('reservation.quand')}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[{ cle: 'maintenant', d: null }, { cle: 'aujourdhui', d: new Date() }, { cle: 'demain', d: demain }].map((o) => {
                    const sel = (o.d === null && !planifier) || (!!o.d && !!planifier && o.d.toDateString() === planifier.toDateString());
                    return (
                      <PressableAnime key={o.cle} onPress={() => setPlanifier(o.d)} vibration="selection"
                        style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: sel ? couleurs.primaire : couleurs.primaireClair }}>
                        <Text style={{ fontFamily: polices.texteGras, color: sel ? '#fff' : couleurs.primaire }}>{t('reservation.' + o.cle)}</Text>
                      </PressableAnime>
                    );
                  })}
                </View>
                {planifier && <Champ libelle={t('reservation.heure')} placeholder="07:30" value={heurePlanif} onChangeText={setHeurePlanif} keyboardType="numbers-and-punctuation" maxLength={5} />}
              </Animated.View>
            )}
          </>
        )}
      </PanneauGlissant>

      <ChoixLieu visible={choix !== null} titre={choix === 'depart' ? t('reservation.depart') : t('reservation.destination')}
        position={position} avecPrecision={choix === 'depart'} onFermer={() => setChoix(null)}
        onChoix={(p) => { haptique.leger(); if (choix === 'depart') setDepart(p); else setArrivee(p); setChoix(null); }} />
    </View>
  );
}

function ChampLieu({ couleur, carre, libelle, valeur, placeholder, precision, onPress }: {
  couleur: string; carre?: boolean; libelle: string; valeur?: string; placeholder?: string; precision?: string; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
      <View style={{ width: 10, height: 10, borderRadius: carre ? 2 : 5, backgroundColor: couleur }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: polices.texte, fontSize: 11, color: couleurs.texteSecondaire }}>{libelle}</Text>
        <Text style={{ fontFamily: valeur ? polices.texteGras : polices.texte, fontSize: 15, color: valeur ? couleurs.texte : couleurs.texteSecondaire }} numberOfLines={1}>
          {valeur || placeholder}
        </Text>
        {precision ? <Text style={{ fontFamily: polices.texte, fontSize: 12, color: couleurs.primaire }} numberOfLines={1}>📍 {precision}</Text> : null}
      </View>
    </Pressable>
  );
}
