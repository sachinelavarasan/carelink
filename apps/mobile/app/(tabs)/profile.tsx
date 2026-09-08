import { Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { useConfirm } from '@/hooks/useConfirm';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/theme/ThemeProvider';

export default function Profile() {
  const { me, logout } = useAuth();
  const { color } = useTheme();
  const confirm = useConfirm();

  if (!me) return null;

  const profileComplete =
    me.user.role === 'DOCTOR' ? Boolean(me.doctorProfile) : Boolean(me.patientProfile);

  const signOut = async () => {
    if ((await confirm({ title: 'Sign out?', confirmLabel: 'Sign out', destructive: true })) !== false) {
      await logout();
    }
  };

  return (
    <Screen contentStyle={{ gap: 16 }}>
      <Card>
        <Text style={{ fontSize: 18, fontWeight: '700', color: color.foreground }}>
          {me.user.fullName}
        </Text>
        <Text style={{ fontSize: 13, color: color['muted-foreground'] }}>{me.user.email}</Text>
        <View
          style={{
            alignSelf: 'flex-start',
            marginTop: 4,
            borderRadius: 999,
            backgroundColor: color.muted,
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: color['muted-foreground'] }}>
            {me.user.role}
          </Text>
        </View>
      </Card>

      {!profileComplete ? (
        <Notice tone="warning">
          Your {me.user.role === 'DOCTOR' ? 'doctor' : 'patient'} profile is incomplete. Editing lands
          in Phase 15 — finish it on the web app meanwhile.
        </Notice>
      ) : null}

      <Button label="Sign out" variant="outline" onPress={signOut} />
    </Screen>
  );
}
