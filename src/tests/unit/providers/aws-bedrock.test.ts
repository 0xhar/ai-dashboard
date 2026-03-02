import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AWSBedrockAdapter } from '@/lib/providers/aws-bedrock';
import type { FetchOptions } from '@/lib/providers/types';

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Use vi.hoisted so mock fns exist when vi.mock factories run
const mocks = vi.hoisted(() => ({
  stsSend: vi.fn(),
  cloudWatchSend: vi.fn(),
  costExplorerSend: vi.fn(),
  bedrockSend: vi.fn(),
}));

vi.mock('@aws-sdk/client-sts', () => ({
  STSClient: class {
    send = mocks.stsSend;
  },
  GetCallerIdentityCommand: class {
    constructor(public input?: unknown) {}
  },
  AssumeRoleCommand: class {
    constructor(public input?: unknown) {}
  },
}));

vi.mock('@aws-sdk/client-cloudwatch', () => ({
  CloudWatchClient: class {
    send = mocks.cloudWatchSend;
  },
  GetMetricDataCommand: class {
    constructor(public input?: unknown) {}
  },
}));

vi.mock('@aws-sdk/client-cost-explorer', () => ({
  CostExplorerClient: class {
    send = mocks.costExplorerSend;
  },
  GetCostAndUsageCommand: class {
    constructor(public input?: unknown) {}
  },
}));

vi.mock('@aws-sdk/client-bedrock', () => ({
  BedrockClient: class {
    send = mocks.bedrockSend;
  },
  ListInferenceProfilesCommand: class {
    constructor(public input?: unknown) {}
  },
}));

const adapter = new AWSBedrockAdapter();
const credentials = {
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  region: 'us-east-1',
};
const baseOptions: FetchOptions = {
  orgId: 'org_test',
  connectionId: 'conn_test',
  startTime: new Date('2024-03-01T00:00:00Z'),
  endTime: new Date('2024-03-04T00:00:00Z'),
};

describe('AWSBedrockAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('testCredentials', () => {
    it('returns success when STS GetCallerIdentity succeeds', async () => {
      mocks.stsSend.mockResolvedValueOnce({
        Account: '123456789012',
        Arn: 'arn:aws:iam::123456789012:user/test',
        UserId: 'AIDAJQABLZS4A3QDU576Q',
      });

      const result = await adapter.testCredentials(credentials);
      expect(result).toEqual({ success: true });
      expect(mocks.stsSend).toHaveBeenCalledOnce();
    });

    it('returns error when STS call fails', async () => {
      mocks.stsSend.mockRejectedValueOnce(
        new Error('The security token included in the request is invalid.')
      );

      const result = await adapter.testCredentials(credentials);
      expect(result.success).toBe(false);
      expect(result.error).toContain('security token');
    });
  });

  describe('fetchUsage', () => {
    it('parses CloudWatch metric data into usage records', async () => {
      // InputTokenCount response
      mocks.cloudWatchSend.mockResolvedValueOnce({
        MetricDataResults: [
          {
            Id: 'inputtokencount',
            Timestamps: [
              new Date('2024-03-01T10:00:00Z'),
              new Date('2024-03-01T11:00:00Z'),
              new Date('2024-03-01T12:00:00Z'),
            ],
            Values: [15000, 22000, 8500],
          },
        ],
        NextToken: undefined,
      });

      // OutputTokenCount response
      mocks.cloudWatchSend.mockResolvedValueOnce({
        MetricDataResults: [
          {
            Id: 'outputtokencount',
            Timestamps: [
              new Date('2024-03-01T10:00:00Z'),
              new Date('2024-03-01T11:00:00Z'),
            ],
            Values: [5000, 8000],
          },
        ],
        NextToken: undefined,
      });

      const allRecords = [];
      for await (const batch of adapter.fetchUsage(credentials, baseOptions)) {
        allRecords.push(...batch);
      }

      // 3 input records + 2 output records = 5 total
      expect(allRecords).toHaveLength(5);

      // Input records
      const inputRecords = allRecords.filter((r) => r.inputTokens > 0);
      expect(inputRecords).toHaveLength(3);
      expect(inputRecords[0].inputTokens).toBe(15000);
      expect(inputRecords[0].outputTokens).toBe(0);
      expect(inputRecords[0].provider).toBe('aws_bedrock');
      expect(inputRecords[0].source).toBe('provider');
      expect(inputRecords[0].model).toBe('bedrock-aggregate');
      expect(inputRecords[0].bucketWidth).toBe('1h');
      expect(inputRecords[0].bucketStart).toEqual(
        new Date('2024-03-01T10:00:00Z')
      );
      expect(inputRecords[0].bucketEnd).toEqual(
        new Date('2024-03-01T11:00:00Z')
      );

      // Output records
      const outputRecords = allRecords.filter((r) => r.outputTokens > 0);
      expect(outputRecords).toHaveLength(2);
      expect(outputRecords[0].outputTokens).toBe(5000);
      expect(outputRecords[0].inputTokens).toBe(0);
    });

    it('handles CloudWatch pagination with NextToken', async () => {
      // First page of InputTokenCount
      mocks.cloudWatchSend.mockResolvedValueOnce({
        MetricDataResults: [
          {
            Timestamps: [new Date('2024-03-01T10:00:00Z')],
            Values: [10000],
          },
        ],
        NextToken: 'next_token_1',
      });

      // Second page of InputTokenCount
      mocks.cloudWatchSend.mockResolvedValueOnce({
        MetricDataResults: [
          {
            Timestamps: [new Date('2024-03-01T11:00:00Z')],
            Values: [20000],
          },
        ],
        NextToken: undefined,
      });

      // OutputTokenCount (single page, no data)
      mocks.cloudWatchSend.mockResolvedValueOnce({
        MetricDataResults: [
          {
            Timestamps: [],
            Values: [],
          },
        ],
        NextToken: undefined,
      });

      const allRecords = [];
      for await (const batch of adapter.fetchUsage(credentials, baseOptions)) {
        allRecords.push(...batch);
      }

      expect(allRecords).toHaveLength(2);
      expect(mocks.cloudWatchSend).toHaveBeenCalledTimes(3);
    });

    it('yields nothing when CloudWatch returns no data', async () => {
      mocks.cloudWatchSend.mockResolvedValue({
        MetricDataResults: [{ Timestamps: [], Values: [] }],
        NextToken: undefined,
      });

      const allRecords = [];
      for await (const batch of adapter.fetchUsage(credentials, baseOptions)) {
        allRecords.push(...batch);
      }

      expect(allRecords).toHaveLength(0);
    });

    it('handles CloudWatch errors gracefully', async () => {
      mocks.cloudWatchSend.mockRejectedValueOnce(new Error('Access Denied'));

      const allRecords = [];
      for await (const batch of adapter.fetchUsage(credentials, baseOptions)) {
        allRecords.push(...batch);
      }

      expect(allRecords).toHaveLength(0);
    });
  });

  describe('fetchCosts', () => {
    it('parses Cost Explorer response and converts dollars to cents', async () => {
      mocks.costExplorerSend.mockResolvedValueOnce({
        ResultsByTime: [
          {
            TimePeriod: { Start: '2024-03-01', End: '2024-03-02' },
            Groups: [
              {
                Keys: ['USE1-Bedrock:anthropic.claude-3-sonnet'],
                Metrics: {
                  UnblendedCost: { Amount: '15.4567', Unit: 'USD' },
                },
              },
              {
                Keys: ['USE1-Bedrock:amazon.titan-text-express'],
                Metrics: {
                  UnblendedCost: { Amount: '2.123', Unit: 'USD' },
                },
              },
            ],
            Estimated: true,
          },
          {
            TimePeriod: { Start: '2024-03-02', End: '2024-03-03' },
            Groups: [
              {
                Keys: ['USE1-Bedrock:anthropic.claude-3-sonnet'],
                Metrics: {
                  UnblendedCost: { Amount: '0.00', Unit: 'USD' },
                },
              },
            ],
            Estimated: false,
          },
        ],
      });

      const allRecords = [];
      for await (const batch of adapter.fetchCosts(credentials, baseOptions)) {
        allRecords.push(...batch);
      }

      // First period: 2 groups, second period: 1 group = 3 total
      expect(allRecords).toHaveLength(3);

      // First cost: $15.4567 → 1546 cents
      const first = allRecords[0];
      expect(first.amountCents).toBe(1546);
      expect(first.currency).toBe('USD');
      expect(first.provider).toBe('aws_bedrock');
      expect(first.source).toBe('provider');
      expect(first.bucketDate).toBe('2024-03-01');
      expect(first.model).toBe('USE1-Bedrock:anthropic.claude-3-sonnet');
      expect(first.costCategory).toBe('USE1-Bedrock:anthropic.claude-3-sonnet');

      // Second cost: $2.123 → 212 cents
      expect(allRecords[1].amountCents).toBe(212);
      expect(allRecords[1].model).toBe(
        'USE1-Bedrock:amazon.titan-text-express'
      );

      // Third: $0.00 → 0 cents
      expect(allRecords[2].amountCents).toBe(0);
      expect(allRecords[2].bucketDate).toBe('2024-03-02');
    });

    it('applies 24h lag guard on end date', async () => {
      mocks.costExplorerSend.mockResolvedValueOnce({
        ResultsByTime: [],
      });

      const allRecords = [];
      for await (const batch of adapter.fetchCosts(credentials, baseOptions)) {
        allRecords.push(...batch);
      }

      expect(mocks.costExplorerSend).toHaveBeenCalledOnce();
    });

    it('handles empty Cost Explorer response', async () => {
      mocks.costExplorerSend.mockResolvedValueOnce({
        ResultsByTime: [],
      });

      const allRecords = [];
      for await (const batch of adapter.fetchCosts(credentials, baseOptions)) {
        allRecords.push(...batch);
      }

      expect(allRecords).toHaveLength(0);
    });

    it('handles periods with no groups', async () => {
      mocks.costExplorerSend.mockResolvedValueOnce({
        ResultsByTime: [
          {
            TimePeriod: { Start: '2024-03-01', End: '2024-03-02' },
            Groups: [],
          },
        ],
      });

      const allRecords = [];
      for await (const batch of adapter.fetchCosts(credentials, baseOptions)) {
        allRecords.push(...batch);
      }

      expect(allRecords).toHaveLength(0);
    });

    it('handles Cost Explorer errors gracefully', async () => {
      mocks.costExplorerSend.mockRejectedValueOnce(
        new Error('AccessDeniedException')
      );

      const allRecords = [];
      for await (const batch of adapter.fetchCosts(credentials, baseOptions)) {
        allRecords.push(...batch);
      }

      expect(allRecords).toHaveLength(0);
    });
  });

  describe('fetchUsage with role ARN', () => {
    it('uses STS AssumeRole when roleArn is provided', async () => {
      const credsWithRole = {
        ...credentials,
        roleArn: 'arn:aws:iam::123456789012:role/BedrockReadOnly',
      };

      // AssumeRole response
      mocks.stsSend.mockResolvedValueOnce({
        Credentials: {
          AccessKeyId: 'ASIA_ASSUMED',
          SecretAccessKey: 'assumed_secret',
          SessionToken: 'session_token',
        },
      });

      // CloudWatch returns empty for both metrics
      mocks.cloudWatchSend.mockResolvedValue({
        MetricDataResults: [{ Timestamps: [], Values: [] }],
        NextToken: undefined,
      });

      const allRecords = [];
      for await (const batch of adapter.fetchUsage(
        credsWithRole,
        baseOptions
      )) {
        allRecords.push(...batch);
      }

      // AssumeRole should have been called
      expect(mocks.stsSend).toHaveBeenCalledOnce();
    });
  });

  describe('listEntities', () => {
    it('returns inference profiles as entities', async () => {
      mocks.bedrockSend.mockResolvedValueOnce({
        inferenceProfileSummaries: [
          {
            inferenceProfileArn:
              'arn:aws:bedrock:us-east-1::inference-profile/us.anthropic.claude-3-sonnet',
            inferenceProfileName: 'Claude 3 Sonnet',
          },
          {
            inferenceProfileArn: null,
            inferenceProfileName: 'Titan Express',
          },
        ],
      });

      const entities = await adapter.listEntities(credentials);
      expect(entities).toHaveLength(2);
      expect(entities[0]).toEqual({
        id: 'arn:aws:bedrock:us-east-1::inference-profile/us.anthropic.claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        type: 'cost_tag',
      });
      expect(entities[1]).toEqual({
        id: 'Titan Express',
        name: 'Titan Express',
        type: 'cost_tag',
      });
    });

    it('returns empty array when no profiles exist', async () => {
      mocks.bedrockSend.mockResolvedValueOnce({
        inferenceProfileSummaries: [],
      });

      const entities = await adapter.listEntities(credentials);
      expect(entities).toEqual([]);
    });

    it('returns empty array on error', async () => {
      mocks.bedrockSend.mockRejectedValueOnce(
        new Error('AccessDeniedException')
      );

      const entities = await adapter.listEntities(credentials);
      expect(entities).toEqual([]);
    });
  });
});
