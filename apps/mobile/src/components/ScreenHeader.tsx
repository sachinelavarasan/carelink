import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

/**
 * Compact stack header — a single tight row (back chevron + title), matching the
 * design board. Replaces the native navigation header, which double-counts the
 * top inset under the root `SafeAreaView` and reads much taller than intended.
 * Render it as the first child of a screen, before `<Screen>`.
 */
export function ScreenHeader({ title, right }: { title: string; right?: ReactNode }) {
  const { color } = useTheme();
  const router = useRouter();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.xs,
        paddingHorizontal: space.md,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: color.border,
        backgroundColor: color.background,
      }}
    >
      {router.canGoBack() ? (
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={{
            width: 32,
            height: 32,
            marginLeft: -6,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="chevron-back" size={24} color={color.foreground} />
        </Pressable>
      ) : null}
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          fontSize: 17,
          fontWeight: '700',
          letterSpacing: -0.3,
          color: color.foreground,
        }}
      >
        {title}
      </Text>
      {right}
    </View>
  );
}
