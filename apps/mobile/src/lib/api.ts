import { API_PREFIX } from '@carelink/shared';
import axios from 'axios';
import type { AxiosError } from 'axios';

import { clearStoredToken } from './authToken';
import { clearToken, getAccessToken, notifyUnauthorized } from './tokenStore';

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/** Mobile holds a single 7-day access token (Bearer). No refresh — a 401 ends
 *  the session (see the response interceptor). */
export const api = axios.create({ baseURL: `${BASE_URL}${API_PREFIX}` });

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      clearToken();
      void clearStoredToken();
      notifyUnauthorized();
    }
    return Promise.reject(error);
  },
);

/** Best-effort human message from an axios / unknown error. */
export const errMessage = (err: unknown, fallback: string): string => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string; validationErrors?: { message: string }[] } | undefined;
    return data?.message ?? data?.validationErrors?.[0]?.message ?? err.message;
  }
  return err instanceof Error ? err.message : fallback;
};

/** Machine-readable error code the API may attach (`{ code: "..." }`). */
export const errCode = (err: unknown): string | undefined =>
  axios.isAxiosError(err) ? (err.response?.data as { code?: string })?.code : undefined;

export const isStatus = (err: unknown, status: number): boolean =>
  axios.isAxiosError(err) && err.response?.status === status;
