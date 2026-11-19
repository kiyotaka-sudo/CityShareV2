import React, { useCallback, useEffect, useState } from 'react';
import { Alert, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Api } from '../../api';
import { messageErreur } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Bouton, Champ, Ecran } from '../../components/ui';
import PrixAnime from '../../components/anime/PrixAnime';
import PressableAnime from '../../components/anime/Pressable';
import Apparition from '../../components/anime/Apparition';
import { haptique } from '../../components/anime/haptique';
import { dateHeure, fcfa } from '../../utils/format';
import { couleurs, mouvement, ombres, polices } from '../../theme';
import type { Gains, Retrait, Transaction } from '../../types';

type Periode = 'jour' | 'semaine' | 'mois';
const PERIODES: Periode[] = ['jour', 'semaine', 'mois'];

/** Gains journaliers, hebdomadaires, mensuels et commissions (BF-55), graphique animé, retraits Mobile Money (BF-41). */
export default function GainsChauffeur() {
  const { t, i18n } = useTranslation();
  const { utilisateur } = useAuth();
  const conducteur = utilisateur?.role === 'CHAUFFEUR';
  const [gains, setGains] = useState<Gains | null>(null);
  const [solde, setSolde] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [retraits, setRetraits] = useState<Retrait[]>([]);
  const [periode, setPeriode] = useState<Periode>('jour');
  const [montant, setMontant] = useState('');
  const [operateur, setOperateur] = useState<'MTN' | 'ORANGE'>('MTN');
  const [tel, setTel] = useState(utilisateur?.telephone ?? '');
  const [envoi, setEnvoi] = useState(false);
  const [pieces, setPieces] = useState(0);
  const [largeurOnglets, setLargeurOnglets] = useState(0);
  const indicateur = useSharedValue(0);

  const charger = useCallback(() => {
    if (conducteur) Api.chauffeur.gains().then(setGains).catch(() => undefined);
    Api.portefeuille.get().then((p) => { setSolde(p.solde); setTransactions(p.transactions); }).catch(() => undefined);
    Api.chauffeur.retraits().then(setRetraits).catch(() => undefined);
  }, [conducteur]);
  useFocusEffect(charger);

  useEffect(() => {
    indicateur.value = withSpring(PERIODES.indexOf(periode) * (largeurOnglets / 3), mouvement.ressort);
  }, [periode, largeurOnglets]); // eslint-disable-line react-hooks/exhaustive-deps
  const styleIndicateur = useAnimatedStyle(() => ({ transform: [{ translateX: indicateur.value }] }));

  const retirer = async () => {
    setEnvoi(true);
    try {
      const r = await Api.chauffeur.retirer(Number(montant), tel, operateur);
      haptique.succes();
      setPieces((n) => n + 1);
      Alert.alert(t('gains.retraitDemande'), r.statut === 'EFFECTUE' ? t('gains.retraitEffectue') : r.message ?? '');
      setMontant(''); charger();
    } catch (e) { haptique.erreur(); Alert.alert(t('erreurs.titre'), messageErreur(e)); } finally { setEnvoi(false); }
  };

  const p = gains?.[periode];
  const jours = gains?.derniersJours.slice(-7) ?? [];
  const max = Math.max(1, ...jours.map((j) => j.gainsNets));
  const locale = i18n.language.startsWith('fr') ? 'fr-FR' : 'en-GB';

  return (
    <Ecran titre={t('gains.titre')} retour={false}>
      {/* Solde : carte dégradée */}
      <View>
        <LinearGradient colors={solde < 0 ? [couleurs.rouge, '#A83232'] : [couleurs.primaire, '#0A4A8A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[{ borderRadius: 24, padding: 20, gap: 6, overflow: 'hidden' }, ombres.moyenne]}>
          <View style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(247,139,3,0.18)' }} />
          <View style={{ position: 'absolute', right: 40, bottom: -50, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(248,217,2,0.12)' }} />
          <Text style={{ fontFamily: polices.texteMoyen, color: '#C9D6E8' }}>{t('portefeuille.solde')}</Text>
          <PrixAnime valeur={solde} duree={900} style={{ fontFamily: polices.titre, fontSize: 34, color: '#fff' }} />
          {solde < 0 && <Text style={{ fontFamily: polices.texte, color: '#fff' }}>{t('gains.soldeNegatif')}</Text>}
        </LinearGradient>
        <PiecesVolantes declencheur={pieces} />
      </View>

      {gains && p && (
        <>
          {/* Onglets jour / semaine / mois avec indicateur glissant */}
          <View onLayout={(e: LayoutChangeEvent) => setLargeurOnglets(e.nativeEvent.layout.width - 8)}
            style={{ flexDirection: 'row', backgroundColor: couleurs.primaireClair, borderRadius: 22, padding: 4 }}>
            {largeurOnglets > 0 && (
              <Animated.View style={[{ position: 'absolute', top: 4, left: 4, bottom: 4, width: largeurOnglets / 3, borderRadius: 18, backgroundColor: couleurs.primaire }, styleIndicateur]} />
            )}
            {PERIODES.map((k) => (
              <Pressable key={k} onPress={() => { haptique.selection(); setPeriode(k); }} style={{ flex: 1, paddingVertical: 10, alignItems: 'center' }}>
                <Text style={{ fontFamily: polices.texteGras, color: periode === k ? '#fff' : couleurs.primaireFonce }}>{t('gains.' + k)}</Text>
              </Pressable>
            ))}
          </View>

          <View style={[{ backgroundColor: '#fff', borderRadius: 22, padding: 18, gap: 14 }, ombres.legere]}>
            <View>
              <Text style={{ fontFamily: polices.texteMoyen, color: couleurs.texteSecondaire }}>{t('gains.nets')}</Text>
              <PrixAnime valeur={p.gainsNets} duree={700} style={{ fontFamily: polices.titre, fontSize: 32, color: couleurs.vert }} />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <Indicateur icone="car" libelle={t('gains.courses', { n: p.nbCourses })} />
              <Indicateur icone="trending-up" libelle={`${t('gains.ca')} : ${fcfa(p.chiffreAffaires)}`} />
              <Indicateur icone="pie-chart" libelle={`${t('gains.commissions')} : ${fcfa(p.commissions)}`} />
              <Indicateur icone="cash" libelle={`${t('gains.especes')} : ${fcfa(p.especesEncaissees)}`} />
            </View>
          </View>

          {/* Graphique en barres animé des 7 derniers jours */}
          <View style={[{ backgroundColor: '#fff', borderRadius: 22, padding: 18, gap: 12 }, ombres.legere]}>
            <Text style={{ fontFamily: polices.titreDemi, fontSize: 15, color: couleurs.texte }}>{t('gains.septJours')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 150, gap: 8 }}>
              {jours.map((j, i) => (
                <Barre key={j.jour} rang={i} ratio={j.gainsNets / max} valeur={j.gainsNets} aujourdhui={i === jours.length - 1}
                  libelle={new Date(j.jour).toLocaleDateString(locale, { weekday: 'short' }).slice(0, 3)} />
              ))}
            </View>
          </View>
        </>
      )}

      {/* Retrait vers Mobile Money */}
      <View style={[{ backgroundColor: '#fff', borderRadius: 22, padding: 18, gap: 12 }, ombres.legere]}>
        <Text style={{ fontFamily: polices.titreDemi, fontSize: 15, color: couleurs.texte }}>{t('gains.retirer')}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['MTN', 'ORANGE'] as const).map((o) => {
            const sel = operateur === o;
            return (
              <PressableAnime key={o} vibration="selection" onPress={() => setOperateur(o)}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', borderWidth: 2,
                  borderColor: sel ? (o === 'MTN' ? '#E0A800' : couleurs.accent) : '#EEF1F5', backgroundColor: sel ? (o === 'MTN' ? '#FFF8D6' : couleurs.accentClair) : '#fff' }}>
                <Text style={{ fontFamily: polices.texteGras, color: couleurs.texte }}>{o === 'MTN' ? 'MTN MoMo' : 'Orange Money'}</Text>
              </PressableAnime>
            );
          })}
        </View>
        <Champ libelle={t('portefeuille.montant')} keyboardType="number-pad" value={montant} onChangeText={(v) => setMontant(v.replace(/\D/g, ''))} />
        <Champ libelle={t('portefeuille.numero')} keyboardType="phone-pad" value={tel} onChangeText={setTel} />
        <Bouton titre={t('gains.retirer')} icone="arrow-up-circle" onPress={retirer} chargement={envoi} desactive={Number(montant) < 500 || Number(montant) > solde} />
      </View>

      {retraits.length > 0 && <Text style={styles.titre}>{t('gains.retraits')}</Text>}
      {retraits.map((r, i) => (
        <Apparition key={r.id} rang={i}>
          <View style={styles.ligne}>
            <View style={{ flex: 1 }}>
              <Text style={styles.ligneTitre}>{fcfa(r.montant)}</Text>
              <Text style={styles.ligneSous}>{r.operateur} · {dateHeure(r.createdAt)}</Text>
            </View>
            <Text style={[styles.ligneTitre, { color: r.statut === 'EFFECTUE' ? couleurs.vert : r.statut === 'EN_ATTENTE' ? couleurs.accentFonce : couleurs.rouge }]}>
              {t('gains.statut_' + r.statut)}
            </Text>
          </View>
        </Apparition>
      ))}

      <Text style={styles.titre}>{t('portefeuille.historique')}</Text>
      {transactions.length === 0 ? (
        <Text style={[styles.ligneSous, { textAlign: 'center', paddingVertical: 16 }]}>{t('portefeuille.aucune')}</Text>
      ) : transactions.map((tr, i) => (
        <Apparition key={tr.id} rang={i}>
          <View style={styles.ligne}>
            <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: tr.montant >= 0 ? couleurs.vertClair : couleurs.rougeClair }}>
              <Ionicons name={tr.montant >= 0 ? 'arrow-down' : 'arrow-up'} size={18} color={tr.montant >= 0 ? couleurs.vert : couleurs.rouge} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ligneTitre}>{t('transactions.' + tr.type)}</Text>
              <Text style={styles.ligneSous} numberOfLines={1}>{tr.description} · {dateHeure(tr.createdAt)}</Text>
            </View>
            <Text style={[styles.ligneTitre, { color: tr.montant >= 0 ? couleurs.vert : couleurs.rouge }]}>{tr.montant > 0 ? '+' : ''}{fcfa(tr.montant)}</Text>
          </View>
        </Apparition>
      ))}
    </Ecran>
  );
}

function Indicateur({ icone, libelle }: { icone: keyof typeof Ionicons.glyphMap; libelle: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: couleurs.fond, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
      <Ionicons name={icone} size={14} color={couleurs.primaire} />
      <Text style={{ fontFamily: polices.texteMoyen, fontSize: 12, color: couleurs.texte }}>{libelle}</Text>
    </View>
  );
}

/** Barre du graphique qui pousse depuis le bas, en cascade. */
function Barre({ ratio, rang, libelle, valeur, aujourdhui }: { ratio: number; rang: number; libelle: string; valeur: number; aujourdhui: boolean }) {
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = withDelay(rang * 70, withTiming(Math.max(0.04, ratio), { duration: 650, easing: Easing.out(Easing.cubic) }));
  }, [ratio]); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({ height: `${h.value * 100}%` }));
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
      {valeur > 0 && <Text style={{ fontFamily: polices.texteGras, fontSize: 9, color: couleurs.texteSecondaire }} numberOfLines={1}>{Math.round(valeur / 100) / 10}k</Text>}
      <View style={{ width: '100%', flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[{ width: '100%', borderRadius: 8, backgroundColor: aujourdhui ? couleurs.accent : couleurs.primaire }, style]} />
      </View>
      <Text style={{ fontFamily: aujourdhui ? polices.texteGras : polices.texte, fontSize: 11, color: aujourdhui ? couleurs.accentFonce : couleurs.texteSecondaire }}>{libelle}</Text>
    </View>
  );
}

/** Pièces dorées qui s'envolent du solde après un retrait réussi. */
function PiecesVolantes({ declencheur }: { declencheur: number }) {
  if (!declencheur) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {[0, 1, 2, 3, 4, 5].map((i) => <Piece key={`${declencheur}-${i}`} rang={i} />)}
    </View>
  );
}

function Piece({ rang }: { rang: number }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withDelay(rang * 90, withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) })); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const derive = (rang - 2.5) * 22;
  const style = useAnimatedStyle(() => ({
    opacity: p.value < 0.7 ? 1 : (1 - p.value) / 0.3,
    transform: [{ translateX: derive * p.value }, { translateY: -110 * p.value }, { rotateY: `${p.value * 540}deg` }, { scale: 0.8 + p.value * 0.4 }]
  }));
  return (
    <Animated.View style={[{ position: 'absolute', left: '45%', top: 40, width: 26, height: 26, borderRadius: 13, backgroundColor: couleurs.jaune,
      borderWidth: 3, borderColor: '#E0A800', alignItems: 'center', justifyContent: 'center' }, style]}>
      <Text style={{ fontFamily: polices.titre, fontSize: 11, color: '#9A6B00' }}>F</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  titre: { fontFamily: polices.titreDemi, fontSize: 17, color: couleurs.texte },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 18, padding: 14 },
  ligneTitre: { fontFamily: polices.texteGras, fontSize: 15, color: couleurs.texte },
  ligneSous: { fontFamily: polices.texte, fontSize: 12, color: couleurs.texteSecondaire }
});
