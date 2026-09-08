import { loginSchema, type LoginInput } from '@carelink/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useRouter } from 'expo-router';

import { AuthLink } from '@/components/AuthLink';
import { AuthShell } from '@/components/AuthShell';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { FormErrorBanner } from '@/components/FormErrorBanner';
import { errMessage, isStatus } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const { control, handleSubmit, formState } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginInput) => {
    setServerError(null);
    try {
      await login(values);
      // Route guards in (auth)/_layout redirect to /(tabs) once authenticated.
    } catch (err) {
      setServerError(
        isStatus(err, 403)
          ? 'Verify your email first — check your inbox.'
          : errMessage(err, 'Invalid email or password'),
      );
    }
  };

  return (
    <AuthShell title="Sign in" subtitle="Sign in to your account">
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
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <Field
            label="Password"
            placeholder="Your password"
            password
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={formState.errors.password?.message}
          />
        )}
      />

      <Button
        label="Sign in"
        busy={formState.isSubmitting}
        onPress={handleSubmit(onSubmit)}
      />

      <AuthLink linkText="Forgot password?" onPress={() => router.push('/(auth)/forgot-password')} />
      <AuthLink
        description="No account?"
        linkText="Register"
        onPress={() => router.push('/(auth)/register')}
      />
    </AuthShell>
  );
}
