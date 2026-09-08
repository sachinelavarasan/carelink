import { registerSchema, type RegisterInput } from '@carelink/shared';
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
import { useAuth } from '@/lib/auth';

export default function Register() {
  const router = useRouter();
  const { register } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const { control, handleSubmit, formState } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '' },
  });

  const onSubmit = async (values: RegisterInput) => {
    setServerError(null);
    try {
      await register(values);
      setDone(true);
    } catch (err) {
      setServerError(errMessage(err, 'Could not create the account'));
    }
  };

  if (done) {
    return (
      <AuthShell title="Almost there" subtitle="Verify your email">
        <Notice tone="success">
          Account created. Check your email for a verification link, then sign in.
        </Notice>
        <Button label="Back to sign in" onPress={() => router.replace('/(auth)/login')} />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Register" subtitle="Create your account">
      <FormErrorBanner message={serverError} />

      <Controller
        control={control}
        name="fullName"
        render={({ field }) => (
          <Field
            label="Full name"
            placeholder="Jane Doe"
            autoCapitalize="words"
            autoComplete="name"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={formState.errors.fullName?.message}
          />
        )}
      />
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
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <Field
            label="Password"
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

      <Button label="Create account" busy={formState.isSubmitting} onPress={handleSubmit(onSubmit)} />
      <AuthLink description="Have an account?" linkText="Sign in" onPress={() => router.replace('/(auth)/login')} />
    </AuthShell>
  );
}
