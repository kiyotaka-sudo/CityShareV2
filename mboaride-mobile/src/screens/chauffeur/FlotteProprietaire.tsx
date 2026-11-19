import React, { useCallback, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Api } from '../../api';
import CarteMboa from '../../carte/CarteMboa';
import { Avatar, Bouton, Carte, Ecran, Etiquette, s, Vide } from '../../components/ui';
import { fcfa } from '../../utils/format';
import { couleurs } from '../../theme';
import type { Flotte } from '../../types';

/** Suivi de l'activité des chauffeurs et véhicules du propriétaire (BF-57). */
export default function FlotteProprietaire() {
  const { t } = useTranslation();
  const [flotte, setFlotte] = useState<Flotte | null>(null);
  useFocusEffect(useCallback(() => {
    const charger = () => Api.chauffeur.flotte().then(setFlotte).catch(() => undefined);
    charger();
    const id = setInterval(charger, 30000);
    return () => clearInterval(id);
  }, []));
  const enLigne = flotte?.chauffeurs.filter((c) => c.lat && c.lng) ?? [];
  return (
    <Ecran titre={t('flotte.titre')} retour={false}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Carte style={{ flex: 1 }}><Text style={s.secondaire}>{t('flotte.gainsSemaine')}</Text><Text style={s.grand}>{fcfa(flotte?.gainsSemaine ?? 0)}</Text></Carte>
        <Carte style={{ flex: 1 }}><Text style={s.secondaire}>{t('flotte.coursesSemaine')}</Text><Text style={s.grand}>{flotte?.coursesSemaine ?? 0}</Text></Carte>
      </View>
      {enLigne.length > 0 && (
        <View style={{ height: 220, borderRadius: 12, overflow: 'hidden' }}>
          <CarteMboa vehicules={enLigne.map((c) => ({ id: String(c.id), lat: c.lat!, lng: c.lng!,
            type: c.vehicule?.typeVehicule === 'MOTO' ? 'MOTO' as const : 'TAXI' as const }))} />
        </View>
      )}
      <Text style={s.grand}>{t('flotte.chauffeurs')}</Text>
      {!flotte?.chauffeurs.length ? <Vide texte={t('flotte.aucunChauffeur')} /> : flotte.chauffeurs.map((c) => (
        <Carte key={c.id}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Avatar photo={c.photoUrl} nom={c.nomComplet} />
            <View style={{ flex: 1 }}>
              <Text style={s.gras}>{c.nomComplet}</Text>
              <Text style={s.secondaire}>{c.vehicule?.marque} {c.vehicule?.modele} · {c.vehicule?.immatriculation} · ★ {c.noteMoyenne}</Text>
            </View>
            <Etiquette texte={c.statut !== 'ACTIF' ? t('flotte.statut_' + c.statut) : c.disponible ? t('flotte.enLigne') : t('flotte.horsLigne')}
              couleur={c.disponible ? couleurs.vert : couleurs.texteSecondaire} fond={c.disponible ? couleurs.vertClair : '#EEF0F2'} />
          </View>
          <Text style={s.normal}>{t('flotte.activite', { jour: c.coursesAujourdhui, semaine: c.coursesSemaine, gains: fcfa(c.gainsSemaine) })}</Text>
          <Bouton petit variante="contour" icone="call" titre={t('course.appeler')} onPress={() => Linking.openURL('tel:' + c.telephone)} />
        </Carte>
      ))}
      <Text style={s.grand}>{t('flotte.vehicules')}</Text>
      {flotte?.vehicules.map((v) => (
        <Carte key={v.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View><Text style={s.gras}>{v.immatriculation}</Text><Text style={s.secondaire}>{v.marque} {v.modele} · {t('services.' + (v.typeVehicule === 'MOTO' ? 'MOTO' : 'DEPOT'))}</Text></View>
          <Etiquette texte={v.actif ? t('flotte.actif') : t('flotte.inactif')} />
        </Carte>
      ))}
    </Ecran>
  );
}
