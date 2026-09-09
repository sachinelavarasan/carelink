import type { ReactNode } from 'react';
import { Image, KeyboardAvoidingView, Platform, Text, View } from 'react-native';

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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ gap: 14 }}
      >
        <View style={{ alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <Image
            source={logo}
            resizeMode="contain"
            style={{ width: 150, height: 80 }}
            accessibilityLabel="CareLink"
          />
          <Text
            style={{
              textAlign: 'center',
              fontSize: 19,
              fontWeight: '700',
              letterSpacing: -0.3,
              color: color.foreground,
            }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ textAlign: 'center', fontSize: 14, color: color['muted-foreground'] }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {children}
      </KeyboardAvoidingView>
    </Screen>
  );
}
