import React from 'react';
import { createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { usePushToken } from '../hooks/usePushToken';
import { Chargement } from '../components/ui';
import { couleurs } from '../theme';
import Bienvenue from '../screens/auth/Bienvenue';
import Telephone from '../screens/auth/Telephone';
import CodeOtp from '../screens/auth/CodeOtp';
import Presentation from '../screens/auth/Presentation';
import AccueilClient from '../screens/client/AccueilClient';
import Reservation from '../screens/client/Reservation';
import CourseClient from '../screens/client/CourseClient';
import Historique from '../screens/commun/Historique';
import DetailCourse from '../screens/commun/DetailCourse';
import Portefeuille from '../screens/client/Portefeuille';
import Profil from '../screens/commun/Profil';
import Contacts from '../screens/commun/Contacts';
import Lieux from '../screens/commun/Lieux';
import Notifications from '../screens/commun/Notifications';
import Reclamations from '../screens/commun/Reclamations';
import Messagerie from '../screens/commun/Messagerie';
import AccueilChauffeur from '../screens/chauffeur/AccueilChauffeur';
import CourseChauffeur from '../screens/chauffeur/CourseChauffeur';
import GainsChauffeur from '../screens/chauffeur/GainsChauffeur';
import Documents from '../screens/chauffeur/Documents';
import CartesHorsLigne from '../screens/commun/CartesHorsLigne';
import FlotteProprietaire from '../screens/chauffeur/FlotteProprietaire';

export type Routes = {
  Bienvenue: undefined;
  Presentation: { langue: 'fr' | 'en' };
  Telephone: { langue: 'fr' | 'en' };
  CodeOtp: { telephone: string; nouveauCompte: boolean; codeDev?: string };
  Onglets: undefined;
  Reservation: { arrivee?: import('../types').Point; service?: import('../types').TypeService } | undefined;
  CourseClient: { courseId: number };
  DetailCourse: { courseId: number };
  Contacts: undefined;
  Lieux: undefined;
  Notifications: undefined;
  Reclamations: { courseId?: number; nouvelle?: boolean } | undefined;
  Messagerie: { courseId: number; interlocuteur: string };
  CourseChauffeur: { courseId: number };
  Documents: undefined;
  CartesHorsLigne: undefined;
};

export const navigationRef = createNavigationContainerRef<Routes>();
const Stack = createStackNavigator<Routes>();
const Onglets = createBottomTabNavigator();

const icone = (nom: keyof typeof Ionicons.glyphMap) => ({ color, size }: { color: string; size: number }) =>
  <Ionicons name={nom} color={color} size={size} />;
const optionsOnglets = { headerShown: false, tabBarActiveTintColor: couleurs.primaire, tabBarLabelStyle: { fontSize: 12, fontWeight: '600' as const } };

function OngletsClient() {
  const { t } = useTranslation();
  return (
    <Onglets.Navigator screenOptions={optionsOnglets}>
      <Onglets.Screen name="Accueil" component={AccueilClient} options={{ title: t('onglets.accueil'), tabBarIcon: icone('car') }} />
      <Onglets.Screen name="Historique" component={Historique} options={{ title: t('onglets.courses'), tabBarIcon: icone('time') }} />
      <Onglets.Screen name="Portefeuille" component={Portefeuille} options={{ title: t('onglets.portefeuille'), tabBarIcon: icone('wallet') }} />
      <Onglets.Screen name="Profil" component={Profil} options={{ title: t('onglets.profil'), tabBarIcon: icone('person') }} />
    </Onglets.Navigator>
  );
}

function OngletsChauffeur() {
  const { t } = useTranslation();
  const { utilisateur } = useAuth();
  const conducteur = utilisateur?.role === 'CHAUFFEUR';
  return (
    <Onglets.Navigator screenOptions={optionsOnglets}>
      {conducteur && <Onglets.Screen name="Accueil" component={AccueilChauffeur} options={{ title: t('onglets.conduire'), tabBarIcon: icone('speedometer') }} />}
      {conducteur && <Onglets.Screen name="Historique" component={Historique} options={{ title: t('onglets.courses'), tabBarIcon: icone('time') }} />}
      <Onglets.Screen name="Gains" component={GainsChauffeur} options={{ title: t('onglets.gains'), tabBarIcon: icone('cash') }} />
      {utilisateur?.estProprietaire && <Onglets.Screen name="Flotte" component={FlotteProprietaire} options={{ title: t('onglets.flotte'), tabBarIcon: icone('car-sport') }} />}
      <Onglets.Screen name="Profil" component={Profil} options={{ title: t('onglets.profil'), tabBarIcon: icone('person') }} />
    </Onglets.Navigator>
  );
}

export default function RootNavigator() {
  const { utilisateur, chargement } = useAuth();
  usePushToken(!!utilisateur);
  if (chargement) return <Chargement />;
  const espaceChauffeur = utilisateur && (utilisateur.role === 'CHAUFFEUR' || utilisateur.role === 'PROPRIETAIRE');
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!utilisateur ? (
        <>
          <Stack.Screen name="Bienvenue" component={Bienvenue} />
          <Stack.Screen name="Presentation" component={Presentation} />
          <Stack.Screen name="Telephone" component={Telephone} />
          <Stack.Screen name="CodeOtp" component={CodeOtp} />
        </>
      ) : (
        <>
          <Stack.Screen name="Onglets" component={espaceChauffeur ? OngletsChauffeur : OngletsClient} />
          <Stack.Screen name="Reservation" component={Reservation} />
          <Stack.Screen name="CourseClient" component={CourseClient} options={{ gestureEnabled: false }} />
          <Stack.Screen name="CourseChauffeur" component={CourseChauffeur} options={{ gestureEnabled: false }} />
          <Stack.Screen name="DetailCourse" component={DetailCourse} />
          <Stack.Screen name="Contacts" component={Contacts} />
          <Stack.Screen name="Lieux" component={Lieux} />
          <Stack.Screen name="Notifications" component={Notifications} />
          <Stack.Screen name="Reclamations" component={Reclamations} />
          <Stack.Screen name="Messagerie" component={Messagerie} />
          <Stack.Screen name="Documents" component={Documents} />
          <Stack.Screen name="CartesHorsLigne" component={CartesHorsLigne} />
        </>
      )}
    </Stack.Navigator>
  );
}
