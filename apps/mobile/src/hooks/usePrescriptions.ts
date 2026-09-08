import type {
  CreatePrescriptionInput,
  PrescriptionView,
  UpdatePrescriptionInput,
} from '@carelink/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, isStatus } from '@/lib/api';
import { appointmentKeys } from '@/hooks/useAppointments';

export const prescriptionKeys = {
  detail: (id: string) => ['prescriptions', id] as const,
  forAppointment: (appointmentId: string) => ['prescriptions', 'appointment', appointmentId] as const,
};

/** The prescription attached to an appointment (draft or finalised). 404 → none yet. */
export function useAppointmentPrescription(appointmentId: string | undefined) {
  return useQuery({
    queryKey: prescriptionKeys.forAppointment(appointmentId ?? ''),
    enabled: Boolean(appointmentId),
    retry: (count, err) => !isStatus(err, 404) && count < 2,
    queryFn: async () => {
      try {
        const { data } = await api.get<PrescriptionView>(
          `/appointments/${appointmentId}/prescription`,
        );
        return data;
      } catch (err) {
        if (isStatus(err, 404)) return null;
        throw err;
      }
    },
  });
}

export function usePrescription(id: string | undefined) {
  return useQuery({
    queryKey: prescriptionKeys.detail(id ?? ''),
    enabled: Boolean(id),
    queryFn: () => api.get<PrescriptionView>(`/prescriptions/${id}`).then((r) => r.data),
  });
}

function useRxInvalidate() {
  const qc = useQueryClient();
  return (appointmentId: string, id?: string) => {
    qc.invalidateQueries({ queryKey: prescriptionKeys.forAppointment(appointmentId) });
    if (id) qc.invalidateQueries({ queryKey: prescriptionKeys.detail(id) });
    qc.invalidateQueries({ queryKey: appointmentKeys.all });
    qc.invalidateQueries({ queryKey: ['medical-history'] });
  };
}

export function useCreatePrescription() {
  const invalidate = useRxInvalidate();
  return useMutation({
    mutationFn: (input: CreatePrescriptionInput) =>
      api.post<PrescriptionView>('/prescriptions', input).then((r) => r.data),
    onSuccess: (data) => invalidate(data.appointmentId, data.id),
  });
}

export function useUpdatePrescription(id: string, appointmentId: string) {
  const invalidate = useRxInvalidate();
  return useMutation({
    mutationFn: (input: UpdatePrescriptionInput) =>
      api.patch<PrescriptionView>(`/prescriptions/${id}`, input).then((r) => r.data),
    onSuccess: () => invalidate(appointmentId, id),
  });
}

/** Irreversible — renders the PDF and flips the appointment to COMPLETED. */
export function useFinalizePrescription(id: string, appointmentId: string) {
  const invalidate = useRxInvalidate();
  return useMutation({
    mutationFn: () =>
      api.post<PrescriptionView>(`/prescriptions/${id}/finalize`, {}).then((r) => r.data),
    onSuccess: () => invalidate(appointmentId, id),
  });
}
