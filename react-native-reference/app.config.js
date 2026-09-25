const appConfig = require('./app.json');

const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  appConfig.expo.extra?.EXPO_PUBLIC_API_BASE_URL ||
  'https://api.evex-tg.com/api';

const mobilePaymentsEnabled =
  process.env.EXPO_PUBLIC_MOBILE_PAYMENTS_ENABLED ||
  appConfig.expo.extra?.EXPO_PUBLIC_MOBILE_PAYMENTS_ENABLED ||
  'false';

const googleMapsAndroidApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;

module.exports = {
  ...appConfig,
  expo: {
    ...appConfig.expo,
    plugins: [...(appConfig.expo.plugins || []), 'expo-secure-store'],
    extra: {
      ...appConfig.expo.extra,
      EXPO_PUBLIC_API_BASE_URL: apiBaseUrl,
      EXPO_PUBLIC_MOBILE_PAYMENTS_ENABLED: mobilePaymentsEnabled,
    },
    android: {
      ...appConfig.expo.android,
      ...(googleMapsAndroidApiKey
        ? {
            config: {
              ...appConfig.expo.android?.config,
              googleMaps: {
                apiKey: googleMapsAndroidApiKey,
              },
            },
          }
        : {}),
    },
  },
};
