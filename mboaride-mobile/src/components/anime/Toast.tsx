import React, { createContext, PropsWithChildren, useCallback, useContext, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeOutUp, SlideInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { couleurs, ombres, polices } from '../../theme';
import { haptique } from './haptique';

type TypeToast = 'succes' | 'erreur' | 'info' | 'alerte';
interface Toast { id: number; type: TypeToast; titre: string; message?: string }

const STYLES: Record<TypeToast, { fond: string; icone: keyof typeof Ionicons.glyphMap }> = {
  succes: { fond: couleurs.vert, icone: 'checkmark-circle' },
  erreur: { fond: couleurs.rouge, icone: 'alert-circle' },
  info: { fond: couleurs.primaire, icone: 'information-circle' },
  alerte: { fond: couleurs.accent, icone: 'warning' }
};

const ToastContext = createContext<(type: TypeToast, titre: string, message?: string) => void>(() => undefined);

/** Notifications internes qui glissent depuis le haut de l'écran (remplacent les boîtes d'alerte bloquantes). */
export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const compteur = useRef(0);
  const insets = useSafeAreaInsets();

  const afficher = useCallback((type: TypeToast, titre: string, message?: string) => {
    const id = ++compteur.current;
    setToasts((t) => [...t.slice(-2), { id, type, titre, message }]);
    if (type === 'succes') haptique.succes(); else if (type === 'erreur') haptique.erreur(); else haptique.leger();
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), type === 'erreur' ? 5000 : 3200);
  }, []);

  return (
    <ToastContext.Provider value={afficher}>
      {children}
      <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 8, left: 12, right: 12, gap: 8 }}>
        {toasts.map((t) => (
          <Animated.View key={t.id} entering={SlideInUp.springify().damping(16)} exiting={FadeOutUp.duration(200)}>
            <Pressable onPress={() => setToasts((l) => l.filter((x) => x.id !== t.id))}
              style={[{ backgroundColor: STYLES[t.type].fond, borderRadius: 16, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center' }, ombres.moyenne]}>
              <Ionicons name={STYLES[t.type].icone} size={24} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontFamily: polices.texteGras, fontSize: 15 }}>{t.titre}</Text>
                {t.message ? <Text style={{ color: 'rgba(255,255,255,0.9)', fontFamily: polices.texte, fontSize: 14 }}>{t.message}</Text> : null}
              </View>
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
