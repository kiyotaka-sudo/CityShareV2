/**
 * Configuration Expo. Les variables EXPO_PUBLIC_* du fichier .env sont chargées automatiquement par Expo.
 * EXPO_PUBLIC_API_URL : URL de l'API (ex. http://192.168.1.20:8080/api)
 */
export default ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? config.extra?.apiUrl,
    wsUrl: process.env.EXPO_PUBLIC_WS_URL ?? config.extra?.wsUrl
  }
});
