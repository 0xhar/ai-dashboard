'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ConnectionCard } from '@/components/connections/connection-card';
import {
  useConnections,
  useDeleteConnection,
} from '@/lib/hooks/use-connections';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { ProviderType, ConnectionStatus } from '@/lib/types';

export default function ConnectionsPage() {
  const { data: connections, isLoading } = useConnections();
  const deleteConnection = useDeleteConnection();

  function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this connection?')) {
      deleteConnection.mutate(id, {
        onSuccess: () => toast.success('Connection deleted'),
        onError: () => toast.error('Failed to delete connection'),
      });
    }
  }

  function handleTest(id: string) {
    fetch(`/api/v1/connections/${id}/test`, { method: 'POST' })
      .then((r) => r.json())
      .then((res) => {
        if (res.data?.success) {
          toast.success('Connection test passed');
        } else {
          toast.error(
            `Connection test failed: ${res.data?.error || 'Unknown error'}`
          );
        }
      })
      .catch(() => toast.error('Test request failed'));
  }

  function handleSync(id: string) {
    fetch(`/api/v1/connections/${id}/sync`, { method: 'POST' })
      .then(() => toast.success('Sync triggered'))
      .catch(() => toast.error('Failed to trigger sync'));
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Connections</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Manage your AI provider connections
          </p>
        </div>
        <Link href="/connections/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Connection
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg bg-[var(--muted)]"
            />
          ))}
        </div>
      ) : !connections || (connections as unknown[]).length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-lg font-medium">No connections yet</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Connect your first AI provider to start tracking spend
          </p>
          <Link href="/connections/new">
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add your first connection
            </Button>
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {(
            connections as Array<{
              id: string;
              provider: ProviderType;
              displayName: string;
              status: ConnectionStatus;
              lastSyncedAt: string | null;
              lastError: string | null;
            }>
          ).map((conn) => (
            <ConnectionCard
              key={conn.id}
              {...conn}
              onTest={handleTest}
              onDelete={handleDelete}
              onSync={handleSync}
            />
          ))}
        </div>
      )}
    </div>
  );
}
