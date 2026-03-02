import { Worker } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import { db } from '@/lib/db';
import { budgetAlerts, costRecords } from '@/lib/db/schema';
import { eq, and, gte, sum } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';
import { sendBudgetAlertEmail } from '@/lib/email/send';

const log = createLogger({ service: 'worker' });

function getPeriodStart(period: string): Date {
  const now = new Date();
  switch (period) {
    case 'daily':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'weekly': {
      const dayOfWeek = now.getDay();
      const start = new Date(now);
      start.setDate(start.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case 'monthly':
    default:
      return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}

export function createBudgetCheckWorker(connection: ConnectionOptions) {
  return new Worker(
    'budget-check',
    async () => {
      log.info('Running budget check');

      const alerts = await db
        .select()
        .from(budgetAlerts)
        .where(eq(budgetAlerts.status, 'active'));

      for (const alert of alerts) {
        const periodStart = getPeriodStart(alert.period);
        const periodStartStr = periodStart.toISOString().split('T')[0];

        // Calculate current spend
        const conditions = [
          eq(costRecords.orgId, alert.orgId),
          gte(costRecords.bucketDate, periodStartStr),
        ];
        if (alert.teamId) {
          conditions.push(eq(costRecords.teamId, alert.teamId));
        }

        const [result] = await db
          .select({ total: sum(costRecords.amountCents) })
          .from(costRecords)
          .where(and(...conditions));

        const currentSpend = Number(result?.total || 0);

        if (currentSpend >= alert.thresholdCents) {
          // Alert triggered
          log.info(
            {
              alertId: alert.id,
              currentSpend,
              threshold: alert.thresholdCents,
            },
            'Budget alert triggered'
          );

          await db
            .update(budgetAlerts)
            .set({
              status: 'triggered',
              lastTriggeredAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(budgetAlerts.id, alert.id));

          // Send notification
          const emails = alert.notifyEmails.split(',').map((e) => e.trim());
          for (const email of emails) {
            await sendBudgetAlertEmail({
              to: email,
              alertId: alert.id,
              teamId: alert.teamId,
              thresholdCents: alert.thresholdCents,
              currentSpendCents: currentSpend,
              period: alert.period,
            });
          }
        }
      }

      log.info({ alertsChecked: alerts.length }, 'Budget check completed');
    },
    { connection, concurrency: 1 }
  );
}
