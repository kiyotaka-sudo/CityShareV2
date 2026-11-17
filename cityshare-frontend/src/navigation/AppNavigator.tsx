import React from 'react';
import { createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import AuthNavigator from './AuthNavigator';
import PassagerNavigator from './PassagerNavigator';
import ConducteurNavigator from './ConducteurNavigator';
import ExpediteurNavigator from './ExpediteurNavigator';
import SearchTripScreen from '../screens/passager/SearchTripScreen';
import TripDetailScreen from '../screens/passager/TripDetailScreen';
import ReservationConfirmScreen from '../screens/passager/ReservationConfirmScreen';
import PaymentScreen from '../screens/passager/PaymentScreen';
import LiveTrackingScreen from '../screens/passager/LiveTrackingScreen';
import RatingScreen from '../screens/passager/RatingScreen';
import SOSScreen from '../screens/shared/SOSScreen';
import SettingsScreen from '../screens/shared/SettingsScreen';
import CreateTripScreen from '../screens/conducteur/CreateTripScreen';
import ValidateTripScreen from '../screens/conducteur/ValidateTripScreen';
import ScanBoardingScreen from '../screens/passager/ScanBoardingScreen';
import ShowBoardingQrScreen from '../screens/conducteur/ShowBoardingQrScreen';
import ParcelTrackingScreen from '../screens/expediteur/ParcelTrackingScreen';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();
const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Auth" component={AuthNavigator} />
      <Stack.Screen name="Passager" component={PassagerNavigator} />
      <Stack.Screen name="Conducteur" component={ConducteurNavigator} />
      <Stack.Screen name="Expediteur" component={ExpediteurNavigator} />
      <Stack.Screen name="SearchTrip" component={SearchTripScreen} />
      <Stack.Screen name="TripDetail" component={TripDetailScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="ReservationConfirm" component={ReservationConfirmScreen} />
      <Stack.Screen name="LiveTracking" component={LiveTrackingScreen} />
      <Stack.Screen name="SOS" component={SOSScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Rating" component={RatingScreen} />
      <Stack.Screen name="CreateTrip" component={CreateTripScreen} />
      <Stack.Screen name="ValidateTrip" component={ValidateTripScreen} />
      <Stack.Screen name="ScanBoarding" component={ScanBoardingScreen} />
      <Stack.Screen name="ShowBoardingQr" component={ShowBoardingQrScreen} />
      <Stack.Screen name="ParcelTracking" component={ParcelTrackingScreen} />
    </Stack.Navigator>
  );
}
