"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
const supabase = createClient();
import { 
  ChevronRight, 
  Activity,
  Brain, 
  ArrowLeft,
  X,
  Zap,
  Lock,
  LockIcon,
  Terminal,
  ExternalLink,
  Plus
} from 'lucide-react';

export default function ClientIsolatedSystemPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id as string;
  const [booting, setBooting] = useState(true);
  const [clientData, setClientData] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [tasksStream, setTasksStream] = useState<any[]>([]);
  const [maxAgents, setMaxAgents] = useState<number>(0);

  const [activeTab, setActiveTab] = useState<'agents' | 'stream'>('agents');
  const [processingCount, setProcessingCount] = useState<number>(0);

  const fetchTasksStream = async () => {
    const { data } = await supabase
      .from('client_agent_tasks')
      .select('agent_id, task_type, task_description, complexity, api_used, status, started_at, output_summary')
      .eq('enterprise_id', id)
      .order('started_at', { ascending: false })
      .limit(10);
    if (data) setTasksStream(data);
  };

  const fetchProcessingCount = async () => {
    const { count } = await supabase
      .from('client_agent_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('enterprise_id', id)
      .eq('status', 'PROCESSING');
    setProcessingCount(count || 0);
  };

  useEffect(() => {
    if (!id) return;

    async function fetchData() {
      if (!id) return;
      
      try {
        const res = await fetch(`/api/admin/enterprise/${id}`);
        console.log('API status:', res.status, 'URL:', `/api/admin/enterprise/${id}`);
        const json = await res.json();
        console.log('API response:', json);
        const { enterprise, agents: agentsData, planDef } = json;

        if (enterprise) {
          setClientData(enterprise);
          const maxAgentsValue = enterprise.max_agents_override ?? planDef?.max_agents_allowed ?? 0;
          setMaxAgents(maxAgentsValue);
          setAgents(agentsData ?? []);
        }
      } catch (err) {
        console.error('fetchData error:', err);
      }

      setBooting(false);
      fetchTasksStream();
      fetchProcessingCount();
    }

    fetchData();

    const interval = setInterval(() => {
      fetchTasksStream();
      fetchProcessingCount();
    }, 30000);
    return () => clearInterval(interval);
  }, [id]);

  const getPlanColor = (plan: string) => {
    switch (plan?.toUpperCase()) {
      case 'STARTUP': return '#6B7280';
      case 'BUSINESS': return '#3B82F6';
      case 'ENTERPRISE': return '#10B981';
      case 'ELITE': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getHealthColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'STABLE': return '#10B981';
      case 'WARNING': return '#F59E0B';
      case 'CRITICAL': return '#EF4444';
      default: return '#10B981';
    }
  };

  const formatDateShort = (dateStr: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).toUpperCase();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-FR').format(val || 0) + ' FCFA';
  };

  if (booting) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/5 border-t-[#10B981] rounded-full animate-spin" />
      </div>
    );
  }

  const tokenUsage = clientData?.token_budget ? (clientData.total_tokens_consumed / clientData.token_budget) * 100 : 0;
  const tokenColor = tokenUsage >= 90 ? '#EF4444' : tokenUsage >= 75 ? '#F59E0B' : '#10B981';

  return (
    <div className="min-h-screen bg-[#080808] text-[#e0e0e0] font-sans">
      {/* COMPACT HEADER */}
      <header className="h-[80px] bg-[#080808] border-b border-[#1a1a1a] flex items-center px-6 justify-between transition-all duration-300">
        
        {/* LEFT SECTION */}
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.back()}
            className="w-9 h-9 bg-[#1a1a1a] border border-white/5 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all text-white/50 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center">
              <Brain className="w-5 h-5 text-[#10B981]" />
            </div>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-[#666] font-bold uppercase tracking-[0.2em] text-[8px]">
                <span>Integrated_Lattice</span>
                <ChevronRight className="w-2.5 h-2.5 text-white/10" />
                <span className="text-[#10B981]">Projet Entreprise</span>
              </div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-black text-white uppercase tracking-tight">{clientData?.name || 'Neural Dynamics'}</h1>
                <div className="px-2 py-0.5 bg-[#10B981]/10 border border-[#10B981]/20 rounded-full">
                  <span className="text-[8px] font-black text-[#10B981] uppercase tracking-widest leading-none">
                    ACTIVE_DOMAIN: {clientData?.sector || 'NON DÉFINI'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SECTION */}
        <div className="flex items-center gap-6">
          <nav className="flex items-center bg-[#111] p-1 rounded-lg border border-white/5">
            <button className="px-5 py-1.5 bg-[#1a1a1a] text-white rounded-md text-[9px] font-black uppercase tracking-widest shadow-lg">Neural Hub</button>
            <button 
              onClick={() => router.push(`/admin/system/${id}/prospects`)}
              className="px-5 py-1.5 text-white/20 hover:text-white/50 text-[9px] font-black uppercase tracking-widest transition-all"
            >
              Prospect
            </button>
            <button className="px-5 py-1.5 text-white/20 hover:text-white/50 text-[9px] font-black uppercase tracking-widest transition-all">Telemetry</button>
            <button className="px-5 py-1.5 text-white/20 hover:text-white/50 text-[9px] font-black uppercase tracking-widest transition-all">Security</button>
          </nav>
          
          <button 
            onClick={() => router.push('/admin')}
            className="h-10 px-6 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-[#10B981] hover:border-[#10B981]/40 transition-all flex items-center gap-2"
          >
            Exit
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* STATS SECTION */}
      <div className="grid grid-cols-4 bg-[#1a1a1a] gap-[1px] border-b border-[#1a1a1a]">
        {/* CARD 1: PLAN & FACTURATION */}
        <div className="bg-[#0A0A0A] p-[28px] relative group overflow-hidden">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B7280]">PLAN & FACTURATION</h3>
            <div className="flex items-center gap-1.5 animate-pulse">
              <span className="text-[9px] font-bold text-[#10B981] tracking-widest">⟳ LIVE</span>
            </div>
          </div>
          <p className="text-[32px] font-extrabold leading-none mb-2" style={{ color: getPlanColor(clientData?.package_type) }}>
            {clientData?.package_type || 'BUSINESS'}
          </p>
          <p className="text-[12px] font-bold text-white/60 mb-8 uppercase tracking-widest">
            {formatCurrency(clientData?.monthly_cost)}
          </p>
          <p className="text-[10px] font-mono text-[#4B5563] uppercase tracking-tight">
            {clientData?.status === 'PROSPECT' ? 'CLIENT NON ACTIVÉ' : `ACTIF DEPUIS ${formatDateShort(clientData?.activated_at) || 'INCONNU'}`}
          </p>
        </div>

        {/* CARD 2: TOKEN USAGE */}
        <div className="bg-[#0A0A0A] p-[28px] relative group overflow-hidden">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B7280]">TOKEN USAGE</h3>
            <div className="flex items-center gap-1.5 animate-pulse duration-[3000ms]">
              <span className="text-[9px] font-bold text-[#10B981] tracking-widest">⟳ LIVE</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-[32px] font-extrabold leading-none" style={{ color: tokenColor }}>
              {Math.round(tokenUsage)}%
            </span>
          </div>
          <div className="h-[3px] w-full bg-white/5 rounded-full mb-4 overflow-hidden">
            <div 
              className="h-full transition-all duration-1000" 
              style={{ width: `${tokenUsage}%`, backgroundColor: tokenColor }} 
            />
          </div>
          <p className="text-[12px] font-bold text-white/60 mb-8 uppercase tracking-widest">
            {clientData?.total_tokens_consumed?.toLocaleString() || 0} / {clientData?.token_budget?.toLocaleString() || '1M'}
          </p>
          <p className="text-[10px] font-mono text-[#4B5563] uppercase tracking-tight">
            {clientData?.package_type === 'STARTUP' ? 'NON APPLICABLE — PLAN STARTUP' : 
             tokenUsage >= 90 ? 'DÉPASSEMENT IMMINENT' : 
             tokenUsage >= 75 ? 'SURVEILLANCE REQUISE' : 'CONSOMMATION NORMALE'}
          </p>
        </div>

        {/* CARD 3: SYSTEM HEALTH */}
        <div className="bg-[#0A0A0A] p-[28px] relative group overflow-hidden">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B7280]">SYSTEM HEALTH</h3>
            <div className="flex items-center gap-1.5 animate-pulse">
              <span className="text-[9px] font-bold text-[#10B981] tracking-widest">⟳ LIVE</span>
            </div>
          </div>
          <p className="text-[32px] font-extrabold leading-none mb-2" style={{ color: getHealthColor(clientData?.status) }}>
            {clientData?.status || 'UNKNOWN'}
          </p>
          <p className="text-[12px] font-bold text-white/60 mb-8 uppercase tracking-widest">
            RÉGION: {clientData?.region || 'FRANCE_SOUTH'}
          </p>
          <p className="text-[10px] font-mono text-[#4B5563] uppercase tracking-tight">
            {clientData?.status === 'STABLE' || clientData?.status === 'ACTIVE' ? 'TOUS SYSTÈMES NOMINAUX' : 
             clientData?.status === 'WARNING' ? 'ANOMALIE DÉTECTÉE — VÉRIFIER AGENTS' : 
             clientData?.status === 'CRITICAL' ? 'INTERVENTION REQUISE' : 'SYSTÈME EN ATTENTE'}
          </p>
        </div>

        {/* CARD 4: DERNIÈRE ACTIVITÉ */}
        <div className="bg-[#0A0A0A] p-[28px] relative group overflow-hidden">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B7280]">DERNIÈRE ACTIVITÉ</h3>
            <div className="flex items-center gap-1.5 animate-pulse duration-[3000ms]">
              <span className="text-[9px] font-bold text-[#10B981] tracking-widest">⟳ LIVE</span>
            </div>
          </div>
          <p className="text-[32px] font-extrabold leading-none mb-2 text-white">
            {formatDateShort(clientData?.last_event_at) || 'N/A'}
          </p>
          <p className="text-[12px] font-bold text-white/60 mb-8 uppercase tracking-widest truncate">
            {clientData?.last_event_text || 'AUCUNE ACTIVITÉ RÉCENTE'}
          </p>
          <p className="text-[10px] font-mono text-[#4B5563] uppercase tracking-tight">
            {!clientData?.last_event_at ? 'AUCUNE ACTIVITÉ — AGENTS EN ATTENTE' : 
             (new Date().getTime() - new Date(clientData.last_event_at).getTime()) > 7 * 24 * 60 * 60 * 1000 ? 
             'INACTIVITÉ DÉTECTÉE' : 'ACTIVITÉ RÉCENTE'}
          </p>
        </div>
      </div>

      {/* SECTION 2: AGENT TASK FORCE & LIVE THOUGHT STREAM */}
      <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] bg-[#080808] border-b border-[#1a1a1a]">
        
        {/* LEFT COLUMN: AGENT TASK FORCE */}
        <div className="p-[28px] lg:p-[32px] border-r border-[#1a1a1a]">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <span className="text-white">⚡</span>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9CA3AF]">AGENT TASK FORCE</h2>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-1 bg-black border border-white/5 rounded-full">
              <div className={`w-1.5 h-1.5 rounded-full ${agents.some(a => a.status?.toLowerCase() === 'active') ? 'bg-[#10B981] animate-pulse' : 'bg-[#6B7280]'}`} />
              <span className={`text-[9px] font-bold uppercase tracking-widest ${agents.some(a => a.status?.toLowerCase() === 'active') ? 'text-[#10B981]' : 'text-[#6B7280]'}`}>
                {agents.some(a => a.status?.toLowerCase() === 'active') ? '● UNITS ACTIVE' : '● STANDBY'}
              </span>
            </div>
          </div>

          {maxAgents === 0 ? (
            <div className="h-[400px] flex flex-col items-center justify-center text-center p-8 bg-[#0a0a0a] border border-dashed border-[#1a1a1a] rounded-xl">
              <Lock className="w-10 h-10 mb-4 text-[#4B5563]" />
              <h4 className="text-[12px] font-bold text-white/40 uppercase tracking-[0.2em] mb-4">AUCUN AGENT — PLAN STARTUP</h4>
              <button 
                onClick={() => router.push(`/admin/system/${id}/settings`)}
                className="px-8 py-3 bg-[#10B981] text-black font-black text-[11px] uppercase tracking-[0.2em] rounded-lg hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)]"
              >
                UPGRADER LE PLAN
              </button>
            </div>
          ) : agents.length === 0 ? (
            <div className={`grid gap-px bg-[#1a1a1a] border border-[#1a1a1a] rounded-xl overflow-hidden ${
              maxAgents >= 3 ? 'grid-cols-3' : maxAgents === 2 ? 'grid-cols-2' : 'grid-cols-1'
            }`}>
              {Array.from({ length: maxAgents }).map((_, i) => (
                <div 
                  key={`empty-${i}`} 
                  onClick={() => router.push(`/admin/system/${id}/agents`)}
                  className="bg-[#0D0D0D] p-12 border border-dashed border-[#10B981]/20 flex flex-col items-center justify-center text-center group/config cursor-pointer hover:bg-[#10B981]/5 transition-all min-h-[300px]"
                >
                  <Plus className="w-8 h-8 text-[#10B981] mb-6 opacity-40 group-hover/config:opacity-100 transition-opacity" />
                  <button className="text-[10px] font-black text-[#10B981] uppercase tracking-[0.2em] px-5 py-2.5 border border-[#10B981]/10 rounded-lg group-hover/config:bg-[#10B981] group-hover/config:text-black transition-all">
                    + CONFIGURER CET AGENT
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className={`grid gap-px bg-[#1a1a1a] border border-[#1a1a1a] rounded-xl overflow-hidden ${
              agents.length >= 3 ? 'grid-cols-3' : agents.length === 2 ? 'grid-cols-2' : 'grid-cols-1'
            }`}>
              {agents.map((agent) => {
                const neuralLoad = agent.neural_load || 0;
                const loadColor = neuralLoad <= 50 ? '#10B981' : neuralLoad <= 80 ? '#F59E0B' : '#EF4444';
                
                return (
                  <div 
                    key={agent.id} 
                    onClick={() => router.push(`/admin/system/${id}/agents`)}
                    className="bg-[#0D0D0D] p-6 hover:bg-[#111827] transition-all group/agent cursor-pointer relative border border-transparent hover:border-white/5"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <span className="text-[8px] font-mono text-[#6B7280] uppercase tracking-widest">[{agent.name.replace(/\s+/g, '_').toUpperCase()}]</span>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${agent.status?.toLowerCase() === 'active' ? 'bg-[#10B981]' : 'bg-[#6B7280]'}`} />
                        <span className={`text-[8px] font-bold uppercase tracking-widest ${agent.status?.toLowerCase() === 'active' ? 'text-[#10B981]' : 'text-[#6B7280]'}`}>
                          {agent.status?.toLowerCase() === 'active' ? '● ACTIVE' : '● STANDBY'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mb-8">
                      <h4 className="text-[18px] font-black text-white uppercase tracking-tighter mb-1">{agent.name}</h4>
                      <p className="text-[9px] font-mono text-white/30 uppercase tracking-[0.2em]">{agent.primary_api || 'LLM_UNIT'}</p>
                    </div>

                    <div className="space-y-2 mb-8">
                      <div className="flex justify-between text-[8px] font-bold text-[#6B7280] uppercase tracking-widest font-mono">
                        <span>NEURAL_LOAD</span>
                        <span style={{ color: loadColor }}>{neuralLoad}%</span>
                      </div>
                      <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full transition-all duration-1000" 
                          style={{ width: `${neuralLoad}%`, backgroundColor: loadColor }} 
                        />
                      </div>
                    </div>

                    <div className="pt-6 border-t border-white/5">
                      <p className="text-[9px] font-mono text-[#4B5563] uppercase tracking-tight line-clamp-1">
                        {agent.current_task ? agent.current_task : 'EN ATTENTE DE MISSION'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: LIVE THOUGHT STREAM */}
        <div className="p-[28px] lg:p-[32px] bg-transparent">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Terminal className="w-4 h-4 text-[#9CA3AF]" />
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9CA3AF]">LIVE THOUGHT STREAM</h2>
              <span className="text-[8px] font-mono text-[#4B5563]"> &gt;_ </span>
            </div>
            {processingCount > 0 && (
              <div className="flex items-center gap-2 px-2 py-0.5 bg-[#10B981]/10 border border-[#10B981]/20 rounded-full animate-pulse">
                <div className="w-1 h-1 rounded-full bg-[#10B981]" />
                <span className="text-[8px] font-black text-[#10B981] uppercase tracking-[0.1em] leading-none">
                  {processingCount} PROCESSING
                </span>
              </div>
            )}
          </div>

          <div className="space-y-0 border border-[#1a1a1a] rounded-xl overflow-hidden bg-[#0a0a0a]/50">
            {clientData?.package_type === 'STARTUP' ? (
              <div className="p-12 flex flex-col items-center justify-center text-center opacity-40">
                <Lock className="w-8 h-8 mb-4 text-[#4B5563]" />
                <span className="text-[10px] font-mono text-[#4B5563] uppercase tracking-widest font-bold">
                  🔒 NON DISPONIBLE
                </span>
              </div>
            ) : tasksStream.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center text-center opacity-40">
                <span className="text-[10px] font-mono text-[#4B5563] uppercase tracking-widest font-bold">
                  FLUX VIDE — EN ATTENTE D'ACTIVITÉ
                </span>
              </div>
            ) : (
              tasksStream.slice(0, 8).map((task, i) => {
                const agent = agents.find(a => a.id === task.agent_id);
                const agentName = agent?.name || 'SYSTEM';
                
                return (
                  <div 
                    key={task.id || i} 
                    onClick={() => router.push(`/admin/system/${id}/agents`)}
                    className="p-4 border-b border-[#1a1a1a] last:border-0 hover:bg-[#111827] transition-all group/task cursor-pointer overflow-hidden"
                  >
                    <div className="flex gap-2 items-center mb-1.5 whitespace-nowrap overflow-hidden">
                      <span className="text-[9px] font-mono text-[#6B7280] tabular-nums">
                        [{new Date(task.started_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}]
                      </span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-1 h-1 rounded-full bg-[#10B981]" />
                        <span className="text-[10px] font-black text-[#10B981] uppercase truncate max-w-[100px]">{agentName}</span>
                        <span className="text-white/20 ml-1"> &gt; </span>
                        <span className="text-[11px] text-white/90 font-medium truncate group-hover/task:hidden">
                          {task.task_description.substring(0, 30)}...
                        </span>
                        {/* EXPAND ON HOVER */}
                        <span className="hidden group-hover/task:inline text-[11px] text-white font-medium animate-in fade-in slide-in-from-left-1 duration-200">
                          {task.task_description}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 text-[8px] font-mono text-white/30 uppercase tracking-widest mb-0 group-hover/task:mb-2 transition-all">
                      <span>{task.task_type || 'GENERIC'}</span>
                      <span className="text-white/5">|</span>
                      <span>{task.complexity || 'LOW'}</span>
                      <span className="text-white/5">|</span>
                      <span>{task.api_used || 'AUTO'}</span>
                      <span className="text-white/5">|</span>
                      <span className={`font-black ${task.status === 'COMPLETED' ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
                        {task.status}
                      </span>
                    </div>

                    {task.output_summary && (
                      <div className="hidden group-hover/task:block animate-in slide-in-from-top-1 duration-200 border-t border-white/5 pt-2 mt-2">
                        <p className="text-[10px] text-white/40 leading-relaxed italic">
                          "{task.output_summary}"
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
