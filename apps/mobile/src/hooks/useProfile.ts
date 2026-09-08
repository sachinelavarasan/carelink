import type {
  DoctorProfileInput,
  DoctorProfileOut,
  PatientProfileInput,
  PatientProfileOut,
  UpdateAccountInput,
} from '@carelink/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

/**
 * Profile writes. `me` itself (account + both profiles) lives in AuthContext;
 * each mutation calls `reload()` so the whole app sees the new profile.
 */
export function useUpdateAccount() {
  const { reload } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateAccountInput) =>
      api.patch('/me', input).then((r) => r.data),
    onSuccess: async () => {
      await reload();
      qc.invalidateQueries();
    },
  });
}

export function useUpsertPatientProfile() {
  const { reload } = useAuth();
  return useMutation({
    mutationFn: (input: PatientProfileInput) =>
      api.put<PatientProfileOut>('/me/patient-profile', input).then((r) => r.data),
    onSuccess: () => reload(),
  });
}

export function useUpsertDoctorProfile() {
  const { reload } = useAuth();
  return useMutation({
    mutationFn: (input: DoctorProfileInput) =>
      api.put<DoctorProfileOut>('/me/doctor-profile', input).then((r) => r.data),
    onSuccess: () => reload(),
  });
}
