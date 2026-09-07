import { type FormEvent, useId, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { Notice } from '../components/Notice';
import { Button } from '../components/ui/button';
import { Field, FieldGroup, FieldLabel } from '../components/ui/field';
import { PasswordInput } from '../components/ui/password-input';
import { api, errMessage } from '../lib/api';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const pwId = useId();
  const [password, setPassword] = useState('');
  const [state, setState] = useState<'idle' | 'done' | 'error'>('idle');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/auth/reset', { token, password });
      setState('done');
    } catch (err) {
      setState('error');
      setMessage(errMessage(err, 'Reset failed'));
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Reset password">
        <Notice kind="error">This reset link is missing its token.</Notice>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password">
      {state === 'done' ? (
        <>
          <Notice kind="success">Password updated. Sign in with your new password.</Notice>
          <Link className="text-sm text-primary underline underline-offset-4" to="/login">
            Go to sign in
          </Link>
        </>
      ) : (
        <form onSubmit={onSubmit}>
          {state === 'error' && <Notice kind="error">{message}</Notice>}
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={pwId}>New password (min 8 characters)</FieldLabel>
              <PasswordInput
                id={pwId}
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? 'Saving…' : 'Update password'}
            </Button>
          </FieldGroup>
        </form>
      )}
    </AuthLayout>
  );
}
