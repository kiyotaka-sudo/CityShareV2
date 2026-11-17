import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { RootStackParamList } from '../../types';
import { notationApi } from '../../api/notationApi';
import StarRating from '../../components/StarRating';

type Props = StackScreenProps<RootStackParamList, 'Rating'>;

export default function RatingScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const trip = route.params?.trip;
  const conducteurId = route.params?.conducteurId ?? trip?.conducteur?.id;
  const [rating, setRating] = useState(5);
  const [criteria, setCriteria] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const items = ['criteria_punctual', 'criteria_safe', 'criteria_friendly', 'criteria_clean'];

  const toggle = (item: string) => setCriteria((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item]);
  const submit = async () => {
    if (!conducteurId) {
      Alert.alert('CityShare', t('common.error'));
      return;
    }
    try {
      await notationApi.create({ noteId: conducteurId, note: rating, criteres: criteria, commentaire: comment });
      navigation.goBack();
    } catch {
      Alert.alert('CityShare', t('common.error'));
    }
  };

  if (!trip) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('common.error')}</Text>
        <Pressable style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>{t('common.back')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {trip.conducteur?.photoUrl ? (
        <Image source={{ uri: trip.conducteur.photoUrl }} style={styles.avatarImg} />
      ) : (
        <View style={styles.avatar}><Ionicons name="person" color={colors.primary} size={44} /></View>
      )}
      <Text style={styles.name}>{trip.conducteur.nom}</Text>
      <Text style={styles.route}>{trip.depart} → {trip.arrivee}</Text>
      <Text style={styles.title}>{t('rating.question')}</Text>
      <StarRating value={rating} onChange={setRating} size={38} />
      <View style={styles.criteria}>
        {items.map((item) => {
          const label = t(`rating.${item}`);
          const active = criteria.includes(label);
          return (
            <Pressable key={item} onPress={() => toggle(label)} style={[styles.pill, active && styles.pillActive]}>
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput multiline style={styles.comment} value={comment} onChangeText={setComment} placeholder={t('rating.comment_placeholder')} />
      <Pressable style={styles.button} onPress={submit}><Text style={styles.buttonText}>{t('rating.submit')}</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, padding: 16, paddingTop: 64, alignItems: 'center' },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#E8F5E9' },
  name: { color: colors.textPrimary, fontSize: 22, fontWeight: '900', marginTop: 12 },
  route: { color: colors.textSecondary, marginBottom: 28 },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 16 },
  criteria: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginVertical: 22 },
  pill: { borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 99 },
  pillActive: { borderColor: colors.primary, backgroundColor: '#E8F5E9' },
  pillText: { color: colors.textSecondary, fontWeight: '700' },
  pillTextActive: { color: colors.primary },
  comment: { width: '100%', minHeight: 120, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14, marginBottom: 18 },
  button: { width: '100%', backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { color: colors.white, fontWeight: '900' }
});
