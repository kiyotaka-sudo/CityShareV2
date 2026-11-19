import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { Api } from '../../api';
import { messageErreur } from '../../api/client';
import { Bouton, Carte, Champ, Ecran, Etiquette, s, Vide } from '../../components/ui';
import { dateHeure } from '../../utils/format';
import { couleurs } from '../../theme';
import type { Reclamation } from '../../types';
import type { Routes } from '../../navigation/RootNavigator';

const TYPES = ['OBJET_PERDU', 'COMPORTEMENT', 'LITIGE_PRIX', 'ACCIDENT', 'AUTRE'];

/** Signalement d'incident et suivi des réclamations par numéro (BF-51, BF-52). */
export default function Reclamations({ route }: StackScreenProps<Routes, 'Reclamations'>) {
  const { t } = useTranslation();
  const courseId = route.params?.courseId;
  const [liste, setListe] = useState<Reclamation[]>([]);
  const [formulaire, setFormulaire] = useState(!!route.params?.nouvelle);
  const [type, setType] = useState('OBJET_PERDU');
  const [description, setDescription] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const charger = () => Api.reclamations.liste().then(setListe).catch(() => undefined);
  useEffect(() => { charger(); }, []);

  const envoyer = async () => {
    setEnvoi(true);
    try {
      const r = await Api.reclamations.creer({ courseId, type, description });
      Alert.alert(t('reclamations.envoyee'), t('reclamations.numero', { numero: r.numero }));
      setFormulaire(false); setDescription(''); charger();
    } catch (e) { Alert.alert(t('erreurs.titre'), messageErreur(e)); } finally { setEnvoi(false); }
  };

  return (
    <Ecran titre={t('profil.reclamations')}>
      {formulaire ? (
        <Carte>
          <Text style={s.gras}>{t('reclamations.nouvelle')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TYPES.map((ty) => (
              <Pressable key={ty} onPress={() => setType(ty)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: type === ty ? couleurs.primaire : couleurs.primaireClair }}>
                <Text style={{ color: type === ty ? '#fff' : couleurs.primaireFonce, fontWeight: '600' }}>{t('reclamations.' + ty)}</Text>
              </Pressable>
            ))}
          </View>
          <Champ libelle={t('reclamations.description')} value={description} onChangeText={setDescription} multiline maxLength={2000} />
          <Bouton titre={t('commun.envoyer')} onPress={envoyer} chargement={envoi} desactive={description.trim().length < 5} />
        </Carte>
      ) : <Bouton icone="add" titre={t('reclamations.nouvelle')} onPress={() => setFormulaire(true)} />}
      {liste.length === 0 ? <Vide texte={t('reclamations.vide')} /> : liste.map((r) => (
        <Carte key={r.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={s.gras}>{r.numero}</Text>
            <Etiquette texte={t('reclamations.statut_' + r.statut)} />
          </View>
          <Text style={s.secondaire}>{t('reclamations.' + r.type)} · {dateHeure(r.createdAt)}{r.courseReference ? ` · ${r.courseReference}` : ''}</Text>
          <Text style={s.normal}>{r.description}</Text>
          {r.reponse ? <Text style={[s.normal, { color: couleurs.primaireFonce }]}>↳ {r.reponse}</Text> : null}
        </Carte>
      ))}
    </Ecran>
  );
}
