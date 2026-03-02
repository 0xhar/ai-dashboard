export type ApiResponse<T> = { data: T } | { error: string; code: string };

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type DatePeriod = '7d' | '30d' | '90d' | 'mtd' | 'last_month';

export type Granularity = 'daily' | 'weekly' | 'monthly';

export type GroupBy = 'provider' | 'model' | 'team';

export type ProviderType = 'openai' | 'anthropic' | 'aws_bedrock' | 'litellm';

export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';

export type ConnectionStatus = 'active' | 'error' | 'disabled';

export type AlertStatus = 'active' | 'triggered' | 'resolved' | 'disabled';

export type PlanTier = 'free' | 'pro' | 'enterprise';

export type SyncType = 'usage' | 'cost';

export type SyncJobStatus = 'pending' | 'running' | 'completed' | 'failed';

export type BucketWidth = '1m' | '1h' | '1d';

export type ProviderEntityType =
  | 'project'
  | 'workspace'
  | 'cost_tag'
  | 'api_key'
  | 'user';

export type AlertPeriod = 'daily' | 'weekly' | 'monthly';
