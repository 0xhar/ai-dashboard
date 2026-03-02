import type { ProviderType, OrgRole } from './types';

export const PROVIDER_TYPES: ProviderType[] = [
  'openai',
  'anthropic',
  'aws_bedrock',
  'litellm',
];

export const PROVIDER_DISPLAY_NAMES: Record<ProviderType, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  aws_bedrock: 'AWS Bedrock',
  litellm: 'LiteLLM',
};

export const PROVIDER_COLORS: Record<ProviderType, string> = {
  openai: '#10A37F',
  anthropic: '#D4A574',
  aws_bedrock: '#FF9900',
  litellm: '#4F46E5',
};

export const ROLE_HIERARCHY: Record<OrgRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

export const SYNC_INTERVALS = {
  usage: 15 * 60 * 1000, // 15 minutes
  cost: 6 * 60 * 60 * 1000, // 6 hours
  budgetCheck: 60 * 60 * 1000, // 1 hour
} as const;

export const CHART_COLORS = [
  '#2563eb',
  '#10A37F',
  '#D4A574',
  '#FF9900',
  '#4F46E5',
  '#ec4899',
  '#14b8a6',
  '#f97316',
];
