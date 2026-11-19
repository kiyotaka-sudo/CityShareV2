import React, { useEffect, useState } from 'react';
import { Linking, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { Api } from '../../api';
import { messageErreur, SERVEUR_URL } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import i18n from '../../i18n';
import { Bouton, Champ, Ecran, s } from '../../components/ui';
import CasesCode from '../../components/anime/CasesCode';
import { couleurs, espace } from '../../theme';
import type { Routes } from '../../navigation/RootNavigator';

/** Vérification du code OTP ; pour un nouveau compte : nom, prénom, parrainage et consentement (loi 2024/017). */
export default function CodeOtp({ route }: StackScreenProps<Routes, 'CodeOtp'>) {
  const { t } = useTranslation();
  const { connecter } = useAuth();
  const { telephone, nouveauCompte } = route.params;
  const [code, setCode] = useState('');
  const [codeDev, setCodeDev] = useState(route.params.codeDev);
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [parrainage, setParrainage] = useState('');
  const [consentement, setConsentement] = useState(false);
  const [erreur, setErreur] = useState<string>();
  const [envoi, setEnvoi] = useState(false);
  const [attente, setAttente] = useState(60);
  const [secousse, setSecousse] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setAttente((a) => Math.max(0, a - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const valide = code.length === 6 && (!nouveauCompte || (nom.trim() && prenom.trim() && consentement));

  // Compte existant : la vérification part dès le 6e chiffre, sans appui sur le bouton
  useEffect(() => {
    if (!nouveauCompte && code.length === 6 && !envoi) verifier();
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  const verifier = async () => {
    setEnvoi(true);
    setErreur(undefined);
    try {
      const r = await Api.auth.verifierOtp({
        telephone, code,
        ...(nouveauCompte ? { nom: nom.trim(), prenom: prenom.trim(), langue: i18n.language === 'en' ? 'en' : 'fr',
          codeParrainage: parrainage.trim() || undefined, consentement } : {})
      });
      await connecter(r.token, r.utilisateur);
    } catch (e) {
      setErreur(messageErreur(e));
      setSecousse((n) => n + 1);
      setEnvoi(false);
    }
  };

  const renvoyer = async () => {
    try {
      const r = await Api.auth.demanderOtp(telephone);
      setCodeDev(r.codeDev);
      setAttente(60);
    } catch (e) {
      setErreur(messageErreur(e));
    }
  };

  return (
    <Ecran titre={t('auth.titreCode')}>
      <Text style={s.normal}>{t('auth.codeEnvoye', { telephone: '+237 ' + telephone })}</Text>
      {codeDev ? (
        <View style={{ backgroundColor: couleurs.orangeClair, padding: espace.m, borderRadius: 12 }}>
          <Text style={{ color: '#7A4A05' }}>{t('auth.modeSimulation', { code: codeDev })}</Text>
        </View>
      ) : null}
      <CasesCode valeur={code} onChange={(v) => { setCode(v); if (erreur) setErreur(undefined); }} erreur={secousse} />
      <Pressable disabled={attente > 0} onPress={renvoyer}>
        <Text style={{ color: attente > 0 ? couleurs.texteSecondaire : couleurs.primaire, fontWeight: '600' }}>
          {attente > 0 ? t('auth.renvoyerDans', { s: attente }) : t('auth.renvoyer')}
        </Text>
      </Pressable>

      {nouveauCompte && (
        <View style={{ gap: espace.m }}>
          <Text style={s.grand}>{t('auth.creerCompte')}</Text>
          <Champ libelle={t('profil.prenom')} value={prenom} onChangeText={setPrenom} autoCapitalize="words" />
          <Champ libelle={t('profil.nom')} value={nom} onChangeText={setNom} autoCapitalize="words" />
          <Champ libelle={t('auth.codeParrainage')} value={parrainage} onChangeText={setParrainage} autoCapitalize="characters" />
          <View style={{ flexDirection: 'row', gap: espace.m, alignItems: 'center' }}>
            <Switch value={consentement} onValueChange={setConsentement} trackColor={{ true: couleurs.primaire }} />
            <Text style={[s.secondaire, { flex: 1 }]}>
              {t('auth.consentement')}{' '}
              <Text style={{ color: couleurs.primaire, textDecorationLine: 'underline' }} onPress={() => Linking.openURL(SERVEUR_URL + '/confidentialite.html')}>
                {t('auth.politique')}
              </Text>
            </Text>
          </View>
        </View>
      )}
      {erreur ? <Text style={s.erreur}>{erreur}</Text> : null}
      <Bouton titre={nouveauCompte ? t('auth.creerEtContinuer') : t('auth.seConnecter')} onPress={verifier} desactive={!valide} chargement={envoi} />
    </Ecran>
  );
}
