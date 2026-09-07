import './global.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/lib/auth';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { AuthScreen } from './src/screens/AuthScreen';
import { MainTabs } from './src/screens/MainTabs';

const queryClient = new QueryClient();

function Root() {
  const { status } = useAuth();
  const { color } = useTheme();

  if (status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={color.primary} />
      </View>
    );
  }
  return status === 'authenticated' ? <MainTabs /> : <AuthScreen />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
              <Root />
              <StatusBar style="auto" />
            </SafeAreaView>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
