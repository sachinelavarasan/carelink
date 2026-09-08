import { resetPasswordSchema, type ResetPasswordInput } from '@carelink/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AuthLink } from '@/components/AuthLink';
import { AuthShell } from '@/components/AuthShell';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { FormErrorBanner } from '@/components/FormErrorBanner';
import { Notice } from '@/components/Notice';
import { errMessage } from '@/lib/api';
import { useResetPassword } from '@/hooks/useAuthApi';

/** Reached from the emailed link (`carelink://reset?token=…`) or by pasting the
 *  code after "Forgot password". */
export default function ResetPassword() {
  const router = useRouter();
  const { token: tokenParam } = useLocalSearchParams<{ token?: string }>();
  const reset = useResetPassword();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const { control, handleSubmit, formState } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: tokenParam ?? '', password: '' },
  });

  const onSubmit = async (values: ResetPasswordInput) => {
    setServerError(null);
    try {
      await reset.mutateAsync(values);
      setDone(true);
    } catch (err) {
      setServerError(errMessage(err, 'That reset link is invalid or has expired'));
    }
  };

  if (done) {
    return (
      <AuthShell title="Password updated" subtitle="You're all set">
        <Notice tone="success">Your password has been changed. Sign in with the new one.</Notice>
        <Button label="Back to sign in" onPress={() => router.replace('/(auth)/login')} />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset password" subtitle="Set a new password">
      <FormErrorBanner message={serverError} />
      {!tokenParam ? (
        <Controller
          control={control}
          name="token"
          render={({ field }) => (
            <Field
              label="Reset code"
              placeholder="Paste the code from your email"
              autoCapitalize="none"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={formState.errors.token?.message}
            />
          )}
        />
      ) : null}
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <Field
            label="New password"
            placeholder="At least 8 characters"
            password
            autoCapitalize="none"
            autoComplete="password-new"
            textContentType="newPassword"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={formState.errors.password?.message}
          />
        )}
      />
      <Button label="Update password" busy={formState.isSubmitting} onPress={handleSubmit(onSubmit)} />
      <AuthLink linkText="Back to sign in" onPress={() => router.replace('/(auth)/login')} />
    </AuthShell>
  );
}
