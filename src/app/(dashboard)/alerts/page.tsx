'use client';

import { useAlerts } from '@/lib/hooks/use-alerts';
import { AlertList } from '@/components/alerts/alert-list';
import { CreateAlertDialog } from '@/components/alerts/create-alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

export default function AlertsPage() {
  const { data: alertsData, isLoading } = useAlerts();

  const alerts = (alertsData || []) as AlertRow[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Budget Alerts</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Set up budget thresholds and get notified when spend exceeds limits.
          </p>
        </div>
        <CreateAlertDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <AlertList data={alerts} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
