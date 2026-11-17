import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAuth } from '../../hooks/useAuth';
import { messageApi } from '../../api/messageApi';
import { userApi } from '../../api/userApi';
import { ChatMessage, User } from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';

type MessagerieParams = { peerId?: number };

function belongsToConversation(msg: ChatMessage, userId: number, peerId: number): boolean {
  const exp = Number(msg.expediteurId ?? msg.senderId);
  const dest = Number(msg.destinataireId ?? msg.receiverId);
  return (exp === userId && dest === peerId) || (exp === peerId && dest === userId);
}

export default function MessagerieScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const route = useRoute();
  const peerId = (route.params as MessagerieParams | undefined)?.peerId;
  const { connected, messages: liveMessages } = useWebSocket(user?.id);
  const [peer, setPeer] = useState<User | null>(null);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [receiverId, setReceiverId] = useState<number | undefined>(peerId);
  const [sending, setSending] = useState(false);

  const loadHistory = useCallback(async (otherId: number) => {
    try {
      const data = await messageApi.getConversation(otherId);
      setHistory(data);
    } catch (e) {
      setHistory([]);
      Alert.alert('CityShare', getApiErrorMessage(e));
    }
  }, []);

  const loadPeer = useCallback(async (otherId: number) => {
    try {
      const data = await userApi.getUser(otherId);
      setPeer(data);
    } catch {
      setPeer(null);
    }
  }, []);

  useEffect(() => {
    if (peerId) {
      setReceiverId(peerId);
      loadHistory(peerId);
      loadPeer(peerId);
    }
  }, [peerId, loadHistory, loadPeer]);

  useEffect(() => {
    if (!user?.id || !receiverId) return;
    const incoming = liveMessages.filter((msg) => belongsToConversation(msg, user.id, receiverId));
    if (incoming.length === 0) return;
    setHistory((current) => {
      const merged = [...current];
      for (const msg of incoming) {
        const existingIndex = merged.findIndex((m) => String(m.id) === String(msg.id));
        const isMyMessage = String(msg.expediteurId ?? msg.senderId) === String(user.id);
        if (existingIndex >= 0) {
          merged[existingIndex] = {
            ...merged[existingIndex],
            ...msg,
            status: isMyMessage ? 'delivered' : merged[existingIndex].status
          };
        } else {
          merged.push({ ...msg, status: isMyMessage ? 'delivered' : undefined });
        }
      }
      return merged.sort(
        (a, b) =>
          new Date(a.createdAt ?? a.dateEnvoi ?? 0).getTime() -
          new Date(b.createdAt ?? b.dateEnvoi ?? 0).getTime()
      );
    });
  }, [liveMessages, receiverId, user?.id]);

  useEffect(() => {
    if (!connected || !receiverId) return;
    loadHistory(receiverId);
  }, [connected, receiverId, loadHistory]);

  const allMessages = useMemo(() => {
    if (!user?.id || !receiverId) return [];
    return history
      .filter((msg) => belongsToConversation(msg, user.id, receiverId))
      .sort(
        (a, b) =>
          new Date(a.createdAt ?? a.dateEnvoi ?? 0).getTime() -
          new Date(b.createdAt ?? b.dateEnvoi ?? 0).getTime()
      );
  }, [history, receiverId, user?.id]);

  const handleBack = () => {
    const parent = navigation?.getParent?.();
    if (parent?.canGoBack?.()) {
      parent.goBack();
      return;
    }
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }
    navigation?.navigate?.('Accueil');
  };

  const peerLabel = peer ? `${peer.prenom} ${peer.nom}` : receiverId ? `${t('extra.messaging')} #${receiverId}` : t('extra.messaging');

  const send = async () => {
    if (!text.trim() || !receiverId || !user?.id) {
      return;
    }
    setSending(true);
    const content = text.trim();
    setText('');
    setHistory((current) => [
      ...current,
      {
        id: `pending-${Date.now()}`,
        expediteurId: user.id,
        destinataireId: receiverId,
        senderId: String(user.id),
        receiverId: String(receiverId),
        contenu: content,
        content,
        status: 'pending',
        createdAt: new Date().toISOString()
      }
    ]);

    try {
      const saved = await messageApi.send(receiverId, content);
      setHistory((current) => {
        const withoutPending = current.filter((m) => String(m.id).startsWith('pending-') === false || String(m.destinataireId) !== String(receiverId) || String(m.expediteurId) !== String(user.id));
        return [...withoutPending, { ...saved, status: 'sent' }];
      });
    } catch (e) {
      Alert.alert('CityShare', getApiErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 70}
    >
      <View style={styles.header}>
        {navigation?.canGoBack?.() && (
          <Pressable onPress={handleBack} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={26} color={colors.textPrimary} />
          </Pressable>
        )}
        <View style={styles.headerInfo}>
          <View style={styles.peerHeader}>
            {peer?.photoUrl ? (
              <Image source={{ uri: peer.photoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={20} color={colors.white} />
              </View>
            )}
            <View style={styles.peerText}>
              <Text style={styles.title}>{peerLabel}</Text>
              <View style={styles.statusRow}>
                {peer?.verifie && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                    <Text style={styles.verifiedText}>{t('extra.verified')}</Text>
                  </View>
                )}
                <Text style={[styles.status, connected && styles.statusOn]}>
                  {connected ? t('extra.connected') : t('extra.offline')}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
      {!receiverId && (
        <Text style={styles.hint}>{t('extra.messaging_select_peer')}</Text>
      )}
      {receiverId && !peerId && (
        <View style={styles.peerRow}>
          <TextInput
            style={styles.peerInput}
            keyboardType="number-pad"
            value={String(receiverId)}
            onChangeText={(v) => setReceiverId(Number(v) || undefined)}
            placeholder={t('extra.messaging_peer_id')}
          />
          <Pressable style={styles.peerBtn} onPress={() => {
            if (receiverId) {
              loadHistory(receiverId);
              loadPeer(receiverId);
            }
          }}>
            <Text style={styles.peerBtnText}>{t('common.confirm')}</Text>
          </Pressable>
        </View>
      )}
      <FlatList
        inverted
        data={allMessages}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const mine = String(item.expediteurId ?? item.senderId) === String(user?.id);
          const status = item.status;
          let statusIcon: keyof typeof Ionicons.glyphMap | null = null;
          if (mine) {
            if (status === 'pending') statusIcon = 'time-outline';
            else if (status === 'sent') statusIcon = 'checkmark-outline';
            else if (status === 'delivered') statusIcon = 'checkmark-done-outline';
          }
          return (
            <View style={[styles.message, mine && styles.messageMine]}>
              <Text style={styles.messageText}>{item.content ?? item.contenu}</Text>
              <View style={styles.messageMeta}>
                <Text style={styles.time}>
                  {new Date(item.createdAt ?? item.dateEnvoi ?? Date.now()).toLocaleTimeString()}
                </Text>
                {statusIcon && <Ionicons name={statusIcon} size={16} color={colors.textSecondary} style={styles.statusIcon} />}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>{t('extra.messaging_empty')}</Text>}
        contentContainerStyle={styles.list}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={t('tracking.message')}
          editable={!!receiverId && !sending}
        />
        <Pressable
          style={[styles.send, (!receiverId || sending) && styles.sendDisabled]}
          onPress={send}
          disabled={!receiverId || sending}
        >
          <Ionicons name="send" color={colors.white} size={20} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, paddingTop: 56 },
  header: { paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerInfo: { flex: 1 },
  peerHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface },
  avatarPlaceholder: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  peerText: { flex: 1 },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: '900' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  status: { color: colors.textSecondary, fontWeight: '800' },
  statusOn: { color: colors.primary },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: '#E8F5E9' },
  verifiedText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  hint: { color: colors.textSecondary, padding: 16, fontWeight: '600' },
  peerRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  peerInput: { flex: 1, height: 44, backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 12 },
  peerBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center' },
  peerBtnText: { color: colors.white, fontWeight: '900' },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: 40 },
  message: { alignSelf: 'flex-start', maxWidth: '82%', backgroundColor: colors.surface, borderRadius: 16, padding: 12, marginBottom: 10 },
  messageMine: { alignSelf: 'flex-end', backgroundColor: '#E8F5E9' },
  messageText: { color: colors.textPrimary, fontWeight: '600' },
  messageMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  statusIcon: { marginLeft: 8 },
  time: { color: colors.textSecondary, fontSize: 11 },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: colors.border, gap: 10 },
  input: { flex: 1, height: 48, backgroundColor: colors.surface, borderRadius: 24, paddingHorizontal: 16 },
  send: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.4 }
});
