import type { ForgotPasswordInput, ResetPasswordInput } from '@carelink/shared';
import { useMutation } from '@tanstack/react-query';

import { api } from '@/lib/api';

/** Password-reset + verification-resend calls. Login / register run through
 *  AuthContext (they mutate session state). */

export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) =>
      api.post<{ ok: true }>('/auth/forgot', input).then((r) => r.data),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) =>
      api.post<{ ok: true }>('/auth/reset', input).then((r) => r.data),
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: (email: string) =>
      api.post<{ ok: true }>('/auth/resend-verification', { email }).then((r) => r.data),
  });
}
