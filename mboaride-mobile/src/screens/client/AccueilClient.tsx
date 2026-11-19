import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '@gorhom/bottom-sheet';
import { Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { usePosition } from '../../hooks/usePosition';
import CarteMboa, { VehiculeCarte } from '../../carte/CarteMboa';
import BoutonSOS from '../../components/BoutonSOS';
import PanneauGlissant from '../../components/anime/PanneauGlissant';
import PressableAnime from '../../components/anime/Pressable';
import Apparition from '../../components/anime/Apparition';
import { Squelette } from '../../components/anime/Squelette';
import { couleurs, ombres, polices } from '../../theme';
import type { Course, Lieu, Point, Repere, TypeService } from '../../types';
import type { Routes } from '../../navigation/RootNavigator';

const ICONES_LIEU: Record<Lieu['type'], keyof typeof Ionicons.glyphMap> = { MAISON: 'home', TRAVAIL: 'briefcase', CAMPUS: 'school', AUTRE: 'star' };
const SERVICES: { type: TypeService; image: number; couleur: string }[] = [
  { type: 'DEPOT', image: require('../../../assets/images/service-taxi.png'), couleur: couleurs.primaire },
  { type: 'RAMASSAGE', image: require('../../../assets/images/service-ramassage.png'), couleur: couleurs.vert },
  { type: 'MOTO', image: require('../../../assets/images/service-moto.png'), couleur: couleurs.accent }
];

/**
 * Accueil client : carte plein écran avec les véhicules alentour qui roulent, panneau glissant à trois crans
 * (« Où allez-vous ? », raccourcis, services, promotions, trajets récents, repères proches).
 */
export default function AccueilClient() {
  const { t } = useTranslation();
  const { utilisateur } = useAuth();
  const nav = useNavigation<StackNavigationProp<Routes>>();
  const { position } = usePosition();
  const panneau = useRef<BottomSheet>(null);
  const [active, setActive] = useState<Course | null>(null);
  const [favoris, setFavoris] = useState<Lieu[] | null>(null);
  const [recents, setRecents] = useState<Point[]>([]);
  const [reperes, setReperes] = useState<Repere[]>([]);
  const [vehicules, setVehicules] = useState<VehiculeCarte[]>([]);

  useFocusEffect(useCallback(() => {
    Api.courses.active().then(setActive).catch(() => undefined);
    Api.moi.lieux().then(setFavoris).catch(() => setFavoris([]));
    Api.courses.historique(0).then((courses) => {
      const vus = new Set<string>();
      setRecents(courses.filter((c) => c.statut === 'TERMINEE').map((c) => c.arrivee)
        .filter((p) => !vus.has(p.adresse) && vus.add(p.adresse)).slice(0, 3));
    }).catch(() => undefined);
  }, []));

  useFocusEffect(useCallback(() => {
    if (!position) return undefined;
    Api.reperes.rechercher(undefined, position.lat, position.lng).then((r) => setReperes(r.slice(0, 6))).catch(() => undefined);
    const charger = () => Api.carte.vehiculesProches(position.lat, position.lng).then(setVehicules).catch(() => undefined);
    charger();
    const id = setInterval(charger, 8000);
    return () => clearInterval(id);
  }, [position?.lat, position?.lng])); // eslint-disable-line react-hooks/exhaustive-deps

  const reserver = (arrivee?: Point, service?: TypeService) => nav.navigate('Reservation', { arrivee, service });
  const nbProches = useMemo(() => vehicules.length, [vehicules]);

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <CarteMboa centre={position ?? undefined} ajuster={false} zoom={14} vehicules={vehicules} marges={{ bas: 260 }}
        points={position ? [{ id: 'moi', type: 'moi', lat: position.lat, lng: position.lng }] : []} />

      <SafeAreaView edges={['top']} pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Apparition effet="descend">
          <View style={[{ backgroundColor: '#fff', paddingLeft: 6, paddingRight: 14, paddingVertical: 6, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 8 }, ombres.moyenne]}>
            <Image source={require('../../../assets/logo-pin.png')} style={{ width: 26, height: 32 }} resizeMode="contain" />
            <View>
              <Text style={{ fontFamily: polices.texteGras, fontSize: 15, color: couleurs.texte }}>{t('accueil.bonjour', { prenom: utilisateur?.prenom })}</Text>
              <Text style={{ fontFamily: polices.texte, fontSize: 12, color: couleurs.texteSecondaire }}>
                {nbProches > 0 ? t('accueil.vehiculesProches', { n: nbProches }) : t('accueil.rechercheVehicules')}
              </Text>
            </View>
          </View>
        </Apparition>
        <Apparition effet="descend" rang={1}><BoutonSOS compact courseId={active?.id} /></Apparition>
      </SafeAreaView>

      <PanneauGlissant ref={panneau} crans={['32%', '60%', '92%']}>
        {active && (
          <Apparition>
            <PressableAnime onPress={() => nav.navigate('CourseClient', { courseId: active.id })}>
              <LinearGradient colors={[couleurs.primaire, '#0B4A8F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 10 }}>
                  <Ionicons name="car" size={26} color={couleurs.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontFamily: polices.titreDemi, fontSize: 16 }}>{t('statuts.' + active.statut)}</Text>
                  <Text style={{ color: couleurs.primaireClair, fontFamily: polices.texte }} numberOfLines={1}>{active.arrivee.adresse}</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#fff" />
              </LinearGradient>
            </PressableAnime>
          </Apparition>
        )}

        <PressableAnime onPress={() => reserver()} style={{ backgroundColor: couleurs.fond, borderRadius: 18, paddingVertical: 18, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ backgroundColor: couleurs.accent, borderRadius: 12, padding: 8 }}><Ionicons name="search" size={20} color="#fff" /></View>
          <Text style={{ flex: 1, fontFamily: polices.titreDemi, fontSize: 19, color: couleurs.texte }}>{t('accueil.ouAllezVous')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Ionicons name="time-outline" size={16} color={couleurs.primaire} />
            <Text style={{ fontFamily: polices.texteGras, fontSize: 13, color: couleurs.primaire }}>{t('accueil.maintenant')}</Text>
          </View>
        </PressableAnime>

        {/* Raccourcis : lieux favoris */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {favoris === null ? [0, 1, 2].map((i) => <Squelette key={i} largeur={120} hauteur={44} rayon={22} />) : (
            <>
              {favoris.map((f, i) => (
                <Apparition key={f.id} rang={i} effet="zoom">
                  <PressableAnime onPress={() => reserver({ lat: f.latitude, lng: f.longitude, adresse: f.adresse })}
                    style={{ flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: couleurs.primaireClair, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 11 }}>
                    <Ionicons name={ICONES_LIEU[f.type]} size={17} color={couleurs.primaire} />
                    <Text style={{ fontFamily: polices.texteGras, color: couleurs.primaire }}>{f.libelle}</Text>
                  </PressableAnime>
                </Apparition>
              ))}
              <PressableAnime onPress={() => nav.navigate('Lieux')} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', borderWidth: 1.5, borderColor: couleurs.bord, borderStyle: 'dashed', borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10 }}>
                <Ionicons name="add" size={18} color={couleurs.texteSecondaire} />
                <Text style={{ fontFamily: polices.texteMoyen, color: couleurs.texteSecondaire }}>{t('accueil.ajouterLieu')}</Text>
              </PressableAnime>
            </>
          )}
        </ScrollView>

        {/* Choix rapide du service */}
        <Text style={titre}>{t('accueil.servicesTitre')}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {SERVICES.map((sv, i) => (
            <Apparition key={sv.type} rang={i} style={{ flex: 1 }}>
              <PressableAnime onPress={() => reserver(undefined, sv.type)} echelle={0.93}
                style={[{ backgroundColor: '#fff', borderRadius: 18, paddingTop: 12, paddingBottom: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#EEF1F5', overflow: 'hidden' }, ombres.legere]}>
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 52, backgroundColor: sv.couleur + '14' }} />
                <Image source={sv.image} style={{ width: '92%', height: 62 }} resizeMode="contain" />
                <Text style={{ fontFamily: polices.texteGras, fontSize: 13, color: couleurs.texte, textAlign: 'center' }}>{t('services.' + sv.type)}</Text>
              </PressableAnime>
            </Apparition>
          ))}
        </View>

        {/* Promotion : parrainage */}
        {utilisateur?.codeParrainage && (
          <PressableAnime onPress={() => nav.navigate('Onglets', { screen: 'Profil' } as never)} echelle={0.97}>
            <LinearGradient colors={[couleurs.accent, '#FFB347']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, overflow: 'hidden' }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontFamily: polices.titre, fontSize: 18, color: '#fff' }}>{t('accueil.promoTitre')}</Text>
                <Text style={{ fontFamily: polices.texte, color: '#FFF7EC' }}>{t('accueil.promoTexte')}</Text>
                <View style={{ alignSelf: 'flex-start', marginTop: 6, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Text style={{ fontFamily: polices.titreDemi, color: couleurs.accentFonce, letterSpacing: 1 }}>{utilisateur.codeParrainage}</Text>
                </View>
              </View>
              <Ionicons name="gift" size={64} color="rgba(255,255,255,0.9)" />
            </LinearGradient>
          </PressableAnime>
        )}

        {/* Trajets récents */}
        {recents.length > 0 && <Text style={titre}>{t('accueil.recents')}</Text>}
        {recents.map((p, i) => (
          <Apparition key={p.adresse} rang={i}>
            <LigneLieu icone="time" titre={p.adresse} onPress={() => reserver(p)} />
          </Apparition>
        ))}

        {/* Repères populaires proches */}
        {reperes.length > 0 && <Text style={titre}>{t('accueil.reperesProches')}</Text>}
        {reperes.map((r, i) => (
          <Apparition key={r.id} rang={i}>
            <LigneLieu icone="flag" titre={r.nom} detail={`${t('categories.' + r.categorie)} · ${r.ville}`}
              onPress={() => reserver({ lat: r.lat, lng: r.lng, adresse: r.nom, repere: r.nom })} />
          </Apparition>
        ))}
      </PanneauGlissant>
    </View>
  );
}

const titre = { fontFamily: polices.titreDemi, fontSize: 17, color: couleurs.texte, marginTop: 6 };

function LigneLieu({ icone, titre: t, detail, onPress }: { icone: keyof typeof Ionicons.glyphMap; titre: string; detail?: string; onPress: () => void }) {
  return (
    <PressableAnime onPress={onPress} echelle={0.98} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
      <View style={{ backgroundColor: couleurs.fond, borderRadius: 14, padding: 10 }}><Ionicons name={icone} size={18} color={couleurs.primaire} /></View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: polices.texteMoyen, fontSize: 15, color: couleurs.texte }} numberOfLines={1}>{t}</Text>
        {detail ? <Text style={{ fontFamily: polices.texte, fontSize: 13, color: couleurs.texteSecondaire }}>{detail}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={couleurs.bord} />
    </PressableAnime>
  );
}
