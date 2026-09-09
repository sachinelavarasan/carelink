import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EditAccountSheet } from '@/components/EditAccountSheet';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { SignOutSheet } from '@/components/SignOutSheet';
import { showToast } from '@/components/ToastMessage';
import { useConfirm } from '@/hooks/useConfirm';
import { api, errMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { mono } from '@/lib/fonts';
import { fmtDate } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

export default function Profile() {
  const router = useRouter();
  const { me, logout } = useAuth();
  const { color } = useTheme();
  const confirm = useConfirm();
  const [editOpen, setEditOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);

  if (!me) return null;

  const isDoctor = me.user.role === 'DOCTOR';
  const profileComplete = isDoctor ? Boolean(me.doctorProfile) : Boolean(me.patientProfile);
  const verified = Boolean(me.doctorProfile?.verifiedAt);

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

  const pill = (label: string, bg: string, fg: string) => (
    <View style={{ borderRadius: radius.pill, backgroundColor: bg, paddingHorizontal: 9, paddingVertical: 3 }}>
      <Text style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', color: fg }}>
        {label}
      </Text>
    </View>
  );

  return (
    <Screen contentStyle={{ gap: 16 }}>
      <Card elevated style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={me.user.fullName} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: color.foreground }}>
              {me.user.fullName}
            </Text>
            <Text style={{ fontSize: 13, color: color['muted-foreground'] }}>{me.user.email}</Text>
          </View>
          <Pressable
            onPress={() => setEditOpen(true)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Edit account"
            style={{
              width: 32,
              height: 32,
              borderRadius: radius.sm,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: color.muted,
            }}
          >
            <Ionicons name="pencil" size={15} color={color['muted-foreground']} />
          </Pressable>
        </View>
        {me.user.phone ? (
          <Text style={[mono('400'), { fontSize: 13, color: color['muted-foreground'] }]}>
            {me.user.phone}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
          {pill(me.user.role, color.muted, color['muted-foreground'])}
          {isDoctor
            ? verified
              ? pill('Verified', color['success-bg'], color['success-fg'])
              : pill('Verification pending', color['warning-bg'], color['warning-fg'])
            : null}
        </View>
        <Text style={{ fontSize: 12, color: color['muted-foreground'], marginTop: 2 }}>
          Joined {fmtDate(me.user.createdAt)}
        </Text>
      </Card>

      {!profileComplete ? (
        <Notice tone="warning">
          Your {isDoctor ? 'doctor' : 'patient'} profile is incomplete.
        </Notice>
      ) : null}

      <View style={{ gap: 8 }}>
        <Button
          label={isDoctor ? 'Edit doctor profile' : 'Edit patient profile'}
          variant="secondary"
          onPress={() => router.push(isDoctor ? '/doctor-profile' : '/patient-profile')}
        />
        {isDoctor ? (
          <>
            <Button
              label="Prescription templates"
              variant="secondary"
              onPress={() => router.push('/templates')}
            />
            <Button
              label="Frequent medicines"
              variant="secondary"
              onPress={() => router.push('/medicines')}
            />
          </>
        ) : (
          <Button
            label="Medical history"
            variant="secondary"
            onPress={() => router.push('/medical-history')}
          />
        )}
        <Button label="Sign out" variant="secondary" onPress={() => setSignOutOpen(true)} />
      </View>

      {!isDoctor ? (
        <Button label="Delete account" variant="destructive" onPress={deleteAccount} />
      ) : null}

      <EditAccountSheet visible={editOpen} onClose={() => setEditOpen(false)} />
      <SignOutSheet visible={signOutOpen} onClose={() => setSignOutOpen(false)} />
    </Screen>
  );
}
