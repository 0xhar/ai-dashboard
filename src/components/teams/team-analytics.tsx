'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { CHART_COLORS } from '@/lib/constants';

interface TeamAnalyticsData {
  totalSpendCents: number;
  budgetCents: number | null;
  budgetUtilization: number | null;
  byModel: Array<{
    model: string;
    provider: string;
    totalCents: number;
  }>;
  timeseries: Array<{
    date: string;
    amountCents: number;
  }>;
}

interface TeamAnalyticsProps {
  data?: TeamAnalyticsData;
  isLoading: boolean;
}

export function TeamAnalytics({ data, isLoading }: TeamAnalyticsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spend by Model</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Daily Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const modelData = data.byModel.map((m) => ({
    name: m.model,
    value: m.totalCents / 100,
  }));

  const tsData = data.timeseries.map((t) => ({
    date: t.date,
    spend: t.amountCents / 100,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Spend by Model */}
      <Card>
        <CardHeader>
          <CardTitle>Spend by Model</CardTitle>
        </CardHeader>
        <CardContent>
          {modelData.length === 0 ? (
            <p className="flex h-[250px] items-center justify-center text-sm text-[var(--muted-foreground)]">
              No model data available
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={modelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  type="number"
                  fontSize={12}
                  tickFormatter={(v: number) => `$${v}`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  fontSize={11}
                  width={150}
                  tickFormatter={(v: string) =>
                    v.length > 20 ? v.slice(0, 20) + '...' : v
                  }
                />
                <Tooltip
                  formatter={(value: number | undefined) =>
                    formatCurrency(Math.round((value ?? 0) * 100))
                  }
                />
                <Bar
                  dataKey="value"
                  fill={CHART_COLORS[0]}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Daily Spend */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Spend</CardTitle>
        </CardHeader>
        <CardContent>
          {tsData.length === 0 ? (
            <p className="flex h-[250px] items-center justify-center text-sm text-[var(--muted-foreground)]">
              No time-series data available
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={tsData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="date"
                  fontSize={12}
                  tickFormatter={(v: string) => {
                    const d = new Date(v);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis fontSize={12} tickFormatter={(v: number) => `$${v}`} />
                <Tooltip
                  formatter={(value: number | undefined) =>
                    formatCurrency(Math.round((value ?? 0) * 100))
                  }
                  labelFormatter={(label) => {
                    const d = new Date(String(label));
                    return d.toLocaleDateString();
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="spend"
                  stroke={CHART_COLORS[0]}
                  fill={CHART_COLORS[0]}
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
