import type { AppointmentIntakeInput, AppointmentIntakeView } from '@carelink/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, isStatus } from '@/lib/api';

export const intakeKeys = {
  detail: (appointmentId: string) => ['intake', appointmentId] as const,
};

/** The patient's pre-consultation questionnaire. 404 → not filled yet (null). */
export function useIntake(appointmentId: string | undefined) {
  return useQuery({
    queryKey: intakeKeys.detail(appointmentId ?? ''),
    enabled: Boolean(appointmentId),
    retry: (count, err) => !isStatus(err, 404) && count < 2,
    queryFn: async () => {
      try {
        const { data } = await api.get<AppointmentIntakeView>(
          `/appointments/${appointmentId}/intake`,
        );
        return data;
      } catch (err) {
        if (isStatus(err, 404)) return null;
        throw err;
      }
    },
  });
}

export function useSaveIntake(appointmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AppointmentIntakeInput) =>
      api.put<AppointmentIntakeView>(`/appointments/${appointmentId}/intake`, input).then((r) => r.data),
    onSuccess: (data) => qc.setQueryData(intakeKeys.detail(appointmentId), data),
  });
}
