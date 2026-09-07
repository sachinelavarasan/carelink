import { type FormEvent, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { Notice } from '../components/Notice';
import { Button } from '../components/ui/button';
import { Field, FieldGroup, FieldLabel } from '../components/ui/field';
import { Input } from '../components/ui/input';
import { errMessage } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function Register() {
  const { register } = useAuth();
  const nameId = useId();
  const emailId = useId();
  const pwId = useId();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register(form);
      setDone(true);
    } catch (err) {
      setError(errMessage(err, 'Registration failed'));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <AuthLayout title="Check your email">
        <Notice kind="success">
          If that address is new, we&apos;ve sent a verification link to{' '}
          <strong>{form.email}</strong>. Click it, then sign in.
        </Notice>
        <Link className="text-sm text-primary underline underline-offset-4" to="/login">
          Back to sign in
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create your CareLink account">
      {error && <Notice kind="error">{error}</Notice>}
      <form onSubmit={onSubmit}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={nameId}>Full name</FieldLabel>
            <Input id={nameId} required value={form.fullName} onChange={set('fullName')} />
          </Field>
          <Field>
            <FieldLabel htmlFor={emailId}>Email</FieldLabel>
            <Input
              id={emailId}
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={set('email')}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={pwId}>Password (min 8 characters)</FieldLabel>
            <Input
              id={pwId}
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={form.password}
              onChange={set('password')}
            />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? 'Creating…' : 'Create account'}
          </Button>
        </FieldGroup>
      </form>
      <p className="mt-4 text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link className="text-primary underline underline-offset-4" to="/login">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
