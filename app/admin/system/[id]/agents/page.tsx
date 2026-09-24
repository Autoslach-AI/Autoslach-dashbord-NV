"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Plus, Lock, ChevronDown, Brain
} from 'lucide-react';
import { createClient } from '@/lib/supabase';

const supabase = createClient();

export default function AgentsPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id as string;

  const [enterprise, setEnterprise] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [planDef, setPlanDef] = useState<any>(null);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function fetchData() {
      const res = await fetch(`/api/admin/enterprise/${id}`);
      const { enterprise: ent, agents: agentsData, planDef: pd } = await res.json();
      setEnterprise(ent);
      setAgents(agentsData || []);
      setPlanDef(pd);

      // Available models
      const { data: models } = await supabase
        .from('available_models')
        .select('*')
        .eq('is_active', true)
        .order('complexity');
      setAvailableModels(models || []);

      setLoading(false);
    }
    fetchData();
  }, [id]);

  const maxAgents = enterprise?.max_agents_override ?? planDef?.max_agents_allowed ?? 0;
  const activeAgents = agents.filter(a => a.status !== 'archived');

  const handleDeployAgent = async () => {
    if (activeAgents.length >= maxAgents && maxAgents !== 99) return;
    setDeploying(true);
    const defaultModel = availableModels[0]?.model_string || 'claude-sonnet-4-20250514';
    const { data: newAgent, error } = await supabase
      .from('agents')
      .insert({
        enterprise_id: id,
        name: 'NOUVEL AGENT',
        status: 'standby',
        primary_api: defaultModel,
        temperature: 0.7,
        token_budget: 50000,
        system_prompt: '',
        neural_load: 0,
        model_config: { kb_access: false }
      })
      .select()
      .single();

    if (!error && newAgent) {
      setAgents(prev => [...prev, newAgent]);
      router.push(`/admin/system/${id}/agent/${newAgent.id}`);
    }
    setDeploying(false);
  };

  const getPlanColor = (plan: string) => {
    switch (plan?.toUpperCase()) {
      case 'STARTUP': return '#6B7280';
      case 'BUSINESS': return '#3B82F6';
      case 'ENTERPRISE': return '#10B981';
      case 'ELITE': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-white/5 border-t-[#10B981] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      
      {/* ── PAGE HEADER ── */}
      <div className="sticky top-0 z-10 bg-[#1a1a1a]/95 backdrop-blur border-b border-white/5 px-8 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-black text-white uppercase tracking-tight">Agent Task Force</h1>
            <p className="text-[10px] font-mono text-white/30 mt-0.5">
              {activeAgents.length} / {maxAgents === 99 ? '∞' : maxAgents} agents déployés
              {enterprise?.max_agents_override && <span className="ml-2 text-[#F59E0B]">· Override actif</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest"
              style={{ backgroundColor: `${getPlanColor(enterprise?.package_type)}20`, color: getPlanColor(enterprise?.package_type), border: `1px solid ${getPlanColor(enterprise?.package_type)}40` }}>
              {enterprise?.package_type}
            </span>
            {maxAgents > 0 && activeAgents.length < maxAgents && (
              <button
                onClick={handleDeployAgent}
                disabled={deploying}
                className="flex items-center gap-2 px-4 py-2 bg-[#10B981] text-black font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-[#0ea572] transition-all disabled:opacity-40"
              >
                {deploying
                  ? <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  : <Plus className="w-3.5 h-3.5" />
                }
                Déployer
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-8 py-8">
        <div className="max-w-3xl mx-auto space-y-10">

          {/* ── PLAN STARTUP ── */}
          {maxAgents === 0 && (
            <div className="bg-[#252525] border border-dashed border-white/10 rounded-2xl p-20 flex flex-col items-center justify-center text-center space-y-5">
              <Lock className="w-12 h-12 text-white/10" />
              <div>
                <p className="text-[14px] font-black text-white/20 uppercase tracking-widest mb-2">Aucun agent — Plan Startup</p>
                <p className="text-[10px] font-mono text-white/20">Passez au plan Business pour déployer des agents IA</p>
              </div>
            </div>
          )}

          {/* ── AGENTS ── */}
          <div className="space-y-4">
            {activeAgents.map((agent) => (
              <div 
                key={agent.id} 
                className="bg-[#252525] border border-white/5 rounded-2xl overflow-hidden cursor-pointer hover:bg-white/[0.02] transition-all group"
                onClick={() => router.push(`/admin/system/${id}/agent/${agent.id}`)}
              >
                {/* CARTE HEADER */}
                <div className="flex items-center gap-5 px-6 py-5">
                  <div className="w-11 h-11 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0 bg-[#0D0D0D]">
                    {agent.avatar_url
                      ? <img src={agent.avatar_url} alt={agent.name} className="w-full h-full object-cover shadow-[0_0_15px_rgba(0,0,0,0.5)]" />
                      : <Brain className="w-5 h-5 text-white/20" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[13px] font-black text-white uppercase truncate tracking-wide group-hover:text-[#10B981] transition-colors">{agent.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest flex-shrink-0 ${
                        agent.status === 'active'
                          ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20'
                          : 'bg-white/5 text-white/30 border border-white/10'
                      }`}>
                        {agent.status === 'active' ? '● ACTIVE' : '● STANDBY'}
                      </span>
                    </div>
                    <p className="text-[9px] font-mono text-white/30 uppercase tracking-tighter">
                      {agent.primary_api || 'Base_Protocol'} · {agent.neural_load || 0}% load
                    </p>
                  </div>
                  <div className="text-white/20 flex-shrink-0 group-hover:text-white transition-colors">
                    <ChevronDown className="w-4 h-4 -rotate-90" />
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

    </div>
  );
}

