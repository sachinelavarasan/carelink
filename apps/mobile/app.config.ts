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
  ios: {
    supportsTablet: true,
    bundleIdentifier: isDev ? 'com.sachinelavarasan.carelink.dev' : 'com.sachinelavarasan.carelink',
  },
  android: {
    package: isDev ? 'com.sachinelavarasan.carelink.dev' : 'com.sachinelavarasan.carelink',
    googleServicesFile,
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font',
    'expo-sharing',
    '@react-native-community/datetimepicker',
    // Strips the dangling @drawable/splashscreen_logo reference that
    // expo-splash-screen adds even for a colour-only splash. Its mod must
    // run *after* expo-splash-screen's styles mod; because same-type mods
    // execute in reverse registration order, this plugin is listed *before*
    // 'expo-splash-screen'.
    './plugins/withColorOnlySplash',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#f8fafc',
        dark: { backgroundColor: '#0b171b' },
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
