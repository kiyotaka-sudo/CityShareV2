import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { AuthStackParamList } from '../../types';
import { colors } from '../../theme/colors';
import { useAuth } from '../../hooks/useAuth';
import LoadingOverlay from '../../components/LoadingOverlay';

type Props = StackScreenProps<AuthStackParamList, 'Login'>;
type FormValues = { telephone: string; password: string };

export default function LoginScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { signIn, loading } = useAuth();
  const { control, handleSubmit } = useForm<FormValues>({ defaultValues: { telephone: '', password: '' } });
  const [hidden, setHidden] = useState(true);

  const goByRole = (nextRole: string) => {
    if (nextRole === 'CONDUCTEUR') navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Conducteur' }] });
    else if (nextRole === 'EXPEDITEUR') navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Expediteur' }] });
    else navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Passager' }] });
  };

  const submit = async (values: FormValues) => {
    try {
      const response = await signIn({ telephone: `+237${values.telephone.replace(/\s/g, '')}`, password: values.password });
      goByRole(response.user?.role ?? response.role ?? 'PASSAGER');
    } catch {
      Alert.alert('CityShare', t('common.error'));
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <LoadingOverlay visible={loading} />
      <Text style={styles.logo}>CityShare</Text>
      <Text style={styles.title}>{t('auth.welcome_back')}</Text>
      <Text style={styles.label}>{t('auth.phone')}</Text>
      <View style={styles.phoneBox}>
        <Text style={styles.prefix}>🇨🇲 +237</Text>
        <Controller control={control} name="telephone" render={({ field }) => (
          <TextInput style={styles.phoneInput} keyboardType="phone-pad" value={field.value} onChangeText={field.onChange} placeholder="6 99 00 00 00" />
        )} />
      </View>
      <Text style={styles.label}>{t('auth.password')}</Text>
      <View style={styles.inputIcon}>
        <Controller control={control} name="password" render={({ field }) => (
          <TextInput style={styles.inputFlex} secureTextEntry={hidden} value={field.value} onChangeText={field.onChange} placeholder="••••••••" />
        )} />
        <Pressable onPress={() => setHidden((current) => !current)}>
          <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={22} color={colors.textSecondary} />
        </Pressable>
      </View>
      <Text style={styles.forgot}>{t('auth.forgot_password')}</Text>
      <Pressable style={styles.button} onPress={handleSubmit(submit)}>
        <Text style={styles.buttonText}>{t('auth.login')}</Text>
      </Pressable>
      <View style={styles.separator}><View style={styles.line} /><Text style={styles.or}>{t('common.or').toUpperCase()}</Text><View style={styles.line} /></View>
      <Pressable style={styles.outline} onPress={() => navigation.navigate('Register')}>
        <Text style={styles.outlineText}>{t('auth.register')}</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, padding: 16, justifyContent: 'center' },
  logo: { color: colors.primary, fontWeight: '900', textAlign: 'center', fontSize: 28, marginBottom: 36 },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: '900', marginBottom: 24 },
  label: { color: colors.textPrimary, fontWeight: '700', marginBottom: 8 },
  phoneBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, marginBottom: 16 },
  prefix: { fontWeight: '800', color: colors.textPrimary, marginRight: 8 },
  phoneInput: { flex: 1, height: 52, color: colors.textPrimary },
  inputIcon: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, height: 52 },
  inputFlex: { flex: 1, color: colors.textPrimary },
  forgot: { alignSelf: 'flex-end', color: colors.secondary, fontWeight: '700', marginVertical: 14 },
  button: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  buttonText: { color: colors.white, fontWeight: '900', fontSize: 16 },
  separator: { flexDirection: 'row', alignItems: 'center', marginVertical: 22, gap: 12 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { color: colors.textSecondary, fontWeight: '800' },
  outline: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.primary },
  outlineText: { color: colors.primary, fontWeight: '900' }
});
