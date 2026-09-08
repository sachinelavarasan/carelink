import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';

import { useAuth } from '@/lib/auth';
import { useTheme } from '@/theme/ThemeProvider';

export default function Index() {
  const { status } = useAuth();
  const { color } = useTheme();

  if (status === 'loading') {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: color.background,
        }}
      >
        <ActivityIndicator color={color.primary} />
      </View>
    );
  }

  return <Redirect href={status === 'authenticated' ? '/(tabs)' : '/(auth)/login'} />;
}
