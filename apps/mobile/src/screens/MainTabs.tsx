import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { cn } from '../lib/cn';
import { useAuth } from '../lib/auth';
import { ThemeToggle } from '../theme/ThemeToggle';
import { AppointmentsScreen } from './AppointmentsScreen';
import { BookScreen } from './BookScreen';
import { HomeScreen } from './HomeScreen';

type Tab = 'home' | 'appointments' | 'book';

const label = (t: Tab) => (t === 'home' ? 'Home' : t === 'appointments' ? 'Appointments' : 'Book');

export function MainTabs() {
  const { me } = useAuth();
  const isPatient = me?.user.role === 'PATIENT';
  const [tab, setTab] = useState<Tab>('home');
  const tabs: Tab[] = isPatient ? ['home', 'appointments', 'book'] : ['home', 'appointments'];

  return (
    <View className="flex-1">
      <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
        <Text className="text-base font-semibold text-foreground">CareLink</Text>
        <ThemeToggle />
      </View>

      <View className="flex-1">
        {tab === 'home' && <HomeScreen />}
        {tab === 'appointments' && <AppointmentsScreen />}
        {tab === 'book' && <BookScreen onBooked={() => setTab('appointments')} />}
      </View>

      <View className="flex-row border-t border-border py-2">
        {tabs.map((t) => (
          <Pressable key={t} className="flex-1 items-center py-1.5" onPress={() => setTab(t)}>
            <Text
              className={cn(
                'text-sm',
                tab === t ? 'font-semibold text-primary' : 'text-muted-foreground',
              )}
            >
              {label(t)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
