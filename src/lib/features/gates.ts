import type { PlanTier } from '@/lib/types';

interface PlanLimits {
  maxConnections: number;
  maxTeams: number;
  maxAlerts: number;
  syncIntervalMinutes: number;
  retentionMonths: number;
  webhookAlerts: boolean;
  csvExport: boolean;
  sso: boolean;
  auditLog: boolean;
  apiKeys: boolean;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxConnections: 3,
    maxTeams: 3,
    maxAlerts: 5,
    syncIntervalMinutes: 15,
    retentionMonths: 6,
    webhookAlerts: false,
    csvExport: false,
    sso: false,
    auditLog: false,
    apiKeys: false,
  },
  pro: {
    maxConnections: Infinity,
    maxTeams: Infinity,
    maxAlerts: Infinity,
    syncIntervalMinutes: 5,
    retentionMonths: 24,
    webhookAlerts: true,
    csvExport: true,
    sso: false,
    auditLog: false,
    apiKeys: false,
  },
  enterprise: {
    maxConnections: Infinity,
    maxTeams: Infinity,
    maxAlerts: Infinity,
    syncIntervalMinutes: 1,
    retentionMonths: Infinity,
    webhookAlerts: true,
    csvExport: true,
    sso: true,
    auditLog: true,
    apiKeys: true,
  },
};

export function getPlanLimits(plan: PlanTier): PlanLimits {
  return PLAN_LIMITS[plan];
}

export function checkFeature(
  plan: PlanTier,
  feature: keyof PlanLimits
): boolean | number {
  return PLAN_LIMITS[plan][feature];
}

export function checkLimit(
  plan: PlanTier,
  resource: 'maxConnections' | 'maxTeams' | 'maxAlerts',
  currentCount: number
): boolean {
  const limit = PLAN_LIMITS[plan][resource];
  return currentCount < limit;
}
