"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  Plus, 
  MoreHorizontal,
  ArrowUpRight,
  TrendingUp,
  Circle,
  FileText,
  Bell
} from 'lucide-react';

interface Prospect {
  id: string;
  name: string;
  segment: string;
  stage: string;
  owner: {
    name: string;
    avatar: string;
  };
  openDeals: number;
  pipelineValue: number;
  winProbability: number;
  activityTrend: number[];
  lastInteraction: string;
}

const DUMMY_PROSPECTS: Prospect[] = [
  {
    id: '1',
    name: 'LVMH',
    segment: 'Enterprise',
    stage: 'Upsell',
    owner: { name: 'Sarah Nguyen', avatar: 'https://i.pravatar.cc/150?u=sarah' },
    openDeals: 7,
    pipelineValue: 420000,
    winProbability: 70,
    activityTrend: [2, 5, 3, 8, 4, 10, 6, 9],
    lastInteraction: '21 Feb'
  },
  {
    id: '2',
    name: 'Disney',
    segment: 'Enterprise',
    stage: 'New Logo',
    owner: { name: 'James Taylor', avatar: 'https://i.pravatar.cc/150?u=james' },
    openDeals: 4,
    pipelineValue: 311242,
    winProbability: 51,
    activityTrend: [4, 2, 6, 3, 5, 2, 4, 3],
    lastInteraction: '22 Feb'
  },
  {
    id: '3',
    name: 'Paypal',
    segment: 'Enterprise',
    stage: 'Expansion',
    owner: { name: 'Maria Keller', avatar: 'https://i.pravatar.cc/150?u=maria' },
    openDeals: 5,
    pipelineValue: 124232,
    winProbability: 22,
    activityTrend: [1, 2, 1, 3, 2, 4, 5, 2],
    lastInteraction: '12 Mar'
  },
  {
    id: '4',
    name: 'Microsoft',
    segment: 'Strategic',
    stage: 'Expansion',
    owner: { name: 'Mark Darnalds', avatar: 'https://i.pravatar.cc/150?u=mark' },
    openDeals: 8,
    pipelineValue: 320222,
    winProbability: 86,
    activityTrend: [5, 7, 6, 9, 8, 10, 9, 12],
    lastInteraction: '15 Mar'
  }
];

export default function ProspectsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="p-8 space-y-8 font-sans">
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black text-white uppercase tracking-[0.1em]">Companies</h1>
          <div className="px-2 py-0.5 rounded-full bg-[#4ade80]/10 border border-[#4ade80]/20 text-[9px] font-black text-[#4ade80] uppercase tracking-widest">
            ● Active
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
             <button className="p-2 text-white/40 hover:text-white transition-all"><Search className="w-4 h-4" /></button>
             <button className="p-2 text-white/40 hover:text-white transition-all"><Bell className="w-4 h-4" /></button>
             <div className="flex items-center gap-2 pl-4 border-l border-white/10">
                <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center text-[10px] font-bold text-orange-400">JA</div>
                <span className="text-[10px] font-bold text-white/60">Jensen Ackles</span>
             </div>
          </div>
        </div>
      </div>

      {/* TABS & ACTIONS */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
         <div className="flex items-center gap-6">
            <button className="text-[11px] font-black text-white uppercase tracking-widest border-b-2 border-white pb-2">Companies</button>
            <button className="text-[11px] font-bold text-white/30 uppercase tracking-widest hover:text-white pb-2 transition-all">Deals</button>
            <button className="text-[11px] font-bold text-white/30 uppercase tracking-widest hover:text-white pb-2 transition-all">Forecast</button>
         </div>
         <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-white/60 hover:text-white flex items-center gap-2 transition-all">
               <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button className="px-4 py-2 bg-[#4f46e5] text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-indigo-500/20">
               <Plus className="w-4 h-4" /> New Company
            </button>
         </div>
      </div>

      {/* FILTER RIBBON */}
      <div className="flex items-center gap-4 py-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 pr-4 border-r border-white/5">
           <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Sort by</span>
           <select className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[9px] font-bold text-white/60 outline-none">
              <option>Pipeline Value</option>
           </select>
        </div>
        <div className="flex items-center gap-2 pr-4 border-r border-white/5">
           <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Filter</span>
           <select className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[9px] font-bold text-white/60 outline-none">
              <option>All Owners</option>
           </select>
        </div>
        <div className="flex items-center gap-2 pr-4 border-r border-white/5">
           <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Stage</span>
           <select className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[9px] font-bold text-white/60 outline-none">
              <option>Any</option>
           </select>
        </div>
        <div className="flex items-center gap-2 pr-4 border-r border-white/5">
           <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Last Activity</span>
           <select className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[9px] font-bold text-white/60 outline-none">
              <option>90 Days</option>
           </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[10px] uppercase font-bold text-white/20 tracking-[0.2em] border-b border-white/5">
              <th className="pb-6 w-8 shrink-0">
                <input type="checkbox" className="w-3 h-3 rounded border-white/20 bg-transparent" />
              </th>
              <th className="pb-6 px-4">Companies</th>
              <th className="pb-6 px-4">Segment & Stage</th>
              <th className="pb-6 px-4">Account Owner</th>
              <th className="pb-6 px-4">Open Deals</th>
              <th className="pb-6 px-4">Pipeline Value</th>
              <th className="pb-6 px-4">Win Probability</th>
              <th className="pb-6 px-4">Activity Trend</th>
              <th className="pb-6 px-4">Last Interaction</th>
              <th className="pb-6 px-4 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {DUMMY_PROSPECTS.map((prospect) => (
              <motion.tr 
                key={prospect.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="group border-b border-white/[0.03] hover:bg-white/[0.02] transition-all"
              >
                <td className="py-4">
                  <input type="checkbox" className="w-3 h-3 rounded border-white/20 bg-transparent" />
                </td>
                <td className="py-4 px-4">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-white/40">
                         {prospect.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs font-bold text-white">{prospect.name}</span>
                   </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${
                      prospect.segment === 'Enterprise' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      prospect.segment === 'Strategic' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      'bg-white/5 text-white/40 border-white/10'
                    }`}>
                      {prospect.segment}
                    </span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${
                      prospect.stage === 'Upsell' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                      prospect.stage === 'New Logo' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                      'bg-orange-500/10 text-orange-400 border-orange-500/20'
                    }`}>
                      {prospect.stage}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <img src={prospect.owner.avatar} alt="" className="w-5 h-5 rounded-full" />
                    <span className="text-[10px] font-bold text-white/60">{prospect.owner.name}</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                   <span className="text-xs font-mono font-bold text-white">{prospect.openDeals}</span>
                </td>
                <td className="py-4 px-4">
                   <span className="text-xs font-mono font-bold text-white">${prospect.pipelineValue.toLocaleString()}</span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${prospect.winProbability}%` }}
                        className={`h-full ${
                          prospect.winProbability > 75 ? 'bg-[#4ade80]' : 
                          prospect.winProbability > 40 ? 'bg-orange-400' : 'bg-red-400'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-white/60">{prospect.winProbability}%</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-end gap-0.5 h-6">
                    {prospect.activityTrend.map((val, i) => (
                      <div 
                        key={i} 
                        style={{ height: `${(val / 12) * 100}%` }}
                        className="w-1.5 bg-[#4ade80]/40 rounded-t-sm group-hover:bg-[#4ade80] transition-all"
                      />
                    ))}
                  </div>
                </td>
                <td className="py-4 px-4">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-white/80">{prospect.lastInteraction}</span>
                      <span className="text-[8px] uppercase font-bold text-white/20 tracking-widest mt-1">QBR Call</span>
                   </div>
                </td>
                <td className="py-4">
                   <button className="p-1.5 rounded bg-transparent text-white/20 hover:text-white hover:bg-white/5 transition-all">
                      <MoreHorizontal className="w-3.5 h-3.5" />
                   </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FOOTER STATS */}
      <div className="flex items-center justify-between pt-6 border-t border-white/5">
        <div className="text-[10px] font-bold uppercase text-white/20 tracking-widest">
          {DUMMY_PROSPECTS.length} Companies in view
        </div>
        <div className="flex items-center gap-8">
           <div className="flex items-center gap-3">
              <span className="text-[10px] uppercase font-bold text-white/20 tracking-widest">+ SUM OF PIPELINE</span>
              <span className="text-xs font-mono font-black text-white">$975,700</span>
           </div>
           <div className="flex items-center gap-3">
              <span className="text-[10px] uppercase font-bold text-white/20 tracking-widest">+ AVG WIN PROBABILITY</span>
              <span className="text-xs font-mono font-black text-white">57%</span>
           </div>
        </div>
      </div>
    </div>
  );
}
