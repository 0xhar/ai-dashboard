'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { GroupBy } from '@/lib/types';

interface GroupByToggleProps {
  value: GroupBy;
  onChange: (value: GroupBy) => void;
}

export function GroupByToggle({ value, onChange }: GroupByToggleProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as GroupBy)}>
      <TabsList>
        <TabsTrigger value="provider">Provider</TabsTrigger>
        <TabsTrigger value="model">Model</TabsTrigger>
        <TabsTrigger value="team">Team</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
