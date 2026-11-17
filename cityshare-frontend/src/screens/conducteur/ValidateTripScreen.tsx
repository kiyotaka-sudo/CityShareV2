import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { reservationApi } from '../../api/reservationApi';
import { parseReservationQr } from '../../utils/tripMapper';

export default function ValidateTripScreen({ navigation }: any) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode] = useState<'arrival'>('arrival');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [scanned, setScanned] = useState(false);

  const handleScan = async ({ data }: { data: string }) => {
    if (scanned) return;
    const parsed = parseReservationQr(data);
    if (!parsed) {
      setScanned(true);
      setStatus('error');
      Alert.alert('CityShare', t('extra.qr_invalid'));
      return;
    }
    setScanned(true);
    try {
      const response = await reservationApi.validateArrivalQr(parsed.reservationId, parsed.token);
      setStatus(response.valid ? 'success' : 'error');
      Alert.alert('CityShare', response.message || (response.valid ? t('extra.qr_valid') : t('extra.qr_invalid')));
    } catch {
      setStatus('error');
      Alert.alert('CityShare', t('common.error'));
    }
  };

  if (!permission) return <View style={styles.center}><Text>{t('common.loading')}</Text></View>;

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
        <Text style={styles.title}>{t('extra.scan_arrival_qr')}</Text>
        <View style={styles.frame} />
        {status !== 'idle' && (
          <View style={[styles.result, status === 'success' ? styles.success : styles.error]}>
            <Ionicons name={status === 'success' ? 'checkmark-circle' : 'close-circle'} color={colors.white} size={40} />
            <Text style={styles.resultText}>{status === 'success' ? t('extra.qr_valid') : t('extra.qr_invalid')}</Text>
          </View>
        )}
        {scanned && (
          <Pressable
            style={styles.button}
            onPress={() => {
              setScanned(false);
              setStatus('idle');
            }}
          >
            <Text style={styles.buttonText}>{t('extra.scan_again')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, padding: 24 },
  permText: { color: colors.textPrimary, fontSize: 16, textAlign: 'center', marginBottom: 16 },
  permButton: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12 },
  permButtonText: { color: colors.white, fontWeight: '900' },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  backButton: { position: 'absolute', top: 58, left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  modeRow: { position: 'absolute', top: 58, flexDirection: 'row', gap: 8, zIndex: 2 },
  modeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)' },
  modeBtnActive: { backgroundColor: colors.accent },
  modeText: { color: colors.white, fontWeight: '800', fontSize: 12 },
  modeTextActive: { color: colors.white },
  title: { position: 'absolute', top: 108, color: colors.white, fontWeight: '900', fontSize: 18, textAlign: 'center', paddingHorizontal: 24 },
  frame: { width: 260, height: 260, borderWidth: 4, borderColor: colors.white, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)' },
  result: { position: 'absolute', bottom: 130, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 16 },
  success: { backgroundColor: colors.accent },
  error: { backgroundColor: colors.danger },
  resultText: { color: colors.white, fontWeight: '900' },
  button: { position: 'absolute', bottom: 54, backgroundColor: colors.white, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 14 },
  buttonText: { color: colors.primary, fontWeight: '900' }
});
