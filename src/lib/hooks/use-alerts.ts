'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';

export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: () => apiFetch('/api/v1/alerts'),
    staleTime: 30_000,
  });
}

export function useAlert(alertId: string) {
  return useQuery({
    queryKey: ['alerts', alertId],
    queryFn: () => apiFetch(`/api/v1/alerts/${alertId}`),
    enabled: !!alertId,
  });
}

export function useCreateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) =>
      apiFetch('/api/v1/alerts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}

export function useUpdateAlert(alertId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) =>
      apiFetch(`/api/v1/alerts/${alertId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['alerts', alertId] });
    },
  });
}

export function useDeleteAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) =>
      apiFetch(`/api/v1/alerts/${alertId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}

export function useAlertHistory(alertId: string) {
  return useQuery({
    queryKey: ['alerts', alertId, 'history'],
    queryFn: () => apiFetch(`/api/v1/alerts/${alertId}/history`),
    enabled: !!alertId,
  });
}
