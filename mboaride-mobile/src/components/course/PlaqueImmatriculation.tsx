import React from 'react';
import { Text, View } from 'react-native';
import { polices } from '../../theme';

/** Plaque d'immatriculation dessinée comme une vraie plaque camerounaise (bandeau CMR aux couleurs nationales). */
export default function PlaqueImmatriculation({ numero, petite }: { numero?: string; petite?: boolean }) {
  if (!numero) return null;
  const h = petite ? 24 : 30;
  return (
    <View style={{ flexDirection: 'row', alignSelf: 'flex-start', height: h, borderRadius: 5, borderWidth: 1.5, borderColor: '#1F2937',
      overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
      <View style={{ width: h * 0.75, backgroundColor: '#032E5D', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
        <View style={{ flexDirection: 'row', width: h * 0.42, height: h * 0.28 }}>
          <View style={{ flex: 1, backgroundColor: '#007A5E' }} />
          <View style={{ flex: 1, backgroundColor: '#CE1126' }} />
          <View style={{ flex: 1, backgroundColor: '#FCD116' }} />
        </View>
        <Text style={{ color: '#fff', fontSize: h * 0.26, fontFamily: polices.texteGras, lineHeight: h * 0.32 }}>CMR</Text>
      </View>
      <View style={{ paddingHorizontal: 8, justifyContent: 'center' }}>
        <Text style={{ fontFamily: polices.titre, fontSize: h * 0.52, letterSpacing: 1.5, color: '#111827' }}>{numero.toUpperCase()}</Text>
      </View>
    </View>
  );
}
