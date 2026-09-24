"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getDomainConfig, BusinessDomain } from '@/lib/domain-registry';
import { ModuleGenericText } from './ModuleGenericText';
import { ModuleSizeSelector } from './ModuleSizeSelector';
import { ModuleTechnicalSpecs } from './ModuleTechnicalSpecs';
import { ModuleLocationData } from './ModuleLocationData';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Save, Zap } from 'lucide-react';

export function UniversalProductForm({ domain, extendedSpecs, onChange }: { 
  domain: string, 
  extendedSpecs: any, 
  onChange: (key: string, val: any) => void 
}) {
  const config = getDomainConfig(domain);

   if (!domain || domain === 'GENERIC') {
    return (
       <div className="py-20 px-10 text-center space-y-6 bg-white/[0.01] border border-dashed border-white/10 rounded-[2.5rem] group transition-all hover:bg-white/[0.02]">
          <div className="w-16 h-16 rounded-[2rem] bg-white/5 flex items-center justify-center mx-auto border border-white/10 group-hover:scale-110 transition-transform">
             <Zap className="w-8 h-8 text-white/20 animate-pulse group-hover:text-[#39FF14] transition-colors" />
          </div>
          <div className="space-y-3">
             <p className="text-[12px] font-black text-white/40 uppercase tracking-[0.4em]">SECTOR_ID: NULL_EXCEPTION</p>
             <p className="text-[9px] font-mono text-white/10 uppercase tracking-[0.2em] leading-loose max-w-sm mx-auto">
                Universal Chameleon Engine blocked. <br /> 
                <span className="text-[#39FF14]/40">Identity secteur non-détecté.</span> <br />
                Please complete the onboarding sequence or re-initialize the neural link.
             </p>
          </div>
       </div>
    );
  }

  const renderModule = (mod: any) => {
    const commonProps = {
      key: mod.id,
      id: mod.id,
      label: mod.label,
      placeholder: mod.placeholder,
      value: extendedSpecs[mod.id] || '',
      onChange: (val: any) => onChange(mod.id, val)
    };

    switch (mod.type) {
      case 'select':
        if (domain === 'FASHION' && mod.id === 'size_grid') {
          return <ModuleSizeSelector {...commonProps} options={mod.options} />;
        }
        return (
          <div key={mod.id} className="space-y-3">
            <Label className="text-[10px] uppercase tracking-[0.3em] font-mono text-white/40">{mod.label}</Label>
            <div className="relative">
               <select 
                 value={extendedSpecs[mod.id] || ''}
                 onChange={(e) => onChange(mod.id, e.target.value)}
                 className="w-full bg-black border border-white/10 rounded-xl px-5 py-4 font-mono text-xs text-white/80 focus:outline-none focus:border-[#39FF14] transition-all appearance-none cursor-pointer"
               >
                 <option value="">SELECT_LEVEL</option>
                 {mod.options.map((o: string) => <option key={o} value={o}>{o}</option>)}
               </select>
               <Zap className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 pointer-events-none" />
            </div>
          </div>
        );
      case 'text':
        if (domain === 'ELECTRONICS') return <ModuleTechnicalSpecs {...commonProps} />;
        if (domain === 'REAL_ESTATE') return <ModuleLocationData {...commonProps} />;
        return <ModuleGenericText {...commonProps} />;
      case 'number':
        return <ModuleGenericText {...commonProps} />;
      case 'date':
        return (
          <div key={mod.id} className="space-y-3">
            <Label className="text-[10px] uppercase tracking-[0.3em] font-mono text-white/40">{mod.label}</Label>
            <Input 
              type="date"
              value={extendedSpecs[mod.id] || ''}
              onChange={(e) => onChange(mod.id, e.target.value)}
              className="bg-black border-white/10 font-mono text-xs focus:border-[#39FF14] text-white/60 h-14"
            />
          </div>
        );
      case 'boolean':
        return (
          <div key={mod.id} className="flex items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-2xl group hover:border-white/10 transition-all">
            <Label className="text-[10px] uppercase tracking-[0.3em] font-mono text-white/40">{mod.label}</Label>
            <button 
              type="button"
              onClick={() => onChange(mod.id, !extendedSpecs[mod.id])}
              className={`w-14 h-7 rounded-full transition-all relative ${extendedSpecs[mod.id] ? 'bg-[#39FF14]' : 'bg-white/10'}`}
            >
              <div className={`absolute top-1 w-5 h-5 bg-black rounded-full transition-all ${extendedSpecs[mod.id] ? 'left-8' : 'left-1'}`} />
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <AnimatePresence mode="wait">
      {config.modules.length > 0 && (
         <motion.div 
           key={domain}
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: -20 }}
           className="grid grid-cols-1 md:grid-cols-2 gap-8"
         >
            {config.modules.map(renderModule)}
         </motion.div>
      )}
    </AnimatePresence>
  );
}
