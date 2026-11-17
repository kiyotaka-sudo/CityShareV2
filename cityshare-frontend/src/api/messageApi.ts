import api from './axiosConfig';
import { ChatMessage } from '../types';

function mapMessage(message: ChatMessage & {
  expediteur?: { id: number };
  destinataire?: { id: number };
}): ChatMessage {
  const expediteurId = message.expediteurId ?? message.expediteur?.id;
  const destinataireId = message.destinataireId ?? message.destinataire?.id;
  return {
    ...message,
    id: message.id,
    content: message.content ?? message.contenu,
    contenu: message.contenu ?? message.content,
    createdAt: message.createdAt ?? message.dateEnvoi,
    dateEnvoi: message.dateEnvoi ?? message.createdAt,
    expediteurId,
    destinataireId,
    senderId: String(expediteurId ?? message.senderId ?? ''),
    receiverId: String(destinataireId ?? message.receiverId ?? '')
  };
}

export const messageApi = {
  getConversation: async (userId: number): Promise<ChatMessage[]> => {
    const { data } = await api.get<ChatMessage[]>(`/messages/conversation/${userId}`);
    return data.map(mapMessage);
  },
  send: async (destinataireId: number, contenu: string): Promise<ChatMessage> => {
    const { data } = await api.post<ChatMessage>('/messages', { destinataireId, contenu });
    return mapMessage(data);
  }
};
