import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { RootStackParamList } from '../../types';
import { reservationApi } from '../../api/reservationApi';
import { parseReservationQr } from '../../utils/tripMapper';
import { getApiErrorMessage } from '../../utils/apiError';

type Props = StackScreenProps<RootStackParamList, 'ScanBoarding'>;

export default function ScanBoardingScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleScan = async ({ data }: { data: string }) => {
    if (scanned) return;
    const parsed = parseReservationQr(data);
    if (!parsed) {
      setScanned(true);
      Alert.alert('CityShare', t('extra.qr_invalid'));
      return;
    }
    setScanned(true);
    try {
      const response = await reservationApi.validateQr(parsed.reservationId, parsed.token);
      Alert.alert('CityShare', response.message || t('extra.qr_valid'), [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('CityShare', getApiErrorMessage(e));
    }
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>{t('extra.camera_denied')}</Text>
        <Pressable style={styles.permButton} onPress={requestPermission}>
          <Text style={styles.permButtonText}>{t('extra.grant_camera')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleScan}
      />
      <View style={styles.overlay}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color={colors.white} />
        </Pressable>
        <Text style={styles.title}>{t('extra.scan_driver_boarding')}</Text>
        <View style={styles.frame} />
        {scanned && (
          <Pressable style={styles.button} onPress={() => setScanned(false)}>
            <Text style={styles.buttonText}>{t('extra.scan_again')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.white },
  permText: { textAlign: 'center', marginBottom: 16, color: colors.textPrimary, fontWeight: '700' },
  permButton: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12 },
  permButtonText: { color: colors.white, fontWeight: '900' },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backButton: {
    position: 'absolute',
    top: 58,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    position: 'absolute',
    top: 108,
    color: colors.white,
    fontWeight: '900',
    fontSize: 17,
    textAlign: 'center',
    paddingHorizontal: 24
  },
  frame: { width: 260, height: 260, borderWidth: 4, borderColor: colors.white, borderRadius: 24 },
  button: { position: 'absolute', bottom: 54, backgroundColor: colors.white, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 14 },
  buttonText: { color: colors.primary, fontWeight: '900' }
});
