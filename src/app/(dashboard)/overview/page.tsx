'use client';

import { useState } from 'react';
import {
  useDashboardSummary,
  useDashboardTimeseries,
  useTopModels,
} from '@/lib/hooks/use-dashboard';
import { SpendSummaryCards } from '@/components/dashboard/spend-summary-cards';
import { SpendByProviderChart } from '@/components/dashboard/spend-by-provider-chart';
import { SpendTimeseriesChart } from '@/components/dashboard/spend-timeseries-chart';
import { TopModelsTable } from '@/components/dashboard/top-models-table';
import { PeriodSelector } from '@/components/dashboard/period-selector';
import { GroupByToggle } from '@/components/dashboard/group-by-toggle';
import type { DatePeriod, GroupBy } from '@/lib/types';

interface SummaryResponse {
  totalSpendCents: number;
  deltaPercent: number;
  byProvider: Array<{ provider: string; totalCents: number }>;
  byModel: Array<{ model: string; provider: string; totalCents: number }>;
}

interface TimeseriesSeries {
  name: string;
  data: Array<{ date: string; amountCents: number }>;
}

interface ModelRow {
  model: string;
  provider: string;
  totalCents: string | number | null;
}

export default function OverviewPage() {
  const [period, setPeriod] = useState<DatePeriod>('30d');
  const [groupBy, setGroupBy] = useState<GroupBy>('provider');

  const { data: summaryRes, isLoading: summaryLoading } =
    useDashboardSummary(period);
  const { data: timeseriesRes, isLoading: tsLoading } = useDashboardTimeseries(
    period,
    'daily',
    groupBy
  );
  const { data: modelsRes, isLoading: modelsLoading } = useTopModels(
    period,
    10
  );

  const summary = (summaryRes as { data: SummaryResponse } | undefined)?.data;
  const timeseries = (timeseriesRes as { data: TimeseriesSeries[] } | undefined)
    ?.data;
  const models = (modelsRes as { data: ModelRow[] } | undefined)?.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Overview</h1>
        <div className="flex items-center gap-3">
          <GroupByToggle value={groupBy} onChange={setGroupBy} />
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
      </div>

      <SpendSummaryCards data={summary} isLoading={summaryLoading} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SpendTimeseriesChart data={timeseries} isLoading={tsLoading} />
        </div>
        <SpendByProviderChart
          data={summary?.byProvider}
          isLoading={summaryLoading}
        />
      </div>

      <TopModelsTable data={models} isLoading={modelsLoading} />
    </div>
  );
}
