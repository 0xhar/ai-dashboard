'use client';

import { useTeams } from '@/lib/hooks/use-teams';
import { TeamCard } from '@/components/teams/team-card';
import { CreateTeamDialog } from '@/components/teams/create-team-dialog';
import { Skeleton } from '@/components/ui/skeleton';

interface TeamRow {
  id: string;
  name: string;
  slug: string;
  monthlyBudgetCents: number | null;
  memberCount: number;
}

export default function TeamsPage() {
  const { data: teamsData, isLoading } = useTeams();

  const teamsList = (teamsData || []) as TeamRow[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Teams</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Create teams and map them to provider projects for cost attribution.
          </p>
        </div>
        <CreateTeamDialog />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : teamsList.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-lg font-medium">No teams yet</p>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Create your first team to start tracking costs by department.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teamsList.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      )}
    </div>
  );
}
