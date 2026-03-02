import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIAdapter } from '@/lib/providers/openai';
import type { FetchOptions } from '@/lib/providers/types';
import usageFixture from '../../fixtures/openai-usage-response.json';
import costsFixture from '../../fixtures/openai-costs-response.json';

// Mock the logger to avoid pino initialization issues
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

const adapter = new OpenAIAdapter();
const credentials = { apiKey: 'sk-admin-test-key' };
const baseOptions: FetchOptions = {
  orgId: 'org_test',
  connectionId: 'conn_test',
  startTime: new Date('2024-03-01T00:00:00Z'),
  endTime: new Date('2024-03-02T00:00:00Z'),
};

describe('OpenAIAdapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('testCredentials', () => {
    it('returns success when API responds 200', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [] }), { status: 200 })
      );

      const result = await adapter.testCredentials(credentials);
      expect(result).toEqual({ success: true });
    });

    it('returns error with HTTP status on non-200 response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401 })
      );

      const result = await adapter.testCredentials(credentials);
      expect(result.success).toBe(false);
      expect(result.error).toContain('401');
    });

    it('returns error on network failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await adapter.testCredentials(credentials);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('sends correct authorization header', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ data: [] }), { status: 200 })
        );

      await adapter.testCredentials(credentials);

      expect(fetchSpy).toHaveBeenCalledOnce();
      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toContain('/v1/organization/projects');
      expect((init as RequestInit).headers).toEqual({
        Authorization: 'Bearer sk-admin-test-key',
      });
    });
  });

  describe('fetchUsage', () => {
    it('parses usage response and normalizes records correctly', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(usageFixture), { status: 200 })
      );

      const allRecords = [];
      for await (const batch of adapter.fetchUsage(credentials, baseOptions)) {
        allRecords.push(...batch);
      }

      // Fixture has 2 buckets: first with 2 results, second with 1 result = 3 records
      expect(allRecords).toHaveLength(3);

      // First result: gpt-4o in first bucket
      const first = allRecords[0];
      expect(first.provider).toBe('openai');
      expect(first.source).toBe('provider');
      expect(first.model).toBe('gpt-4o');
      expect(first.inputTokens).toBe(12500);
      expect(first.outputTokens).toBe(3400);
      expect(first.cachedInputTokens).toBe(1200);
      expect(first.totalRequests).toBe(45);
      expect(first.providerProjectId).toBe('proj_abc123');
      expect(first.providerApiKeyId).toBe('key_001');
      expect(first.bucketWidth).toBe('1h');
      expect(first.orgId).toBe('org_test');
      expect(first.connectionId).toBe('conn_test');

      // Verify timestamp conversion (1709337600 = 2024-03-02T00:00:00Z)
      expect(first.bucketStart).toEqual(new Date(1709337600 * 1000));
      expect(first.bucketEnd).toEqual(new Date(1709341200 * 1000));

      // Second result: gpt-4o-mini in first bucket
      const second = allRecords[1];
      expect(second.model).toBe('gpt-4o-mini');
      expect(second.inputTokens).toBe(85000);
      expect(second.outputTokens).toBe(15000);
      expect(second.cachedInputTokens).toBe(0);
      expect(second.totalRequests).toBe(200);

      // Third result: gpt-4o in second bucket
      const third = allRecords[2];
      expect(third.model).toBe('gpt-4o');
      expect(third.inputTokens).toBe(5000);
      expect(third.providerProjectId).toBe('proj_def456');
    });

    it('handles pagination with next_page', async () => {
      const page1 = {
        ...usageFixture,
        has_more: true,
        next_page: 'page_cursor_2',
      };
      const page2 = {
        object: 'page',
        data: [
          {
            object: 'bucket',
            start_time: 1709344800,
            end_time: 1709348400,
            results: [
              {
                input_tokens: 1000,
                output_tokens: 500,
                input_cached_tokens: 0,
                num_model_requests: 5,
                project_id: 'proj_abc123',
                model: 'gpt-4o',
              },
            ],
          },
        ],
        has_more: false,
        next_page: null,
      };

      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify(page1), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(page2), { status: 200 })
        );

      const allRecords = [];
      for await (const batch of adapter.fetchUsage(credentials, baseOptions)) {
        allRecords.push(...batch);
      }

      // 3 from page1 + 1 from page2
      expect(allRecords).toHaveLength(4);
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      // Verify page parameter was sent on second call
      const secondCallUrl = fetchSpy.mock.calls[1][0] as string;
      expect(secondCallUrl).toContain('page=page_cursor_2');
    });

    it('yields nothing on empty response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: [], has_more: false, next_page: null }),
          { status: 200 }
        )
      );

      const allRecords = [];
      for await (const batch of adapter.fetchUsage(credentials, baseOptions)) {
        allRecords.push(...batch);
      }

      expect(allRecords).toHaveLength(0);
    });

    it('stops on API error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Rate limited', { status: 429 })
      );

      const allRecords = [];
      for await (const batch of adapter.fetchUsage(credentials, baseOptions)) {
        allRecords.push(...batch);
      }

      expect(allRecords).toHaveLength(0);
    });
  });

  describe('fetchCosts', () => {
    it('parses cost response and converts dollars to cents', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(costsFixture), { status: 200 })
      );

      const allRecords = [];
      for await (const batch of adapter.fetchCosts(credentials, baseOptions)) {
        allRecords.push(...batch);
      }

      // 2 buckets: first with 2 results, second with 1 result = 3 records
      expect(allRecords).toHaveLength(3);

      // First cost: $12.50 → 1250 cents
      const first = allRecords[0];
      expect(first.amountCents).toBe(1250);
      expect(first.currency).toBe('USD');
      expect(first.provider).toBe('openai');
      expect(first.source).toBe('provider');
      expect(first.providerProjectId).toBe('proj_abc123');
      expect(first.costCategory).toBe('Completions');

      // Verify date is extracted from start_time
      // 1709251200 = 2024-03-01T00:00:00Z
      expect(first.bucketDate).toBe('2024-03-01');

      // Second cost: $0.75 → 75 cents
      expect(allRecords[1].amountCents).toBe(75);
      expect(allRecords[1].providerProjectId).toBe('proj_def456');

      // Third cost: $8.25 → 825 cents
      expect(allRecords[2].amountCents).toBe(825);
    });

    it('handles pagination for costs', async () => {
      const page1 = { ...costsFixture, has_more: true, next_page: 'cost_p2' };
      const page2 = {
        data: [],
        has_more: false,
        next_page: null,
      };

      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify(page1), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(page2), { status: 200 })
        );

      const allRecords = [];
      for await (const batch of adapter.fetchCosts(credentials, baseOptions)) {
        allRecords.push(...batch);
      }

      expect(allRecords).toHaveLength(3);
    });

    it('yields nothing on empty cost response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: [], has_more: false, next_page: null }),
          { status: 200 }
        )
      );

      const allRecords = [];
      for await (const batch of adapter.fetchCosts(credentials, baseOptions)) {
        allRecords.push(...batch);
      }

      expect(allRecords).toHaveLength(0);
    });
  });

  describe('listEntities', () => {
    it('returns project entities', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              { id: 'proj_abc', name: 'My Project' },
              { id: 'proj_def', name: 'Other Project' },
            ],
            has_more: false,
          }),
          { status: 200 }
        )
      );

      const entities = await adapter.listEntities(credentials);
      expect(entities).toHaveLength(2);
      expect(entities[0]).toEqual({
        id: 'proj_abc',
        name: 'My Project',
        type: 'project',
      });
      expect(entities[1]).toEqual({
        id: 'proj_def',
        name: 'Other Project',
        type: 'project',
      });
    });

    it('handles paginated project listing', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: [{ id: 'proj_1', name: 'First' }],
              has_more: true,
            }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: [{ id: 'proj_2', name: 'Second' }],
              has_more: false,
            }),
            { status: 200 }
          )
        );

      const entities = await adapter.listEntities(credentials);
      expect(entities).toHaveLength(2);
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      const secondCallUrl = fetchSpy.mock.calls[1][0] as string;
      expect(secondCallUrl).toContain('after=proj_1');
    });

    it('returns empty array on API error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Forbidden', { status: 403 })
      );

      const entities = await adapter.listEntities(credentials);
      expect(entities).toEqual([]);
    });
  });
});
