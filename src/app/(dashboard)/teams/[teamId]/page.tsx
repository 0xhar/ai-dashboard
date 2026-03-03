'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useTeam,
  useTeamAnalytics,
  useDeleteTeam,
  useUpdateTeam,
  useRemoveTeamMember,
  useDeleteMapping,
} from '@/lib/hooks/use-teams';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { PeriodSelector } from '@/components/dashboard/period-selector';
import { TeamAnalytics } from '@/components/teams/team-analytics';
import { TeamMappingDialog } from '@/components/teams/team-mapping-dialog';
import { formatCurrency } from '@/lib/utils';
import type { DatePeriod } from '@/lib/types';

interface TeamData {
  id: string;
  name: string;
  slug: string;
  monthlyBudgetCents: number | null;
  createdAt: string;
  members: Array<{
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    joinedAt: string;
  }>;
  mappings: Array<{
    id: string;
    connectionId: string;
    providerEntityType: string;
    providerEntityId: string;
    providerEntityName: string | null;
  }>;
}

interface AnalyticsData {
  totalSpendCents: number;
  budgetCents: number | null;
  budgetUtilization: number | null;
  byModel: Array<{ model: string; provider: string; totalCents: number }>;
  timeseries: Array<{ date: string; amountCents: number }>;
}

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;

  const [period, setPeriod] = useState<DatePeriod>('30d');
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBudget, setEditBudget] = useState('');

  const { data: teamData, isLoading } = useTeam(teamId);
  const { data: analyticsRes, isLoading: analyticsLoading } = useTeamAnalytics(
    teamId,
    period
  );
  const deleteTeam = useDeleteTeam();
  const updateTeam = useUpdateTeam(teamId);
  const removeMember = useRemoveTeamMember(teamId);
  const deleteMapping = useDeleteMapping(teamId);

  const team = teamData as TeamData | undefined;
  const analytics = analyticsRes as AnalyticsData | undefined;

  function openEditDialog() {
    if (team) {
      setEditName(team.name);
      setEditBudget(
        team.monthlyBudgetCents
          ? (team.monthlyBudgetCents / 100).toString()
          : ''
      );
      setEditOpen(true);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateTeam.mutateAsync({
        name: editName,
        monthlyBudgetCents: editBudget
          ? Math.round(parseFloat(editBudget) * 100)
          : null,
      });
      toast.success('Team updated');
      setEditOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update team');
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this team?')) return;
    try {
      await deleteTeam.mutateAsync(teamId);
      toast.success('Team deleted');
      router.push('/teams');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete team');
    }
  }

  async function handleRemoveMember(userId: string) {
    try {
      await removeMember.mutateAsync(userId);
      toast.success('Member removed');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to remove member'
      );
    }
  }

  async function handleDeleteMapping(mappingId: string) {
    try {
      await deleteMapping.mutateAsync(mappingId);
      toast.success('Mapping removed');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to remove mapping'
      );
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg font-medium">Team not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push('/teams')}
        >
          Back to Teams
        </Button>
      </div>
    );
  }

  const budgetPct = analytics?.budgetUtilization;
  const barColor =
    budgetPct === null || budgetPct === undefined
      ? ''
      : budgetPct > 100
        ? 'bg-red-500'
        : budgetPct > 80
          ? 'bg-yellow-500'
          : 'bg-green-500';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/teams')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{team.name}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {team.slug} &middot; {team.members.length} member
            {team.members.length !== 1 ? 's' : ''} &middot;{' '}
            {team.mappings.length} mapping
            {team.mappings.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodSelector value={period} onChange={setPeriod} />
          <Button variant="outline" size="sm" onClick={openEditDialog}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Spend Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">
                Period Spend
              </p>
              <p className="text-3xl font-bold">
                {analytics ? formatCurrency(analytics.totalSpendCents) : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">
                Monthly Budget
              </p>
              <p className="text-3xl font-bold">
                {team.monthlyBudgetCents
                  ? formatCurrency(team.monthlyBudgetCents)
                  : 'No limit'}
              </p>
            </div>
            {budgetPct !== null && budgetPct !== undefined && (
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Budget Utilization
                </p>
                <p className="text-3xl font-bold">{budgetPct}%</p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                  <div
                    className={`h-full rounded-full ${barColor}`}
                    style={{ width: `${Math.min(budgetPct, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <TeamAnalytics data={analytics} isLoading={analyticsLoading} />

      {/* Provider Mappings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Provider Mappings</CardTitle>
              <CardDescription>
                Linked provider projects and workspaces
              </CardDescription>
            </div>
            <TeamMappingDialog teamId={teamId} />
          </div>
        </CardHeader>
        <CardContent>
          {team.mappings.length === 0 ? (
            <p className="py-4 text-center text-sm text-[var(--muted-foreground)]">
              No mappings yet. Add a mapping to attribute costs to this team.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Entity ID</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.mappings.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.providerEntityName || m.providerEntityId}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{m.providerEntityType}</Badge>
                    </TableCell>
                    <TableCell className="text-[var(--muted-foreground)]">
                      {m.providerEntityId}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMapping(m.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Members</CardTitle>
              <CardDescription>Users in this team</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {team.members.length === 0 ? (
            <p className="py-4 text-center text-sm text-[var(--muted-foreground)]">
              No members yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.members.map((m) => (
                  <TableRow key={m.userId}>
                    <TableCell className="font-medium">{m.userName}</TableCell>
                    <TableCell className="text-[var(--muted-foreground)]">
                      {m.userEmail}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(m.userId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Edit Team</DialogTitle>
              <DialogDescription>
                Update team name and budget.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Team Name</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-budget">Monthly Budget (USD)</Label>
                <Input
                  id="edit-budget"
                  type="number"
                  value={editBudget}
                  onChange={(e) => setEditBudget(e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="No limit"
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateTeam.isPending}>
                {updateTeam.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
