import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Api } from '../../api';
import { Ecran, Vide } from '../../components/ui';
import Apparition from '../../components/anime/Apparition';
import { SqueletteCarte } from '../../components/anime/Squelette';
import { dateHeure } from '../../utils/format';
import { couleurs, ombres, polices } from '../../theme';
import type { NotificationApp } from '../../types';

/** Icône et couleur selon le type de notification (le type est un code du serveur, ex. COURSE_ACCEPTEE, PAIEMENT_REUSSI). */
function apparence(type: string): { icone: keyof typeof Ionicons.glyphMap; couleur: string } {
  const t = type.toUpperCase();
  if (t.includes('SOS') || t.includes('ALERTE')) return { icone: 'warning', couleur: couleurs.rouge };
  if (t.includes('PAIEMENT') || t.includes('RETRAIT') || t.includes('RECHARGE')) return { icone: 'wallet', couleur: couleurs.vert };
  if (t.includes('DOCUMENT')) return { icone: 'document-text', couleur: couleurs.accentFonce };
  if (t.includes('PROMO') || t.includes('PARRAIN')) return { icone: 'gift', couleur: couleurs.accent };
  if (t.includes('RECLAMATION')) return { icone: 'chatbox-ellipses', couleur: couleurs.primaire };
  return { icone: 'car', couleur: couleurs.primaire };
}

/** Historique des notifications reçues (BF-65, BF-67). */
export default function Notifications() {
  const { t } = useTranslation();
  const [liste, setListe] = useState<NotificationApp[] | null>(null);
  useEffect(() => {
    Api.moi.notifications()
      .then((n) => { setListe(n); Api.moi.notificationsLues().catch(() => undefined); })
      .catch(() => setListe([]));
  }, []);

  return (
    <Ecran titre={t('profil.notifications')}>
      {liste === null ? (
        <View style={{ gap: 10 }}>{[0, 1, 2].map((i) => <SqueletteCarte key={i} />)}</View>
      ) : liste.length === 0 ? (
        <Vide titre={t('notifications.videTitre')} texte={t('notifications.vide')} icone="notifications-off-outline" />
      ) : liste.map((n, i) => {
        const { icone, couleur } = apparence(n.type);
        return (
          <Apparition key={n.id} rang={i}>
            <View style={[{ flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderRadius: 18, padding: 14 }, ombres.legere]}>
              <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: couleur + '18', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={icone} size={20} color={couleur} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ flex: 1, fontFamily: polices.texteGras, fontSize: 15, color: couleurs.texte }}>{n.titre}</Text>
                  {!n.lu && <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: couleurs.accent }} accessibilityLabel={t('notifications.nonLue')} />}
                </View>
                <Text style={{ fontFamily: polices.texte, fontSize: 14, lineHeight: 20, color: couleurs.texte }}>{n.corps}</Text>
                <Text style={{ fontFamily: polices.texte, fontSize: 12, color: couleurs.texteSecondaire }}>{dateHeure(n.createdAt)}</Text>
              </View>
            </View>
          </Apparition>
        );
      })}
    </Ecran>
  );
}
