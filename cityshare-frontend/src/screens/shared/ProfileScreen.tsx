import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { colors } from '../../theme/colors';
import { LANG_KEY } from '../../utils/constants';
import { useAuth } from '../../hooks/useAuth';
import { userApi } from '../../api/userApi';
import { RootStackParamList } from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';
import { pickProfilePhotoBase64 } from '../../utils/photoUpload';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { user, signOut, setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [nom, setNom] = useState(user?.nom ?? '');
  const [prenom, setPrenom] = useState(user?.prenom ?? '');
  const [uploading, setUploading] = useState(false);
  const [urgenceNom, setUrgenceNom] = useState(user?.contactUrgenceNom ?? '');
  const [urgenceTel, setUrgenceTel] = useState(user?.contactUrgenceTel ?? '');

  const changeLang = async (lang: 'fr' | 'en') => {
    await i18n.changeLanguage(lang);
    await AsyncStorage.setItem(LANG_KEY, lang);
  };

  const pickPhoto = async () => {
    setUploading(true);
    try {
      const photoUrl = await pickProfilePhotoBase64();
      if (!photoUrl) {
        Alert.alert('CityShare', t('extra.camera_denied'));
        return;
      }
      const updated = await userApi.updatePhoto(photoUrl);
      setUser?.({ ...user!, photoUrl: updated.photoUrl });
      Alert.alert('CityShare', t('profile.photo_updated'));
    } catch (e) {
      const msg =
        e instanceof Error && e.message === 'PHOTO_TOO_LARGE'
          ? t('profile.photo_too_large')
          : getApiErrorMessage(e);
      Alert.alert('CityShare', msg);
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async () => {
    try {
      const updated = await userApi.updateProfile({ nom, prenom });
      setUser?.({ ...user!, nom: updated.nom, prenom: updated.prenom });
      setEditing(false);
      Alert.alert('CityShare', '✅ Profil mis à jour !');
    } catch {
      Alert.alert('CityShare', t('common.error'));
    }
  };

  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'fr';

  const saveEmergency = async () => {
    try {
      const updated = await userApi.updateEmergencyContact(urgenceNom.trim(), urgenceTel.trim());
      setUser?.({ ...user!, contactUrgenceNom: updated.contactUrgenceNom, contactUrgenceTel: updated.contactUrgenceTel });
      Alert.alert('CityShare', t('profile.emergency_saved'));
    } catch {
      Alert.alert('CityShare', t('common.error'));
    }
  };

  const openHistory = () => {
    const tab = user?.role === 'CONDUCTEUR' ? 'Dashboard' : user?.role === 'EXPEDITEUR' ? 'Colis' : 'Trajets';
    const root = user?.role === 'CONDUCTEUR' ? 'Conducteur' : user?.role === 'EXPEDITEUR' ? 'Expediteur' : 'Passager';
    navigation.navigate(root as keyof RootStackParamList, { screen: tab } as never);
  };

  const menu: [keyof typeof Ionicons.glyphMap, string, string, () => void][] = [
    ['document-text-outline', t('profile.documents'), colors.textPrimary, () => Alert.alert('CityShare', t('profile.documents_soon'))],
    ['time-outline', t('profile.history'), colors.textPrimary, openHistory],
    ['settings-outline', t('profile.settings'), colors.textPrimary, () => navigation.navigate('Settings')]
  ];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.top}>
        <Pressable onPress={pickPhoto} style={styles.avatarWrap} disabled={uploading}>
          {user?.photoUrl ? (
            <Image source={{ uri: user.photoUrl }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatar}><Ionicons name="person" color={colors.primary} size={48} /></View>
          )}
          <View style={styles.avatarBadge}>
            <Ionicons name={uploading ? 'hourglass-outline' : 'camera'} size={14} color={colors.white} />
          </View>
        </Pressable>

        {editing ? (
          <View style={styles.editFields}>
            <TextInput style={styles.editInput} value={prenom} onChangeText={setPrenom} placeholder="Prénom" />
            <TextInput style={styles.editInput} value={nom} onChangeText={setNom} placeholder="Nom" />
            <View style={styles.editButtons}>
              <Pressable style={styles.cancelBtn} onPress={() => setEditing(false)}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={saveProfile}>
                <Text style={styles.saveBtnText}>Enregistrer</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.name}>{user?.prenom} {user?.nom}</Text>
            <Text style={styles.phone}>{user?.telephone}</Text>
            <Text style={styles.badge}>{user?.role ?? 'PASSAGER'} · ⭐ {user?.noteMoyenne ?? 4.8}</Text>
            <Pressable style={styles.editProfileBtn} onPress={() => setEditing(true)}>
              <Ionicons name="pencil-outline" size={14} color={colors.primary} />
              <Text style={styles.editProfileText}>Modifier le profil</Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.bottom}>
        {menu.map(([icon, label, color, onPress]) => (
          <Pressable key={label} style={styles.menuItem} onPress={onPress}>
            <Ionicons name={icon} size={22} color={color} />
            <Text style={styles.menuText}>{label}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </Pressable>
        ))}

        {user?.role === 'PASSAGER' && (
          <View style={styles.emergencyBox}>
            <Text style={styles.emergencyTitle}>{t('profile.emergency')}</Text>
            <TextInput
              style={styles.emergencyInput}
              value={urgenceNom}
              onChangeText={setUrgenceNom}
              placeholder={t('profile.emergency_name')}
            />
            <TextInput
              style={styles.emergencyInput}
              value={urgenceTel}
              onChangeText={setUrgenceTel}
              placeholder={t('profile.emergency_phone')}
              keyboardType="phone-pad"
            />
            <Pressable style={styles.emergencySave} onPress={saveEmergency}>
              <Text style={styles.emergencySaveText}>{t('common.save')}</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.languageTitle}>{t('settings.language_title')}</Text>
        <View style={styles.langRow}>
          <Pressable onPress={() => changeLang('fr')} style={[styles.langButton, currentLang === 'fr' && styles.langActive]}>
            <Text style={styles.langFlag}>🇫🇷</Text>
            <Text style={[styles.langText, currentLang === 'fr' && styles.langTextActive]}>{t('settings.french')}</Text>
          </Pressable>
          <Pressable onPress={() => changeLang('en')} style={[styles.langButton, currentLang === 'en' && styles.langActive]}>
            <Text style={styles.langFlag}>🇬🇧</Text>
            <Text style={[styles.langText, currentLang === 'en' && styles.langTextActive]}>{t('settings.english')}</Text>
          </Pressable>
        </View>

        <Pressable style={styles.menuItem} onPress={async () => {
          await signOut();
          let root: any = navigation;
          while (root.getParent?.()) root = root.getParent();
          root.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Auth' }] }));
        }}>
          <Ionicons name="log-out-outline" size={22} color={colors.danger} />
          <Text style={[styles.menuText, { color: colors.danger }]}>{t('profile.logout')}</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.danger} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.primary },
  top: { alignItems: 'center', paddingTop: 64, paddingBottom: 30 },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatarImg: { width: 104, height: 104, borderRadius: 52, borderWidth: 3, borderColor: colors.white },
  avatar: { width: 104, height: 104, borderRadius: 52, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  avatarBadge: { position: 'absolute', bottom: 2, right: 2, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.primary },
  name: { color: colors.white, fontSize: 24, fontWeight: '900' },
  phone: { color: colors.white, fontWeight: '600', marginTop: 6, opacity: 0.9, fontSize: 13 },
  badge: { color: colors.white, fontWeight: '800', marginTop: 8, opacity: 0.95 },
  editProfileBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99 },
  editProfileText: { color: colors.primary, fontWeight: '800', fontSize: 13 },
  editFields: { width: '85%', gap: 10, marginTop: 10 },
  editInput: { backgroundColor: colors.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: colors.textPrimary, fontWeight: '700' },
  editButtons: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 12, padding: 12, alignItems: 'center' },
  cancelBtnText: { color: colors.white, fontWeight: '900' },
  saveBtn: { flex: 1, backgroundColor: colors.accent, borderRadius: 12, padding: 12, alignItems: 'center' },
  saveBtnText: { color: colors.white, fontWeight: '900' },
  bottom: { flex: 1, backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuText: { flex: 1, color: colors.textPrimary, fontWeight: '800' },
  languageTitle: { color: colors.textPrimary, fontWeight: '900', marginTop: 20, marginBottom: 10 },
  langRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  langButton: { flex: 1, padding: 13, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  langActive: { borderColor: colors.primary, backgroundColor: '#E8F5E9' },
  langFlag: { fontSize: 24, marginBottom: 6 },
  langText: { color: colors.textSecondary, fontWeight: '800' },
  langTextActive: { color: colors.primary },
  emergencyBox: { marginTop: 8, padding: 14, backgroundColor: colors.surface, borderRadius: 16, gap: 10 },
  emergencyTitle: { color: colors.textPrimary, fontWeight: '900' },
  emergencyInput: { height: 48, backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, color: colors.textPrimary },
  emergencySave: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  emergencySaveText: { color: colors.white, fontWeight: '900' }
});
