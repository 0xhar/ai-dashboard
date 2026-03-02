'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ProviderType } from '@/lib/types';

interface CredentialsFormProps {
  provider: ProviderType;
}

export function CredentialsForm({ provider }: CredentialsFormProps) {
  switch (provider) {
    case 'openai':
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="apiKey">Admin API Key</Label>
            <Input
              id="apiKey"
              name="apiKey"
              type="password"
              placeholder="sk-admin-..."
              required
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              Organization admin key from platform.openai.com/settings
            </p>
          </div>
        </div>
      );
    case 'anthropic':
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="apiKey">Admin API Key</Label>
            <Input
              id="apiKey"
              name="apiKey"
              type="password"
              placeholder="sk-ant-admin..."
              required
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              Organization admin key from console.anthropic.com
            </p>
          </div>
        </div>
      );
    case 'aws_bedrock':
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="accessKeyId">Access Key ID</Label>
            <Input id="accessKeyId" name="accessKeyId" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secretAccessKey">Secret Access Key</Label>
            <Input
              id="secretAccessKey"
              name="secretAccessKey"
              type="password"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="region">Region</Label>
            <Input
              id="region"
              name="region"
              placeholder="us-east-1"
              defaultValue="us-east-1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="roleArn">Role ARN (optional)</Label>
            <Input
              id="roleArn"
              name="roleArn"
              placeholder="arn:aws:iam::123456789:role/BedrockReadOnly"
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              For cross-account access via STS AssumeRole
            </p>
          </div>
        </div>
      );
    case 'litellm':
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="databaseUrl">
              PostgreSQL Connection String (recommended)
            </Label>
            <Input
              id="databaseUrl"
              name="databaseUrl"
              type="password"
              placeholder="postgresql://user:pass@host:5432/litellm"
            />
          </div>
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[var(--card)] px-2 text-[var(--muted-foreground)]">
                or
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiEndpoint">API Endpoint</Label>
            <Input
              id="apiEndpoint"
              name="apiEndpoint"
              placeholder="http://localhost:4000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key (optional)</Label>
            <Input id="apiKey" name="apiKey" type="password" />
          </div>
        </div>
      );
  }
}
