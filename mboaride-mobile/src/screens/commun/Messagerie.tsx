import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useEvenement } from '../../context/TempsReelContext';
import { Ecran, s } from '../../components/ui';
import { heure } from '../../utils/format';
import { couleurs, espace } from '../../theme';
import type { Message } from '../../types';
import type { Routes } from '../../navigation/RootNavigator';

/** Messagerie client / chauffeur pendant la course (BF-12). */
export default function Messagerie({ route }: StackScreenProps<Routes, 'Messagerie'>) {
  const { t } = useTranslation();
  const { utilisateur } = useAuth();
  const { courseId, interlocuteur } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [texte, setTexte] = useState('');
  const liste = useRef<FlatList<Message>>(null);

  const charger = useCallback(() => Api.courses.messages(courseId).then(setMessages).catch(() => undefined), [courseId]);
  useEffect(() => { charger(); const id = setInterval(charger, 10000); return () => clearInterval(id); }, [charger]);
  useEvenement<Message>('/user/queue/messages', ['MESSAGE'], (m) => {
    if (m.courseId === courseId) setMessages((l) => (l.some((x) => x.id === m.id) ? l : [...l, m]));
  });

  const envoyer = async () => {
    const contenu = texte.trim();
    if (!contenu) return;
    setTexte('');
    try {
      const m = await Api.courses.envoyer(courseId, contenu);
      setMessages((l) => (l.some((x) => x.id === m.id) ? l : [...l, m]));
    } catch { setTexte(contenu); }
  };

  const rapides = [t('chat.rapide1'), t('chat.rapide2'), t('chat.rapide3')];
  return (
    <Ecran titre={interlocuteur} defilement={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <FlatList ref={liste} data={messages} keyExtractor={(m) => String(m.id)} contentContainerStyle={{ padding: espace.m, gap: 8 }}
          onContentSizeChange={() => liste.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const moi = item.expediteurId === utilisateur?.id;
            return (
              <View style={{ alignSelf: moi ? 'flex-end' : 'flex-start', maxWidth: '80%', backgroundColor: moi ? couleurs.primaire : '#fff', borderRadius: 14, padding: 10 }}>
                <Text style={{ color: moi ? '#fff' : couleurs.texte, fontSize: 16 }}>{item.contenu}</Text>
                <Text style={{ color: moi ? '#D1FAE5' : couleurs.texteSecondaire, fontSize: 11, alignSelf: 'flex-end' }}>{heure(item.createdAt)}</Text>
              </View>
            );
          }} />
        <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: espace.m, flexWrap: 'wrap' }}>
          {rapides.map((r) => (
            <Pressable key={r} onPress={() => setTexte(r)} style={{ backgroundColor: couleurs.primaireClair, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 }}>
              <Text style={{ color: couleurs.primaireFonce }}>{r}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, padding: espace.m, alignItems: 'center' }}>
          <TextInput style={[s.champ, { flex: 1 }]} value={texte} onChangeText={setTexte} placeholder={t('chat.ecrire')} maxLength={1000} />
          <Pressable onPress={envoyer} style={{ backgroundColor: couleurs.primaire, borderRadius: 24, padding: 12 }}><Ionicons name="send" size={20} color="#fff" /></Pressable>
        </View>
      </KeyboardAvoidingView>
    </Ecran>
  );
}
