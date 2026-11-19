import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Api } from '../../api';
import { messageErreur } from '../../api/client';
import { usePosition } from '../../hooks/usePosition';
import ChoixLieu from '../../components/ChoixLieu';
import { Bouton, Carte, Champ, Ecran, Ligne, Vide } from '../../components/ui';
import { couleurs } from '../../theme';
import type { Lieu, Point } from '../../types';

const TYPES: Lieu['type'][] = ['MAISON', 'TRAVAIL', 'CAMPUS', 'AUTRE'];

/** Lieux favoris : maison, travail, campus (BF-35). */
export default function Lieux() {
  const { t } = useTranslation();
  const { position } = usePosition();
  const [lieux, setLieux] = useState<Lieu[]>([]);
  const [type, setType] = useState<Lieu['type']>('MAISON');
  const [libelle, setLibelle] = useState('');
  const [point, setPoint] = useState<Point | null>(null);
  const [choix, setChoix] = useState(false);
  const charger = () => Api.moi.lieux().then(setLieux).catch(() => undefined);
  useEffect(() => { charger(); }, []);

  const enregistrer = async () => {
    if (!point) return;
    try {
      await Api.moi.enregistrerLieu({ type, libelle: libelle.trim() || t('lieux.' + type), adresse: point.adresse, latitude: point.lat, longitude: point.lng });
      setPoint(null); setLibelle(''); charger();
    } catch (e) { Alert.alert(t('erreurs.titre'), messageErreur(e)); }
  };

  return (
    <Ecran titre={t('profil.lieux')}>
      {lieux.length === 0 ? <Vide texte={t('lieux.vide')} icone="star-outline" /> : (
        <Carte style={{ padding: 0, overflow: 'hidden' }}>
          {lieux.map((l) => <Ligne key={l.id} icone="star" texte={l.libelle} sousTexte={l.adresse}
            droite={<Bouton petit variante="contour" titre={t('commun.supprimer')} onPress={() => Api.moi.supprimerLieu(l.id!).then(charger)} />} />)}
        </Carte>
      )}
      <Carte>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TYPES.map((ty) => (
            <Pressable key={ty} onPress={() => setType(ty)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: type === ty ? couleurs.primaire : couleurs.primaireClair }}>
              <Text style={{ color: type === ty ? '#fff' : couleurs.primaireFonce, fontWeight: '600' }}>{t('lieux.' + ty)}</Text>
            </Pressable>
          ))}
        </View>
        <Champ libelle={t('lieux.nom')} value={libelle} onChangeText={setLibelle} placeholder={t('lieux.' + type)} />
        <Bouton variante="contour" icone="location" titre={point ? point.adresse : t('lieux.choisirAdresse')} onPress={() => setChoix(true)} />
        <Bouton titre={t('commun.enregistrer')} onPress={enregistrer} desactive={!point} />
      </Carte>
      <ChoixLieu visible={choix} titre={t('lieux.choisirAdresse')} position={position} onFermer={() => setChoix(false)} onChoix={(p) => { setPoint(p); setChoix(false); }} />
    </Ecran>
  );
}
