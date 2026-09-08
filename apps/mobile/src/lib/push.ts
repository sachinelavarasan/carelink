import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Asks for permission and returns the Expo push token, or null if this isn't a
 * physical device / permission was denied / no EAS project is configured.
 * Never throws.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  const bail = (why: string): null => {
    if (__DEV__) console.log(`[push] not registering: ${why}`);
    return null;
  };

  try {
    // Simulators / emulators can't receive push; Expo Go (SDK 53+) can't either.
    if (!Device.isDevice) return bail('not a physical device');

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted' && existing.canAskAgain) {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return bail(`permission ${status}`);

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return bail('no EAS projectId in config');

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (__DEV__) console.log(`[push] token: ${data}`);
    return data;
  } catch (err) {
    return bail(err instanceof Error ? err.message : 'unknown error');
  }
}

export const pushPlatform = (): 'ios' | 'android' | 'web' =>
  Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
