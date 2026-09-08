import { forgotPasswordSchema, type ForgotPasswordInput } from '@carelink/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useRouter } from 'expo-router';

import { AuthLink } from '@/components/AuthLink';
import { AuthShell } from '@/components/AuthShell';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { FormErrorBanner } from '@/components/FormErrorBanner';
import { Notice } from '@/components/Notice';
import { errMessage } from '@/lib/api';
import { useForgotPassword } from '@/hooks/useAuthApi';

export default function ForgotPassword() {
  const router = useRouter();
  const forgot = useForgotPassword();
  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const { control, handleSubmit, formState } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordInput) => {
    setServerError(null);
    try {
      await forgot.mutateAsync(values);
      setSent(true);
    } catch (err) {
      setServerError(errMessage(err, 'Could not send the reset email'));
    }
  };

  if (sent) {
    return (
      <AuthShell title="Check your email" subtitle="Reset link sent">
        <Notice tone="success">
          If that email has an account, a password-reset link is on its way. Open it, then set a new
          password.
        </Notice>
        <Button label="Enter reset code" onPress={() => router.push('/(auth)/reset-password')} />
        <AuthLink linkText="Back to sign in" onPress={() => router.replace('/(auth)/login')} />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Forgot password" subtitle="We'll email you a reset link">
      <FormErrorBanner message={serverError} />
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <Field
            label="Email"
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={formState.errors.email?.message}
          />
        )}
      />
      <Button label="Send reset link" busy={formState.isSubmitting} onPress={handleSubmit(onSubmit)} />
      <AuthLink linkText="Back to sign in" onPress={() => router.replace('/(auth)/login')} />
    </AuthShell>
  );
}
