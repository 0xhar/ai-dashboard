import type {
  ProviderAdapter,
  NormalizedUsageRecord,
  NormalizedCostRecord,
  ProviderEntity,
  TestResult,
  FetchOptions,
} from './types';
import { logger } from '@/lib/logger';

export class AWSBedrockAdapter implements ProviderAdapter {
  private getClients(credentials: Record<string, string>) {
    // Lazy import AWS SDK to avoid bundling in client
    const config = {
      region: credentials.region || 'us-east-1',
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
    };
    return config;
  }

  async testCredentials(
    credentials: Record<string, string>
  ): Promise<TestResult> {
    try {
      const { STSClient, GetCallerIdentityCommand } =
        await import('@aws-sdk/client-sts');
      const client = new STSClient(this.getClients(credentials));
      await client.send(new GetCallerIdentityCommand({}));
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  async *fetchUsage(
    credentials: Record<string, string>,
    options: FetchOptions
  ): AsyncGenerator<NormalizedUsageRecord[], void, unknown> {
    const { orgId, connectionId, startTime, endTime } = options;

    try {
      const { CloudWatchClient, GetMetricDataCommand } =
        await import('@aws-sdk/client-cloudwatch');
      const client = new CloudWatchClient(this.getClients(credentials));

      // Fetch InputTokenCount and OutputTokenCount per model
      for (const metricName of ['InputTokenCount', 'OutputTokenCount']) {
        let nextToken: string | undefined;

        do {
          const cmd = new GetMetricDataCommand({
            StartTime: startTime,
            EndTime: endTime,
            MetricDataQueries: [
              {
                Id: metricName.toLowerCase(),
                MetricStat: {
                  Metric: {
                    Namespace: 'AWS/Bedrock',
                    MetricName: metricName,
                    Dimensions: [],
                  },
                  Period: 3600,
                  Stat: 'Sum',
                },
              },
            ],
            NextToken: nextToken,
          });

          const result = await client.send(cmd);
          const metricData = result.MetricDataResults?.[0];

          if (metricData?.Timestamps && metricData.Values) {
            const records: NormalizedUsageRecord[] = metricData.Timestamps.map(
              (ts, i) => ({
                orgId,
                connectionId,
                provider: 'aws_bedrock' as const,
                source: 'provider' as const,
                bucketStart: ts,
                bucketEnd: new Date(ts.getTime() + 3600000),
                bucketWidth: '1h' as const,
                model: 'bedrock-aggregate',
                inputTokens:
                  metricName === 'InputTokenCount'
                    ? metricData.Values![i] || 0
                    : 0,
                outputTokens:
                  metricName === 'OutputTokenCount'
                    ? metricData.Values![i] || 0
                    : 0,
                cachedInputTokens: 0,
                totalRequests: 0,
              })
            );
            if (records.length > 0) yield records;
          }

          nextToken = result.NextToken;
        } while (nextToken);
      }
    } catch (err) {
      logger.error({ err }, 'Bedrock usage fetch error');
    }
  }

  async *fetchCosts(
    credentials: Record<string, string>,
    options: FetchOptions
  ): AsyncGenerator<NormalizedCostRecord[], void, unknown> {
    const { orgId, connectionId, startTime, endTime } = options;

    try {
      const { CostExplorerClient, GetCostAndUsageCommand } =
        await import('@aws-sdk/client-cost-explorer');
      // Cost Explorer must be called against us-east-1
      const client = new CostExplorerClient({
        ...this.getClients(credentials),
        region: 'us-east-1',
      });

      // Guard: never request current or previous day (24h lag)
      const safEnd = new Date(endTime);
      safEnd.setDate(safEnd.getDate() - 2);

      const cmd = new GetCostAndUsageCommand({
        TimePeriod: {
          Start: startTime.toISOString().split('T')[0],
          End: safEnd.toISOString().split('T')[0],
        },
        Granularity: 'DAILY',
        Metrics: ['UnblendedCost'],
        Filter: {
          Dimensions: {
            Key: 'SERVICE',
            Values: ['Amazon Bedrock'],
          },
        },
        GroupBy: [{ Type: 'DIMENSION', Key: 'USAGE_TYPE' }],
      });

      const result = await client.send(cmd);

      for (const period of result.ResultsByTime || []) {
        const records: NormalizedCostRecord[] = (period.Groups || []).map(
          (group) => {
            const usageType = group.Keys?.[0] || 'unknown';
            const amount = parseFloat(
              group.Metrics?.UnblendedCost?.Amount || '0'
            );
            return {
              orgId,
              connectionId,
              provider: 'aws_bedrock' as const,
              source: 'provider' as const,
              bucketDate: period.TimePeriod?.Start || '',
              model: usageType,
              costCategory: usageType,
              amountCents: Math.round(amount * 100),
              currency: 'USD',
            };
          }
        );
        if (records.length > 0) yield records;
      }
    } catch (err) {
      logger.error({ err }, 'Bedrock cost fetch error');
    }
  }

  async listEntities(
    credentials: Record<string, string>
  ): Promise<ProviderEntity[]> {
    try {
      const { BedrockClient, ListInferenceProfilesCommand } =
        await import('@aws-sdk/client-bedrock');
      const client = new BedrockClient(this.getClients(credentials));
      const result = await client.send(new ListInferenceProfilesCommand({}));

      return (result.inferenceProfileSummaries || []).map((p) => ({
        id: p.inferenceProfileArn || p.inferenceProfileName || 'unknown',
        name: p.inferenceProfileName || 'Unknown Profile',
        type: 'cost_tag' as const,
      }));
    } catch {
      // Fallback: return empty (profiles may not exist)
      return [];
    }
  }
}
