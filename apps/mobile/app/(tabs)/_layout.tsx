import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Redirect, Tabs } from 'expo-router';

import BottomTabBar from '@/components/BottomTabBar';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/theme/ThemeProvider';
import { ThemeToggle } from '@/theme/ThemeToggle';

type FeatherName = ComponentProps<typeof Feather>['name'];
type MaterialCommunityName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Icon renderer for `Tabs.Screen`'s `tabBarIcon` — `color`/`size` come from BottomTabBar. */
type TabIcon = (props: { focused: boolean; color: ColorValue; size: number }) => React.ReactNode;

/**
 * The bar uses a single stroke-icon set (Feather, 2px) in both states — active
 * tabs only change colour and sit on the brand pill, they don't switch to a
 * filled glyph. "Doctors" is the one exception: Feather has no medical bag, so
 * it borrows the matching outline from Material Community.
 */
const feather =
  (name: FeatherName): TabIcon =>
  ({ color, size }) => <Feather name={name} size={size} color={color} />;

const mci =
  (name: MaterialCommunityName): TabIcon =>
  ({ color, size }) => <MaterialCommunityIcons name={name} size={size} color={color} />;

export default function TabsLayout() {
  const { status, me } = useAuth();
  const { color } = useTheme();

  if (status === 'loading') return null;
  if (status !== 'authenticated') return <Redirect href="/(auth)/login" />;

  const isDoctor = me?.user.role === 'DOCTOR';

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
          paddingVertical: 9,
        }}
      >
        <Text style={{ fontSize: 17, fontWeight: '700', letterSpacing: -0.3, color: color.foreground }}>
          Care<Text style={{ color: color.primary }}>Link</Text>
        </Text>
        <ThemeToggle />
      </View>

      <Tabs
        screenOptions={{ headerShown: false, tabBarShowLabel: false }}
        tabBar={(props) => <BottomTabBar {...props} />}
      >
        <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: feather('home') }} />
        <Tabs.Screen
          name="appointments"
          options={{ title: 'Appts', tabBarIcon: feather('calendar') }}
        />
        {/* Patient-only */}
        <Tabs.Screen
          name="doctors"
          options={{
            title: 'Doctors',
            href: isDoctor ? null : '/(tabs)/doctors',
            tabBarIcon: mci('briefcase-plus-outline'),
          }}
        />
        <Tabs.Screen
          name="vitals"
          options={{
            title: 'Vitals',
            href: isDoctor ? null : '/(tabs)/vitals',
            tabBarIcon: feather('activity'),
          }}
        />
        {/* Doctor-only */}
        <Tabs.Screen
          name="patients"
          options={{
            title: 'Patients',
            href: isDoctor ? '/(tabs)/patients' : null,
            tabBarIcon: feather('users'),
          }}
        />
        <Tabs.Screen
          name="availability"
          options={{
            title: 'Availability',
            href: isDoctor ? '/(tabs)/availability' : null,
            tabBarIcon: feather('clock'),
          }}
        />
        <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: feather('user') }} />
      </Tabs>
    </View>
  );
}
