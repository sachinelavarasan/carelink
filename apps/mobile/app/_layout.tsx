import { useEffect, useMemo } from 'react';
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
import * as SplashScreen from 'expo-splash-screen';

import { NetworkInfoModal } from '@/components/NetworkInfoModal';
import { ToastMessage } from '@/components/ToastMessage';
import { ConfirmProvider } from '@/hooks/useConfirm';
import { AuthProvider, useAuth } from '@/lib/auth';
import { persistOptions, queryClient } from '@/lib/queryClient';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
            <AuthProvider>
              <BottomSheetModalProvider>
                <ConfirmProvider>
                  <AppShell />
                </ConfirmProvider>
              </BottomSheetModalProvider>
            </AuthProvider>
          </PersistQueryClientProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

function AppShell() {
  const { status } = useAuth();
  const { color, theme } = useTheme();

  useEffect(() => {
    if (status !== 'loading') void SplashScreen.hideAsync();
  }, [status]);

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
