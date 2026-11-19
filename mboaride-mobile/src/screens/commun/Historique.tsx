import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { Api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Ecran, Etiquette, s, Vide } from '../../components/ui';
import { dateHeure, fcfa } from '../../utils/format';
import { couleurs, espace } from '../../theme';
import type { Course } from '../../types';
import type { Routes } from '../../navigation/RootNavigator';

const COULEUR: Record<string, [string, string]> = {
  TERMINEE: [couleurs.vert, couleurs.vertClair], ANNULEE: [couleurs.rouge, couleurs.rougeClair], EXPIREE: [couleurs.rouge, couleurs.rougeClair]
};

/** Historique des courses (BF-15). */
export default function Historique() {
  const { t } = useTranslation();
  const { utilisateur } = useAuth();
  const nav = useNavigation<StackNavigationProp<Routes>>();
  const [courses, setCourses] = useState<Course[]>([]);
  const [page, setPage] = useState(0);
  const [fin, setFin] = useState(false);
  const [chargement, setChargement] = useState(false);
  const chauffeur = utilisateur?.role === 'CHAUFFEUR';

  const charger = useCallback(async (p: number) => {
    setChargement(true);
    try {
      const liste = await Api.courses.historique(p);
      setCourses((c) => (p === 0 ? liste : [...c, ...liste]));
      setFin(liste.length < 20);
      setPage(p);
    } catch { /* hors ligne */ } finally { setChargement(false); }
  }, []);
  useFocusEffect(useCallback(() => { charger(0); }, [charger]));

  const ouvrir = (c: Course) => {
    if (['RECHERCHE', 'ACCEPTEE', 'CHAUFFEUR_ARRIVE', 'EN_COURS', 'PLANIFIEE'].includes(c.statut)) {
      nav.navigate(chauffeur ? 'CourseChauffeur' : 'CourseClient', { courseId: c.id });
    } else nav.navigate('DetailCourse', { courseId: c.id });
  };

  return (
    <Ecran titre={t('historique.titre')} retour={false} defilement={false}>
      <FlatList data={courses} keyExtractor={(c) => String(c.id)} contentContainerStyle={{ padding: espace.m, gap: espace.s }}
        refreshControl={<RefreshControl refreshing={chargement && page === 0} onRefresh={() => charger(0)} />}
        onEndReached={() => !fin && !chargement && charger(page + 1)}
        ListEmptyComponent={chargement ? null : <Vide texte={t('historique.vide')} icone="car-outline" />}
        renderItem={({ item: c }) => {
          const [fg, bg] = COULEUR[c.statut] ?? [couleurs.bleu, '#E8EFFF'];
          return (
            <Pressable onPress={() => ouvrir(c)} style={{ backgroundColor: '#fff', borderRadius: 12, padding: espace.m, gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={s.secondaire}>{dateHeure(c.createdAt)} · {t('services.' + c.typeService)}</Text>
                <Etiquette texte={t('statuts.' + c.statut)} couleur={fg} fond={bg} />
              </View>
              <Text style={s.gras} numberOfLines={1}>{c.depart.adresse}</Text>
              <Text style={s.normal} numberOfLines={1}>→ {c.arrivee.adresse}</Text>
              <Text style={[s.gras, { alignSelf: 'flex-end' }]}>{fcfa(chauffeur ? c.gainChauffeur ?? c.prixFinal : c.montantAPayer)}</Text>
            </Pressable>
          );
        }} />
    </Ecran>
  );
}
