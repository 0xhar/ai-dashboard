import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicAdapter } from '@/lib/providers/anthropic';
import type { FetchOptions } from '@/lib/providers/types';
import usageFixture from '../../fixtures/anthropic-usage-response.json';
import costFixture from '../../fixtures/anthropic-cost-response.json';

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

const adapter = new AnthropicAdapter();
const credentials = { apiKey: 'sk-ant-admin-test-key' };
const baseOptions: FetchOptions = {
  orgId: 'org_test',
  connectionId: 'conn_test',
  startTime: new Date('2024-03-01T00:00:00Z'),
  endTime: new Date('2024-03-02T00:00:00Z'),
};

describe('AnthropicAdapter', () => {
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

    it('returns error on non-200 response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Forbidden', { status: 403 })
      );

      const result = await adapter.testCredentials(credentials);
      expect(result.success).toBe(false);
      expect(result.error).toContain('403');
    });

    it('sends correct headers (x-api-key + anthropic-version)', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ data: [] }), { status: 200 })
        );

      await adapter.testCredentials(credentials);

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toContain('/v1/organizations/workspaces');
      expect((init as RequestInit).headers).toEqual({
        'x-api-key': 'sk-ant-admin-test-key',
        'anthropic-version': '2023-06-01',
      });
    });

    it('returns error on network failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
        new Error('Connection refused')
      );

      const result = await adapter.testCredentials(credentials);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection refused');
    });
  });

  describe('fetchUsage', () => {
    it('parses usage response with correct token mapping', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(usageFixture), { status: 200 })
      );

      const allRecords = [];
      for await (const batch of adapter.fetchUsage(credentials, baseOptions)) {
        allRecords.push(...batch);
      }

      expect(allRecords).toHaveLength(2);

      // First record: claude-sonnet-4-20250514
      const first = allRecords[0];
      expect(first.provider).toBe('anthropic');
      expect(first.source).toBe('provider');
      expect(first.model).toBe('claude-sonnet-4-20250514');
      expect(first.inputTokens).toBe(25000); // uncached_input_tokens
      expect(first.outputTokens).toBe(8500);
      expect(first.cachedInputTokens).toBe(3000); // cache_read_input_tokens
      expect(first.totalRequests).toBe(30);
      expect(first.providerWorkspaceId).toBe('ws_abc123');
      expect(first.providerApiKeyId).toBe('key_ant_001');
      expect(first.bucketWidth).toBe('1h');
      expect(first.orgId).toBe('org_test');
      expect(first.connectionId).toBe('conn_test');

      // Verify ISO timestamp parsing
      expect(first.bucketStart).toEqual(new Date('2024-03-01T10:00:00Z'));
      expect(first.bucketEnd).toEqual(new Date('2024-03-01T11:00:00Z'));

      // Second record: claude-haiku-3-20240307
      const second = allRecords[1];
      expect(second.model).toBe('claude-haiku-3-20240307');
      expect(second.inputTokens).toBe(150000);
      expect(second.outputTokens).toBe(40000);
      expect(second.cachedInputTokens).toBe(0);
      expect(second.totalRequests).toBe(500);
    });

    it('handles pagination with next_page', async () => {
      const page1 = { ...usageFixture, next_page: 'token_page2' };
      const page2 = {
        data: [
          {
            start_time: '2024-03-01T12:00:00Z',
            end_time: '2024-03-01T13:00:00Z',
            model: 'claude-sonnet-4-20250514',
            workspace_id: 'ws_abc123',
            uncached_input_tokens: 5000,
            output_tokens: 2000,
            cache_read_input_tokens: 0,
            num_requests: 10,
          },
        ],
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

      expect(allRecords).toHaveLength(3);
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      const secondCallUrl = fetchSpy.mock.calls[1][0] as string;
      expect(secondCallUrl).toContain('next_page=token_page2');
    });

    it('yields nothing on empty response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [], next_page: null }), {
          status: 200,
        })
      );

      const allRecords = [];
      for await (const batch of adapter.fetchUsage(credentials, baseOptions)) {
        allRecords.push(...batch);
      }

      expect(allRecords).toHaveLength(0);
    });

    it('stops on API error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Internal Server Error', { status: 500 })
      );

      const allRecords = [];
      for await (const batch of adapter.fetchUsage(credentials, baseOptions)) {
        allRecords.push(...batch);
      }

      expect(allRecords).toHaveLength(0);
    });
  });

  describe('fetchCosts', () => {
    it('parses cost response with decimal-string cents correctly', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(costFixture), { status: 200 })
      );

      const allRecords = [];
      for await (const batch of adapter.fetchCosts(credentials, baseOptions)) {
        allRecords.push(...batch);
      }

      expect(allRecords).toHaveLength(2);

      // First cost: amount "1542" cents → 1542 cents (rounded from parseFloat)
      const first = allRecords[0];
      expect(first.amountCents).toBe(1542);
      expect(first.currency).toBe('USD');
      expect(first.provider).toBe('anthropic');
      expect(first.source).toBe('provider');
      expect(first.bucketDate).toBe('2024-03-01');
      expect(first.model).toBe('claude-sonnet-4-20250514');
      expect(first.providerWorkspaceId).toBe('ws_abc123');
      expect(first.costCategory).toBe('claude-sonnet-4-20250514');

      // Second cost: amount "325.50" → 326 cents (Math.round)
      const second = allRecords[1];
      expect(second.amountCents).toBe(326);
      expect(second.providerWorkspaceId).toBe('ws_def456');
      expect(second.model).toBe('claude-haiku-3-20240307');
    });

    it('yields nothing on empty cost response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [], next_page: null }), {
          status: 200,
        })
      );

      const allRecords = [];
      for await (const batch of adapter.fetchCosts(credentials, baseOptions)) {
        allRecords.push(...batch);
      }

      expect(allRecords).toHaveLength(0);
    });

    it('handles pagination for costs', async () => {
      const page1 = { ...costFixture, next_page: 'cost_token_p2' };
      const page2 = { data: [], next_page: null };

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

      expect(allRecords).toHaveLength(2);
    });
  });

  describe('listEntities', () => {
    it('returns workspace entities', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              { id: 'ws_1', display_name: 'Production' },
              { id: 'ws_2', display_name: 'Staging', name: 'staging' },
            ],
            has_more: false,
          }),
          { status: 200 }
        )
      );

      const entities = await adapter.listEntities(credentials);
      expect(entities).toHaveLength(2);
      expect(entities[0]).toEqual({
        id: 'ws_1',
        name: 'Production',
        type: 'workspace',
      });
      expect(entities[1]).toEqual({
        id: 'ws_2',
        name: 'Staging',
        type: 'workspace',
      });
    });

    it('falls back to name when display_name is missing', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [{ id: 'ws_1', name: 'default-workspace' }],
            has_more: false,
          }),
          { status: 200 }
        )
      );

      const entities = await adapter.listEntities(credentials);
      expect(entities[0].name).toBe('default-workspace');
    });

    it('returns empty array on API error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Not found', { status: 404 })
      );

      const entities = await adapter.listEntities(credentials);
      expect(entities).toEqual([]);
    });
  });
});
