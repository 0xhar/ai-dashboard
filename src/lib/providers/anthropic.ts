import type {
  ProviderAdapter,
  NormalizedUsageRecord,
  NormalizedCostRecord,
  ProviderEntity,
  TestResult,
  FetchOptions,
} from './types';
import { logger } from '@/lib/logger';

const BASE_URL = 'https://api.anthropic.com';

export class AnthropicAdapter implements ProviderAdapter {
  async testCredentials(
    credentials: Record<string, string>
  ): Promise<TestResult> {
    try {
      const res = await fetch(
        `${BASE_URL}/v1/organizations/workspaces?limit=1`,
        {
          headers: {
            'x-api-key': credentials.apiKey,
            'anthropic-version': '2023-06-01',
          },
        }
      );
      if (res.ok) return { success: true };
      const body = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${body}` };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  async *fetchUsage(
    credentials: Record<string, string>,
    options: FetchOptions
  ): AsyncGenerator<NormalizedUsageRecord[], void, unknown> {
    const { orgId, connectionId, startTime, endTime } = options;
    let nextPage: string | undefined;

    do {
      const params = new URLSearchParams({
        starting_at: startTime.toISOString(),
        ending_at: endTime.toISOString(),
        bucket_width: '1h',
        group_by: 'model,workspace_id,api_key_id',
        limit: '100',
      });
      if (nextPage) params.set('next_page', nextPage);

      const res = await fetch(
        `${BASE_URL}/v1/organizations/usage_report/messages?${params}`,
        {
          headers: {
            'x-api-key': credentials.apiKey,
            'anthropic-version': '2023-06-01',
          },
        }
      );

      if (!res.ok) {
        logger.error({ status: res.status }, 'Anthropic usage API error');
        break;
      }

      const data = await res.json();
      const records: NormalizedUsageRecord[] = (data.data || []).map(
        (bucket: Record<string, unknown>) => ({
          orgId,
          connectionId,
          provider: 'anthropic' as const,
          source: 'provider' as const,
          bucketStart: new Date(bucket.start_time as string),
          bucketEnd: new Date(bucket.end_time as string),
          bucketWidth: '1h' as const,
          model: (bucket.model as string) || 'unknown',
          providerWorkspaceId: bucket.workspace_id as string | undefined,
          providerApiKeyId: bucket.api_key_id as string | undefined,
          inputTokens: Number(bucket.uncached_input_tokens || 0),
          outputTokens: Number(bucket.output_tokens || 0),
          cachedInputTokens: Number(bucket.cache_read_input_tokens || 0),
          totalRequests: Number(bucket.num_requests || 0),
        })
      );

      if (records.length > 0) yield records;
      nextPage = data.next_page;
    } while (nextPage);
  }

  async *fetchCosts(
    credentials: Record<string, string>,
    options: FetchOptions
  ): AsyncGenerator<NormalizedCostRecord[], void, unknown> {
    const { orgId, connectionId, startTime, endTime } = options;
    let nextPage: string | undefined;

    do {
      const params = new URLSearchParams({
        starting_at: startTime.toISOString(),
        ending_at: endTime.toISOString(),
        group_by: 'workspace_id,description',
        limit: '100',
      });
      if (nextPage) params.set('next_page', nextPage);

      const res = await fetch(
        `${BASE_URL}/v1/organizations/cost_report?${params}`,
        {
          headers: {
            'x-api-key': credentials.apiKey,
            'anthropic-version': '2023-06-01',
          },
        }
      );

      if (!res.ok) {
        logger.error({ status: res.status }, 'Anthropic cost API error');
        break;
      }

      const data = await res.json();
      // Note: Anthropic returns costs as decimal-string cents
      const records: NormalizedCostRecord[] = (data.data || []).map(
        (item: Record<string, unknown>) => ({
          orgId,
          connectionId,
          provider: 'anthropic' as const,
          source: 'provider' as const,
          bucketDate:
            (item.date as string) ||
            new Date(item.start_time as string).toISOString().split('T')[0],
          model: (item.description as string) || 'unknown',
          providerWorkspaceId: item.workspace_id as string | undefined,
          costCategory: item.description as string | undefined,
          amountCents: Math.round(parseFloat(String(item.amount || 0))),
          currency: 'USD',
        })
      );

      if (records.length > 0) yield records;
      nextPage = data.next_page;
    } while (nextPage);
  }

  async listEntities(
    credentials: Record<string, string>
  ): Promise<ProviderEntity[]> {
    const entities: ProviderEntity[] = [];
    let after: string | undefined;

    do {
      const params = new URLSearchParams({ limit: '100' });
      if (after) params.set('after_id', after);

      const res = await fetch(
        `${BASE_URL}/v1/organizations/workspaces?${params}`,
        {
          headers: {
            'x-api-key': credentials.apiKey,
            'anthropic-version': '2023-06-01',
          },
        }
      );

      if (!res.ok) break;
      const data = await res.json();

      for (const ws of data.data || []) {
        entities.push({
          id: ws.id,
          name: ws.display_name || ws.name,
          type: 'workspace',
        });
      }

      after = data.has_more ? data.data[data.data.length - 1]?.id : undefined;
    } while (after);

    return entities;
  }
}
