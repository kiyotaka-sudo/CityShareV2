import { useCallback, useEffect, useRef, useState } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { WS_URL } from '../utils/constants';
import { tokenStorage } from '../utils/tokenStorage';
import { ChatMessage } from '../types';

function sockJsUrl(wsUrl: string, token?: string): string {
  let url = wsUrl;
  if (wsUrl.startsWith('ws://')) url = `http://${wsUrl.slice(5)}`;
  if (wsUrl.startsWith('wss://')) url = `https://${wsUrl.slice(6)}`;
  if (token) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}token=${encodeURIComponent(token)}`;
  }
  return url;
}

function mapIncoming(body: Record<string, unknown>): ChatMessage {
  return {
    id: body.id as number | string,
    contenu: (body.contenu ?? body.content) as string | undefined,
    content: (body.content ?? body.contenu) as string | undefined,
    expediteurId: body.expediteurId as number | undefined,
    destinataireId: body.destinataireId as number | undefined,
    senderId: String(body.expediteurId ?? ''),
    receiverId: String(body.destinataireId ?? ''),
    dateEnvoi: (body.dateEnvoi as string | undefined) ?? undefined,
    createdAt: (body.dateEnvoi as string | undefined) ?? (body.createdAt as string | undefined)
  };
}

export const useWebSocket = (currentUserId?: number) => {
  const clientRef = useRef<Client | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    let mounted = true;
    const connect = async () => {
      const token = await tokenStorage.getToken();
      if (!token) {
        setConnected(false);
        return;
      }
      const client = new Client({
        webSocketFactory: () => new SockJS(sockJsUrl(WS_URL, token)),
        connectHeaders: { Authorization: `Bearer ${token}` },
        reconnectDelay: 5000,
        onConnect: () => {
          if (!mounted) return;
          setConnected(true);
          client.subscribe('/user/queue/messages', (message: IMessage) => {
            const body = JSON.parse(message.body) as Record<string, unknown>;
            const mapped = mapIncoming(body);
            setMessages((current) => {
              if (current.some((m) => String(m.id) === String(mapped.id))) {
                return current;
              }
              return [mapped, ...current];
            });
          });
        },
        onDisconnect: () => mounted && setConnected(false),
        onStompError: (frame) => {
          if (mounted) {
            setConnected(false);
            // eslint-disable-next-line no-console
            console.warn('[CityShare] STOMP error', frame?.headers, frame?.body);
          }
        },
        onWebSocketError: (event) => {
          if (mounted) {
            setConnected(false);
            // eslint-disable-next-line no-console
            console.warn('[CityShare] WebSocket error', event);
          }
        }
      });
      clientRef.current = client;
      client.activate();
    };
    connect();
    return () => {
      mounted = false;
      clientRef.current?.deactivate();
      clientRef.current = null;
    };
  }, [currentUserId]);

  const sendMessage = useCallback((content: string, receiverId?: string | number) => {
    if (!receiverId || !clientRef.current?.active || !clientRef.current.connected) {
      return false;
    }
    try {
      clientRef.current.publish({
        destination: '/app/chat.send',
        body: JSON.stringify({ contenu: content, destinataireId: receiverId }),
        headers: { 'content-type': 'application/json' }
      });
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[CityShare] WebSocket publish failed', error);
      return false;
    }
  }, []);

  return { connected, messages, sendMessage };
};
