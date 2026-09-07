import { API_PREFIX } from '@carelink/shared';
import axios, { type InternalAxiosRequestConfig } from 'axios';

// Empty (the default) means "same origin" — requests go to `/api/…` and, in dev,
// Vite proxies them to the API. Set VITE_API_URL to an absolute URL to override.
const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

/**
 * Web talks to the API with httpOnly auth cookies. axios reads the readable
 * `carelink_csrf` cookie and echoes it as `x-csrf-token` automatically
 * (double-submit CSRF). No token is ever held in JS.
 */
export const api = axios.create({
  baseURL: `${BASE_URL}${API_PREFIX}`,
  withCredentials: true,
  xsrfCookieName: 'carelink_csrf',
  xsrfHeaderName: 'x-csrf-token',
  withXSRFToken: true,
});

const hasSession = () => /(?:^|;\s*)carelink_csrf=/.test(document.cookie);

let refreshing: Promise<boolean> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.config) throw error;

    const cfg = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const isRefresh = cfg.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !cfg._retry && !isRefresh && hasSession()) {
      cfg._retry = true;
      refreshing ??= api
        .post('/auth/refresh', {})
        .then(() => true)
        .catch(() => false)
        .finally(() => {
          refreshing = null;
        });
      if (await refreshing) return api(cfg);
    }
    throw error;
  },
);

/** Thin helper for call sites that just want the response body. */
export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  return (await api.get<T>(url, { params })).data;
}

/** Absolute URL for an API path — for links the browser opens directly (e.g. a
 *  PDF in a new tab). Auth cookies ride along on the top-level GET. */
export function apiUrl(path: string): string {
  return `${BASE_URL}${API_PREFIX}${path}`;
}

/**
 * Fetches a PDF through the authenticated axios client (cookies + CSRF) and
 * opens it in a new tab as a blob URL. Doing it this way rather than
 * `window.open(apiUrl(...))` avoids the raw top-level navigation, which (a) may
 * not carry the auth cookie on a cross-site deploy and (b) inherits the API's
 * strict `Content-Security-Policy`, which stops some browsers rendering the PDF
 * (blank tab). Any error propagates so the caller can show it.
 */
export async function openPdf(path: string): Promise<void> {
  const res = await api.get<Blob>(path, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  window.open(url, '_blank', 'noopener');
  // Give the new tab time to load before releasing the object URL.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Best-effort human message from an axios/unknown error. */
export function errMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { message?: string })?.message ?? err.message;
  }
  return err instanceof Error ? err.message : fallback;
}

export const isStatus = (err: unknown, status: number): boolean =>
  axios.isAxiosError(err) && err.response?.status === status;
