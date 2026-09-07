import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { Notice } from '../components/Notice';
import { Spinner } from '../components/Spinner';
import { api } from '../lib/api';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState<'working' | 'ok' | 'failed'>('working');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!token) {
      setState('failed');
      return;
    }
    api
      .get('/auth/verify', { params: { token } })
      .then(() => setState('ok'))
      .catch(() => setState('failed'));
  }, [token]);

  return (
    <AuthLayout title="Email verification">
      {state === 'working' && (
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Verifying…
        </p>
      )}
      {state === 'ok' && (
        <>
          <Notice kind="success">Your email is verified. You can sign in now.</Notice>
          <Link className="text-sm text-primary underline underline-offset-4" to="/login">
            Go to sign in
          </Link>
        </>
      )}
      {state === 'failed' && (
        <>
          <Notice kind="error">That verification link is invalid or has expired.</Notice>
          <Link className="text-sm text-primary underline underline-offset-4" to="/login">
            Back to sign in
          </Link>
        </>
      )}
    </AuthLayout>
  );
}
