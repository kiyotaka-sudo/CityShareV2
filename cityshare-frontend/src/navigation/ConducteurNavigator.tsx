import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardConducteurScreen from '../screens/conducteur/DashboardConducteurScreen';
import ValidateTripScreen from '../screens/conducteur/ValidateTripScreen';
import ConducteurPassengersScreen from '../screens/conducteur/ConducteurPassengersScreen';
import MessagerieScreen from '../screens/shared/MessagerieScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

export default function ConducteurNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Dashboard: 'speedometer-outline',
            Passagers: 'people-outline',
            Scanner: 'qr-code-outline',
            Messages: 'chatbubble-ellipses-outline',
            Profil: 'person-outline'
          };
          return <Ionicons name={icons[route.name]} color={color} size={size} />;
        }
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardConducteurScreen} />
      <Tab.Screen name="Passagers" component={ConducteurPassengersScreen} />
      <Tab.Screen name="Scanner" component={ValidateTripScreen} />
      <Tab.Screen name="Messages" component={MessagerieScreen} />
      <Tab.Screen name="Profil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
