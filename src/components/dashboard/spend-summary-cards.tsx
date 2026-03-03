'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatCurrencyCompact } from '@/lib/utils';
import { PROVIDER_DISPLAY_NAMES, PROVIDER_COLORS } from '@/lib/constants';
import type { ProviderType } from '@/lib/types';

interface SummaryData {
  totalSpendCents: number;
  deltaPercent: number;
  byProvider: Array<{ provider: string; totalCents: number }>;
  byModel: Array<{ model: string; provider: string; totalCents: number }>;
}

interface SpendSummaryCardsProps {
  data?: SummaryData;
  isLoading: boolean;
}

export function SpendSummaryCards({ data, isLoading }: SpendSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const delta = data.deltaPercent;
  const deltaColor =
    delta > 0
      ? 'text-red-500'
      : delta < 0
        ? 'text-green-500'
        : 'text-[var(--muted-foreground)]';
  const deltaSign = delta > 0 ? '+' : '';

  // Project monthly cost from current data (simple daily average)
  const now = new Date();
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate();
  const dayOfMonth = now.getDate();
  const projectedCents =
    dayOfMonth > 0
      ? Math.round((data.totalSpendCents / dayOfMonth) * daysInMonth)
      : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
            Total Spend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(data.totalSpendCents)}
          </div>
          <p className={`text-xs ${deltaColor}`}>
            {deltaSign}
            {delta}% vs prior period
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
            Monthly Projection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrencyCompact(projectedCents)}
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            Based on daily average
          </p>
        </CardContent>
      </Card>

      {data.byProvider.slice(0, 2).map((p) => (
        <Card key={p.provider}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
              <span className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor:
                      PROVIDER_COLORS[p.provider as ProviderType] || '#888',
                  }}
                />
                {PROVIDER_DISPLAY_NAMES[p.provider as ProviderType] ||
                  p.provider}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(p.totalCents)}
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">
              {data.totalSpendCents > 0
                ? `${Math.round((p.totalCents / data.totalSpendCents) * 100)}% of total`
                : '0%'}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
