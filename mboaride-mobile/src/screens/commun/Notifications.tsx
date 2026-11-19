import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Api } from '../../api';
import { Carte, Ecran, s, Vide } from '../../components/ui';
import { dateHeure } from '../../utils/format';
import { couleurs } from '../../theme';
import type { NotificationApp } from '../../types';

/** Historique des notifications reçues (BF-65, BF-67). */
export default function Notifications() {
  const { t } = useTranslation();
  const [liste, setListe] = useState<NotificationApp[]>([]);
  useEffect(() => {
    Api.moi.notifications().then((n) => { setListe(n); Api.moi.notificationsLues().catch(() => undefined); }).catch(() => undefined);
  }, []);
  return (
    <Ecran titre={t('profil.notifications')}>
      {liste.length === 0 ? <Vide texte={t('notifications.vide')} icone="notifications-off-outline" /> : liste.map((n) => (
        <Carte key={n.id} style={!n.lu ? { borderLeftWidth: 4, borderLeftColor: couleurs.primaire } : undefined}>
          <Text style={s.gras}>{n.titre}</Text>
          <Text style={s.normal}>{n.corps}</Text>
          <Text style={s.secondaire}>{dateHeure(n.createdAt)}</Text>
        </Carte>
      ))}
    </Ecran>
  );
}
