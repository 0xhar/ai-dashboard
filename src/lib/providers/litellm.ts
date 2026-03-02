import type {
  ProviderAdapter,
  NormalizedUsageRecord,
  NormalizedCostRecord,
  ProviderEntity,
  TestResult,
  FetchOptions,
} from './types';
import { logger } from '@/lib/logger';

export class LiteLLMAdapter implements ProviderAdapter {
  private isDbMode(credentials: Record<string, string>): boolean {
    return !!credentials.databaseUrl;
  }

  async testCredentials(
    credentials: Record<string, string>
  ): Promise<TestResult> {
    try {
      if (this.isDbMode(credentials)) {
        const postgres = (await import('postgres')).default;
        const sql = postgres(credentials.databaseUrl, { max: 1 });
        await sql`SELECT 1`;
        await sql.end();
        return { success: true };
      } else {
        const url = `${credentials.apiEndpoint}/health`;
        const headers: Record<string, string> = {};
        if (credentials.apiKey) {
          headers['Authorization'] = `Bearer ${credentials.apiKey}`;
        }
        const res = await fetch(url, { headers });
        if (res.ok) return { success: true };
        return { success: false, error: `HTTP ${res.status}` };
      }
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  async *fetchUsage(
    credentials: Record<string, string>,
    options: FetchOptions
  ): AsyncGenerator<NormalizedUsageRecord[], void, unknown> {
    const { orgId, connectionId, startTime, endTime } = options;

    if (this.isDbMode(credentials)) {
      try {
        const postgres = (await import('postgres')).default;
        const sql = postgres(credentials.databaseUrl, { max: 2 });

        const rows = await sql`
          SELECT
            model,
            api_key,
            "user",
            date_trunc('hour', "startTime") as bucket,
            SUM(prompt_tokens)::bigint as input_tokens,
            SUM(completion_tokens)::bigint as output_tokens,
            COUNT(*)::int as total_requests
          FROM "LiteLLM_SpendLogs"
          WHERE "startTime" >= ${startTime} AND "startTime" < ${endTime}
          GROUP BY model, api_key, "user", date_trunc('hour', "startTime")
          ORDER BY bucket
        `;

        const records: NormalizedUsageRecord[] = rows.map((row) => ({
          orgId,
          connectionId,
          provider: 'litellm' as const,
          source: 'aggregator' as const,
          bucketStart: new Date(row.bucket),
          bucketEnd: new Date(new Date(row.bucket).getTime() + 3600000),
          bucketWidth: '1h' as const,
          model: row.model || 'unknown',
          providerApiKeyId: row.api_key,
          providerUserId: row.user,
          inputTokens: Number(row.input_tokens || 0),
          outputTokens: Number(row.output_tokens || 0),
          cachedInputTokens: 0,
          totalRequests: Number(row.total_requests || 0),
        }));

        if (records.length > 0) yield records;
        await sql.end();
      } catch (err) {
        logger.error({ err }, 'LiteLLM DB usage fetch error');
      }
    } else {
      // API mode
      try {
        const headers: Record<string, string> = {};
        if (credentials.apiKey) {
          headers['Authorization'] = `Bearer ${credentials.apiKey}`;
        }
        const params = new URLSearchParams({
          start_date: startTime.toISOString().split('T')[0],
          end_date: endTime.toISOString().split('T')[0],
        });
        const res = await fetch(
          `${credentials.apiEndpoint}/spend/logs?${params}`,
          { headers }
        );
        if (!res.ok) return;
        const data = await res.json();

        const records: NormalizedUsageRecord[] = (data || []).map(
          (log: Record<string, unknown>) => ({
            orgId,
            connectionId,
            provider: 'litellm' as const,
            source: 'aggregator' as const,
            bucketStart: new Date(log.startTime as string),
            bucketEnd: new Date(log.endTime as string),
            bucketWidth: '1h' as const,
            model: (log.model as string) || 'unknown',
            providerApiKeyId: log.api_key as string | undefined,
            providerUserId: log.user as string | undefined,
            inputTokens: Number(log.prompt_tokens || 0),
            outputTokens: Number(log.completion_tokens || 0),
            cachedInputTokens: 0,
            totalRequests: 1,
          })
        );

        if (records.length > 0) yield records;
      } catch (err) {
        logger.error({ err }, 'LiteLLM API usage fetch error');
      }
    }
  }

  async *fetchCosts(
    credentials: Record<string, string>,
    options: FetchOptions
  ): AsyncGenerator<NormalizedCostRecord[], void, unknown> {
    const { orgId, connectionId, startTime, endTime } = options;

    if (this.isDbMode(credentials)) {
      try {
        const postgres = (await import('postgres')).default;
        const sql = postgres(credentials.databaseUrl, { max: 2 });

        const rows = await sql`
          SELECT
            model,
            api_key,
            DATE("startTime") as bucket_date,
            SUM(spend)::numeric as total_spend
          FROM "LiteLLM_SpendLogs"
          WHERE "startTime" >= ${startTime} AND "startTime" < ${endTime}
          GROUP BY model, api_key, DATE("startTime")
          ORDER BY bucket_date
        `;

        const records: NormalizedCostRecord[] = rows.map((row) => ({
          orgId,
          connectionId,
          provider: 'litellm' as const,
          source: 'aggregator' as const,
          bucketDate: row.bucket_date,
          model: row.model || 'unknown',
          providerProjectId: row.api_key,
          amountCents: Math.round(parseFloat(row.total_spend || '0') * 100),
          currency: 'USD',
        }));

        if (records.length > 0) yield records;
        await sql.end();
      } catch (err) {
        logger.error({ err }, 'LiteLLM DB cost fetch error');
      }
    } else {
      // API mode - aggregate from spend/logs
      try {
        const headers: Record<string, string> = {};
        if (credentials.apiKey) {
          headers['Authorization'] = `Bearer ${credentials.apiKey}`;
        }
        const params = new URLSearchParams({
          start_date: startTime.toISOString().split('T')[0],
          end_date: endTime.toISOString().split('T')[0],
        });
        const res = await fetch(
          `${credentials.apiEndpoint}/spend/logs?${params}`,
          { headers }
        );
        if (!res.ok) return;
        const data = await res.json();

        // Aggregate by model + date
        const aggregated = new Map<string, NormalizedCostRecord>();
        for (const log of data || []) {
          const date = new Date(log.startTime).toISOString().split('T')[0];
          const key = `${log.model}:${date}`;
          const existing = aggregated.get(key);
          if (existing) {
            existing.amountCents += Math.round(
              parseFloat(log.spend || '0') * 100
            );
          } else {
            aggregated.set(key, {
              orgId,
              connectionId,
              provider: 'litellm' as const,
              source: 'aggregator' as const,
              bucketDate: date,
              model: log.model || 'unknown',
              amountCents: Math.round(parseFloat(log.spend || '0') * 100),
              currency: 'USD',
            });
          }
        }

        const records = Array.from(aggregated.values());
        if (records.length > 0) yield records;
      } catch (err) {
        logger.error({ err }, 'LiteLLM API cost fetch error');
      }
    }
  }

  async listEntities(
    credentials: Record<string, string>
  ): Promise<ProviderEntity[]> {
    const entities: ProviderEntity[] = [];

    if (this.isDbMode(credentials)) {
      try {
        const postgres = (await import('postgres')).default;
        const sql = postgres(credentials.databaseUrl, { max: 1 });

        const keys = await sql`
          SELECT DISTINCT api_key FROM "LiteLLM_SpendLogs"
          WHERE api_key IS NOT NULL
          LIMIT 100
        `;
        for (const row of keys) {
          entities.push({
            id: row.api_key,
            name: row.api_key,
            type: 'api_key',
          });
        }

        const users = await sql`
          SELECT DISTINCT "user" FROM "LiteLLM_SpendLogs"
          WHERE "user" IS NOT NULL
          LIMIT 100
        `;
        for (const row of users) {
          entities.push({
            id: row.user,
            name: row.user,
            type: 'user',
          });
        }

        await sql.end();
      } catch (err) {
        logger.error({ err }, 'LiteLLM entity listing error');
      }
    }

    return entities;
  }
}
