import type { PrescriptionTemplate, PrescriptionTemplateInput } from '@carelink/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';

export const templateKeys = {
  all: ['me', 'prescription-templates'] as const,
};

/** Doctor's reusable prescription skeletons. */
export function useTemplates() {
  return useQuery({
    queryKey: templateKeys.all,
    queryFn: () =>
      api.get<PrescriptionTemplate[]>('/me/prescription-templates').then((r) => r.data),
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PrescriptionTemplateInput) =>
      api.post<PrescriptionTemplate>('/me/prescription-templates', input).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: templateKeys.all }),
  });
}

export function useUpdateTemplate(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PrescriptionTemplateInput) =>
      api.patch<PrescriptionTemplate>(`/me/prescription-templates/${id}`, input).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: templateKeys.all }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/me/prescription-templates/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: templateKeys.all }),
  });
}
