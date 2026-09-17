import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

// expo-notifications throws on import when running inside Expo Go on Android
// (SDK 53+ dropped support for it there). Only load the real module when
// we're not in that specific combo, and no-op everything otherwise so the
// rest of the app keeps working in Expo Go.
const isExpoGoAndroid =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient && Platform.OS === 'android';

type NotificationsModule = typeof import('expo-notifications');

let real: NotificationsModule | null = null;
if (!isExpoGoAndroid) {
  real = require('expo-notifications');
}

export const notificationsAvailable = real !== null;

export const AndroidImportance = real?.AndroidImportance ?? { MAX: 5, DEFAULT: 3, MIN: 1, LOW: 2, HIGH: 4, UNKNOWN: -1000 };

export function setNotificationHandler(handler: Parameters<NotificationsModule['setNotificationHandler']>[0]) {
  real?.setNotificationHandler(handler);
}

export async function setNotificationChannelAsync(
  ...args: Parameters<NotificationsModule['setNotificationChannelAsync']>
) {
  if (!real) return null;
  return real.setNotificationChannelAsync(...args);
}

export async function getPermissionsAsync() {
  if (!real) return { status: 'undetermined' } as Awaited<ReturnType<NotificationsModule['getPermissionsAsync']>>;
  return real.getPermissionsAsync();
}

export async function requestPermissionsAsync() {
  if (!real) return { status: 'undetermined' } as Awaited<ReturnType<NotificationsModule['requestPermissionsAsync']>>;
  return real.requestPermissionsAsync();
}

export async function scheduleNotificationAsync(
  request: Parameters<NotificationsModule['scheduleNotificationAsync']>[0]
) {
  if (!real) return null;
  return real.scheduleNotificationAsync(request);
}
