import type { AuthTokens, LoginInput, Me, RegisterInput } from '@carelink/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from './api';
import { clearStoredToken, getStoredToken, setStoredToken } from './authToken';
import { queryClient } from './queryClient';
import { clearToken, onUnauthorized, setToken } from './tokenStore';

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

  /** Wipe every trace of the session locally. Does NOT call the API. */
  const clearSession = useCallback(() => {
    clearToken();
    void clearStoredToken();
    queryClient.clear();
    setMe(null);
    setStatus('anonymous');
  }, []);

  const reload = useCallback(async () => {
    const stored = await getStoredToken();
    if (!stored) {
      clearSession();
      return;
    }
    setToken(stored);
    try {
      const { data } = await api.get<Me>('/me');
      setMe(data);
      setStatus('authenticated');
    } catch {
      clearSession();
    }
  }, [clearSession]);

  // A 401 from anywhere means the 7-day token is gone — drop the session so the
  // route guards bounce to sign-in.
  useEffect(() => {
    onUnauthorized(clearSession);
  }, [clearSession]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const login = useCallback(
    async (input: LoginInput) => {
      const { data } = await api.post<AuthTokens>('/auth/login', input);
      setToken(data.accessToken);
      await setStoredToken(data.accessToken);
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
    clearSession();
  }, [clearSession]);

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
