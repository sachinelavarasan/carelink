import { API_PREFIX } from '@carelink/shared';
import axios from 'axios';
import { authToken } from './authToken';

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/** Mobile holds a single 7-day access token in AsyncStorage. No refresh. */
export const api = axios.create({ baseURL: `${BASE_URL}${API_PREFIX}` });

api.interceptors.request.use(async (config) => {
  const token = await authToken.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      await authToken.clear();
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
