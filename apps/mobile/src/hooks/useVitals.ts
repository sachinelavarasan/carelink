import type { Vital, VitalEntryInput, VitalsList } from '@carelink/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';

export const vitalsKeys = {
  mine: ['me', 'vitals'] as const,
  patient: (patientId: string) => ['patients', patientId, 'vitals'] as const,
};

/** Patient's own time-series. */
export function useMyVitals() {
  return useQuery({
    queryKey: vitalsKeys.mine,
    queryFn: () => api.get<VitalsList>('/me/vitals').then((r) => r.data.items),
  });
}

export function useAddVital() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: VitalEntryInput) =>
      api.post<Vital>('/me/vitals', input).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: vitalsKeys.mine }),
  });
}

export function useDeleteVital() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/me/vitals/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: vitalsKeys.mine }),
  });
}

/** Doctor reading a patient's vitals (gated on a shared appointment). */
export function usePatientVitals(patientId: string | undefined) {
  return useQuery({
    queryKey: vitalsKeys.patient(patientId ?? ''),
    enabled: Boolean(patientId),
    queryFn: () =>
      api.get<VitalsList>(`/patients/${patientId}/vitals`).then((r) => r.data.items),
  });
}
