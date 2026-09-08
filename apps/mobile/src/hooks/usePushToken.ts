import type { RegisterPushTokenInput } from '@carelink/shared';
import { useMutation } from '@tanstack/react-query';

import { api } from '@/lib/api';

/** Register / de-register the device's Expo push token with the API. */
export function useRegisterPushToken() {
  return useMutation({
    mutationFn: (input: RegisterPushTokenInput) =>
      api.post('/me/push-tokens', input).then((r) => r.data),
  });
}

export function useDisablePushToken() {
  return useMutation({
    mutationFn: (token: string) =>
      api.delete('/me/push-tokens', { data: { token } }).then((r) => r.data),
  });
}
