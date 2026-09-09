import type { ReactNode } from 'react';
import { Image, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { useTheme } from '@/theme/ThemeProvider';
import { ThemeToggle } from '@/theme/ThemeToggle';

const logo = require('../../assets/images/logo.png');

/** Centered, branded frame shared by every /(auth) screen. */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { color } = useTheme();
  return (
    <Screen center contentStyle={{ paddingHorizontal: 24 }}>
      <View style={{ position: 'absolute', right: 24, top: 12 }}>
        <ThemeToggle />
      </View>
      <View style={{ gap: 14 }}>
        <View style={{ alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Image
            source={logo}
            resizeMode="contain"
            style={{ width: 168, height: 90 }}
            accessibilityLabel="CareLink"
          />
          <Text style={{ textAlign: 'center', fontSize: 14, color: color['muted-foreground'] }}>
            {subtitle ?? title}
          </Text>
        </View>
        {children}
      </View>
    </Screen>
  );
}
