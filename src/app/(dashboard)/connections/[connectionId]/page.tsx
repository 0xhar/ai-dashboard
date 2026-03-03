'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useConnection,
  useSyncJobs,
  useConnectionRecords,
} from '@/lib/hooks/use-connections';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  RefreshCw,
  Plug,
  ChevronLeft,
  ChevronRight,
  KeyRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { PROVIDER_DISPLAY_NAMES } from '@/lib/constants';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import type { ProviderType } from '@/lib/types';

function statusBadgeVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'completed':
      return 'default';
    case 'running':
      return 'secondary';
    case 'failed':
      return 'destructive';
    default:
      return 'outline';
  }
}

function connectionStatusVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'default';
    case 'error':
      return 'destructive';
    default:
      return 'secondary';
  }
}

interface ConnectionData {
  id: string;
  provider: ProviderType;
  displayName: string;
  status: string;
  lastSyncedAt: string | null;
  lastError: string | null;
  createdAt: string;
}

interface SyncJobData {
  id: string;
  syncType: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  recordsSynced: number;
  errorMessage: string | null;
  createdAt: string;
}

interface CostRow {
  id: number;
  bucketDate: string;
  model: string;
  provider: string;
  amountCents: number;
  providerProjectId: string | null;
  providerWorkspaceId: string | null;
}

interface RecordsResponse {
  rows: CostRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  availableModels: string[];
}

export default function ConnectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const connectionId = params.connectionId as string;

  // Filters state
  const [modelFilter, setModelFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data: connection, isLoading: connLoading } =
    useConnection(connectionId);
  const { data: syncJobs, isLoading: jobsLoading } = useSyncJobs(connectionId);
  const { data: recordsData, isLoading: recordsLoading } = useConnectionRecords(
    connectionId,
    {
      model: modelFilter || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page,
    }
  );

  const conn = connection as ConnectionData | undefined;
  const jobs = (syncJobs || []) as SyncJobData[];
  const records = recordsData as RecordsResponse | undefined;

  function handleSync() {
    fetch(`/api/v1/connections/${connectionId}/sync`, { method: 'POST' })
      .then(() => toast.success('Sync triggered'))
      .catch(() => toast.error('Failed to trigger sync'));
  }

  function handleTest() {
    fetch(`/api/v1/connections/${connectionId}/test`, { method: 'POST' })
      .then((r) => r.json())
      .then((res) => {
        if (res.data?.success) {
          toast.success('Connection test passed');
        } else {
          toast.error(`Test failed: ${res.data?.error || 'Unknown error'}`);
        }
      })
      .catch(() => toast.error('Test request failed'));
  }

  function handleReenterCredentials() {
    router.push(`/connections?reconfigure=${connectionId}`);
  }

  if (connLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!conn) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-medium">Connection not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push('/connections')}
        >
          Back to Connections
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/connections')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Connection Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{conn.displayName}</CardTitle>
              <CardDescription>
                {PROVIDER_DISPLAY_NAMES[conn.provider]} connection
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {conn.status === 'error' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReenterCredentials}
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  Re-enter Credentials
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleTest}>
                <Plug className="mr-2 h-4 w-4" />
                Test
              </Button>
              <Button size="sm" onClick={handleSync}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Now
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">Status</p>
              <Badge variant={connectionStatusVariant(conn.status)}>
                {conn.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">Provider</p>
              <p className="font-medium">
                {PROVIDER_DISPLAY_NAMES[conn.provider]}
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">
                Last Synced
              </p>
              <p className="font-medium">
                {conn.lastSyncedAt
                  ? formatRelativeTime(new Date(conn.lastSyncedAt))
                  : 'Never'}
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">Created</p>
              <p className="font-medium">
                {formatRelativeTime(new Date(conn.createdAt))}
              </p>
            </div>
          </div>
          {conn.lastError && (
            <div className="mt-4 rounded-md border border-[var(--destructive)] bg-[var(--destructive)]/10 p-3">
              <p className="text-sm font-medium text-[var(--destructive)]">
                Last Error
              </p>
              <p className="mt-1 text-sm">{conn.lastError}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost Records Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Records</CardTitle>
          <CardDescription>
            Cost data synced from this connection
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-sm text-[var(--muted-foreground)]">
                Model
              </label>
              <Select
                value={modelFilter}
                onValueChange={(v) => {
                  setModelFilter(v === 'all' ? '' : v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All models" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All models</SelectItem>
                  {(records?.availableModels || []).map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-[var(--muted-foreground)]">
                Start date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-[var(--muted-foreground)]">
                End date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-[160px]"
              />
            </div>
            {(modelFilter || startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setModelFilter('');
                  setStartDate('');
                  setEndDate('');
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            )}
          </div>

          {recordsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !records || records.rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
              No cost records found
              {modelFilter || startDate || endDate
                ? ' for the selected filters'
                : '. Sync data to see records here.'}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Project / Workspace</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.bucketDate}</TableCell>
                      <TableCell className="font-medium">{row.model}</TableCell>
                      <TableCell className="text-[var(--muted-foreground)]">
                        {row.providerProjectId ||
                          row.providerWorkspaceId ||
                          '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(row.amountCents)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {records.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Showing {(records.page - 1) * records.pageSize + 1}-
                    {Math.min(records.page * records.pageSize, records.total)}{' '}
                    of {records.total} records
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {records.page} of {records.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= records.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Sync History */}
      <Card>
        <CardHeader>
          <CardTitle>Sync History</CardTitle>
          <CardDescription>
            Recent synchronization jobs for this connection
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <p className="py-4 text-center text-sm text-[var(--muted-foreground)]">
              No sync jobs yet. Click &quot;Sync Now&quot; to start.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">
                      {job.syncType}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(job.status)}>
                        {job.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{job.recordsSynced}</TableCell>
                    <TableCell>
                      {job.startedAt
                        ? formatRelativeTime(new Date(job.startedAt))
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {job.completedAt
                        ? formatRelativeTime(new Date(job.completedAt))
                        : '-'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {job.errorMessage || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
