import { Pressable, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';

export function HomeScreen() {
  const { me, logout } = useAuth();
  if (!me) return null;

  const profileComplete =
    me.user.role === 'DOCTOR' ? Boolean(me.doctorProfile) : Boolean(me.patientProfile);

  return (
    <View className="flex-1 justify-center gap-2 px-6">
      <Text className="mb-2 text-center text-2xl font-bold text-foreground">
        Hi, {me.user.fullName.split(' ')[0]}
      </Text>
      <Text className="text-center text-muted-foreground">
        {me.user.role.toLowerCase()} · {me.user.email}
      </Text>

      {!profileComplete && (
        <Text className="my-2 rounded-md border border-warning-border bg-warning-bg px-3 py-2 text-center text-sm text-warning-fg">
          Finish your profile on the web app.
        </Text>
      )}

      <Pressable
        className="mt-5 items-center rounded-md border border-border p-3"
        onPress={() => void logout()}
      >
        <Text className="text-foreground">Sign out</Text>
      </Pressable>
    </View>
  );
}
