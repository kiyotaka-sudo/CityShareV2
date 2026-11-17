/** Charge .env et expose apiUrl / wsUrl à expo-constants (priorité sur app.json). */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

export default ({ config }) => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? config.extra?.apiUrl;
  const wsUrl = process.env.EXPO_PUBLIC_WS_URL ?? config.extra?.wsUrl;
  return {
    ...config,
    extra: {
      ...config.extra,
      apiUrl,
      wsUrl
    }
  };
};
