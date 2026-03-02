'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PROVIDER_DISPLAY_NAMES, PROVIDER_COLORS } from '@/lib/constants';
import { formatRelativeTime } from '@/lib/utils';
import type { ProviderType, ConnectionStatus } from '@/lib/types';
import { Trash2, TestTube, RefreshCw } from 'lucide-react';

interface ConnectionCardProps {
  id: string;
  provider: ProviderType;
  displayName: string;
  status: ConnectionStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
  onTest: (id: string) => void;
  onDelete: (id: string) => void;
  onSync: (id: string) => void;
}

const statusVariants: Record<
  ConnectionStatus,
  'default' | 'destructive' | 'secondary'
> = {
  active: 'default',
  error: 'destructive',
  disabled: 'secondary',
};

export function ConnectionCard({
  id,
  provider,
  displayName,
  status,
  lastSyncedAt,
  lastError,
  onTest,
  onDelete,
  onSync,
}: ConnectionCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: PROVIDER_COLORS[provider] }}
          />
          <CardTitle className="text-base font-medium">{displayName}</CardTitle>
        </div>
        <Badge variant={statusVariants[status]}>{status}</Badge>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-[var(--muted-foreground)]">
              {PROVIDER_DISPLAY_NAMES[provider]}
            </p>
            {lastSyncedAt && (
              <p className="text-xs text-[var(--muted-foreground)]">
                Last synced: {formatRelativeTime(new Date(lastSyncedAt))}
              </p>
            )}
            {lastError && status === 'error' && (
              <p className="text-xs text-red-500 truncate max-w-xs">
                {lastError}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onSync(id)}
              title="Sync now"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onTest(id)}
              title="Test connection"
            >
              <TestTube className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(id)}
              title="Delete"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
