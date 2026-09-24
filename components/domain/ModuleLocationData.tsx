"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';

interface Props {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
}

export function ModuleLocationData({ id, label, placeholder, value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-[10px] uppercase tracking-widest font-mono text-white/40 flex items-center gap-2">
        <MapPin className="w-3 h-3" />
        {label}
      </Label>
      <Input
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-black border-white/10 font-mono text-xs focus:border-[#4ade80]/40 transition-all shadow-[inset_0_0_10px_rgba(255,255,255,0.02)]"
      />
    </div>
  );
}
