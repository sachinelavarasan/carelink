import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';

import BottomTabBar from '@/components/BottomTabBar';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/theme/ThemeProvider';
import { ThemeToggle } from '@/theme/ThemeToggle';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export default function TabsLayout() {
  const { status, me } = useAuth();
  const { color } = useTheme();

  if (status === 'loading') return null;
  if (status !== 'authenticated') return <Redirect href="/(auth)/login" />;

  const isDoctor = me?.user.role === 'DOCTOR';

  const tabIcon =
    (base: IoniconName) =>
    ({ focused }: { focused: boolean }) => (
      <Ionicons
        name={focused ? base : (`${base}-outline` as IoniconName)}
        size={24}
        color={focused ? color['primary-foreground'] : color['muted-foreground']}
      />
    );

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottomWidth: 1,
          borderBottomColor: color.border,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '600', color: color.foreground }}>CareLink</Text>
        <ThemeToggle />
      </View>

      <Tabs
        screenOptions={{ headerShown: false, tabBarShowLabel: false }}
        tabBar={(props) => <BottomTabBar {...props} />}
      >
        <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon('home') }} />
        <Tabs.Screen
          name="appointments"
          options={{ title: 'Appointments', tabBarIcon: tabIcon('calendar') }}
        />
        {/* Patient-only */}
        <Tabs.Screen
          name="doctors"
          options={{
            title: 'Doctors',
            href: isDoctor ? null : '/(tabs)/doctors',
            tabBarIcon: tabIcon('medkit'),
          }}
        />
        <Tabs.Screen
          name="vitals"
          options={{
            title: 'Vitals',
            href: isDoctor ? null : '/(tabs)/vitals',
            tabBarIcon: tabIcon('pulse'),
          }}
        />
        {/* Doctor-only */}
        <Tabs.Screen
          name="patients"
          options={{
            title: 'Patients',
            href: isDoctor ? '/(tabs)/patients' : null,
            tabBarIcon: tabIcon('people'),
          }}
        />
        <Tabs.Screen
          name="availability"
          options={{
            title: 'Availability',
            href: isDoctor ? '/(tabs)/availability' : null,
            tabBarIcon: tabIcon('time'),
          }}
        />
        <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: tabIcon('person') }} />
      </Tabs>
    </View>
  );
}
