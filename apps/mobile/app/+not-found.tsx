import { Text, View } from 'react-native';
import { Link, Stack } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';

export default function NotFound() {
  const { color } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingHorizontal: 24,
          backgroundColor: color.background,
        }}
      >
        <Text style={{ color: color.foreground }}>This screen doesn&apos;t exist.</Text>
        <Link href="/">
          <Text style={{ color: color.primary }}>Go to home</Text>
        </Link>
      </View>
    </>
  );
}
