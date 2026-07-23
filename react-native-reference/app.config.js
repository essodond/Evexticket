const appConfig = require('./app.json');

const apiBaseUrl =
  appConfig.expo.extra?.EXPO_PUBLIC_API_BASE_URL ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://api.evex-tg.com/api';

const mobilePaymentsEnabled =
  process.env.EXPO_PUBLIC_MOBILE_PAYMENTS_ENABLED ||
  appConfig.expo.extra?.EXPO_PUBLIC_MOBILE_PAYMENTS_ENABLED ||
  'false';

module.exports = {
  ...appConfig,
  expo: {
    ...appConfig.expo,
    extra: {
      ...appConfig.expo.extra,
      EXPO_PUBLIC_API_BASE_URL: apiBaseUrl,
      EXPO_PUBLIC_MOBILE_PAYMENTS_ENABLED: mobilePaymentsEnabled,
    },
  },
};
