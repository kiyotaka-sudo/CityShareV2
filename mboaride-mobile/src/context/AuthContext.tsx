import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Api } from '../api';
import { session } from '../api/client';
import { changerLangue } from '../i18n';
import type { Utilisateur } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CLE_UTILISATEUR = 'mboaride.utilisateur';

interface AuthValeur {
  utilisateur: Utilisateur | null;
  chargement: boolean;
  connecter: (token: string, utilisateur: Utilisateur) => Promise<void>;
  deconnecter: () => Promise<void>;
  rafraichir: () => Promise<Utilisateur | null>;
  mettreAJour: (u: Utilisateur) => void;
}

const AuthContext = createContext<AuthValeur | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [chargement, setChargement] = useState(true);

  const mettreAJour = useCallback((u: Utilisateur) => {
    setUtilisateur(u);
    AsyncStorage.setItem(CLE_UTILISATEUR, JSON.stringify(u)).catch(() => undefined);
  }, []);

  const deconnecter = useCallback(async () => {
    await session.definir(null);
    await AsyncStorage.removeItem(CLE_UTILISATEUR);
    setUtilisateur(null);
  }, []);

  const rafraichir = useCallback(async () => {
    try {
      const u = await Api.moi.get();
      mettreAJour(u);
      return u;
    } catch {
      return null;
    }
  }, [mettreAJour]);

  useEffect(() => {
    session.surExpiration(() => setUtilisateur(null));
    (async () => {
      const token = await session.charger();
      if (!token) { setChargement(false); return; }
      // Le profil en cache s'affiche tout de suite : pas d'attente si le réseau est lent ou le serveur endormi
      const cache = await AsyncStorage.getItem(CLE_UTILISATEUR);
      if (cache) { setUtilisateur(JSON.parse(cache)); setChargement(false); }
      // Session glissante : jeton neuf à chaque ouverture. En cas d'échec réseau, la session en cache est conservée.
      try {
        const r = await Api.auth.renouveler();
        await session.definir(r.token);
        mettreAJour(r.utilisateur);
      } catch {
        await rafraichir();
      }
      setChargement(false);
    })();
  }, [rafraichir, mettreAJour]);

  const connecter = useCallback(async (token: string, u: Utilisateur) => {
    await session.definir(token);
    await changerLangue(u.langue);
    mettreAJour(u);
  }, [mettreAJour]);

  const valeur = useMemo(() => ({ utilisateur, chargement, connecter, deconnecter, rafraichir, mettreAJour }),
    [utilisateur, chargement, connecter, deconnecter, rafraichir, mettreAJour]);
  return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth hors AuthProvider');
  return ctx;
}
