import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LiteLLMAdapter } from '@/lib/providers/litellm';
import type { FetchOptions } from '@/lib/providers/types';

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

const adapter = new LiteLLMAdapter();
const apiCredentials = {
  apiEndpoint: 'http://localhost:4000',
  apiKey: 'sk-litellm-test',
};
const baseOptions: FetchOptions = {
  orgId: 'org_test',
  connectionId: 'conn_test',
  startTime: new Date('2024-03-01T00:00:00Z'),
  endTime: new Date('2024-03-02T00:00:00Z'),
};

describe('LiteLLMAdapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('testCredentials (API mode)', () => {
    it('returns success when health endpoint responds 200', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'healthy' }), { status: 200 })
      );

      const result = await adapter.testCredentials(apiCredentials);
      expect(result).toEqual({ success: true });
    });

    it('returns error on non-200 health response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Service Unavailable', { status: 503 })
      );

      const result = await adapter.testCredentials(apiCredentials);
      expect(result.success).toBe(false);
      expect(result.error).toContain('503');
    });

    it('sends authorization header when API key provided', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ status: 'healthy' }), { status: 200 })
        );

      await adapter.testCredentials(apiCredentials);

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://localhost:4000/health');
      expect((init as RequestInit).headers).toEqual({
        Authorization: 'Bearer sk-litellm-test',
      });
    });

    it('sends no auth header when no API key', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ status: 'healthy' }), { status: 200 })
        );

      await adapter.testCredentials({
        apiEndpoint: 'http://localhost:4000',
      });

      const [, init] = fetchSpy.mock.calls[0];
      expect((init as RequestInit).headers).toEqual({});
    });

    it('returns error on network failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
        new Error('ECONNREFUSED')
      );

      const result = await adapter.testCredentials(apiCredentials);
      expect(result.success).toBe(false);
      expect(result.error).toContain('ECONNREFUSED');
    });
  });

  describe('fetchUsage (API mode)', () => {
    it('parses spend/logs response into usage records', async () => {
      const spendLogs = [
        {
          startTime: '2024-03-01T10:00:00Z',
          endTime: '2024-03-01T10:01:00Z',
          model: 'gpt-4o',
          api_key: 'key_team_a',
          user: 'user@example.com',
          prompt_tokens: 1500,
          completion_tokens: 500,
        },
        {
          startTime: '2024-03-01T11:00:00Z',
          endTime: '2024-03-01T11:02:00Z',
          model: 'claude-sonnet-4-20250514',
          api_key: 'key_team_b',
          user: null,
          prompt_tokens: 3000,
          completion_tokens: 1200,
        },
      ];

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(spendLogs), { status: 200 })
      );

      const allRecords = [];
      for await (const batch of adapter.fetchUsage(
        apiCredentials,
        baseOptions
      )) {
        allRecords.push(...batch);
      }

      expect(allRecords).toHaveLength(2);

      const first = allRecords[0];
      expect(first.provider).toBe('litellm');
      expect(first.source).toBe('aggregator');
      expect(first.model).toBe('gpt-4o');
      expect(first.inputTokens).toBe(1500);
      expect(first.outputTokens).toBe(500);
      expect(first.cachedInputTokens).toBe(0);
      expect(first.totalRequests).toBe(1);
      expect(first.providerApiKeyId).toBe('key_team_a');
      expect(first.providerUserId).toBe('user@example.com');
      expect(first.bucketWidth).toBe('1h');

      const second = allRecords[1];
      expect(second.model).toBe('claude-sonnet-4-20250514');
      expect(second.inputTokens).toBe(3000);
      expect(second.outputTokens).toBe(1200);
    });

    it('yields nothing on empty response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify([]), { status: 200 })
      );

      const allRecords = [];
      for await (const batch of adapter.fetchUsage(
        apiCredentials,
        baseOptions
      )) {
        allRecords.push(...batch);
      }

      expect(allRecords).toHaveLength(0);
    });

    it('returns nothing on API error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401 })
      );

      const allRecords = [];
      for await (const batch of adapter.fetchUsage(
        apiCredentials,
        baseOptions
      )) {
        allRecords.push(...batch);
      }

      expect(allRecords).toHaveLength(0);
    });

    it('sends correct date parameters', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify([]), { status: 200 })
        );

      const allRecords = [];
      for await (const batch of adapter.fetchUsage(
        apiCredentials,
        baseOptions
      )) {
        allRecords.push(...batch);
      }

      expect(allRecords).toHaveLength(0);
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain('start_date=2024-03-01');
      expect(url).toContain('end_date=2024-03-02');
    });
  });

  describe('fetchCosts (API mode)', () => {
    it('aggregates spend logs by model and date into cost records', async () => {
      const spendLogs = [
        {
          startTime: '2024-03-01T10:00:00Z',
          model: 'gpt-4o',
          spend: '0.15',
        },
        {
          startTime: '2024-03-01T14:00:00Z',
          model: 'gpt-4o',
          spend: '0.25',
        },
        {
          startTime: '2024-03-01T10:00:00Z',
          model: 'claude-sonnet-4-20250514',
          spend: '0.50',
        },
      ];

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(spendLogs), { status: 200 })
      );

      const allRecords = [];
      for await (const batch of adapter.fetchCosts(
        apiCredentials,
        baseOptions
      )) {
        allRecords.push(...batch);
      }

      // 2 unique model+date combos: gpt-4o:2024-03-01 and claude-sonnet-4-20250514:2024-03-01
      expect(allRecords).toHaveLength(2);

      const gpt4Record = allRecords.find((r) => r.model === 'gpt-4o');
      expect(gpt4Record).toBeDefined();
      // $0.15 + $0.25 = $0.40 → 40 cents
      expect(gpt4Record!.amountCents).toBe(40);
      expect(gpt4Record!.currency).toBe('USD');
      expect(gpt4Record!.provider).toBe('litellm');
      expect(gpt4Record!.source).toBe('aggregator');
      expect(gpt4Record!.bucketDate).toBe('2024-03-01');

      const claudeRecord = allRecords.find((r) => r.model.includes('claude'));
      expect(claudeRecord).toBeDefined();
      expect(claudeRecord!.amountCents).toBe(50);
    });

    it('yields nothing on empty spend logs', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify([]), { status: 200 })
      );

      const allRecords = [];
      for await (const batch of adapter.fetchCosts(
        apiCredentials,
        baseOptions
      )) {
        allRecords.push(...batch);
      }

      expect(allRecords).toHaveLength(0);
    });

    it('returns nothing on API error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Server Error', { status: 500 })
      );

      const allRecords = [];
      for await (const batch of adapter.fetchCosts(
        apiCredentials,
        baseOptions
      )) {
        allRecords.push(...batch);
      }

      expect(allRecords).toHaveLength(0);
    });
  });

  describe('listEntities (API mode)', () => {
    it('returns empty array for API mode (no DB)', async () => {
      const entities = await adapter.listEntities(apiCredentials);
      expect(entities).toEqual([]);
    });
  });
});
