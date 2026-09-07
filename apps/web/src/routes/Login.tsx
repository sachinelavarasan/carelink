import { type FormEvent, useId, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { Notice } from '../components/Notice';
import { Button } from '../components/ui/button';
import { Field, FieldGroup, FieldLabel } from '../components/ui/field';
import { Input } from '../components/ui/input';
import { errMessage, isStatus } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const emailId = useId();
  const pwId = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login({ email, password });
      navigate('/', { replace: true });
    } catch (err) {
      setError(
        isStatus(err, 403)
          ? 'Please verify your email first — check your inbox.'
          : errMessage(err, 'Login failed'),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Sign in to CareLink">
      {error && <Notice kind="error">{error}</Notice>}
      <form onSubmit={onSubmit}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={emailId}>Email</FieldLabel>
            <Input
              id={emailId}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={pwId}>Password</FieldLabel>
            <Input
              id={pwId}
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </FieldGroup>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <Link className="text-primary underline underline-offset-4" to="/forgot">
          Forgot password?
        </Link>
        <Link className="text-primary underline underline-offset-4" to="/register">
          Create account
        </Link>
      </div>
    </AuthLayout>
  );
}
