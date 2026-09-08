import type {
  Appointment,
  AppointmentListItem,
  AppointmentPage,
  AppointmentSummary,
  CancelAppointmentInput,
  CreateAppointmentInput,
  RescheduleAppointmentInput,
} from '@carelink/shared';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { api } from '@/lib/api';

export type AppointmentScope = 'upcoming' | 'past' | 'all';

export const appointmentKeys = {
  all: ['appointments'] as const,
  list: (scope: AppointmentScope) => ['appointments', 'list', scope] as const,
  summary: ['appointments', 'summary'] as const,
  detail: (id: string) => ['appointments', 'detail', id] as const,
};

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: appointmentKeys.all });
  qc.invalidateQueries({ queryKey: ['slots'] });
  qc.invalidateQueries({ queryKey: ['medical-history'] });
}

/** Paginated list for the Appointments tab (keyset cursor). */
export function useAppointments(scope: AppointmentScope) {
  return useInfiniteQuery({
    queryKey: appointmentKeys.list(scope),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api
        .get<AppointmentPage>('/appointments', { params: { scope, cursor: pageParam } })
        .then((r) => r.data),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

/** Flat list of appointments for a scope — convenience over the infinite query. */
export function useAppointmentItems(scope: AppointmentScope): {
  items: AppointmentListItem[];
  query: ReturnType<typeof useAppointments>;
} {
  const query = useAppointments(scope);
  return { items: query.data?.pages.flatMap((p) => p.items) ?? [], query };
}

/** Home dashboard counts + 14-day series. */
export function useAppointmentSummary() {
  return useQuery({
    queryKey: appointmentKeys.summary,
    queryFn: () => api.get<AppointmentSummary>('/appointments/summary').then((r) => r.data),
  });
}

export function useAppointment(id: string | undefined) {
  return useQuery({
    queryKey: appointmentKeys.detail(id ?? ''),
    enabled: Boolean(id),
    queryFn: () => api.get<Appointment>(`/appointments/${id}`).then((r) => r.data),
  });
}

export function useBookAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAppointmentInput) =>
      api.post<Appointment>('/appointments', input).then((r) => r.data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useCancelAppointment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CancelAppointmentInput) =>
      api.post(`/appointments/${id}/cancel`, input).then((r) => r.data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useRescheduleAppointment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RescheduleAppointmentInput) =>
      api.post(`/appointments/${id}/reschedule`, input).then((r) => r.data),
    onSuccess: () => invalidateAll(qc),
  });
}

/** Doctor stamps that they verified the patient's identity. */
export function useVerifyIdentity(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/appointments/${id}/verify-identity`, {}).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appointmentKeys.detail(id) });
      qc.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}
