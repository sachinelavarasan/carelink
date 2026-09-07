import { API_PREFIX, type AuthTokens } from '@carelink/shared';
import axios, { type InternalAxiosRequestConfig } from 'axios';
import { authToken } from './authToken';

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/** Mobile uses Bearer tokens kept in AsyncStorage. */
export const api = axios.create({ baseURL: `${BASE_URL}${API_PREFIX}` });

api.interceptors.request.use(async (config) => {
  const token = await authToken.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<boolean> | null = null;

async function runRefresh(): Promise<boolean> {
  const refreshToken = await authToken.getRefresh();
  if (!refreshToken) return false;
  try {
    const { data } = await axios.post<AuthTokens>(`${BASE_URL}${API_PREFIX}/auth/refresh`, {
      refreshToken,
    });
    await authToken.set(data);
    return true;
  } catch {
    await authToken.clear();
    return false;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.config) throw error;
    const cfg = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !cfg._retry && !cfg.url?.includes('/auth/refresh')) {
      cfg._retry = true;
      refreshing ??= runRefresh().finally(() => {
        refreshing = null;
      });
      if (await refreshing) return api(cfg);
    }
    throw error;
  },
);

export const errMessage = (err: unknown, fallback: string): string => {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { message?: string })?.message ?? err.message;
  }
  return err instanceof Error ? err.message : fallback;
};

export const isStatus = (err: unknown, status: number): boolean =>
  axios.isAxiosError(err) && err.response?.status === status;
