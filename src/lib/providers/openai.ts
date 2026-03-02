import type {
  ProviderAdapter,
  NormalizedUsageRecord,
  NormalizedCostRecord,
  ProviderEntity,
  TestResult,
  FetchOptions,
} from './types';
import { logger } from '@/lib/logger';

const BASE_URL = 'https://api.openai.com';

export class OpenAIAdapter implements ProviderAdapter {
  async testCredentials(
    credentials: Record<string, string>
  ): Promise<TestResult> {
    try {
      const res = await fetch(`${BASE_URL}/v1/organization/projects?limit=1`, {
        headers: { Authorization: `Bearer ${credentials.apiKey}` },
      });
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
    let page: string | undefined;

    do {
      const params = new URLSearchParams({
        start_time: Math.floor(startTime.getTime() / 1000).toString(),
        end_time: Math.floor(endTime.getTime() / 1000).toString(),
        bucket_width: '1h',
        group_by: 'model,project_id,api_key_id',
        limit: '100',
      });
      if (page) params.set('page', page);

      const res = await fetch(
        `${BASE_URL}/v1/organization/usage/completions?${params}`,
        { headers: { Authorization: `Bearer ${credentials.apiKey}` } }
      );

      if (!res.ok) {
        logger.error({ status: res.status }, 'OpenAI usage API error');
        break;
      }

      const data = await res.json();
      const records: NormalizedUsageRecord[] = (data.data || []).flatMap(
        (bucket: Record<string, unknown>) => {
          const results = (bucket.results || []) as Record<string, unknown>[];
          return results.map((result) => ({
            orgId,
            connectionId,
            provider: 'openai' as const,
            source: 'provider' as const,
            bucketStart: new Date((bucket.start_time as number) * 1000),
            bucketEnd: new Date((bucket.end_time as number) * 1000),
            bucketWidth: '1h' as const,
            model: (result.model as string) || 'unknown',
            providerProjectId: result.project_id as string | undefined,
            providerApiKeyId: result.api_key_id as string | undefined,
            inputTokens: Number(result.input_tokens || 0),
            outputTokens: Number(result.output_tokens || 0),
            cachedInputTokens: Number(result.input_cached_tokens || 0),
            totalRequests: Number(result.num_model_requests || 0),
          }));
        }
      );

      if (records.length > 0) yield records;
      page = data.next_page;
    } while (page);
  }

  async *fetchCosts(
    credentials: Record<string, string>,
    options: FetchOptions
  ): AsyncGenerator<NormalizedCostRecord[], void, unknown> {
    const { orgId, connectionId, startTime, endTime } = options;
    let page: string | undefined;

    do {
      const params = new URLSearchParams({
        start_time: Math.floor(startTime.getTime() / 1000).toString(),
        end_time: Math.floor(endTime.getTime() / 1000).toString(),
        bucket_width: '1d',
        group_by: 'project_id',
        limit: '100',
      });
      if (page) params.set('page', page);

      const res = await fetch(`${BASE_URL}/v1/organization/costs?${params}`, {
        headers: { Authorization: `Bearer ${credentials.apiKey}` },
      });

      if (!res.ok) {
        logger.error({ status: res.status }, 'OpenAI costs API error');
        break;
      }

      const data = await res.json();
      const records: NormalizedCostRecord[] = (data.data || []).flatMap(
        (bucket: Record<string, unknown>) => {
          const results = (bucket.results || []) as Record<string, unknown>[];
          return results.map((result) => {
            const amountObj = result.amount as
              | Record<string, unknown>
              | undefined;
            const amount = Number(amountObj?.value || 0);
            return {
              orgId,
              connectionId,
              provider: 'openai' as const,
              source: 'provider' as const,
              bucketDate: new Date((bucket.start_time as number) * 1000)
                .toISOString()
                .split('T')[0],
              model: (result.model as string) || 'all',
              providerProjectId: result.project_id as string | undefined,
              costCategory: result.line_item as string | undefined,
              amountCents: Math.round(amount * 100),
              currency: 'USD',
            };
          });
        }
      );

      if (records.length > 0) yield records;
      page = data.next_page;
    } while (page);
  }

  async listEntities(
    credentials: Record<string, string>
  ): Promise<ProviderEntity[]> {
    const entities: ProviderEntity[] = [];
    let after: string | undefined;

    do {
      const params = new URLSearchParams({ limit: '100' });
      if (after) params.set('after', after);

      const res = await fetch(
        `${BASE_URL}/v1/organization/projects?${params}`,
        { headers: { Authorization: `Bearer ${credentials.apiKey}` } }
      );

      if (!res.ok) break;
      const data = await res.json();

      for (const project of data.data || []) {
        entities.push({
          id: project.id,
          name: project.name,
          type: 'project',
        });
      }

      after = data.has_more ? data.data[data.data.length - 1]?.id : undefined;
    } while (after);

    return entities;
  }
}
