import { updateAccountSchema, type UpdateAccountInput } from '@carelink/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Stack, useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { FormErrorBanner } from '@/components/FormErrorBanner';
import { Screen } from '@/components/Screen';
import { showToast } from '@/components/ToastMessage';
import { useUpdateAccount } from '@/hooks/useProfile';
import { errMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';

export default function EditAccount() {
  const router = useRouter();
  const { me } = useAuth();
  const update = useUpdateAccount();
  const [serverError, setServerError] = useState<string | null>(null);

  const { control, handleSubmit, formState } = useForm<UpdateAccountInput>({
    resolver: zodResolver(updateAccountSchema),
    values: { fullName: me?.user.fullName ?? '', phone: me?.user.phone ?? '' },
  });

  const onSubmit = async (v: UpdateAccountInput) => {
    setServerError(null);
    try {
      await update.mutateAsync({ fullName: v.fullName.trim(), phone: v.phone?.trim() || undefined });
      showToast({ type: 'success', text1: 'Account updated' });
      router.back();
    } catch (err) {
      setServerError(errMessage(err, 'Could not save'));
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Account', headerBackTitle: 'Back' }} />
      <Screen contentStyle={{ gap: 14 }}>
        <FormErrorBanner message={serverError} />
        <Controller
          control={control}
          name="fullName"
          render={({ field }) => (
            <Field
              label="Full name"
              autoCapitalize="words"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={formState.errors.fullName?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <Field
              label="Phone"
              keyboardType="phone-pad"
              value={field.value ?? ''}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={formState.errors.phone?.message}
            />
          )}
        />
        <Button label="Save" busy={update.isPending} onPress={handleSubmit(onSubmit)} />
      </Screen>
    </>
  );
}
