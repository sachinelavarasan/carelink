import type {
  AvailabilityExceptionInput,
  AvailabilityExceptionOut,
  AvailabilityExceptionRangeInput,
  AvailabilityRuleOut,
  ReplaceAvailabilityRulesInput,
  Slot,
} from '@carelink/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';

export const availabilityKeys = {
  slots: (doctorId: string, from: string, to: string) =>
    ['slots', doctorId, from, to] as const,
  myRules: ['me', 'availability', 'rules'] as const,
  myExceptions: ['me', 'availability', 'exceptions'] as const,
};

/** Free slots for a doctor over a date range (`yyyy-MM-dd`). */
export function useDoctorSlots(doctorId: string | undefined, from: string, to: string) {
  return useQuery({
    queryKey: availabilityKeys.slots(doctorId ?? '', from, to),
    enabled: Boolean(doctorId && from && to),
    queryFn: () =>
      api
        .get<Slot[]>(`/doctors/${doctorId}/slots`, { params: { from, to } })
        .then((r) => r.data),
  });
}

/* ---- doctor's own template (all below are DOCTOR-only) ---- */

export function useMyRules() {
  return useQuery({
    queryKey: availabilityKeys.myRules,
    queryFn: () => api.get<AvailabilityRuleOut[]>('/me/availability/rules').then((r) => r.data),
  });
}

export function useReplaceRules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReplaceAvailabilityRulesInput) =>
      api.put<AvailabilityRuleOut[]>('/me/availability/rules', input).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: availabilityKeys.myRules });
      qc.invalidateQueries({ queryKey: ['slots'] });
    },
  });
}

export function useMyExceptions() {
  return useQuery({
    queryKey: availabilityKeys.myExceptions,
    queryFn: () =>
      api.get<AvailabilityExceptionOut[]>('/me/availability/exceptions').then((r) => r.data),
  });
}

export function useUpsertException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AvailabilityExceptionInput) =>
      api.put<AvailabilityExceptionOut>('/me/availability/exceptions', input).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: availabilityKeys.myExceptions });
      qc.invalidateQueries({ queryKey: ['slots'] });
    },
  });
}

export function useDeleteException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/me/availability/exceptions/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: availabilityKeys.myExceptions });
      qc.invalidateQueries({ queryKey: ['slots'] });
    },
  });
}

/** Holiday / leave block — the API expands it to one exception per date. */
export function useCloseRange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AvailabilityExceptionRangeInput) =>
      api.put('/me/availability/exceptions/range', input).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: availabilityKeys.myExceptions });
      qc.invalidateQueries({ queryKey: ['slots'] });
    },
  });
}

export function useClearRange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { from: string; to: string }) =>
      api.delete('/me/availability/exceptions/range', { params }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: availabilityKeys.myExceptions });
      qc.invalidateQueries({ queryKey: ['slots'] });
    },
  });
}
