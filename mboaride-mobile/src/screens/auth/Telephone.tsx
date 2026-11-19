import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { Api } from '../../api';
import { messageErreur } from '../../api/client';
import { Bouton, Ecran, s } from '../../components/ui';
import { couleurs, espace } from '../../theme';
import type { Routes } from '../../navigation/RootNavigator';

/** Saisie du numéro camerounais ; un code OTP est envoyé par SMS (BF-01). */
export default function Telephone({ navigation }: StackScreenProps<Routes, 'Telephone'>) {
  const { t } = useTranslation();
  const [numero, setNumero] = useState('');
  const [erreur, setErreur] = useState<string>();
  const [envoi, setEnvoi] = useState(false);
  const chiffres = numero.replace(/\D/g, '');
  const valide = /^[62]\d{8}$/.test(chiffres);

  const envoyer = async () => {
    setEnvoi(true);
    setErreur(undefined);
    try {
      const r = await Api.auth.demanderOtp(chiffres);
      navigation.navigate('CodeOtp', { telephone: chiffres, nouveauCompte: r.nouveauCompte, codeDev: r.codeDev });
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Ecran titre={t('auth.titreTelephone')}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ gap: espace.l }}>
        <Image source={require('../../../assets/logo.png')} style={{ width: 160, height: 78, alignSelf: 'center' }} resizeMode="contain" accessibilityLabel="MboaRide" />
        <Text style={s.normal}>{t('auth.explicationTelephone')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: espace.s }}>
          <View style={[s.champ, { justifyContent: 'center' }]}><Text style={{ fontSize: 18, fontWeight: '700' }}>🇨🇲 +237</Text></View>
          <TextInput style={[s.champ, { flex: 1, fontSize: 20, letterSpacing: 1 }]} keyboardType="phone-pad" autoFocus maxLength={14}
            placeholder="6 90 00 00 00" placeholderTextColor="#9CA3AF" value={numero} onChangeText={setNumero} onSubmitEditing={valide ? envoyer : undefined} />
        </View>
        {erreur ? <Text style={s.erreur}>{erreur}</Text> : null}
        <Bouton titre={t('auth.recevoirCode')} onPress={envoyer} desactive={!valide} chargement={envoi} />
        <View style={{ backgroundColor: couleurs.primaireClair, padding: espace.m, borderRadius: 12 }}>
          <Text style={{ color: couleurs.primaireFonce }}>{t('auth.infoChauffeur')}</Text>
        </View>
      </KeyboardAvoidingView>
    </Ecran>
  );
}
