import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming, ZoomIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { couleurs, polices } from '../../theme';

/** Chiffre qui se retourne comme une carte (rotation sur l'axe vertical) avec un léger décalage. */
function ChiffreRetourne({ chiffre, rang }: { chiffre: string; rang: number }) {
  const angle = useSharedValue(90);
  useEffect(() => {
    angle.value = withDelay(150 + rang * 160, withTiming(0, { duration: 420, easing: Easing.out(Easing.back(1.6)) }));
  }, [chiffre]); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({
    opacity: angle.value > 80 ? 0 : 1,
    transform: [{ perspective: 600 }, { rotateY: `${angle.value}deg` }]
  }));
  return (
    <Animated.View style={[{ width: 44, height: 56, borderRadius: 12, backgroundColor: couleurs.primaire, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Text style={{ fontFamily: polices.titre, fontSize: 28, color: '#fff' }}>{chiffre}</Text>
    </Animated.View>
  );
}

/**
 * Code de vérification (moment 8) : les chiffres se retournent l'un après l'autre,
 * puis le QR code apparaît avec un rebond. Le chauffeur saisit le code ou scanne le QR.
 */
export default function CodeVerification({ courseId, code }: { courseId: number; code: string }) {
  const { t } = useTranslation();
  const echelle = useSharedValue(0.6);
  useEffect(() => { echelle.value = withDelay(150 + code.length * 160, withSpring(1, { damping: 12, stiffness: 180 })); }, [code]); // eslint-disable-line react-hooks/exhaustive-deps
  const qr = useAnimatedStyle(() => ({ transform: [{ scale: echelle.value }], opacity: Math.min(1, (echelle.value - 0.6) / 0.3) }));

  return (
    <View style={{ backgroundColor: couleurs.fond, borderRadius: 20, padding: 16, gap: 12 }}>
      <Text style={{ fontFamily: polices.titreDemi, fontSize: 15, color: couleurs.texte }}>{t('course.codeVerification')}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ flex: 1, gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {code.split('').map((c, i) => <ChiffreRetourne key={i} chiffre={c} rang={i} />)}
          </View>
          <Text style={{ fontFamily: polices.texte, fontSize: 12, color: couleurs.texteSecondaire }}>{t('course.codeExplication')}</Text>
        </View>
        <Animated.View entering={ZoomIn.delay(100)} style={[{ backgroundColor: '#fff', padding: 8, borderRadius: 14 }, qr]}>
          <QRCode value={`MBOARIDE:${courseId}:${code}`} size={84} color={couleurs.primaire} />
        </Animated.View>
      </View>
    </View>
  );
}
