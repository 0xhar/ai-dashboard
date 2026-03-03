'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CHART_COLORS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';

interface TimeseriesSeries {
  name: string;
  data: Array<{ date: string; amountCents: number }>;
}

interface SpendTimeseriesChartProps {
  data?: TimeseriesSeries[];
  isLoading: boolean;
}

export function SpendTimeseriesChart({
  data,
  isLoading,
}: SpendTimeseriesChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spend Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spend Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="flex h-[300px] items-center justify-center text-sm text-[var(--muted-foreground)]">
            No time-series data available
          </p>
        </CardContent>
      </Card>
    );
  }

  // Pivot: merge all series into one array of objects keyed by date
  const dateMap = new Map<string, Record<string, number>>();
  for (const series of data) {
    for (const point of series.data) {
      const dateKey = point.date.split('T')[0];
      if (!dateMap.has(dateKey)) dateMap.set(dateKey, {});
      const entry = dateMap.get(dateKey)!;
      entry[series.name] = (entry[series.name] || 0) + point.amountCents / 100;
    }
  }

  const chartData = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({
      date,
      ...values,
    }));

  const seriesNames = data.map((s) => s.name);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spend Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
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
            <Legend />
            {seriesNames.map((name, i) => (
              <Area
                key={name}
                type="monotone"
                dataKey={name}
                stackId="1"
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                fill={CHART_COLORS[i % CHART_COLORS.length]}
                fillOpacity={0.4}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
