import React, { forwardRef, PropsWithChildren, ReactNode } from 'react';
import BottomSheet, { BottomSheetFooter, BottomSheetFooterProps, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { couleurs, ombres } from '../../theme';

/**
 * Panneau glissant à crans (ex. 28 % / 55 % / 90 %) posé sur la carte, comme dans Uber ou Yango.
 * `pied` reste fixé en bas quel que soit le cran (bouton « Commander »).
 */
const PanneauGlissant = forwardRef<BottomSheet, PropsWithChildren<{
  crans?: (string | number)[]; index?: number; onChange?: (index: number) => void; pied?: ReactNode; margeBas?: number;
}>>(({ children, crans = ['28%', '55%', '90%'], index = 0, onChange, pied, margeBas = 0 }, ref) => {
  const insets = useSafeAreaInsets();
  const renduPied = pied
    ? (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={0}>
        {pied}
      </BottomSheetFooter>
    )
    : undefined;
  return (
    <BottomSheet
      ref={ref}
      index={index}
      snapPoints={crans}
      onChange={onChange}
      enableDynamicSizing={false}
      bottomInset={margeBas}
      footerComponent={renduPied}
      backgroundStyle={[{ backgroundColor: couleurs.blanc, borderTopLeftRadius: 26, borderTopRightRadius: 26 }, ombres.forte]}
      handleIndicatorStyle={{ backgroundColor: '#C9D1DC', width: 44, height: 5 }}
      animationConfigs={{ damping: 22, stiffness: 180, mass: 1 }}>
      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: (pied ? 110 : 40) + (margeBas ? 0 : insets.bottom), gap: 14 }}
        keyboardShouldPersistTaps="handled">
        {children}
      </BottomSheetScrollView>
    </BottomSheet>
  );
});
PanneauGlissant.displayName = 'PanneauGlissant';
export default PanneauGlissant;
