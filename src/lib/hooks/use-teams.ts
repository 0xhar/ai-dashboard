'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import type { DatePeriod } from '@/lib/types';

export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: () => apiFetch('/api/v1/teams'),
    staleTime: 30_000,
  });
}

export function useTeam(teamId: string) {
  return useQuery({
    queryKey: ['teams', teamId],
    queryFn: () => apiFetch(`/api/v1/teams/${teamId}`),
    enabled: !!teamId,
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) =>
      apiFetch('/api/v1/teams', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
  });
}

export function useUpdateTeam(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) =>
      apiFetch(`/api/v1/teams/${teamId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] });
      qc.invalidateQueries({ queryKey: ['teams', teamId] });
    },
  });
}

export function useDeleteTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (teamId: string) =>
      apiFetch(`/api/v1/teams/${teamId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
  });
}

export function useTeamAnalytics(teamId: string, period: DatePeriod) {
  return useQuery({
    queryKey: ['teams', teamId, 'analytics', period],
    queryFn: () =>
      apiFetch(`/api/v1/teams/${teamId}/analytics?period=${period}`),
    enabled: !!teamId,
    staleTime: 30_000,
  });
}

export function useTeamMappings(teamId: string) {
  return useQuery({
    queryKey: ['teams', teamId, 'mappings'],
    queryFn: () => apiFetch(`/api/v1/teams/${teamId}/mappings`),
    enabled: !!teamId,
  });
}

export function useAddTeamMember(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/api/v1/teams/${teamId}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams', teamId] });
    },
  });
}

export function useRemoveTeamMember(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/api/v1/teams/${teamId}/members/${userId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams', teamId] });
    },
  });
}

export function useCreateMapping(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      connectionId: string;
      providerEntityType: string;
      providerEntityId: string;
      providerEntityName?: string;
    }) =>
      apiFetch(`/api/v1/teams/${teamId}/mappings`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams', teamId, 'mappings'] });
      qc.invalidateQueries({ queryKey: ['teams', teamId] });
    },
  });
}

export function useDeleteMapping(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mappingId: string) =>
      apiFetch(`/api/v1/teams/${teamId}/mappings/${mappingId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams', teamId, 'mappings'] });
      qc.invalidateQueries({ queryKey: ['teams', teamId] });
    },
  });
}

export function useConnectionEntities(connectionId: string) {
  return useQuery({
    queryKey: ['connections', connectionId, 'entities'],
    queryFn: () => apiFetch(`/api/v1/connections/${connectionId}/entities`),
    enabled: !!connectionId,
    staleTime: 5 * 60_000,
  });
}
