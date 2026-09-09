import { updateAccountSchema } from '@carelink/shared';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { ModalCard } from '@/components/ModalCard';
import { Notice } from '@/components/Notice';
import { showToast } from '@/components/ToastMessage';
import { useUpdateAccount } from '@/hooks/useProfile';
import { errMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';

/** Name + phone editor, shown as a bottom sheet from the profile card. */
export function EditAccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { me } = useAuth();
  const update = useUpdateAccount();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setFullName(me?.user.fullName ?? '');
    setPhone(me?.user.phone ?? '');
    setErr(null);
  }, [visible, me?.user.fullName, me?.user.phone]);

  async function save() {
    const parsed = updateAccountSchema.safeParse({
      fullName: fullName.trim(),
      phone: phone.trim() || undefined,
    });
    if (!parsed.success) {
      setErr(parsed.error.issues[0]?.message ?? 'Check the details and try again.');
      return;
    }
    try {
      await update.mutateAsync(parsed.data);
      showToast({ type: 'success', text1: 'Account updated' });
      onClose();
    } catch (e) {
      setErr(errMessage(e, 'Could not save'));
    }
  }

  return (
    <ModalCard
      visible={visible}
      onClose={onClose}
      presentation="sheet"
      title="Edit account"
      footer={<Button label="Save" busy={update.isPending} onPress={save} />}
    >
      <View style={{ gap: 12 }}>
        {err ? <Notice tone="danger">{err}</Notice> : null}
        <Field
          label="Full name"
          autoCapitalize="words"
          value={fullName}
          onChangeText={setFullName}
        />
        <Field label="Phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      </View>
    </ModalCard>
  );
}
