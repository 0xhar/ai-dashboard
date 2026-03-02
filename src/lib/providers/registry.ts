import type { ProviderType } from '@/lib/types';
import type { ProviderAdapter } from './types';
import { OpenAIAdapter } from './openai';
import { AnthropicAdapter } from './anthropic';
import { AWSBedrockAdapter } from './aws-bedrock';
import { LiteLLMAdapter } from './litellm';

const adapters: Record<ProviderType, ProviderAdapter> = {
  openai: new OpenAIAdapter(),
  anthropic: new AnthropicAdapter(),
  aws_bedrock: new AWSBedrockAdapter(),
  litellm: new LiteLLMAdapter(),
};

export function getAdapter(providerType: ProviderType): ProviderAdapter {
  const adapter = adapters[providerType];
  if (!adapter) {
    throw new Error(`Unknown provider type: ${providerType}`);
  }
  return adapter;
}
