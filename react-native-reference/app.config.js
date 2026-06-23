const appConfig = require('./app.json');

const apiBaseUrl =
  appConfig.expo.extra?.EXPO_PUBLIC_API_BASE_URL ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://api.evex-tg.com/api';

module.exports = {
  ...appConfig,
  expo: {
    ...appConfig.expo,
    extra: {
      ...appConfig.expo.extra,
      EXPO_PUBLIC_API_BASE_URL: apiBaseUrl,
    },
  },
};
