import type { MedicalHistory, MedicalHistoryEntry, VisitedPatient } from '@carelink/shared';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

export const historyKeys = {
  mine: (doctorId?: string) => ['medical-history', 'mine', doctorId ?? null] as const,
  patient: (patientId: string) => ['medical-history', 'patient', patientId] as const,
  patients: ['me', 'patients'] as const,
};

function flatten(query: {
  data?: { pages: MedicalHistory[] };
}): MedicalHistoryEntry[] {
  return query.data?.pages.flatMap((p) => p.items) ?? [];
}

/** Patient's own consultation history. `doctorId` scopes to "history with Dr X". */
export function useMedicalHistory(opts: { doctorId?: string; enabled?: boolean } = {}) {
  const { doctorId, enabled = true } = opts;
  const query = useInfiniteQuery({
    queryKey: historyKeys.mine(doctorId),
    enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api
        .get<MedicalHistory>('/medical-history', { params: { doctorId, cursor: pageParam } })
        .then((r) => r.data),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  return { entries: flatten(query), query };
}

/** Doctor viewing one patient's history (own appointments only). */
export function usePatientHistory(patientId: string | undefined) {
  const query = useInfiniteQuery({
    queryKey: historyKeys.patient(patientId ?? ''),
    enabled: Boolean(patientId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api
        .get<MedicalHistory>(`/patients/${patientId}/history`, { params: { cursor: pageParam } })
        .then((r) => r.data),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  return { entries: flatten(query), query };
}

/** The doctor's list of patients they've consulted. */
export function useMyPatients(enabled = true) {
  return useQuery({
    queryKey: historyKeys.patients,
    enabled,
    queryFn: () => api.get<VisitedPatient[]>('/me/patients').then((r) => r.data),
  });
}
