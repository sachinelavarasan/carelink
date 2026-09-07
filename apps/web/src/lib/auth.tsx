import { meSchema, type LoginInput, type Me, type RegisterInput } from '@carelink/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from './api';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: Status;
  me: Me | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<{ ok: true }>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [me, setMe] = useState<Me | null>(null);

  const reload = useCallback(async () => {
    try {
      const { data } = await api.get<Me>('/me');
      // A misconfigured VITE_API_URL can make `/me` resolve to the SPA's own
      // index.html (200 + HTML body). Validate against the contract so that
      // surfaces as "anonymous" instead of crashing on `me.user.role`.
      setMe(meSchema.parse(data));
      setStatus('authenticated');
    } catch {
      setMe(null);
      setStatus('anonymous');
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const login = useCallback(
    async (input: LoginInput) => {
      // Server sets httpOnly auth cookies on success.
      await api.post('/auth/login', input);
      await reload();
    },
    [reload],
  );

  const register = useCallback(
    async (input: RegisterInput) => (await api.post<{ ok: true }>('/auth/register', input)).data,
    [],
  );

  const logout = useCallback(async () => {
    await api.post('/auth/logout', {}).catch(() => undefined);
    setMe(null);
    setStatus('anonymous');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, me, login, register, logout, reload }),
    [status, me, login, register, logout, reload],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
