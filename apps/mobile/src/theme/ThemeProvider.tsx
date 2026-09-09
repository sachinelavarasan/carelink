import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME_STORAGE_KEY, type ThemeName } from '@carelink/theme';
import * as SystemUI from 'expo-system-ui';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { palette } from '@/theme/palette';

interface ThemeContextValue {
  theme: ThemeName;
  /** Raw hex map for every colour prop — backgrounds, text, borders, icons.
   *  CareLink mobile's warm palette (see `@/theme/palette`). */
  color: (typeof palette)['light'];
  setTheme: (t: ThemeName) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('light');

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      setThemeState(stored === 'dark' ? 'dark' : 'light');
    })();
  }, []);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(palette[theme].background);
  }, [theme]);

  const setTheme = useCallback((t: ThemeName) => {
    setThemeState(t);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, t);
  }, []);

  const toggle = useCallback(
    () => setThemeState((prev) => {
      const next: ThemeName = prev === 'dark' ? 'light' : 'dark';
      void AsyncStorage.setItem(THEME_STORAGE_KEY, next);
      return next;
    }),
    [],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, color: palette[theme], setTheme, toggle }),
    [theme, setTheme, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx;
}
