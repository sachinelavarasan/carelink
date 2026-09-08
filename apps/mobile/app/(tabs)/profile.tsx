import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { showToast } from '@/components/ToastMessage';
import { useConfirm } from '@/hooks/useConfirm';
import { api, errMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fmtDate } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';

export default function Profile() {
  const router = useRouter();
  const { me, logout } = useAuth();
  const { color } = useTheme();
  const confirm = useConfirm();

  if (!me) return null;

  const isDoctor = me.user.role === 'DOCTOR';
  const profileComplete = isDoctor ? Boolean(me.doctorProfile) : Boolean(me.patientProfile);
  const verified = Boolean(me.doctorProfile?.verifiedAt);

  const signOut = async () => {
    if ((await confirm({ title: 'Sign out?', confirmLabel: 'Sign out', destructive: true })) !== false) {
      await logout();
    }
  };

  const deleteAccount = async () => {
    const pw = await confirm({
      title: 'Delete your account?',
      message: 'This permanently removes your profile, appointments, prescriptions and messages. It cannot be undone. Enter your password to confirm.',
      withInput: true,
      inputPlaceholder: 'Current password',
      confirmLabel: 'Delete forever',
      destructive: true,
    });
    if (pw === false) return;
    try {
      await api.delete('/me', { data: { password: pw, confirm: 'DELETE' } });
      await logout();
    } catch (err) {
      showToast({ type: 'error', text1: errMessage(err, 'Could not delete the account') });
    }
  };

  return (
    <Screen contentStyle={{ gap: 16 }}>
      <Card>
        <Text style={{ fontSize: 18, fontWeight: '700', color: color.foreground }}>
          {me.user.fullName}
        </Text>
        <Text style={{ fontSize: 13, color: color['muted-foreground'] }}>{me.user.email}</Text>
        {me.user.phone ? (
          <Text style={{ fontSize: 13, color: color['muted-foreground'] }}>{me.user.phone}</Text>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
          <View style={{ borderRadius: 999, backgroundColor: color.muted, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: color['muted-foreground'] }}>
              {me.user.role}
            </Text>
          </View>
          {isDoctor ? (
            <View
              style={{
                borderRadius: 999,
                paddingHorizontal: 8,
                paddingVertical: 2,
                backgroundColor: verified ? color['success-bg'] : color['warning-bg'],
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: verified ? color['success-fg'] : color['warning-fg'],
                }}
              >
                {verified ? 'Verified' : 'Verification pending'}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={{ fontSize: 12, color: color['muted-foreground'], marginTop: 4 }}>
          Joined {fmtDate(me.user.createdAt)}
        </Text>
      </Card>

      {!profileComplete ? (
        <Notice tone="warning">
          Your {isDoctor ? 'doctor' : 'patient'} profile is incomplete.
        </Notice>
      ) : null}

      <View style={{ gap: 8 }}>
        <Button label="Edit account" variant="outline" onPress={() => router.push('/account')} />
        <Button
          label={isDoctor ? 'Edit doctor profile' : 'Edit patient profile'}
          variant="outline"
          onPress={() => router.push(isDoctor ? '/doctor-profile' : '/patient-profile')}
        />
        {isDoctor ? (
          <Button
            label="Prescription templates"
            variant="outline"
            onPress={() => router.push('/templates')}
          />
        ) : (
          <Button
            label="Medical history"
            variant="outline"
            onPress={() => router.push('/medical-history')}
          />
        )}
      </View>

      <Button label="Sign out" variant="outline" onPress={signOut} />

      {!isDoctor ? (
        <Button label="Delete account" variant="destructive" onPress={deleteAccount} />
      ) : null}
    </Screen>
  );
}
