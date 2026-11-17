import Constants from 'expo-constants';

/** Expo Go (SDK 53+) ne supporte plus les push distantes — éviter les appels qui loguent ERROR. */
export function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}
