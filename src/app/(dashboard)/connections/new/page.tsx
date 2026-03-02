'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CredentialsForm } from '@/components/connections/credentials-form';
import { PROVIDER_DISPLAY_NAMES, PROVIDER_COLORS } from '@/lib/constants';
import type { ProviderType } from '@/lib/types';
import { toast } from 'sonner';

const providers: ProviderType[] = [
  'openai',
  'anthropic',
  'aws_bedrock',
  'litellm',
];

export default function NewConnectionPage() {
  const router = useRouter();
  const [step, setStep] = useState<'select' | 'configure'>('select');
  const [selectedProvider, setSelectedProvider] = useState<ProviderType | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedProvider) return;
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const credentials: Record<string, string> = {};
    formData.forEach((value, key) => {
      if (key !== 'displayName' && value) {
        credentials[key] = value as string;
      }
    });

    try {
      const res = await fetch('/api/v1/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          displayName:
            formData.get('displayName') ||
            PROVIDER_DISPLAY_NAMES[selectedProvider],
          credentials,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Failed to create connection');
        setLoading(false);
        return;
      }

      toast.success('Connection created successfully');
      router.push('/connections');
    } catch {
      toast.error('Request failed');
      setLoading(false);
    }
  }

  if (step === 'select') {
    return (
      <div>
        <h1 className="text-2xl font-bold">Add Connection</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Choose a provider to connect
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {providers.map((p) => (
            <Card
              key={p}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => {
                setSelectedProvider(p);
                setStep('configure');
              }}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: PROVIDER_COLORS[p] }}
                  />
                  <CardTitle className="text-lg">
                    {PROVIDER_DISPLAY_NAMES[p]}
                  </CardTitle>
                </div>
                <CardDescription>
                  {p === 'openai' &&
                    'Poll usage and cost data from OpenAI Admin API'}
                  {p === 'anthropic' &&
                    'Poll usage and cost data from Anthropic Admin API'}
                  {p === 'aws_bedrock' &&
                    'Pull metrics from CloudWatch and Cost Explorer'}
                  {p === 'litellm' &&
                    'Connect to LiteLLM database or API for spend data'}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <Button
        variant="ghost"
        onClick={() => setStep('select')}
        className="mb-4"
      >
        &larr; Back
      </Button>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: PROVIDER_COLORS[selectedProvider!] }}
            />
            <CardTitle>
              Configure {PROVIDER_DISPLAY_NAMES[selectedProvider!]}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                name="displayName"
                placeholder={PROVIDER_DISPLAY_NAMES[selectedProvider!]}
              />
            </div>
            <CredentialsForm provider={selectedProvider!} />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating...' : 'Create Connection'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
