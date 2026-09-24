"use client";

import React from 'react';
import { Label } from '@/components/ui/label';

interface Props {
  id: string;
  label: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
}

export function ModuleSizeSelector({ id, label, options, value, onChange }: Props) {
  return (
    <div className="space-y-4">
      <Label className="text-[10px] uppercase tracking-widest font-mono text-white/40">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-4 py-2 rounded-lg border text-[10px] font-mono transition-all ${
              value === opt 
              ? 'bg-[#4ade80] text-black border-[#4ade80] shadow-[0_0_15px_#4ade80]' 
              : 'bg-black text-white/40 border-white/5 hover:border-white/20'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
