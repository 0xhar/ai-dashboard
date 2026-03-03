'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { PROVIDER_DISPLAY_NAMES, PROVIDER_COLORS } from '@/lib/constants';
import type { ProviderType } from '@/lib/types';

interface ModelRow {
  model: string;
  provider: string;
  totalCents: string | number | null;
}

interface TopModelsTableProps {
  data?: ModelRow[];
  isLoading: boolean;
}

export function TopModelsTable({ data, isLoading }: TopModelsTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Models by Cost</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Models by Cost</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
            No model cost data available
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalCents = data.reduce(
    (sum, r) => sum + Number(r.totalCents || 0),
    0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Models by Cost</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Model</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">% of Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => {
              const cents = Number(row.totalCents || 0);
              const pct =
                totalCents > 0
                  ? Math.round((cents / totalCents) * 1000) / 10
                  : 0;
              return (
                <TableRow key={`${row.model}-${row.provider}`}>
                  <TableCell className="font-medium">{row.model}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{
                          backgroundColor:
                            PROVIDER_COLORS[row.provider as ProviderType] ||
                            '#888',
                        }}
                      />
                      {PROVIDER_DISPLAY_NAMES[row.provider as ProviderType] ||
                        row.provider}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(cents)}
                  </TableCell>
                  <TableCell className="text-right text-[var(--muted-foreground)]">
                    {pct}%
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
