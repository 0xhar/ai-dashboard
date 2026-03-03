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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { useCreateAlert } from '@/lib/hooks/use-alerts';
import { useTeams } from '@/lib/hooks/use-teams';
import { toast } from 'sonner';

interface TeamItem {
  id: string;
  name: string;
}

export function CreateAlertDialog() {
  const [open, setOpen] = useState(false);
  const [teamId, setTeamId] = useState('');
  const [threshold, setThreshold] = useState('');
  const [period, setPeriod] = useState('monthly');
  const [emails, setEmails] = useState('');

  const createAlert = useCreateAlert();
  const { data: teamsData } = useTeams();
  const teamsList = (teamsData || []) as TeamItem[];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createAlert.mutateAsync({
        teamId: teamId && teamId !== 'org-wide' ? teamId : undefined,
        thresholdCents: Math.round(parseFloat(threshold) * 100),
        period,
        notifyEmails: emails,
      });
      toast.success('Alert created');
      setOpen(false);
      setTeamId('');
      setThreshold('');
      setPeriod('monthly');
      setEmails('');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create alert'
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Alert
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Budget Alert</DialogTitle>
            <DialogDescription>
              Get notified when spend exceeds a threshold.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select value={teamId || 'org-wide'} onValueChange={setTeamId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="org-wide">Organization-wide</SelectItem>
                  {teamsList.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="alert-threshold">Threshold (USD)</Label>
              <Input
                id="alert-threshold"
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder="e.g. 5000"
                min="0.01"
                step="0.01"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Period</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="alert-emails">Notification Emails</Label>
              <Input
                id="alert-emails"
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder="admin@acme.com, finance@acme.com"
                required
              />
              <p className="text-xs text-[var(--muted-foreground)]">
                Comma-separated email addresses.
              </p>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createAlert.isPending}>
              {createAlert.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
