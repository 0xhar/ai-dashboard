import { logger } from '@/lib/logger';
import { formatCurrency } from '@/lib/utils';

interface BudgetAlertEmailParams {
  to: string;
  alertId: string;
  teamId: string | null;
  thresholdCents: number;
  currentSpendCents: number;
  period: string;
}

export async function sendBudgetAlertEmail(params: BudgetAlertEmailParams) {
  const { to, thresholdCents, currentSpendCents, period, teamId } = params;
  const subject = `Budget Alert: ${teamId ? 'Team' : 'Organization'} spend exceeded threshold`;
  const html = `
    <h2>Budget Alert Triggered</h2>
    <p>Your ${period} spend has exceeded the configured threshold.</p>
    <ul>
      <li><strong>Threshold:</strong> ${formatCurrency(thresholdCents)}</li>
      <li><strong>Current Spend:</strong> ${formatCurrency(currentSpendCents)}</li>
      <li><strong>Period:</strong> ${period}</li>
    </ul>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/alerts">View in Dashboard</a></p>
  `;

  await sendEmail({ to, subject, html });
}

async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  // Option 1: Resend
  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.SMTP_FROM || 'AI FinOps <noreply@aifinops.io>',
      to,
      subject,
      html,
    });
    return;
  }

  // Option 2: SMTP via Nodemailer
  if (process.env.SMTP_HOST) {
    const nodemailer = await import('nodemailer');
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    await transport.sendMail({
      from: process.env.SMTP_FROM || 'noreply@aifinops.io',
      to,
      subject,
      html,
    });
    return;
  }

  // Fallback: log
  logger.info({ to, subject }, 'Email (dev fallback - not actually sent)');
}
