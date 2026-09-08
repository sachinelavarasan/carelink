import type { ExpoConfig } from 'expo/config';
import { withGradleProperties } from 'expo/config-plugins';

// Runtime config comes from EXPO_PUBLIC_* env vars (see .env.example),
// which Expo inlines into the bundle at build time. APP_VARIANT ("development"
// | "production", set per EAS build profile in eas.json) switches the app name
// and native id so a dev build installs alongside the store build.
const isDev = process.env.APP_VARIANT === 'development';

// EAS uploads google-services.json from the repo; the env override lets EAS
// swap in a secret file at build time without committing it.
const googleServicesFile = process.env.GOOGLE_SERVICES_JSON || './google-services.json';

const EAS_PROJECT_ID = 'ab92681b-c97b-4792-a100-83a626091896';

// Raises the Gradle daemon heap so large release builds (Hermes + R8) don't
// OOM on EAS workers. Idempotent: overwrites the key if prebuild already set it.
const withIncreasedMetaspace = (config: ExpoConfig): ExpoConfig =>
  withGradleProperties(config as never, (c) => {
    const key = 'org.gradle.jvmargs';
    const value = '-Xmx6144m -XX:MaxMetaspaceSize=2048m';
    const existing = c.modResults.find(
      (item) => item.type === 'property' && item.key === key,
    );
    if (existing && existing.type === 'property') {
      existing.value = value;
    } else {
      c.modResults.push({ type: 'property', key, value });
    }
    return c;
  }) as never as ExpoConfig;

const config: ExpoConfig = {
  name: isDev ? 'CareLink Dev' : 'CareLink',
  slug: 'carelink',
  scheme: 'carelink',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  icon: './assets/images/icon.png',
  ios: {
    supportsTablet: true,
    bundleIdentifier: isDev ? 'com.sachinelavarasan.carelink.dev' : 'com.sachinelavarasan.carelink',
  },
  android: {
    package: isDev ? 'com.sachinelavarasan.carelink.dev' : 'com.sachinelavarasan.carelink',
    googleServicesFile,
    adaptiveIcon: {
      foregroundImage: './assets/images/android-icon-foreground.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
      backgroundColor: '#f8fafc',
    },
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-sharing',
    '@react-native-community/datetimepicker',
    [
      'expo-font',
      {
        fonts: [
          './assets/fonts/Inter-Thin.ttf',
          './assets/fonts/Inter-ExtraLight.ttf',
          './assets/fonts/Inter-Light.ttf',
          './assets/fonts/Inter-Regular.ttf',
          './assets/fonts/Inter-Medium.ttf',
          './assets/fonts/Inter-SemiBold.ttf',
          './assets/fonts/Inter-Bold.ttf',
          './assets/fonts/Inter-ExtraBold.ttf',
          './assets/fonts/Inter-Black.ttf',
        ],
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 180,
        resizeMode: 'contain',
        backgroundColor: '#f8fafc',
        dark: {
          image: './assets/images/splash-icon-dark.png',
          backgroundColor: '#0b171b',
        },
      },
    ],
    [
      'expo-notifications',
      {
        defaultChannel: 'default',
        enableBackgroundRemoteNotifications: false,
      },
    ],
    [
      'expo-build-properties',
      {
        ios: {
          useFrameworks: 'static',
        },
        android: {
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: {
    url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
  },
  extra: {
    eas: {
      projectId: EAS_PROJECT_ID,
    },
  },
};

// `withIncreasedMetaspace` is a config-plugin *function*, which the typed
// `plugins` array doesn't accept — apply it to the whole config instead.
export default withIncreasedMetaspace(config);
