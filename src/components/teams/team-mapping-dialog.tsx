'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Link2 } from 'lucide-react';
import { useConnections } from '@/lib/hooks/use-connections';
import { useConnectionEntities, useCreateMapping } from '@/lib/hooks/use-teams';
import { PROVIDER_DISPLAY_NAMES } from '@/lib/constants';
import { toast } from 'sonner';
import type { ProviderType } from '@/lib/types';

interface ProviderEntity {
  id: string;
  name: string;
  type: string;
}

interface ConnectionItem {
  id: string;
  provider: ProviderType;
  displayName: string;
}

interface TeamMappingDialogProps {
  teamId: string;
}

export function TeamMappingDialog({ teamId }: TeamMappingDialogProps) {
  const [open, setOpen] = useState(false);
  const [connectionId, setConnectionId] = useState('');
  const [entityId, setEntityId] = useState('');

  const { data: connectionsData } = useConnections();
  const { data: entitiesData, isLoading: entitiesLoading } =
    useConnectionEntities(connectionId);
  const createMapping = useCreateMapping(teamId);

  const connections = (connectionsData || []) as ConnectionItem[];
  const entities = (entitiesData || []) as ProviderEntity[];

  const selectedEntity = entities.find((e) => e.id === entityId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!connectionId || !entityId || !selectedEntity) return;

    try {
      await createMapping.mutateAsync({
        connectionId,
        providerEntityType: selectedEntity.type,
        providerEntityId: selectedEntity.id,
        providerEntityName: selectedEntity.name,
      });
      toast.success('Mapping created');
      setOpen(false);
      setConnectionId('');
      setEntityId('');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create mapping'
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Link2 className="mr-2 h-4 w-4" />
          Add Mapping
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Map Provider Entity</DialogTitle>
            <DialogDescription>
              Map a provider project, workspace, or API key to this team for
              cost attribution.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Connection</Label>
              <Select
                value={connectionId}
                onValueChange={(v) => {
                  setConnectionId(v);
                  setEntityId('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a connection" />
                </SelectTrigger>
                <SelectContent>
                  {connections.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.displayName} ({PROVIDER_DISPLAY_NAMES[c.provider]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {connectionId && (
              <div className="space-y-2">
                <Label>Entity</Label>
                {entitiesLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : entities.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)]">
                    No entities found for this connection.
                  </p>
                ) : (
                  <Select value={entityId} onValueChange={setEntityId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an entity" />
                    </SelectTrigger>
                    <SelectContent>
                      {entities.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name} ({e.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!connectionId || !entityId || createMapping.isPending}
            >
              {createMapping.isPending ? 'Saving...' : 'Save Mapping'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
