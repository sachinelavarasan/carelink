import { useEffect, useMemo, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider as NavThemeProvider,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';

import { NetworkInfoModal } from '@/components/NetworkInfoModal';
import { ToastMessage } from '@/components/ToastMessage';
import { NotificationProvider, useNotification } from '@/contexts/NotificationContext';
import { ConfirmProvider } from '@/hooks/useConfirm';
import { useDisablePushToken, useRegisterPushToken } from '@/hooks/usePushToken';
import { AuthProvider, useAuth } from '@/lib/auth';
import { INTER_FONTS, MONO_FONTS, applyInterFont } from '@/lib/fonts';
import { pushPlatform } from '@/lib/push';
import { persistOptions, queryClient } from '@/lib/queryClient';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* Directly under GestureHandlerRootView + SafeAreaProvider, and above the
            navigator, so @gorhom/bottom-sheet's portal isn't trapped behind a
            react-native-screens native stack screen on the New Architecture. */}
        <BottomSheetModalProvider>
          <ThemeProvider>
            <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
              <AuthProvider>
                <NotificationProvider>
                  <ConfirmProvider>
                    <PushSync />
                    <AppShell />
                  </ConfirmProvider>
                </NotificationProvider>
              </AuthProvider>
            </PersistQueryClientProvider>
          </ThemeProvider>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

/** Keeps the API's copy of this device's push token in sync with the session. */
function PushSync() {
  const { status } = useAuth();
  const { expoPushToken } = useNotification();
  const register = useRegisterPushToken();
  const disable = useDisablePushToken();
  const registered = useRef<string | null>(null);

  useEffect(() => {
    if (!expoPushToken) return;
    if (status === 'authenticated' && registered.current !== expoPushToken) {
      registered.current = expoPushToken;
      register.mutate({ token: expoPushToken, platform: pushPlatform() });
    }
    if (status === 'anonymous' && registered.current) {
      disable.mutate(registered.current);
      registered.current = null;
    }
  }, [status, expoPushToken]);

  return null;
}

function AppShell() {
  const { status } = useAuth();
  const { color, theme } = useTheme();
  const [fontsLoaded] = useFonts({ ...INTER_FONTS, ...MONO_FONTS });

  // Patch Text/TextInput to use Inter as soon as the faces are ready — before
  // the real UI renders (the splash is still up until `ready`).
  if (fontsLoaded) applyInterFont();

  const ready = status !== 'loading' && fontsLoaded;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  // Bind the navigation theme to our token map so every navigator's scene /
  // card / border colour tracks the theme toggle. Without this, expo-router's
  // default ThemeProvider keeps the tab scene on its static light background.
  const navTheme = useMemo(() => {
    const base = theme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: theme === 'dark',
      colors: {
        ...base.colors,
        background: color.background,
        card: color.card,
        border: color.border,
        text: color.foreground,
        primary: color.primary,
        notification: color.destructive,
      },
    };
  }, [theme, color]);

  // Keep the splash up (render nothing) until auth has bootstrapped and the
  // fonts are ready, so the first painted frame is already themed + Inter.
  if (!ready) return null;

  return (
    <NavThemeProvider value={navTheme}>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: color.background }}
        edges={['top', 'bottom']}
      >
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: color.background },
          }}
        />
        <NetworkInfoModal />
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
      <ToastMessage />
    </NavThemeProvider>
  );
}
