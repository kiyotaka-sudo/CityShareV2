import React, { createContext, PropsWithChildren, useEffect, useMemo, useReducer } from 'react';
import { authApi, LoginPayload, RegisterPayload } from '../api/authApi';
import { userApi } from '../api/userApi';
import { tokenStorage } from '../utils/tokenStorage';
import { AuthResponse, User, UserRole } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  loading: boolean;
}

type AuthAction =
  | { type: 'RESTORE'; payload: { token: string | null; user: User | null } }
  | { type: 'SIGN_IN'; payload: { token: string; user: User } }
  | { type: 'SIGN_OUT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'UPDATE_USER'; payload: User };

const initialState: AuthState = {
  user: null,
  token: null,
  role: null,
  loading: true
};

const reducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'RESTORE':
      return { ...state, token: action.payload.token, user: action.payload.user, role: action.payload.user?.role ?? null, loading: false };
    case 'SIGN_IN':
      return { ...state, token: action.payload.token, user: action.payload.user, role: action.payload.user.role, loading: false };
    case 'SIGN_OUT':
      return { ...initialState, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'UPDATE_USER':
      return { ...state, user: action.payload, role: action.payload.role };
    default:
      return state;
  }
};

interface AuthContextValue extends AuthState {
  signIn: (payload: LoginPayload) => Promise<AuthResponse>;
  signUp: (payload: RegisterPayload) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  setUser: (user: User) => void;
  refreshSession: () => Promise<User | null>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const restore = async () => {
      const token = await tokenStorage.getToken();
      if (!token) {
        dispatch({ type: 'RESTORE', payload: { token: null, user: null } });
        return;
      }
      try {
        const user = await userApi.me();
        await tokenStorage.setUser(user);
        await tokenStorage.setRole(user.role);
        dispatch({ type: 'RESTORE', payload: { token, user } });
      } catch {
        const user = await tokenStorage.getUser();
        dispatch({ type: 'RESTORE', payload: { token, user } });
      }
    };
    restore();
  }, []);

  const persistSession = async (response: AuthResponse) => {
    const user = response.user ?? {
      id: response.userId ?? 0,
      nom: '',
      prenom: response.prenom ?? 'Utilisateur',
      telephone: '',
      role: response.role ?? 'PASSAGER',
      noteMoyenne: 0,
      preferredLang: response.preferredLang ?? 'fr'
    };
    await tokenStorage.setToken(response.token);
    await tokenStorage.setRole(user.role);
    let sessionUser = user;
    try {
      sessionUser = await userApi.me();
    } catch {
      // garde le profil minimal de la réponse auth
    }
    await tokenStorage.setUser(sessionUser);
    dispatch({ type: 'SIGN_IN', payload: { token: response.token, user: sessionUser } });
  };

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    signIn: async (payload) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const response = await authApi.login(payload);
        await persistSession(response);
        return response;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    signUp: async (payload) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const response = await authApi.register(payload);
        await persistSession(response);
        return response;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    signOut: async () => {
      await tokenStorage.clearSession();
      dispatch({ type: 'SIGN_OUT' });
    },
    setUser: (user: User) => {
      dispatch({ type: 'UPDATE_USER', payload: user });
      tokenStorage.setUser(user);
      tokenStorage.setRole(user.role);
    },
    refreshSession: async () => {
      const token = await tokenStorage.getToken();
      if (!token) return null;
      try {
        const user = await userApi.me();
        await tokenStorage.setUser(user);
        await tokenStorage.setRole(user.role);
        dispatch({ type: 'UPDATE_USER', payload: user });
        return user;
      } catch {
        return null;
      }
    }
  }), [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
