import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME_STORAGE_KEY, type ThemeName, tokens } from '@carelink/theme';
import { colorScheme } from 'nativewind';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

interface ThemeContextValue {
  theme: ThemeName;
  /** Raw hex map for imperative colour props (ActivityIndicator, placeholders…). */
  color: (typeof tokens)['light'];
  setTheme: (t: ThemeName) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('light');

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      const next: ThemeName = stored === 'dark' ? 'dark' : 'light';
      colorScheme.set(next);
      setThemeState(next);
    })();
  }, []);

  const setTheme = useCallback((t: ThemeName) => {
    colorScheme.set(t);
    setThemeState(t);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, t);
  }, []);

  const toggle = useCallback(
    () => setTheme(colorScheme.get() === 'dark' ? 'light' : 'dark'),
    [setTheme],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, color: tokens[theme], setTheme, toggle }),
    [theme, setTheme, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx;
}
