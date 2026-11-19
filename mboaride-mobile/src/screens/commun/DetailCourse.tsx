import React, { useEffect, useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { Api } from '../../api';
import { messageErreur } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Bouton, Carte, Champ, Chargement, Ecran, Etoiles, s } from '../../components/ui';
import { dateHeure, fcfa } from '../../utils/format';
import type { Course } from '../../types';
import type { Routes } from '../../navigation/RootNavigator';

/** Détail d'une course passée : reçu (BF-15), notation (BF-49), signalement d'incident (BF-51). */
export default function DetailCourse({ navigation, route }: StackScreenProps<Routes, 'DetailCourse'>) {
  const { t } = useTranslation();
  const { utilisateur } = useAuth();
  const [c, setC] = useState<Course | null>(null);
  const [note, setNote] = useState(0);
  const [commentaire, setCommentaire] = useState('');
  const charger = () => Api.courses.detail(route.params.courseId).then(setC).catch((e) => Alert.alert(t('erreurs.titre'), messageErreur(e)));
  useEffect(() => { charger(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!c) return <Chargement />;
  const chauffeur = utilisateur?.role === 'CHAUFFEUR';
  const ligne = (lib: string, val?: string | number | null) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={s.secondaire}>{lib}</Text><Text style={[s.normal, { flexShrink: 1, textAlign: 'right' }]}>{val ?? '—'}</Text>
    </View>
  );
  return (
    <Ecran titre={c.reference}>
      <Carte>
        {ligne(t('detail.statut'), t('statuts.' + c.statut))}
        {ligne(t('detail.service'), t('services.' + c.typeService))}
        {ligne(t('reservation.depart'), c.depart.adresse + (c.depart.repere ? ` (${c.depart.repere})` : ''))}
        {ligne(t('reservation.destination'), c.arrivee.adresse)}
        {ligne(t('detail.distance'), `${c.distanceKm} km`)}
        {ligne(t('detail.date'), dateHeure(c.createdAt))}
        {ligne(chauffeur ? t('detail.client') : t('detail.chauffeur'), chauffeur ? c.client.prenom : c.chauffeur ? `${c.chauffeur.prenom} ${c.chauffeur.nom} — ${c.chauffeur.vehicule?.immatriculation ?? ''}` : null)}
      </Carte>
      <Carte>
        {ligne(t('detail.prixReference'), fcfa(c.prixReference))}
        {ligne(t('detail.prixConvenu'), fcfa(c.prixFinal))}
        {c.reduction > 0 && ligne(t('detail.reduction'), '− ' + fcfa(c.reduction))}
        {ligne(t('course.total'), fcfa(c.montantAPayer))}
        {chauffeur && ligne(t('detail.commission'), fcfa(c.commission))}
        {chauffeur && ligne(t('detail.gain'), fcfa(c.gainChauffeur))}
        {ligne(t('reservation.paiement'), `${t('paiements.' + c.modePaiement)} · ${t('paiementStatut.' + c.statutPaiement)}`)}
        {c.fraisAnnulation > 0 && ligne(t('detail.fraisAnnulation'), fcfa(c.fraisAnnulation))}
      </Carte>
      {c.statut === 'TERMINEE' && (
        <>
          <Bouton icone="document-text" titre={t('course.recu')} onPress={async () => {
            try { Linking.openURL((await Api.courses.recu(c.id)).url); } catch (e) { Alert.alert(t('erreurs.titre'), messageErreur(e)); }
          }} />
          {!c.dejaNote && c.chauffeur && (
            <Carte>
              <Text style={s.gras}>{t('detail.noter')}</Text>
              <Etoiles note={note} taille={34} onChange={setNote} />
              <Champ placeholder={t('course.commentaire')} value={commentaire} onChangeText={setCommentaire} multiline />
              <Bouton titre={t('commun.envoyer')} desactive={!note} onPress={async () => {
                try { await Api.courses.noter(c.id, note, commentaire || undefined); charger(); } catch (e) { Alert.alert(t('erreurs.titre'), messageErreur(e)); }
              }} />
            </Carte>
          )}
        </>
      )}
      <Bouton variante="contour" icone="alert-circle" titre={t('detail.signaler')} onPress={() => navigation.navigate('Reclamations', { courseId: c.id, nouvelle: true })} />
    </Ecran>
  );
}
