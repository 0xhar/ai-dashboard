'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';

export function useConnections() {
  return useQuery({
    queryKey: ['connections'],
    queryFn: () => apiFetch('/api/v1/connections'),
    staleTime: 30_000,
  });
}

export function useConnection(id: string) {
  return useQuery({
    queryKey: ['connections', id],
    queryFn: () => apiFetch(`/api/v1/connections/${id}`),
    enabled: !!id,
  });
}

export function useCreateConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) =>
      apiFetch('/api/v1/connections', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['connections'] }),
  });
}

export function useDeleteConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/v1/connections/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['connections'] }),
  });
}

export function useTestConnection(id: string) {
  return useMutation({
    mutationFn: () =>
      apiFetch(`/api/v1/connections/${id}/test`, { method: 'POST' }),
  });
}

export function useTriggerSync(id: string) {
  return useMutation({
    mutationFn: () =>
      apiFetch(`/api/v1/connections/${id}/sync`, { method: 'POST' }),
  });
}

export function useSyncJobs(connectionId: string) {
  return useQuery({
    queryKey: ['sync-jobs', connectionId],
    queryFn: () => apiFetch(`/api/v1/sync/jobs?connectionId=${connectionId}`),
    enabled: !!connectionId,
    refetchInterval: 30_000,
  });
}

export function useConnectionRecords(
  connectionId: string,
  filters: {
    model?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
  } = {}
) {
  const params = new URLSearchParams();
  if (filters.model) params.set('model', filters.model);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.page) params.set('page', String(filters.page));

  const qs = params.toString();
  return useQuery({
    queryKey: ['connection-records', connectionId, filters],
    queryFn: () =>
      apiFetch(
        `/api/v1/connections/${connectionId}/records${qs ? `?${qs}` : ''}`
      ),
    enabled: !!connectionId,
    staleTime: 30_000,
  });
}
