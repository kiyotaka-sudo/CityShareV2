import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { session, WS_URL } from '../api/client';
import { useAuth } from './AuthContext';

/** Événement temps réel : { type, data } envoyé par le serveur sur une file privée. */
export interface Evenement<T = unknown> { type: string; data: T }
type Gestionnaire = (e: Evenement<any>) => void;

interface TempsReelValeur {
  connecte: boolean;
  /** Abonnement à une file (/user/queue/courses, /user/queue/demandes, /user/queue/messages). Renvoie la désinscription. */
  ecouter: (file: string, fn: Gestionnaire) => () => void;
}

const TempsReelContext = createContext<TempsReelValeur>({ connecte: false, ecouter: () => () => undefined });

/**
 * Connexion STOMP unique pour toute l'application, reconnectée automatiquement après une coupure réseau.
 * Les écrans complètent par des requêtes périodiques : l'application reste utilisable sans WebSocket.
 */
export function TempsReelProvider({ children }: PropsWithChildren) {
  const { utilisateur } = useAuth();
  const [connecte, setConnecte] = useState(false);
  const client = useRef<Client | null>(null);
  const gestionnaires = useRef(new Map<string, Set<Gestionnaire>>());
  const abonnements = useRef(new Map<string, StompSubscription>());

  const abonner = useCallback((file: string) => {
    const c = client.current;
    if (!c?.connected || abonnements.current.has(file)) return;
    abonnements.current.set(file, c.subscribe(file, (m: IMessage) => {
      try {
        const evt = JSON.parse(m.body) as Evenement;
        gestionnaires.current.get(file)?.forEach((fn) => fn(evt));
      } catch { /* message illisible */ }
    }));
  }, []);

  useEffect(() => {
    const token = session.jeton();
    if (!utilisateur || !token) return undefined;
    const url = WS_URL.replace(/^ws/, 'http');
    const c = new Client({
      webSocketFactory: () => new SockJS(url),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 4000,
      heartbeatIncoming: 20000,
      heartbeatOutgoing: 20000,
      onConnect: () => {
        setConnecte(true);
        abonnements.current.clear();
        gestionnaires.current.forEach((_, file) => abonner(file));
      },
      onWebSocketClose: () => setConnecte(false),
      onStompError: () => setConnecte(false)
    });
    client.current = c;
    c.activate();
    return () => {
      c.deactivate();
      client.current = null;
      abonnements.current.clear();
      setConnecte(false);
    };
  }, [utilisateur?.id, abonner]);

  const ecouter = useCallback((file: string, fn: Gestionnaire) => {
    if (!gestionnaires.current.has(file)) gestionnaires.current.set(file, new Set());
    gestionnaires.current.get(file)!.add(fn);
    abonner(file);
    return () => {
      gestionnaires.current.get(file)?.delete(fn);
    };
  }, [abonner]);

  return <TempsReelContext.Provider value={{ connecte, ecouter }}>{children}</TempsReelContext.Provider>;
}

export const useTempsReel = () => useContext(TempsReelContext);

/** Écoute un type d'événement sur une file pendant la durée de vie du composant. */
export function useEvenement<T>(file: string, types: string[], fn: (data: T, type: string) => void) {
  const { ecouter } = useTempsReel();
  const ref = useRef(fn);
  ref.current = fn;
  const cle = types.join(',');
  useEffect(() => ecouter(file, (e) => {
    if (cle.split(',').includes(e.type)) ref.current(e.data as T, e.type);
  }), [ecouter, file, cle]);
}
