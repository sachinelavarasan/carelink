import type { ExpoConfig } from 'expo/config';

// Runtime config comes from EXPO_PUBLIC_* env vars (see .env.example),
// which Expo inlines into the bundle at build time.
const config: ExpoConfig = {
  name: 'CareLink',
  slug: 'carelink',
  scheme: 'carelink',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.carelink.app',
  },
  android: {
    package: 'com.carelink.app',
  },
};

export default config;
