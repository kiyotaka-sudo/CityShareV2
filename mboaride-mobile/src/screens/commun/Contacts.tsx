import React, { useEffect, useState } from 'react';
import { Alert, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Api } from '../../api';
import { messageErreur } from '../../api/client';
import { Bouton, Carte, Champ, Ecran, Ligne, s, Vide } from '../../components/ui';
import { telephone } from '../../utils/format';
import type { Contact } from '../../types';

/** Contacts de confiance prévenus par SMS en cas de SOS (BF-02, BF-43). */
export default function Contacts() {
  const { t } = useTranslation();
  const [liste, setListe] = useState<Contact[]>([]);
  const [nom, setNom] = useState('');
  const [tel, setTel] = useState('');
  const charger = () => Api.moi.contacts().then(setListe).catch(() => undefined);
  useEffect(() => { charger(); }, []);
  const ajouter = async () => {
    try { await Api.moi.ajouterContact({ nom, telephone: tel }); setNom(''); setTel(''); charger(); }
    catch (e) { Alert.alert(t('erreurs.titre'), messageErreur(e)); }
  };
  return (
    <Ecran titre={t('profil.contacts')}>
      <Text style={s.secondaire}>{t('contacts.explication')}</Text>
      {liste.length === 0 ? <Vide texte={t('contacts.vide')} icone="people-outline" /> : (
        <Carte style={{ padding: 0, overflow: 'hidden' }}>
          {liste.map((c) => <Ligne key={c.id} icone="person" texte={c.nom} sousTexte={telephone(c.telephone)}
            droite={<Bouton petit variante="contour" titre={t('commun.supprimer')} onPress={() => Api.moi.supprimerContact(c.id!).then(charger)} />} />)}
        </Carte>
      )}
      {liste.length < 5 && (
        <Carte>
          <Champ libelle={t('contacts.nom')} value={nom} onChangeText={setNom} />
          <Champ libelle={t('contacts.telephone')} value={tel} onChangeText={setTel} keyboardType="phone-pad" placeholder="6 90 00 00 00" />
          <Bouton titre={t('commun.ajouter')} onPress={ajouter} desactive={!nom.trim() || tel.replace(/\D/g, '').length < 9} />
        </Carte>
      )}
    </Ecran>
  );
}
