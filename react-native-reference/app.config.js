const appConfig = require('./app.json');

const apiBaseUrl =
  appConfig.expo.extra?.EXPO_PUBLIC_API_BASE_URL ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'http://192.168.1.65:8000/api';

const mobilePaymentsEnabled =
  process.env.EXPO_PUBLIC_MOBILE_PAYMENTS_ENABLED ||
  appConfig.expo.extra?.EXPO_PUBLIC_MOBILE_PAYMENTS_ENABLED ||
  'false';

const googleMapsAndroidApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;

module.exports = {
  ...appConfig,
  expo: {
    ...appConfig.expo,
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
