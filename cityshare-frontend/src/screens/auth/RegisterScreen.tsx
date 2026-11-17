import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { AuthStackParamList, UserRole } from '../../types';
import { colors } from '../../theme/colors';
import { useAuth } from '../../hooks/useAuth';
import RoleSelector from '../../components/RoleSelector';
import LoadingOverlay from '../../components/LoadingOverlay';

type Props = StackScreenProps<AuthStackParamList, 'Register'>;
type FormValues = { nom: string; telephone: string; email: string; password: string; role: UserRole };

export default function RegisterScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { signUp, loading } = useAuth();
  const [roleChosen, setRoleChosen] = useState(false);
  const { control, handleSubmit, watch, setValue } = useForm<FormValues>({
    defaultValues: { nom: '', telephone: '', email: '', password: '', role: 'PASSAGER' }
  });

  const submit = async (values: FormValues) => {
    if (!roleChosen) {
      Alert.alert('CityShare', t('auth.role_required'));
      return;
    }
    try {
      await signUp({ ...values, telephone: `+237${values.telephone.replace(/\s/g, '')}` });
      navigation.getParent()?.reset({ index: 0, routes: [{ name: values.role === 'CONDUCTEUR' ? 'Conducteur' : values.role === 'EXPEDITEUR' ? 'Expediteur' : 'Passager' }] });
    } catch {
      Alert.alert('CityShare', t('common.error'));
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <LoadingOverlay visible={loading} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{t('auth.register')}</Text>
        {(['nom', 'telephone', 'email', 'password'] as const).map((name) => (
          <Controller key={name} control={control} name={name} render={({ field }) => (
            <TextInput
              style={styles.input}
              placeholder={name === 'nom' ? t('auth.full_name') : name === 'telephone' ? `${t('auth.phone')} (+237)` : name === 'email' ? t('auth.email') : t('auth.password')}
              secureTextEntry={name === 'password'}
              keyboardType={name === 'email' ? 'email-address' : name === 'telephone' ? 'phone-pad' : 'default'}
              value={field.value}
              onChangeText={field.onChange}
            />
          )} />
        ))}
        <RoleSelector
          value={watch('role')}
          onChange={(role) => {
            setRoleChosen(true);
            setValue('role', role);
          }}
        />
        <Pressable style={styles.button} onPress={handleSubmit(submit)}>
          <Text style={styles.buttonText}>{t('auth.sign_up')}</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>{t('auth.already_account')}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16, backgroundColor: colors.white, justifyContent: 'center', gap: 14 },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '900', marginBottom: 12 },
  input: { height: 52, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, color: colors.textPrimary },
  button: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: colors.white, fontWeight: '900', fontSize: 16 },
  link: { textAlign: 'center', color: colors.secondary, fontWeight: '800', marginTop: 10 }
});
