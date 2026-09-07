import { meSchema, type LoginInput, type Me, type RegisterInput } from '@carelink/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, isStatus } from './api';

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
    let data: unknown;
    try {
      ({ data } = await api.get('/me'));
    } catch (err) {
      // 401 = no/expired session, the normal "logged out" case — stay quiet.
      // Anything else (network error, 5xx, a proxy handing back HTML) still
      // lands us on "anonymous", but log it so the reason isn't swallowed.
      if (!isStatus(err, 401)) {
        console.warn('[auth] GET /me failed:', err);
      }
      setMe(null);
      setStatus('anonymous');
      return;
    }

    // A misconfigured VITE_API_URL can make `/me` resolve to the SPA's own
    // index.html (200 + HTML body), or the API shape can drift. Validate
    // against the contract; a 200 that doesn't match is a bug, not a logged-out
    // user, so surface it loudly instead of silently signing the user out.
    const parsed = meSchema.safeParse(data);
    if (!parsed.success) {
      console.error('[auth] GET /me returned an unexpected shape:', parsed.error.issues, data);
      setMe(null);
      setStatus('anonymous');
      return;
    }

    setMe(parsed.data);
    setStatus('authenticated');
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
