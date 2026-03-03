'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface TeamCardProps {
  team: {
    id: string;
    name: string;
    slug: string;
    monthlyBudgetCents: number | null;
    memberCount: number;
  };
  spendCents?: number;
}

export function TeamCard({ team, spendCents = 0 }: TeamCardProps) {
  const budgetPct =
    team.monthlyBudgetCents && team.monthlyBudgetCents > 0
      ? Math.round((spendCents / team.monthlyBudgetCents) * 100)
      : null;

  const barColor =
    budgetPct === null
      ? 'bg-[var(--muted)]'
      : budgetPct > 100
        ? 'bg-red-500'
        : budgetPct > 80
          ? 'bg-yellow-500'
          : 'bg-green-500';

  return (
    <Link href={`/teams/${team.id}`}>
      <Card className="transition-colors hover:border-[var(--primary)]/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{team.name}</CardTitle>
            <Badge variant="outline">{team.slug}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-2xl font-bold">{formatCurrency(spendCents)}</div>
          <div className="flex items-center gap-4 text-sm text-[var(--muted-foreground)]">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {team.memberCount} member{team.memberCount !== 1 ? 's' : ''}
            </span>
            {team.monthlyBudgetCents ? (
              <span>Budget: {formatCurrency(team.monthlyBudgetCents)}</span>
            ) : null}
          </div>
          {budgetPct !== null && (
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span>Budget utilization</span>
                <span className="font-medium">{budgetPct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                <div
                  className={`h-full rounded-full ${barColor}`}
                  style={{ width: `${Math.min(budgetPct, 100)}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
