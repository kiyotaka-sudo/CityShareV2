import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Api } from '../../api';
import { Carte, Ecran, Etiquette, s, Vide } from '../../components/ui';
import { couleurs } from '../../theme';
import type { DocumentChauffeur } from '../../types';

/** Pièces du chauffeur et alertes d'expiration (BF-03, BF-06). Le renouvellement se fait auprès de l'administration. */
export default function Documents() {
  const { t } = useTranslation();
  const [docs, setDocs] = useState<DocumentChauffeur[]>([]);
  useEffect(() => { Api.chauffeur.documents().then(setDocs).catch(() => undefined); }, []);
  return (
    <Ecran titre={t('profil.documents')}>
      <Text style={s.secondaire}>{t('documents.explication')}</Text>
      {docs.length === 0 ? <Vide texte={t('documents.vide')} /> : docs.map((d) => (
        <Carte key={d.id}>
          <Text style={s.gras}>{t('documents.' + d.type)}</Text>
          <Etiquette texte={d.expire ? t('documents.expire') : t('documents.statut_' + d.statut)}
            couleur={d.expire || d.statut === 'REJETE' ? couleurs.rouge : d.statut === 'VALIDE' ? couleurs.vert : '#9A5B06'}
            fond={d.expire || d.statut === 'REJETE' ? couleurs.rougeClair : d.statut === 'VALIDE' ? couleurs.vertClair : couleurs.orangeClair} />
          {d.dateExpiration ? <Text style={[s.normal, d.expireBientot && { color: couleurs.orange, fontWeight: '700' }]}>
            {t('documents.expiration', { date: new Date(d.dateExpiration).toLocaleDateString('fr-FR') })}{d.expireBientot ? ` — ${t('documents.bientot')}` : ''}
          </Text> : null}
          {d.motifRejet ? <Text style={[s.normal, { color: couleurs.rouge }]}>{d.motifRejet}</Text> : null}
        </Carte>
      ))}
    </Ecran>
  );
}
