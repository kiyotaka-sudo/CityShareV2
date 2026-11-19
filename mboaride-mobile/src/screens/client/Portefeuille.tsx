import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Api } from '../../api';
import { messageErreur } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Bouton, Carte, Champ, Ecran, s, Vide } from '../../components/ui';
import { dateHeure, fcfa } from '../../utils/format';
import { couleurs } from '../../theme';
import type { Paiement, Transaction } from '../../types';

/** Portefeuille MboaRide : solde, recharge Mobile Money et historique (section 5.8). */
export default function Portefeuille() {
  const { t } = useTranslation();
  const { utilisateur, rafraichir } = useAuth();
  const [solde, setSolde] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [montant, setMontant] = useState('');
  const [mode, setMode] = useState<'MTN_MOMO' | 'ORANGE_MONEY'>('MTN_MOMO');
  const [telephone, setTelephone] = useState(utilisateur?.telephone ?? '');
  const [paiement, setPaiement] = useState<Paiement | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const suivi = useRef<ReturnType<typeof setInterval>>(undefined);

  const charger = useCallback(() => {
    Api.portefeuille.get().then((p) => { setSolde(p.solde); setTransactions(p.transactions); }).catch(() => undefined);
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
          charger();
          rafraichir();
          setMontant('');
        }
      }, 4000);
    } catch (e) {
      Alert.alert(t('erreurs.titre'), messageErreur(e));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Ecran titre={t('portefeuille.titre')} retour={false}>
      <Carte style={{ backgroundColor: couleurs.primaire }}>
        <Text style={{ color: couleurs.primaireClair }}>{t('portefeuille.solde')}</Text>
        <Text style={{ color: '#fff', fontSize: 32, fontWeight: '900' }}>{fcfa(solde)}</Text>
      </Carte>
      <Carte>
        <Text style={s.gras}>{t('portefeuille.recharger')}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['MTN_MOMO', 'ORANGE_MONEY'] as const).map((m) => (
            <Pressable key={m} onPress={() => setMode(m)} style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 2, alignItems: 'center',
              borderColor: mode === m ? couleurs.primaire : couleurs.bord, backgroundColor: mode === m ? couleurs.primaireClair : '#fff' }}>
              <Text style={{ fontWeight: '700' }}>{t('paiements.' + m)}</Text>
            </Pressable>
          ))}
        </View>
        <Champ libelle={t('portefeuille.montant')} keyboardType="number-pad" value={montant} onChangeText={(v) => setMontant(v.replace(/\D/g, ''))} />
        <Champ libelle={t('portefeuille.numero')} keyboardType="phone-pad" value={telephone} onChangeText={setTelephone} />
        <Bouton titre={t('portefeuille.payer')} onPress={recharger} chargement={envoi} desactive={Number(montant) < 100} />
        {paiement && (
          <Text style={{ color: paiement.statut === 'REUSSI' ? couleurs.vert : paiement.statut === 'ECHOUE' ? couleurs.rouge : couleurs.texte }}>
            {paiement.statut === 'EN_ATTENTE' ? paiement.message : t('paiementStatut.' + paiement.statut)}
          </Text>
        )}
      </Carte>
      <Text style={s.grand}>{t('portefeuille.historique')}</Text>
      {transactions.length === 0 ? <Vide texte={t('portefeuille.aucune')} /> : transactions.map((tr) => (
        <Carte key={tr.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={s.gras}>{t('transactions.' + tr.type)}</Text>
            <Text style={s.secondaire}>{tr.description} · {dateHeure(tr.createdAt)}</Text>
          </View>
          <Text style={{ fontWeight: '800', color: tr.montant >= 0 ? couleurs.vert : couleurs.rouge }}>{tr.montant > 0 ? '+' : ''}{fcfa(tr.montant)}</Text>
        </Carte>
      ))}
    </Ecran>
  );
}
