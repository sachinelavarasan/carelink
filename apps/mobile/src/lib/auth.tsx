import type { AuthTokens, LoginInput, Me, RegisterInput } from '@carelink/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from './api';
import { authToken } from './authToken';

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
    if (!(await authToken.getAccess())) {
      setMe(null);
      setStatus('anonymous');
      return;
    }
    try {
      const { data } = await api.get<Me>('/me');
      setMe(data);
      setStatus('authenticated');
    } catch {
      await authToken.clear();
      setMe(null);
      setStatus('anonymous');
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const login = useCallback(
    async (input: LoginInput) => {
      const { data } = await api.post<AuthTokens>('/auth/login', input);
      await authToken.set(data);
      await reload();
    },
    [reload],
  );

  const register = useCallback(
    async (input: RegisterInput) => (await api.post<{ ok: true }>('/auth/register', input)).data,
    [],
  );

  const logout = useCallback(async () => {
    const refreshToken = await authToken.getRefresh();
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken }).catch(() => undefined);
    }
    await authToken.clear();
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
