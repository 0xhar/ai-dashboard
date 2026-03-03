'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, Pause, Play } from 'lucide-react';
import { useDeleteAlert, useUpdateAlert } from '@/lib/hooks/use-alerts';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';

interface AlertRow {
  id: string;
  teamId: string | null;
  teamName: string | null;
  thresholdCents: number;
  period: string;
  notifyEmails: string;
  status: string;
  currentSpendCents: number;
  lastTriggeredAt: string | null;
  createdAt: string;
}

interface AlertListProps {
  data?: AlertRow[];
  isLoading: boolean;
}

function statusBadgeVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'default';
    case 'triggered':
      return 'destructive';
    case 'resolved':
      return 'secondary';
    case 'disabled':
      return 'outline';
    default:
      return 'outline';
  }
}

export function AlertList({ data, isLoading }: AlertListProps) {
  const deleteAlert = useDeleteAlert();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-lg font-medium">No alerts yet</p>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Create a budget alert to get notified when spend exceeds a threshold.
        </p>
      </div>
    );
  }

  async function handleDelete(alertId: string) {
    if (!confirm('Delete this alert?')) return;
    try {
      await deleteAlert.mutateAsync(alertId);
      toast.success('Alert deleted');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete alert'
      );
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Scope</TableHead>
          <TableHead>Threshold</TableHead>
          <TableHead>Current Spend</TableHead>
          <TableHead>Period</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Last Triggered</TableHead>
          <TableHead className="w-[100px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((alert) => {
          const pct =
            alert.thresholdCents > 0
              ? Math.round(
                  (alert.currentSpendCents / alert.thresholdCents) * 100
                )
              : 0;
          return (
            <TableRow key={alert.id}>
              <TableCell className="font-medium">
                {alert.teamName || 'Organization'}
              </TableCell>
              <TableCell>{formatCurrency(alert.thresholdCents)}</TableCell>
              <TableCell>
                <span
                  className={
                    pct >= 100
                      ? 'font-bold text-red-600'
                      : pct >= 80
                        ? 'font-medium text-yellow-600'
                        : ''
                  }
                >
                  {formatCurrency(alert.currentSpendCents)}
                </span>
                <span className="ml-1 text-xs text-[var(--muted-foreground)]">
                  ({pct}%)
                </span>
              </TableCell>
              <TableCell className="capitalize">{alert.period}</TableCell>
              <TableCell>
                <Badge variant={statusBadgeVariant(alert.status)}>
                  {alert.status}
                </Badge>
              </TableCell>
              <TableCell className="text-[var(--muted-foreground)]">
                {alert.lastTriggeredAt
                  ? formatRelativeTime(new Date(alert.lastTriggeredAt))
                  : 'Never'}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <AlertToggleButton alertId={alert.id} status={alert.status} />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(alert.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function AlertToggleButton({
  alertId,
  status,
}: {
  alertId: string;
  status: string;
}) {
  const updateAlert = useUpdateAlert(alertId);

  async function toggle() {
    const newStatus = status === 'disabled' ? 'active' : 'disabled';
    try {
      await updateAlert.mutateAsync({ status: newStatus });
      toast.success(
        newStatus === 'active' ? 'Alert enabled' : 'Alert disabled'
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update alert'
      );
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={toggle}>
      {status === 'disabled' ? (
        <Play className="h-4 w-4" />
      ) : (
        <Pause className="h-4 w-4" />
      )}
    </Button>
  );
}
