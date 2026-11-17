import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomePassagerScreen from '../screens/passager/HomePassagerScreen';
import MesTrajetsScreen from '../screens/passager/MesTrajetsScreen';
import MessagerieScreen from '../screens/shared/MessagerieScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

export default function PassagerNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Accueil: 'home-outline',
            Trajets: 'calendar-outline',
            Messages: 'chatbubble-ellipses-outline',
            Profil: 'person-outline'
          };
          return <Ionicons name={icons[route.name]} color={color} size={size} />;
        }
      })}
    >
      <Tab.Screen name="Accueil" component={HomePassagerScreen} />
      <Tab.Screen name="Trajets" component={MesTrajetsScreen} />
      <Tab.Screen name="Messages" component={MessagerieScreen} />
      <Tab.Screen name="Profil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
