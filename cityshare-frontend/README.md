# CityShare Frontend

Application mobile React Native Expo pour le covoiturage et la livraison collaborative de colis au Cameroun.

## Installation

```bash
npx create-expo-app cityshare-frontend --template blank-typescript
cd cityshare-frontend
npx expo install @expo/vector-icons @react-native-async-storage/async-storage @react-native-masked-view/masked-view @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs axios react-hook-form react-native-maps react-native-qrcode-svg expo-barcode-scanner expo-notifications expo-localization expo-location react-native-screens react-native-safe-area-context react-native-gesture-handler react-native-svg react-native-reanimated react-native-worklets i18next react-i18next @stomp/stompjs sockjs-client
npx expo start
```

## Lancement du projet généré

```bash
cd cityshare-frontend
npm install
npx expo start
```

## API

L'URL locale Android est configurée dans `src/utils/constants.ts` :

```ts
export const API_BASE_URL = 'http://10.0.2.2:8080/api';
```

Pour la production, remplacez cette valeur par l'URL Render ou VPS du backend.

## i18n

Français par défaut, anglais disponible. La langue est détectée au premier lancement, puis persistée dans `AsyncStorage` avec la clé `cityshare_lang`. Le profil contient un sélecteur FR/EN.

## Contrat backend bilingue

Les erreurs API doivent suivre ce format :

```json
{
  "message_fr": "Trajet introuvable",
  "message_en": "Trip not found",
  "status": 404
}
```

Le backend doit lire `Accept-Language` sur chaque requête et stocker `Utilisateur.preferredLang` pour les notifications FCM.
