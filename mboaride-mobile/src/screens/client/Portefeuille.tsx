import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Api } from '../../api';
import { messageErreur } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Bouton, Champ, Ecran, Vide } from '../../components/ui';
import PrixAnime from '../../components/anime/PrixAnime';
import PressableAnime from '../../components/anime/Pressable';
import Apparition from '../../components/anime/Apparition';
import { SqueletteCarte } from '../../components/anime/Squelette';
import { haptique } from '../../components/anime/haptique';
import { dateHeure, fcfa } from '../../utils/format';
import { couleurs, ombres, polices } from '../../theme';
import type { Paiement, Transaction } from '../../types';

const MONTANTS_RAPIDES = [500, 1000, 2000, 5000];

/** Portefeuille MboaRide : solde, recharge Mobile Money avec suivi du paiement, historique (section 5.8). */
export default function Portefeuille() {
  const { t } = useTranslation();
  const { utilisateur, rafraichir } = useAuth();
  const [solde, setSolde] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [montant, setMontant] = useState('');
  const [mode, setMode] = useState<'MTN_MOMO' | 'ORANGE_MONEY'>('MTN_MOMO');
  const [telephone, setTelephone] = useState(utilisateur?.telephone ?? '');
  const [paiement, setPaiement] = useState<Paiement | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const suivi = useRef<ReturnType<typeof setInterval>>(undefined);

  const charger = useCallback(() => {
    Api.portefeuille.get().then((p) => { setSolde(p.solde); setTransactions(p.transactions); }).catch(() => setTransactions((l) => l ?? []));
  }, []);
  useFocusEffect(charger);
  useEffect(() => () => clearInterval(suivi.current), []);

  const recharger = async () => {
    setEnvoi(true);
    try {
      const p = await Api.portefeuille.recharger(Number(montant), mode, telephone);
      setPaiement(p);
      if (p.paymentUrl) Linking.openURL(p.paymentUrl);
      clearInterval(suivi.current);
      suivi.current = setInterval(async () => {
        const maj = await Api.portefeuille.paiement(p.id).catch(() => null);
        if (maj) setPaiement(maj);
        if (maj && maj.statut !== 'EN_ATTENTE') {
          clearInterval(suivi.current);
          if (maj.statut === 'REUSSI') haptique.succes(); else haptique.erreur();
          charger();
          rafraichir();
          setMontant('');
        }
      }, 4000);
    } catch (e) {
      haptique.erreur();
      Alert.alert(t('erreurs.titre'), messageErreur(e));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Ecran titre={t('portefeuille.titre')} retour={false}>
      <LinearGradient colors={[couleurs.primaire, '#0A4A8A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[{ borderRadius: 24, padding: 20, gap: 4, overflow: 'hidden', minHeight: 150, justifyContent: 'space-between' }, ombres.moyenne]}>
        <View style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(247,139,3,0.18)' }} />
        <View style={{ position: 'absolute', right: 40, bottom: -50, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(248,217,2,0.12)' }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: polices.texteMoyen, color: '#C9D6E8' }}>{t('portefeuille.solde')}</Text>
          <Ionicons name="wallet" size={22} color={couleurs.accent} />
        </View>
        <PrixAnime valeur={solde} duree={900} style={{ fontFamily: polices.titre, fontSize: 34, color: '#fff' }} />
        <Text style={{ fontFamily: polices.texte, fontSize: 12, color: '#C9D6E8' }}>{t('portefeuille.aide')}</Text>
      </LinearGradient>

      <View style={[{ backgroundColor: '#fff', borderRadius: 22, padding: 18, gap: 14 }, ombres.legere]}>
        <Text style={{ fontFamily: polices.titreDemi, fontSize: 16, color: couleurs.texte }}>{t('portefeuille.recharger')}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['MTN_MOMO', 'ORANGE_MONEY'] as const).map((m) => {
            const sel = mode === m;
            const teinte = m === 'MTN_MOMO' ? '#E0A800' : couleurs.accent;
            return (
              <PressableAnime key={m} vibration="selection" onPress={() => setMode(m)}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', gap: 4, borderWidth: 2,
                  borderColor: sel ? teinte : '#EEF1F5', backgroundColor: sel ? (m === 'MTN_MOMO' ? '#FFF8D6' : couleurs.accentClair) : '#fff' }}>
                <Ionicons name="phone-portrait" size={18} color={teinte} />
                <Text style={{ fontFamily: polices.texteGras, color: couleurs.texte }}>{t('paiements.' + m)}</Text>
              </PressableAnime>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {MONTANTS_RAPIDES.map((v) => {
            const sel = Number(montant) === v;
            return (
              <PressableAnime key={v} vibration="selection" onPress={() => setMontant(String(v))}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: sel ? couleurs.primaire : couleurs.primaireClair }}>
                <Text style={{ fontFamily: polices.texteGras, color: sel ? '#fff' : couleurs.primaire }}>{fcfa(v)}</Text>
              </PressableAnime>
            );
          })}
        </View>
        <Champ libelle={t('portefeuille.montant')} keyboardType="number-pad" value={montant} onChangeText={(v) => setMontant(v.replace(/\D/g, ''))} />
        <Champ libelle={t('portefeuille.numero')} keyboardType="phone-pad" value={telephone} onChangeText={setTelephone} />
        <Bouton titre={Number(montant) >= 100 ? t('portefeuille.payerMontant', { montant: fcfa(Number(montant)) }) : t('portefeuille.payer')}
          icone="arrow-down-circle" onPress={recharger} chargement={envoi} desactive={Number(montant) < 100} />
        {paiement && (
          <Animated.View key={paiement.statut} entering={paiement.statut === 'EN_ATTENTE' ? FadeInDown : ZoomIn.springify().damping(14)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14,
              backgroundColor: paiement.statut === 'REUSSI' ? couleurs.vertClair : paiement.statut === 'ECHOUE' ? couleurs.rougeClair : couleurs.accentClair }}>
            {paiement.statut === 'EN_ATTENTE'
              ? <ActivityIndicator color={couleurs.accentFonce} />
              : <Ionicons name={paiement.statut === 'REUSSI' ? 'checkmark-circle' : 'close-circle'} size={22} color={paiement.statut === 'REUSSI' ? couleurs.vert : couleurs.rouge} />}
            <Text style={{ flex: 1, fontFamily: polices.texteMoyen, color: couleurs.texte }}>
              {paiement.statut === 'EN_ATTENTE' ? paiement.message ?? t('paiementStatut.EN_ATTENTE') : t('paiementStatut.' + paiement.statut)}
            </Text>
          </Animated.View>
        )}
      </View>

      <Text style={{ fontFamily: polices.titreDemi, fontSize: 17, color: couleurs.texte }}>{t('portefeuille.historique')}</Text>
      {transactions === null ? (
        <View style={{ gap: 10 }}>{[0, 1, 2].map((i) => <SqueletteCarte key={i} />)}</View>
      ) : transactions.length === 0 ? (
        <Vide texte={t('portefeuille.aucune')} icone="wallet-outline" illustration="portefeuille" />
      ) : transactions.map((tr, i) => (
        <Apparition key={tr.id} rang={i}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 18, padding: 14 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: tr.montant >= 0 ? couleurs.vertClair : couleurs.rougeClair }}>
              <Ionicons name={tr.montant >= 0 ? 'arrow-down' : 'arrow-up'} size={18} color={tr.montant >= 0 ? couleurs.vert : couleurs.rouge} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: polices.texteGras, fontSize: 15, color: couleurs.texte }}>{t('transactions.' + tr.type)}</Text>
              <Text style={{ fontFamily: polices.texte, fontSize: 12, color: couleurs.texteSecondaire }} numberOfLines={1}>{tr.description} · {dateHeure(tr.createdAt)}</Text>
            </View>
            <Text style={{ fontFamily: polices.texteGras, fontSize: 15, color: tr.montant >= 0 ? couleurs.vert : couleurs.rouge }}>{tr.montant > 0 ? '+' : ''}{fcfa(tr.montant)}</Text>
          </View>
        </Apparition>
      ))}
    </Ecran>
  );
}
