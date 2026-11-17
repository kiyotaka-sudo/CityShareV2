import React, { useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { FIRST_LAUNCH_KEY } from '../../utils/constants';
import { RootStackParamList } from '../../types';

const { width } = Dimensions.get('window');

const slides = [
  { icon: 'car-outline', title: 'onboarding.slide1_title', sub: 'onboarding.slide1_sub' },
  { icon: 'cube-outline', title: 'onboarding.slide2_title', sub: 'onboarding.slide2_sub' },
  { icon: 'shield-checkmark-outline', title: 'onboarding.slide3_title', sub: 'onboarding.slide3_sub' }
] as const;

type Props = StackScreenProps<RootStackParamList, 'Onboarding'>;

export default function OnboardingScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const listRef = useRef<FlatList<(typeof slides)[number]>>(null);
  const [index, setIndex] = useState(0);

  const next = async () => {
    if (index < slides.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1 });
      return;
    }
    await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'true');
    navigation.replace('Auth');
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={slides}
        keyExtractor={(item) => item.title}
        onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Ionicons name={item.icon} color={colors.primary} size={112} />
            <Text style={styles.title}>{t(item.title)}</Text>
            <Text style={styles.subtitle}>{t(item.sub)}</Text>
          </View>
        )}
      />
      <View style={styles.dots}>
        {slides.map((slide, dotIndex) => <View key={slide.title} style={[styles.dot, dotIndex === index && styles.dotActive]} />)}
      </View>
      <Pressable style={styles.button} onPress={next}>
        <Text style={styles.buttonText}>{index === slides.length - 1 ? t('onboarding.get_started') : t('common.next')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, paddingBottom: 32 },
  slide: { width, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { color: colors.primary, fontSize: 28, fontWeight: '900', marginTop: 28, textAlign: 'center' },
  subtitle: { color: colors.textSecondary, fontSize: 16, marginTop: 12, textAlign: 'center', lineHeight: 23 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.border },
  dotActive: { width: 24, backgroundColor: colors.primary },
  button: { marginHorizontal: 16, backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  buttonText: { color: colors.white, fontWeight: '900', fontSize: 16 }
});
