import type {
  ProviderType,
  ProviderEntityType,
  BucketWidth,
} from '@/lib/types';

export interface NormalizedUsageRecord {
  orgId: string;
  connectionId: string;
  provider: ProviderType;
  source: 'provider' | 'aggregator';
  bucketStart: Date;
  bucketEnd: Date;
  bucketWidth: BucketWidth;
  model: string;
  providerProjectId?: string;
  providerWorkspaceId?: string;
  providerUserId?: string;
  providerApiKeyId?: string;
  serviceTier?: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  totalRequests: number;
}

export interface NormalizedCostRecord {
  orgId: string;
  connectionId: string;
  provider: ProviderType;
  source: 'provider' | 'aggregator';
  bucketDate: string; // YYYY-MM-DD
  model: string;
  providerProjectId?: string;
  providerWorkspaceId?: string;
  costCategory?: string;
  amountCents: number;
  currency: string;
}

export interface ProviderEntity {
  id: string;
  name: string;
  type: ProviderEntityType;
}

export interface TestResult {
  success: boolean;
  error?: string;
}

export interface FetchOptions {
  orgId: string;
  connectionId: string;
  startTime: Date;
  endTime: Date;
}

export interface ProviderAdapter {
  testCredentials(credentials: Record<string, string>): Promise<TestResult>;

  fetchUsage(
    credentials: Record<string, string>,
    options: FetchOptions
  ): AsyncGenerator<NormalizedUsageRecord[], void, unknown>;

  fetchCosts(
    credentials: Record<string, string>,
    options: FetchOptions
  ): AsyncGenerator<NormalizedCostRecord[], void, unknown>;

  listEntities(credentials: Record<string, string>): Promise<ProviderEntity[]>;
}
