import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Bouton, Ecran, Vide } from '../../components/ui';
import PressableAnime from '../../components/anime/Pressable';
import Apparition from '../../components/anime/Apparition';
import { SqueletteCarte } from '../../components/anime/Squelette';
import { dateHeure, fcfa } from '../../utils/format';
import { couleurs, ombres, polices } from '../../theme';
import type { Course } from '../../types';
import type { Routes } from '../../navigation/RootNavigator';

const STATUT: Record<string, { fg: string; bg: string; icone: keyof typeof Ionicons.glyphMap }> = {
  TERMINEE: { fg: couleurs.vert, bg: couleurs.vertClair, icone: 'checkmark-circle' },
  ANNULEE: { fg: couleurs.rouge, bg: couleurs.rougeClair, icone: 'close-circle' },
  EXPIREE: { fg: couleurs.accentFonce, bg: couleurs.accentClair, icone: 'time' }
};
const EN_COURS = ['RECHERCHE', 'ACCEPTEE', 'CHAUFFEUR_ARRIVE', 'EN_COURS', 'PLANIFIEE'];

/** Historique des courses (BF-15) : cartes avec le trajet dessiné, chargement en squelettes, état vide illustré. */
export default function Historique() {
  const { t } = useTranslation();
  const { utilisateur } = useAuth();
  const nav = useNavigation<StackNavigationProp<Routes>>();
  const [courses, setCourses] = useState<Course[]>([]);
  const [page, setPage] = useState(0);
  const [fin, setFin] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [premierChargement, setPremierChargement] = useState(true);
  const chauffeur = utilisateur?.role === 'CHAUFFEUR';

  const charger = useCallback(async (p: number) => {
    setChargement(true);
    try {
      const liste = await Api.courses.historique(p);
      setCourses((c) => (p === 0 ? liste : [...c, ...liste]));
      setFin(liste.length < 20);
      setPage(p);
    } catch { /* hors ligne : la liste déjà affichée reste visible */ } finally { setChargement(false); setPremierChargement(false); }
  }, []);
  useFocusEffect(useCallback(() => { charger(0); }, [charger]));

  const ouvrir = (c: Course) => {
    if (EN_COURS.includes(c.statut)) nav.navigate(chauffeur ? 'CourseChauffeur' : 'CourseClient', { courseId: c.id });
    else nav.navigate('DetailCourse', { courseId: c.id });
  };

  return (
    <Ecran titre={t('historique.titre')} retour={false} defilement={false}>
      <FlatList data={courses} keyExtractor={(c) => String(c.id)} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={chargement && page === 0 && !premierChargement} onRefresh={() => charger(0)} tintColor={couleurs.primaire} />}
        onEndReached={() => !fin && !chargement && charger(page + 1)}
        ListEmptyComponent={premierChargement ? (
          <View style={{ gap: 12 }}>{[0, 1, 2, 3].map((i) => <SqueletteCarte key={i} />)}</View>
        ) : (
          <Vide titre={t('historique.videTitre')} texte={chauffeur ? t('historique.videChauffeur') : t('historique.vide')} icone="car-outline" illustration="aucuneCourse"
            action={chauffeur ? undefined : <Bouton titre={t('historique.commander')} icone="flash" onPress={() => nav.navigate('Reservation', undefined)} />} />
        )}
        renderItem={({ item: c, index }) => {
          const st = STATUT[c.statut] ?? { fg: couleurs.primaire, bg: couleurs.primaireClair, icone: 'navigate-circle' as const };
          const montant = chauffeur ? c.gainChauffeur ?? c.prixFinal : c.montantAPayer;
          return (
            <Apparition rang={index % 10}>
              <PressableAnime onPress={() => ouvrir(c)} echelle={0.98} vibration="selection"
                style={[{ backgroundColor: '#fff', borderRadius: 20, padding: 16, gap: 12 }, ombres.legere]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name={c.typeService === 'MOTO' ? 'bicycle' : c.typeService === 'RAMASSAGE' ? 'people' : 'car'} size={16} color={couleurs.primaire} />
                    <Text style={{ fontFamily: polices.texteMoyen, fontSize: 13, color: couleurs.texteSecondaire }}>
                      {t('services.' + c.typeService)} · {dateHeure(c.createdAt)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: st.bg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Ionicons name={st.icone} size={13} color={st.fg} />
                    <Text style={{ fontFamily: polices.texteGras, fontSize: 12, color: st.fg }}>{t('statuts.' + c.statut)}</Text>
                  </View>
                </View>

                {/* Trajet dessiné : départ, ligne, destination */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ alignItems: 'center', paddingVertical: 4 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: couleurs.primaire }} />
                    <View style={{ width: 2, flex: 1, minHeight: 16, backgroundColor: '#D7DEE8', marginVertical: 3 }} />
                    <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: couleurs.accent }} />
                  </View>
                  <View style={{ flex: 1, justifyContent: 'space-between', gap: 10 }}>
                    <Text style={{ fontFamily: polices.texteGras, fontSize: 15, color: couleurs.texte }} numberOfLines={1}>{c.depart.adresse}</Text>
                    <Text style={{ fontFamily: polices.texteGras, fontSize: 15, color: couleurs.texte }} numberOfLines={1}>{c.arrivee.adresse}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F0F2F5', paddingTop: 10 }}>
                  <Text style={{ fontFamily: polices.texte, fontSize: 13, color: couleurs.texteSecondaire }}>
                    {c.distanceKm ? `${String(c.distanceKm).replace('.', ',')} km · ${c.dureeMin} min` : ''}
                  </Text>
                  <Text style={{ fontFamily: polices.titre, fontSize: 17, color: c.statut === 'TERMINEE' ? couleurs.primaire : couleurs.texteSecondaire }}>
                    {montant != null ? fcfa(montant) : '—'}
                  </Text>
                </View>
              </PressableAnime>
            </Apparition>
          );
        }}
        ListFooterComponent={chargement && !premierChargement && page > 0 ? <SqueletteCarte /> : null} />
    </Ecran>
  );
}
