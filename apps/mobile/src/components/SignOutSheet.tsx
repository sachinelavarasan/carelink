import { useState } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button } from '@/components/Button';
import { ModalCard } from '@/components/ModalCard';
import { showToast } from '@/components/ToastMessage';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/**
 * Sign-out confirmation, ported from the Expensify app's LogOutModal: an
 * icon-badged bottom sheet with Cancel / Sign out and a busy state while the
 * session tears down. The route guards bounce to /(auth)/login once auth flips
 * to `anonymous`, so there's nothing to navigate here.
 */
export function SignOutSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { color } = useTheme();
  const { logout } = useAuth();
  const [busy, setBusy] = useState(false);

  async function proceed() {
    setBusy(true);
    try {
      await logout();
    } catch {
      showToast({ type: 'error', text1: 'Could not sign out. Try again.' });
      setBusy(false);
    }
  }

  return (
    <ModalCard
      visible={visible}
      onClose={busy ? undefined : onClose}
      presentation="sheet"
      closeDisabled={busy}
    >
      <View style={{ alignItems: 'center', gap: 6, paddingTop: space.xs }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: color['danger-bg'],
            marginBottom: space.sm,
          }}
        >
          <Ionicons name="log-out-outline" size={28} color={color['danger-fg']} />
        </View>

        <Text style={{ fontSize: 18, fontWeight: '700', color: color.foreground }}>Sign out?</Text>
        <Text
          style={{
            fontSize: 14,
            lineHeight: 20,
            textAlign: 'center',
            color: color['muted-foreground'],
          }}
        >
          You&apos;ll need to sign in again to access your account.
        </Text>

        <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.xl, width: '100%' }}>
          <Button
            label="Cancel"
            variant="outline"
            onPress={onClose}
            disabled={busy}
            style={{ flex: 1 }}
          />
          <Button
            label="Sign out"
            variant="destructive"
            busy={busy}
            onPress={proceed}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </ModalCard>
  );
}
