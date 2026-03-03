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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { useCreateTeam } from '@/lib/hooks/use-teams';
import { toast } from 'sonner';
import { slugify } from '@/lib/utils';

export function CreateTeamDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [budget, setBudget] = useState('');
  const createTeam = useCreateTeam();

  function handleNameChange(value: string) {
    setName(value);
    setSlug(slugify(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createTeam.mutateAsync({
        name,
        slug,
        monthlyBudgetCents: budget
          ? Math.round(parseFloat(budget) * 100)
          : undefined,
      });
      toast.success('Team created');
      setOpen(false);
      setName('');
      setSlug('');
      setBudget('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create team');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Team
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Team</DialogTitle>
            <DialogDescription>
              Create a new team to track AI costs by department or project.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Engineering"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-slug">Slug</Label>
              <Input
                id="team-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. engineering"
                pattern="^[a-z0-9-]+$"
                required
              />
              <p className="text-xs text-[var(--muted-foreground)]">
                Lowercase letters, numbers, and hyphens only.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-budget">Monthly Budget (USD)</Label>
              <Input
                id="team-budget"
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. 5000"
                min="0"
                step="0.01"
              />
              <p className="text-xs text-[var(--muted-foreground)]">
                Optional. Leave empty for no budget limit.
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
            <Button type="submit" disabled={createTeam.isPending}>
              {createTeam.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
