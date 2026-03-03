'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PROVIDER_DISPLAY_NAMES, PROVIDER_COLORS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import type { ProviderType } from '@/lib/types';

interface ProviderSpend {
  provider: string;
  totalCents: number;
}

interface SpendByProviderChartProps {
  data?: ProviderSpend[];
  isLoading: boolean;
}

export function SpendByProviderChart({
  data,
  isLoading,
}: SpendByProviderChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spend by Provider</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = (data || [])
    .filter((d) => d.totalCents > 0)
    .map((d) => ({
      name: PROVIDER_DISPLAY_NAMES[d.provider as ProviderType] || d.provider,
      value: d.totalCents / 100,
      color: PROVIDER_COLORS[d.provider as ProviderType] || '#888',
    }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spend by Provider</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="flex h-[250px] items-center justify-center text-sm text-[var(--muted-foreground)]">
            No cost data available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spend by Provider</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              dataKey="value"
              nameKey="name"
              paddingAngle={2}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number | undefined) =>
                formatCurrency(Math.round((value ?? 0) * 100))
              }
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
