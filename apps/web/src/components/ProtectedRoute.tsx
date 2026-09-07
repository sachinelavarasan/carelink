import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Spinner } from './Spinner';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        <span className="inline-flex items-center gap-2 text-sm">
          <Spinner />
          Loading…
        </span>
      </div>
    );
  }
  if (status === 'anonymous') {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
