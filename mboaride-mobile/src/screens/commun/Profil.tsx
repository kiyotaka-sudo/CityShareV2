import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Share, Switch, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Api } from '../../api';
import { messageErreur } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { changerLangue } from '../../i18n';
import { CLE_ECONOMIE } from '../../hooks/useEnvoiPosition';
import { Avatar, Bouton, Carte, Champ, Ecran, Etoiles, Ligne, s } from '../../components/ui';
import { telephone } from '../../utils/format';
import { couleurs, espace } from '../../theme';
import type { Routes } from '../../navigation/RootNavigator';

/** Profil (BF-02, BF-05) : identité, langue, contacts de confiance, favoris, parrainage, données personnelles. */
export default function Profil() {
  const { t, i18n } = useTranslation();
  const { utilisateur: u, mettreAJour, deconnecter } = useAuth();
  const nav = useNavigation<StackNavigationProp<Routes>>();
  const [edition, setEdition] = useState(false);
  const [nom, setNom] = useState(u?.nom ?? '');
  const [prenom, setPrenom] = useState(u?.prenom ?? '');
  const [email, setEmail] = useState(u?.email ?? '');
  const [economie, setEconomie] = useState(false);

  useEffect(() => { AsyncStorage.getItem(CLE_ECONOMIE).then((v) => setEconomie(v === 'true')); }, []);
  if (!u) return null;
  const chauffeur = u.role === 'CHAUFFEUR';

  const executer = async (fn: () => Promise<unknown>) => {
    try { await fn(); } catch (e) { Alert.alert(t('erreurs.titre'), messageErreur(e)); }
  };

  const changerPhoto = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6 });
    if (!r.canceled) executer(async () => mettreAJour(await Api.moi.photo(r.assets[0].uri)));
  };

  const langue = (l: 'fr' | 'en') => executer(async () => { await changerLangue(l); mettreAJour(await Api.moi.modifier({ langue: l })); });

  const supprimer = () => Alert.alert(t('profil.supprimerTitre'), t('profil.supprimerTexte'), [
    { text: t('commun.annuler'), style: 'cancel' },
    { text: t('profil.supprimer'), style: 'destructive', onPress: () => executer(async () => { await Api.moi.supprimer(); await deconnecter(); }) }
  ]);

  const exporter = () => executer(async () => {
    const donnees = await Api.moi.exporter();
    await Share.share({ title: 'MboaRide', message: JSON.stringify(donnees, null, 2) });
  });

  return (
    <Ecran titre={t('profil.titre')} retour={false}>
      <Carte style={{ flexDirection: 'row', alignItems: 'center', gap: espace.m }}>
        <Pressable onPress={changerPhoto}><Avatar photo={u.photoUrl} nom={u.prenom} taille={72} /></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.grand}>{u.prenom} {u.nom}</Text>
          <Text style={s.secondaire}>{telephone(u.telephone)}</Text>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Etoiles note={u.noteMoyenne} taille={14} /><Text style={s.secondaire}>{u.noteMoyenne} ({u.nbNotes})</Text></View>
        </View>
      </Carte>

      {edition ? (
        <Carte>
          <Champ libelle={t('profil.prenom')} value={prenom} onChangeText={setPrenom} />
          <Champ libelle={t('profil.nom')} value={nom} onChangeText={setNom} />
          <Champ libelle="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          {u.role === 'CLIENT' && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['H', 'F'] as const).map((g) => (
                <Bouton key={g} petit style={{ flex: 1 }} variante={u.genre === g ? 'primaire' : 'contour'} titre={t('profil.genre' + g)}
                  onPress={() => executer(async () => mettreAJour(await Api.moi.modifier({ genre: g })))} />
              ))}
            </View>
          )}
          <Bouton titre={t('commun.enregistrer')} onPress={() => executer(async () => {
            mettreAJour(await Api.moi.modifier({ nom, prenom, email }));
            setEdition(false);
          })} />
        </Carte>
      ) : <Bouton variante="contour" icone="create-outline" titre={t('profil.modifier')} onPress={() => setEdition(true)} />}

      <Carte style={{ padding: 0, overflow: 'hidden' }}>
        <Ligne icone="language" texte={t('profil.langue')} droite={
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {(['fr', 'en'] as const).map((l) => <Bouton key={l} petit variante={i18n.language === l ? 'primaire' : 'contour'} titre={l.toUpperCase()} onPress={() => langue(l)} />)}
          </View>} />
        <Ligne icone="people" texte={t('profil.contacts')} sousTexte={t('profil.contactsAide')} onPress={() => nav.navigate('Contacts')} />
        {!chauffeur && <Ligne icone="star" texte={t('profil.lieux')} onPress={() => nav.navigate('Lieux')} />}
        <Ligne icone="notifications" texte={t('profil.notifications')} onPress={() => nav.navigate('Notifications')} />
        <Ligne icone="cloud-download" texte={t('hors.titre')} sousTexte={t('hors.sousTitre')} onPress={() => nav.navigate('CartesHorsLigne')} />
        <Ligne icone="chatbox-ellipses" texte={t('profil.reclamations')} onPress={() => nav.navigate('Reclamations')} />
        {chauffeur && <Ligne icone="document-attach" texte={t('profil.documents')} onPress={() => nav.navigate('Documents')} />}
        {chauffeur && (
          <Ligne icone="battery-half" texte={t('profil.economie')} sousTexte={t('profil.economieAide')} droite={
            <Switch value={economie} trackColor={{ true: couleurs.primaire }} onValueChange={(v) => { setEconomie(v); AsyncStorage.setItem(CLE_ECONOMIE, String(v)); }} />} />
        )}
        {chauffeur && u.chauffeur?.typeService === 'MOTO' && (
          <Ligne icone="shield-checkmark" texte={t('profil.casque')} droite={
            <Switch value={u.chauffeur.casqueDisponible} trackColor={{ true: couleurs.primaire }}
              onValueChange={(v) => executer(async () => mettreAJour(await Api.chauffeur.casque(v)))} />} />
        )}
      </Carte>

      {u.codeParrainage && (
        <Carte>
          <Text style={s.gras}>{t('profil.parrainage')}</Text>
          <Text style={s.secondaire}>{t('profil.parrainageAide')}</Text>
          <Text style={{ fontSize: 24, fontWeight: '900', letterSpacing: 2, color: couleurs.primaire }}>{u.codeParrainage}</Text>
          <Bouton petit variante="secondaire" icone="share-social" titre={t('profil.partagerCode')}
            onPress={() => Share.share({ message: t('profil.messageParrainage', { code: u.codeParrainage }) })} />
        </Carte>
      )}

      <Carte style={{ padding: 0, overflow: 'hidden' }}>
        <Ligne icone="download" texte={t('profil.exporter')} sousTexte={t('profil.exporterAide')} onPress={exporter} />
        <Ligne icone="trash" texte={t('profil.supprimer')} onPress={supprimer} />
      </Carte>
      <Bouton variante="danger" icone="log-out" titre={t('profil.deconnexion')} onPress={deconnecter} />
    </Ecran>
  );
}
