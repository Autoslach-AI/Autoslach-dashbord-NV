"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
}

export function ModuleGenericText({ id, label, placeholder, value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-[10px] uppercase tracking-widest font-mono text-white/40">{label}</Label>
      <Input
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-black border-white/5 font-mono text-xs focus:border-[#4ade80]/40 transition-all"
      />
    </div>
  );
}
