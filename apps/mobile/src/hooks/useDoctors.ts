import type { DoctorPublic, ListDoctorsQuery, VisitedDoctor } from '@carelink/shared';
import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

export const doctorKeys = {
  all: ['doctors'] as const,
  list: (q: Partial<ListDoctorsQuery>) => ['doctors', 'list', q] as const,
  specializations: ['doctors', 'specializations'] as const,
  detail: (id: string) => ['doctors', 'detail', id] as const,
  mine: ['doctors', 'mine'] as const,
};

/** Patient-facing directory. `q` / `specialization` / `sort` filter server-side. */
export function useDoctors(query: Partial<ListDoctorsQuery>) {
  return useQuery({
    queryKey: doctorKeys.list(query),
    queryFn: () =>
      api
        .get<DoctorPublic[]>('/doctors', { params: query })
        .then((r) => r.data),
  });
}

export function useSpecializations() {
  return useQuery({
    queryKey: doctorKeys.specializations,
    queryFn: () => api.get<string[]>('/doctors/specializations').then((r) => r.data),
    staleTime: 60 * 60 * 1000,
  });
}

export function useDoctor(id: string | undefined) {
  return useQuery({
    queryKey: doctorKeys.detail(id ?? ''),
    enabled: Boolean(id),
    queryFn: () => api.get<DoctorPublic>(`/doctors/${id}`).then((r) => r.data),
  });
}

/** Doctors the patient has already consulted (for one-tap re-booking). */
export function useMyDoctors() {
  return useQuery({
    queryKey: doctorKeys.mine,
    queryFn: () => api.get<VisitedDoctor[]>('/me/doctors').then((r) => r.data),
  });
}
