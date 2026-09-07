import { type FormEvent, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { Notice } from '../components/Notice';
import { Button } from '../components/ui/button';
import { Field, FieldGroup, FieldLabel } from '../components/ui/field';
import { Input } from '../components/ui/input';
import { api } from '../lib/api';

export default function ForgotPassword() {
  const emailId = useId();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    await api.post('/auth/forgot', { email }).catch(() => undefined);
    setBusy(false);
    setSent(true);
  }

  return (
    <AuthLayout title="Reset your password">
      {sent ? (
        <>
          <Notice kind="success">
            If an account exists for {email}, a reset link is on its way.
          </Notice>
          <Link className="text-sm text-primary underline underline-offset-4" to="/login">
            Back to sign in
          </Link>
        </>
      ) : (
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={emailId}>Email</FieldLabel>
              <Input
                id={emailId}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? 'Sending…' : 'Send reset link'}
            </Button>
          </FieldGroup>
        </form>
      )}
    </AuthLayout>
  );
}
