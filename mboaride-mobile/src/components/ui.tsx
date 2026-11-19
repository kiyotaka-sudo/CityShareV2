import React, { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator, Image, Pressable, ScrollView, StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { couleurs, espace, police, polices, rayon } from '../theme';
import PressableAnime from './anime/Pressable';
import { urlPhoto } from '../api/client';

type Variante = 'primaire' | 'secondaire' | 'danger' | 'contour' | 'accent';

export function Bouton({ titre, onPress, variante = 'primaire', chargement, desactive, icone, style, petit }: {
  titre: string; onPress?: () => void; variante?: Variante; chargement?: boolean; desactive?: boolean;
  icone?: keyof typeof Ionicons.glyphMap; style?: StyleProp<ViewStyle>; petit?: boolean;
}) {
  const fond = { primaire: couleurs.primaire, secondaire: couleurs.primaireClair, danger: couleurs.rouge, contour: couleurs.blanc, accent: couleurs.accent }[variante];
  const texte = { primaire: '#fff', secondaire: couleurs.primaireFonce, danger: '#fff', contour: couleurs.texte, accent: '#fff' }[variante];
  const inactif = desactive || chargement;
  return (
    <PressableAnime
      accessibilityRole="button"
      onPress={onPress}
      disabled={inactif}
      vibration={variante === 'danger' ? 'moyen' : 'leger'}
      style={[s.bouton, petit && s.boutonPetit, { backgroundColor: fond, opacity: inactif ? 0.55 : 1 },
        variante === 'contour' && { borderWidth: 1.5, borderColor: couleurs.bord }, style]}>
      {chargement ? <ActivityIndicator color={texte} /> : (
        <>
          {icone && <Ionicons name={icone} size={petit ? 16 : 20} color={texte} />}
          <Text style={[s.boutonTexte, petit && { fontSize: 14 }, { color: texte }]}>{titre}</Text>
        </>
      )}
    </PressableAnime>
  );
}

export function Ecran({ titre, children, defilement = true, retour = true, droite, style }: PropsWithChildren<{
  titre?: string; defilement?: boolean; retour?: boolean; droite?: ReactNode; style?: StyleProp<ViewStyle>;
}>) {
  const nav = useNavigation();
  return (
    <SafeAreaView style={s.ecran} edges={['top', 'left', 'right']}>
      {titre !== undefined && (
        <View style={s.entete}>
          {retour && nav.canGoBack() ? (
            <Pressable onPress={() => nav.goBack()} hitSlop={12} accessibilityLabel="Retour"><Ionicons name="arrow-back" size={26} color={couleurs.texte} /></Pressable>
          ) : null}
          <Text style={s.enteteTitre} numberOfLines={1}>{titre}</Text>
          {droite}
        </View>
      )}
      {defilement ? (
        <ScrollView contentContainerStyle={[s.contenu, style]} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      ) : <View style={[{ flex: 1 }, style]}>{children}</View>}
    </SafeAreaView>
  );
}

export function Carte({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[s.carte, style]}>{children}</View>;
}

export function Champ({ libelle, erreur, ...props }: TextInputProps & { libelle?: string; erreur?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {libelle ? <Text style={s.libelle}>{libelle}</Text> : null}
      <TextInput placeholderTextColor="#9CA3AF" {...props} style={[s.champ, props.multiline && { minHeight: 90, textAlignVertical: 'top' }, props.style]} />
      {erreur ? <Text style={s.erreur}>{erreur}</Text> : null}
    </View>
  );
}

export function Etiquette({ texte, couleur = couleurs.primaire, fond = couleurs.primaireClair }: { texte: string; couleur?: string; fond?: string }) {
  return <View style={[s.etiquette, { backgroundColor: fond }]}><Text style={[s.etiquetteTexte, { color: couleur }]}>{texte}</Text></View>;
}

export function Avatar({ photo, nom, taille = 48 }: { photo?: string | null; nom: string; taille?: number }) {
  const url = urlPhoto(photo);
  if (url) return <Image source={{ uri: url }} style={{ width: taille, height: taille, borderRadius: taille / 2, backgroundColor: couleurs.primaireClair }} />;
  return (
    <View style={{ width: taille, height: taille, borderRadius: taille / 2, backgroundColor: couleurs.primaire, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: couleurs.accent, fontWeight: '800', fontSize: taille / 2.4 }}>{nom.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

export function Etoiles({ note, taille = 18, onChange }: { note: number; taille?: number; onChange?: (n: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable key={i} disabled={!onChange} onPress={() => onChange?.(i)} hitSlop={6} accessibilityLabel={`${i}`}>
          <Ionicons name={i <= Math.round(note) ? 'star' : 'star-outline'} size={taille} color={couleurs.jaune} />
        </Pressable>
      ))}
    </View>
  );
}

export function Ligne({ icone, texte, sousTexte, onPress, droite }: {
  icone?: keyof typeof Ionicons.glyphMap; texte: string; sousTexte?: string; onPress?: () => void; droite?: ReactNode;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [s.ligne, pressed && { backgroundColor: couleurs.fond }]}>
      {icone && <Ionicons name={icone} size={22} color={couleurs.primaire} />}
      <View style={{ flex: 1 }}>
        <Text style={s.ligneTexte}>{texte}</Text>
        {sousTexte ? <Text style={s.sousTexte}>{sousTexte}</Text> : null}
      </View>
      {droite ?? (onPress ? <Ionicons name="chevron-forward" size={20} color={couleurs.texteSecondaire} /> : null)}
    </Pressable>
  );
}

export function Vide({ texte, icone = 'file-tray-outline' }: { texte: string; icone?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={{ alignItems: 'center', padding: espace.xl, gap: espace.s }}>
      <Ionicons name={icone} size={44} color={couleurs.bord} />
      <Text style={{ color: couleurs.texteSecondaire, textAlign: 'center' }}>{texte}</Text>
    </View>
  );
}

export function Chargement() {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: espace.xl }}><ActivityIndicator color={couleurs.primaire} size="large" /></View>;
}

export function Texte({ children, style, variante = 'normal' }: PropsWithChildren<{ style?: StyleProp<any>; variante?: 'normal' | 'titre' | 'secondaire' | 'gras' | 'grand' }>) {
  return <Text style={[s[variante], style]}>{children}</Text>;
}

export const s = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  entete: { flexDirection: 'row', alignItems: 'center', gap: espace.m, paddingHorizontal: espace.m, paddingVertical: espace.s + 4, backgroundColor: couleurs.blanc, borderBottomWidth: 1, borderBottomColor: '#EEF0EF' },
  enteteTitre: { fontSize: police.grande, fontFamily: polices.titreDemi, color: couleurs.texte, flex: 1 },
  contenu: { padding: espace.m, gap: espace.m, paddingBottom: 48 },
  bouton: { minHeight: 52, borderRadius: rayon.m, paddingHorizontal: espace.m, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: espace.s },
  boutonPetit: { minHeight: 40, paddingHorizontal: 12 },
  boutonTexte: { fontSize: police.normale, fontFamily: polices.texteGras },
  carte: { backgroundColor: couleurs.blanc, borderRadius: rayon.m, padding: espace.m, gap: espace.s, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  libelle: { fontSize: police.petite, fontFamily: polices.texteGras, color: couleurs.texteSecondaire },
  champ: { borderWidth: 1.5, borderColor: couleurs.bord, borderRadius: rayon.s, paddingHorizontal: 14, paddingVertical: 12, fontSize: police.normale, fontFamily: polices.texte, backgroundColor: couleurs.blanc, color: couleurs.texte },
  erreur: { color: couleurs.rouge, fontSize: police.petite, fontFamily: polices.texteMoyen },
  etiquette: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  etiquetteTexte: { fontSize: 12, fontFamily: polices.texteGras },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: espace.m, paddingVertical: 14, paddingHorizontal: espace.m, backgroundColor: couleurs.blanc },
  ligneTexte: { fontSize: police.normale, color: couleurs.texte, fontFamily: polices.texteMoyen },
  sousTexte: { fontSize: police.petite, color: couleurs.texteSecondaire, marginTop: 2, fontFamily: polices.texte },
  normal: { fontSize: police.normale, color: couleurs.texte, fontFamily: polices.texte },
  titre: { fontSize: police.titre, fontFamily: polices.titre, color: couleurs.texte },
  secondaire: { fontSize: police.petite, color: couleurs.texteSecondaire, fontFamily: polices.texte },
  gras: { fontSize: police.normale, color: couleurs.texte, fontFamily: polices.texteGras },
  grand: { fontSize: police.grande, color: couleurs.texte, fontFamily: polices.titreDemi }
});
