import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Réglage « Réduire les animations » du téléphone (accessibilité) : les effets décoratifs sont alors coupés. */
export function useReduireAnimations(): boolean {
  const [reduire, setReduire] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduire).catch(() => undefined);
    const abonnement = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduire);
    return () => abonnement.remove();
  }, []);
  return reduire;
}
