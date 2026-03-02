'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import type { DatePeriod, Granularity, GroupBy } from '@/lib/types';

export function useDashboardSummary(period: DatePeriod) {
  return useQuery({
    queryKey: ['dashboard', 'summary', period],
    queryFn: () => apiFetch(`/api/v1/dashboard/summary?period=${period}`),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useDashboardTimeseries(
  period: DatePeriod,
  granularity: Granularity,
  groupBy: GroupBy
) {
  return useQuery({
    queryKey: ['dashboard', 'timeseries', period, granularity, groupBy],
    queryFn: () =>
      apiFetch(
        `/api/v1/dashboard/timeseries?period=${period}&granularity=${granularity}&groupBy=${groupBy}`
      ),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useTopModels(period: DatePeriod, limit = 10) {
  return useQuery({
    queryKey: ['dashboard', 'top-models', period, limit],
    queryFn: () =>
      apiFetch(`/api/v1/dashboard/top-models?period=${period}&limit=${limit}`),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
