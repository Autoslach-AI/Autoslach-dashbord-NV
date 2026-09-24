"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cpu, 
  Settings, 
  Activity, 
  Zap, 
  Shield, 
  Check, 
  AlertCircle,
  Clock,
  X,
  Bot,
  Sliders,
  Key,
  Eye,
  Trash2,
  Copy,
  Plus,
  Network,
  Database,
  BarChart3,
  MessageSquare,
  Upload,
  Search,
  ChevronDown
} from 'lucide-react';
import { useSystem } from '../../SystemContext';
import { 
  getEnterpriseData, 
  getAgentsByEnterprise, 
  updateAgentProtocol, 
  syncTokenUsage 
} from '@/lib/db/actions';
import { createClient } from '@/lib/supabase';

// TYPES FOR THE ORACLE ENGINE
interface KnowledgeNode {
  id: string;
  content: string;
  category: string;
  created_at: string;
}


export default function OracleConfigPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const agentId = params?.agentId as string;
  const { updateAgent, agentsState } = useSystem();
  
  const [booting, setBooting] = useState(true);
  const [isMaître, setIsMaître] = useState(false);
  
  // CORE STATE (Local for deferred SYNC)
  const [localAgentData, setLocalAgentData] = useState<any>(null);
  const [agentName, setAgentName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [temperature, setTemperature] = useState(0.4);
  const [modelConfig, setModelConfig] = useState<{ model: string; provider: string; fallback?: string }>({ model: 'gemini-1.5-pro', provider: 'google', fallback: '' });
  const [kbNodes, setKbNodes] = useState<KnowledgeNode[]>([]);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [tokenStats, setTokenStats] = useState({ consumed: 0, budget: 1000000, warning: false });
  const [agentTokenBudget, setAgentTokenBudget] = useState(50000);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showShadowChat, setShowShadowChat] = useState(false);
  const [showKbModal, setShowKbModal] = useState(false);
  const [editingNode, setEditingNode] = useState<KnowledgeNode | null>(null);
  const [activeTab, setActiveTab] = useState<'CORE' | 'KNOWLEDGE' | 'PERFORMANCE'>('CORE');

  // Performance states
  const [perfLogs, setPerfLogs]         = useState<any[]>([])
  const [loadingPerf, setLoadingPerf]   = useState(false)
  const [perfError, setPerfError]       = useState<string | null>(null)
  const [showLogModal, setShowLogModal] = useState(false)
  const [logForm, setLogForm]           = useState({
    period_start:     '',
    period_end:       '',
    tokens_consumed:  '',
    tasks_completed:  '',
    avg_response_time:'',
    quality_score:    ''
  })
  const [savingLog, setSavingLog]       = useState(false)

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'KNOWLEDGE') {
      setActiveTab('KNOWLEDGE');
    } else if (tab === 'PERFORMANCE') {
      setActiveTab('PERFORMANCE');
    } else {
      setActiveTab('CORE');
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === 'PERFORMANCE') loadPerfLogs()
  }, [activeTab, agentId])
  
  const [skillForm, setSkillForm] = useState({ name: '', category: 'GENERAL', content: '' });
  const [kbForm, setKbForm] = useState({ content: '', category: 'GENERAL' });
  
  const kbFileInputRef = useRef<HTMLInputElement>(null);

  const wordCount = instructions.trim().split(/\s+/).filter(Boolean).length;
  const isWordLimitExceeded = wordCount > 200;

  // AUTH & BOOTSTRAP
  useEffect(() => {
    const bootstrap = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/');
        return;
      }

      // Check RBAC (Maître Only)
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      
      if (!profile?.is_admin) {
        setIsMaître(false);
        // We might want to block access if NOT Maître
        // router.push('/dashboard');
      } else {
        setIsMaître(true);
      }

      // Fetch Real Data
      const { data: enterprise } = await getEnterpriseData(id); // Using system id as enterprise id for this context
      if (enterprise) {
        setTokenStats({
          consumed: enterprise.total_tokens_consumed || 0,
          budget: enterprise.token_budget || 1000000,
          warning: enterprise.warning_flag || false
        });
      }

      const { data: agents } = await getAgentsByEnterprise(id);
      const currentAgent = (agents as any[])?.find((a: any) => a.id === agentId);
      if (currentAgent) {
        setLocalAgentData(currentAgent);
        setAgentName(currentAgent.name);
        setInstructions(currentAgent.system_prompt || '');
        setAgentTokenBudget(currentAgent.token_budget || 50000);
        setTemperature(currentAgent.temperature ?? 0.7);
        setModelConfig({
          model: currentAgent.primary_api || 'claude-sonnet-4-20250514',
          provider: currentAgent.model_config?.provider || 'anthropic',
          fallback: currentAgent.fallback_chain?.[0] || ''
        });
      }

      // Fetch KB Nodes
      const { data: kb_data } = await supabase
        .from('enterprise_kb')
        .select('*')
        .eq('enterprise_id', id);
      if (kb_data && kb_data.length > 0) {
        setKbNodes(kb_data);
      } else {
        setKbNodes([]);
      }

      setBooting(false);

      const supabaseClient = createClient();
      const { data: models } = await supabaseClient
        .from('available_models')
        .select('*')
        .eq('is_active', true)
        .order('complexity');
      setAvailableModels(models || []);
    };

    bootstrap();
  }, [id, agentId, router]);

  // AUTO-COLLAPSE TRIGGER
  useEffect(() => {
    // Dispatch a virtual event for the sidebar to collapse
    window.dispatchEvent(new CustomEvent('oracle_focus_mode', { detail: { active: true } }));
    return () => {
      window.dispatchEvent(new CustomEvent('oracle_focus_mode', { detail: { active: false } }));
    };
  }, []);

  if (booting) {
    return (
      <div className="flex-1 min-h-screen bg-[#0A0A0A] flex items-center justify-center p-20">
         <div className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 border-2 border-white/5 border-t-[#4ade80] rounded-full animate-spin shadow-[0_0_30px_rgba(74,222,128,0.2)]" />
            <div className="text-center space-y-1">
               <p className="text-[10px] font-mono font-bold uppercase tracking-[0.5em] text-white/40">Calibrating_Neural_Node</p>
               <p className="text-[8px] font-mono text-[#4ade80]/40 uppercase">AGENT_TARGET: {agentId}</p>
            </div>
         </div>
      </div>
    );
  }

  // MAÎTRE ACCESS GUARD
  if (!isMaître) {
    return (
      <div className="flex-1 min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-20">
         <div className="max-w-md w-full border border-red-500/20 bg-red-500/5 p-12 rounded-3xl text-center space-y-6">
            <Shield className="w-12 h-12 text-red-500 mx-auto" />
            <div className="space-y-2">
               <h2 className="text-xl font-bold font-mono text-white uppercase tracking-widest">Access_Unauthorized</h2>
               <p className="text-xs text-white/40 font-mono">This interface is restricted to Global Creators (Maîtres). Your access level is insufficient for neural reconfiguration.</p>
            </div>
            <button 
               onClick={() => router.push(`/admin/system/${id}`)}
               className="px-8 py-3 border border-white/10 rounded-xl text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-widest transition-all"
            >
               Return_to_Lattice
            </button>
         </div>
      </div>
    );
  }


  const handleInjectData = () => {
    kbFileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const newNode: KnowledgeNode = {
        id: Math.random().toString(36).substring(7),
        content: `SOURCE: ${file.name}\n\n${content.substring(0, 1000)}${content.length > 1000 ? '...' : ''}`,
        category: file.type.split('/')[1]?.toUpperCase() || 'DOCUMENT',
        created_at: new Date().toISOString()
      };
      setKbNodes(prev => [...prev, newNode]);
    };

    if (file.type === 'application/pdf') {
      const newNode: KnowledgeNode = {
        id: Math.random().toString(36).substring(7),
        content: `SOURCE: ${file.name} (PDF_EXTRACTED)\n\nNeural extraction complete for ${file.size} bytes. Context lattice updated with binary vector data.`,
        category: 'PDF_RAG',
        created_at: new Date().toISOString()
      };
      setKbNodes(prev => [...prev, newNode]);
    } else {
      reader.readAsText(file);
    }
  };

  const handleDeleteKbNode = (nodeId: string) => {
    if (!confirm("ERASE_LATTICE_NODE?")) return;
    setKbNodes(prev => prev.filter(n => n.id !== nodeId));
  };

  const handleEditKbNode = (node: KnowledgeNode) => {
    setEditingNode(node);
    setKbForm({ content: node.content, category: node.category });
    setShowKbModal(true);
  };

  const saveKbNode = () => {
    if (!kbForm.content) return;
    if (editingNode) {
      setKbNodes(kbNodes.map(n => n.id === editingNode.id ? { ...n, ...kbForm } : n));
    } else {
      const newNode: KnowledgeNode = {
        id: Math.random().toString(36).substring(7),
        ...kbForm,
        created_at: new Date().toISOString()
      };
      setKbNodes([...kbNodes, newNode]);
    }
    setShowKbModal(false);
  };

  const loadPerfLogs = async () => {
    if (!agentId) return
    setLoadingPerf(true)
    setPerfError(null)
    try {
      const res = await fetch(`/api/admin/agent/performance?agent_id=${agentId}`)
      const { data, error } = await res.json()
      if (error) throw new Error(error)
      setPerfLogs(data ?? [])
    } catch (err: any) {
      setPerfError(err.message)
    } finally {
      setLoadingPerf(false)
    }
  }

  const handleSaveLog = async () => {
    setSavingLog(true)
    setPerfError(null)
    try {
      const res = await fetch('/api/admin/agent/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id:          agentId,
          enterprise_id:     id,
          period_start:      logForm.period_start,
          period_end:        logForm.period_end,
          tokens_consumed:   parseInt(logForm.tokens_consumed)   || 0,
          tasks_completed:   parseInt(logForm.tasks_completed)   || 0,
          avg_response_time: parseInt(logForm.avg_response_time) || 0,
          quality_score:     parseInt(logForm.quality_score)     || 0
        })
      })
      const { error: saveError } = await res.json()
      if (saveError) throw new Error(saveError)
      setShowLogModal(false)
      setLogForm({ period_start: '', period_end: '', tokens_consumed: '', tasks_completed: '', avg_response_time: '', quality_score: '' })
      await loadPerfLogs()
    } catch (err: any) {
      setPerfError(err.message)
    } finally {
      setSavingLog(false)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const supabase = createClient();
      
      // 1. SYNC_AGENT_PROTOCOL
      await updateAgentProtocol(agentId, {
        name: agentName,
        system_prompt: instructions,
        model_config: modelConfig,
        token_budget: agentTokenBudget,
        temperature: temperature,
        fallback_chain: modelConfig.fallback ? [modelConfig.fallback] : [],
      });

      // 2. SYNC_ENTERPRISE_BUDGET
      await supabase
        .from('enterprises')
        .update({ token_budget: tokenStats.budget })
        .eq('id', id);


      // 4. SYNC_KNOWLEDGE_BASE
      const delRes = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'row', table: 'enterprise_kb', column: 'enterprise_id', id: id })
      });
      const { error: delError } = await delRes.json();
      if (delError) throw new Error(delError);

      const realNodes = kbNodes.filter(n => !n.id.startsWith('m'));
      if (realNodes.length > 0) {
        await supabase.from('enterprise_kb').insert(
          realNodes.map(n => ({
            content: n.content,
            category: n.category,
            enterprise_id: id
          }))
        );
      }

      console.log("[ORACLE] Global Sync Sequence Complete: Neural + Data + Fiscal");

      // Update global context for UI reflected changes
      updateAgent(agentId, { name: agentName });
      
      // Simulate success pulse
      setTimeout(() => setIsSyncing(false), 1000);
    } catch (error) {
      console.error("Sync Failed", error);
      setIsSyncing(false);
    }
  };

  const templates = [
    { label: 'SUPPORT_PROTOCOL', value: 'IDENTITY: High-precision technical support entity...' },
    { label: 'ARCHITECT_CORE', value: 'IDENTITY: Elite software architect neural network...' },
    { label: 'ANALYTICS_NODE', value: 'IDENTITY: Objective data extraction and pattern recognition...' },
  ];

  return (
    <div className="relative p-6 lg:p-12 max-w-[1200px] mx-auto space-y-[100px] pb-64 font-mono">
      
      {/* PAGE HEADER */}
      <div className="flex justify-between items-end">
        <div className="space-y-4">
           <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-[#4ade80] rounded-full shadow-[0_0_10px_#4ade80] animate-pulse" />
              <span className="text-[10px] font-bold text-white/40 tracking-[0.4em] uppercase">Status // Online_Configuration</span>
           </div>
           <h1 className="text-5xl font-normal text-white tracking-tighter small-caps">{agentName || 'UNDEFINED_NODE'}</h1>
        </div>
        <div className="text-right">
           <p className="text-[10px] text-white/20 uppercase tracking-widest mb-1">Sector_Cluster</p>
           <p className="text-xs font-bold text-white/60 tracking-wider">0X-{id.substring(0, 8).toUpperCase()}</p>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex border-b border-white/10 gap-10">
        <button 
          onClick={() => setActiveTab('CORE')}
          className={`pb-4 text-[10px] font-bold uppercase tracking-[0.3em] transition-all relative ${
            activeTab === 'CORE' ? 'text-white' : 'text-white/20 hover:text-white/40'
          }`}
        >
          Core_Config
          {activeTab === 'CORE' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4ade80] shadow-[0_0_10px_#4ade80]" />}
        </button>
        <button 
          onClick={() => setActiveTab('KNOWLEDGE')}
          className={`pb-4 text-[10px] font-bold uppercase tracking-[0.3em] transition-all relative ${
            activeTab === 'KNOWLEDGE' ? 'text-white' : 'text-white/20 hover:text-white/40'
          }`}
        >
          Knowledge_Base
          {activeTab === 'KNOWLEDGE' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 shadow-[0_0_10px_#a855f7]" />}
        </button>
        <button 
          onClick={() => setActiveTab('PERFORMANCE')}
          className={`pb-4 text-[10px] font-bold uppercase tracking-[0.3em] transition-all relative ${
            activeTab === 'PERFORMANCE' ? 'text-white' : 'text-white/20 hover:text-white/40'
          }`}
        >
          Performance
          {activeTab === 'PERFORMANCE' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-400 shadow-[0_0_10px_#fb923c]" />}
        </button>
        <button 
          onClick={() => router.push(`/admin/system/${id}/agent/${agentId}/skills`)}
          className="pb-4 text-[10px] font-bold uppercase text-white/20 hover:text-white/40 tracking-[0.3em] transition-all relative"
        >
          Skills
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'CORE' ? (
          <motion.div
            key="core"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="space-y-[100px]"
          >
            {/* SECTION_01 // IDENTITY */}
            <section className="space-y-10">
               <div className="flex items-center gap-4">
                  <div className="w-1.5 h-6 bg-[#4ade80] rounded-full shadow-[0_0_10px_#4ade80]" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-[0.3em]">Section_01 // Identity</h2>
               </div>

               <div className="bg-[#252525] border border-white/20 rounded-2xl p-10 space-y-10 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                     <Zap className="w-40 h-40 text-white" />
                  </div>

                  <div className="flex flex-col lg:flex-row gap-12 items-start">
                     <div className="w-48 h-48 rounded-xl bg-white/[0.04] border border-dashed border-white/20 flex flex-col items-center justify-center gap-4 group/icon cursor-pointer hover:border-[#4ade80]/60 transition-all shrink-0 shadow-inner">
                        <div className="w-16 h-16 rounded-lg bg-blue-600/20 flex items-center justify-center border border-blue-500/30 group-hover/icon:scale-110 transition-transform">
                           <Upload className="w-6 h-6 text-blue-400" />
                        </div>
                        <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest group-hover/icon:text-white">AGENT_ICON_DROP</span>
                     </div>
                     
                     <div className="flex-1 space-y-8 w-full">
                        <div className="space-y-3">
                           <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest flex justify-between">
                              <span>Agent_Alias</span>
                              <span className="text-white/30 font-mono tracking-normal">UID: {agentId.substring(0, 12)}</span>
                           </label>
                           <div className="bg-black border border-white/20 rounded-lg px-6 py-4 flex items-center group-focus-within:border-[#4ade80]/40 transition-all">
                              <input 
                                value={agentName}
                                onChange={(e) => setAgentName(e.target.value)}
                                className="w-full bg-transparent text-xl font-bold text-white outline-none placeholder:text-white/20 tracking-tight uppercase"
                                placeholder="ASSIGN_NAME"
                              />
                           </div>
                        </div>

                        <div className="space-y-3">
                           <div className="flex justify-between items-center mb-2">
                              <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Protocol_Templates</label>
                              <select 
                                className="bg-black border border-white/20 rounded-md px-3 py-1.5 text-[9px] font-bold uppercase text-white/80 outline-none hover:border-[#4ade80]/40 transition-all cursor-pointer"
                                onChange={(e) => setInstructions(e.target.value)}
                              >
                                 <option value="">SELECT_ARCHITECTURE</option>
                                 {templates.map(t => <option key={t.label} value={t.value}>{t.label}</option>)}
                              </select>
                           </div>
                           <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-[10px] text-white/30 italic">
                              Select a template to auto-populate the Neural Prompt in Section 02.
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </section>

            {/* SECTION_02 // NEURAL_PROMPT */}
            <section className="space-y-10">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="w-1.5 h-6 bg-blue-500 rounded-full shadow-[0_0_15px_#3b82f6]" />
                     <h2 className="text-sm font-bold text-white uppercase tracking-[0.3em]">Section_02 // Neural_Prompt</h2>
                  </div>
                  
                  <button 
                    onClick={() => setShowShadowChat(true)}
                    className="flex items-center gap-2 px-8 py-3 bg-white/5 border border-white/20 rounded-full group hover:border-[#4ade80]/60 transition-all shadow-xl"
                  >
                     <div className="w-2 h-2 bg-[#4ade80]/40 rounded-full group-hover:bg-[#4ade80] transition-colors" />
                     <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest group-hover:text-white transition-colors">TEST_NEURAL_LINK</span>
                  </button>
               </div>

               <div className="space-y-6">
                  <div className="bg-black border border-white/10 rounded-2xl p-8 shadow-inner relative group focus-within:border-blue-500/40 transition-all">
                     <textarea 
                        value={instructions}
                        onChange={(e) => {
                           const val = e.target.value;
                           const words = val.trim().split(/\s+/).filter(Boolean);
                           if (words.length <= 200 || val.length < instructions.length) {
                              setInstructions(val);
                           }
                        }}
                        className="w-full h-64 bg-transparent text-sm font-mono text-white/80 outline-none placeholder:text-white/10 leading-relaxed resize-none scrollbar-hide"
                        placeholder="Insert core neural instructions (Max 200 words)..."
                     />
                     <div className={`absolute bottom-6 right-8 text-[9px] font-bold uppercase tracking-widest ${isWordLimitExceeded ? 'text-red-500' : 'text-white/20'}`}>
                        Words: {wordCount} / 200
                     </div>
                  </div>

                  <div className="bg-[#252525] border border-white/20 rounded-2xl p-10 space-y-8 shadow-sm">
                     <div className="space-y-4">
                        <div className="flex justify-between items-center px-2">
                           <div className="space-y-1">
                              <h3 className="text-[11px] font-bold text-white uppercase tracking-widest">Cognitive_Temperature</h3>
                              <p className="text-[9px] text-white/40 italic tracking-wide">Adjusting variance of neural path selection.</p>
                           </div>
                           <div className="px-5 py-2 bg-blue-600/20 border border-blue-500/40 rounded text-blue-400 text-xs font-mono font-bold shadow-inner">
                              {temperature.toFixed(1)}
                           </div>
                        </div>

                        <div className="pt-10 px-4 relative">
                           <input 
                              type="range" 
                              min="0" 
                              max="1" 
                              step="0.1" 
                              value={temperature}
                              onChange={(e) => setTemperature(parseFloat(e.target.value))}
                              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#4ade80]"
                           />
                           <div className="flex justify-between mt-8 text-[9px] font-bold text-white/30 uppercase tracking-[0.2em]">
                              <span>Deterministic</span>
                              <span>Balanced</span>
                              <span>Creative</span>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </section>


            {/* 02 — INTELLIGENCE (IMAGE REPLACEMENT) */}
            <section className="space-y-12">
               <div className="flex items-center gap-4">
                  <h2 className="text-[14px] font-black text-[#4ade80] uppercase tracking-[0.3em]">02 — Intelligence</h2>
               </div>

               <div className="space-y-10">
                  {/* API PRIMAIRE */}
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Api Primaire</label>
                     <div className="bg-[#0D0D0D] border border-white/5 rounded-xl px-6 py-3.5 hover:border-[#4ade80]/30 transition-all relative group">
                        <select 
                          value={modelConfig.model}
                          onChange={(e) => setModelConfig({...modelConfig, model: e.target.value})}
                          className="w-full bg-[#0D0D0D] text-[12px] font-bold text-white uppercase outline-none cursor-pointer appearance-none relative z-10"
                        >
                           <option value="">SÉLECTIONNER UNE API</option>
                           {availableModels.map((m) => (
                             <option key={m.id} value={m.model_string} className="bg-[#0D0D0D] text-white">
                               {m.name} — {m.provider} ({m.complexity})
                             </option>
                           ))}
                        </select>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-white/20 group-hover:text-[#4ade80]/50 transition-colors">
                           <ChevronDown className="w-3.5 h-3.5" />
                        </div>
                     </div>
                  </div>

                  {/* API FALLBACK */}
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Api Fallback</label>
                     <div className="bg-[#0D0D0D] border border-white/5 rounded-xl px-6 py-3.5 hover:border-[#4ade80]/30 transition-all relative group">
                        <select 
                          value={modelConfig.fallback || ''}
                          onChange={(e) => setModelConfig({...modelConfig, fallback: e.target.value})}
                          className="w-full bg-[#0D0D0D] text-[12px] font-bold text-white uppercase outline-none cursor-pointer appearance-none relative z-10"
                        >
                           <option value="">AUCUN FALLBACK</option>
                           {availableModels.filter(m => m.model_string !== modelConfig.model).map((m) => (
                             <option key={m.id} value={m.model_string} className="bg-[#0D0D0D] text-white">
                               {m.name} — {m.provider}
                             </option>
                           ))}
                        </select>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-white/20 group-hover:text-[#4ade80]/50 transition-colors">
                           <ChevronDown className="w-3.5 h-3.5" />
                        </div>
                     </div>
                  </div>

                  {/* TEMPÉRATURE */}
                  <div className="space-y-6">
                     <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Température</label>
                        <span className="text-[16px] font-black text-[#4ade80] font-mono">{temperature.toFixed(1)}</span>
                     </div>
                     <div className="relative pt-2">
                        <input 
                           type="range" 
                           min="0" 
                           max="1" 
                           step="0.1" 
                           value={temperature}
                           onChange={(e) => setTemperature(parseFloat(e.target.value))}
                           className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-[#4ade80]"
                        />
                        <div className="flex justify-between mt-6 text-[8px] font-bold text-white/10 uppercase tracking-widest">
                           <span>0.0 — Précis & déterministe</span>
                           <span>0.5 — Équilibré</span>
                           <span>1.0 — Créatif & varié</span>
                        </div>
                     </div>
                  </div>

                  {/* BUDGET TOKENS INDIVIDUEL */}
                  <div className="space-y-4">
                     <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Budget Tokens Individuel</label>
                     <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl px-8 py-6 flex items-center justify-between">
                        <input 
                          type="number"
                          value={agentTokenBudget}
                          onChange={(e) => setAgentTokenBudget(parseInt(e.target.value) || 0)}
                          className="bg-transparent text-[14px] font-bold text-white outline-none w-full font-mono"
                          placeholder="50000"
                        />
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-4">Tokens</span>
                     </div>
                     <div className="flex justify-between text-[8px] font-bold text-white/10 uppercase tracking-widest px-2">
                        <span>Limite individuelle — indépendante des autres agents</span>
                        <span>Budget total : {tokenStats.budget.toLocaleString()} tokens</span>
                     </div>
                  </div>
               </div>
            </section>
          </motion.div>
        ) : activeTab === 'KNOWLEDGE' ? (
          <motion.div
            key="knowledge"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-10"
          >
             {/* SECTION_03 // KNOWLEDGE_HUB (RAG) */}
             <section className="space-y-10">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-1.5 h-6 bg-purple-500 rounded-full shadow-[0_0_15px_#a855f7]" />
                      <h2 className="text-sm font-bold text-white uppercase tracking-[0.3em]">Knowledge_Lattice_Locus</h2>
                   </div>
                   <div className="flex items-center gap-4">
                      <button 
                        onClick={handleInjectData}
                        className="text-[10px] font-bold text-purple-400 hover:text-white flex items-center gap-2 uppercase tracking-widest transition-all px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-md"
                      >
                         <Plus className="w-4 h-4" /> Inject_Source_Packet
                      </button>
                      <input 
                        type="file"
                        ref={kbFileInputRef}
                        onChange={handleFileChange}
                        accept=".pdf,.txt,.json"
                        className="hidden"
                      />
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                        <input 
                          type="text"
                          placeholder="SCAN_NODES..."
                          className="bg-black border border-white/20 rounded-md pl-10 pr-4 py-2 text-[10px] font-bold text-white outline-none focus:border-purple-500/40 w-48"
                        />
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {kbNodes.length > 0 ? kbNodes.map(node => (
                      <div 
                        key={node.id} 
                        onClick={() => handleEditKbNode(node)}
                        className="bg-[#252525] border border-white/20 p-8 rounded-2xl group hover:border-purple-500/40 transition-all relative overflow-hidden flex flex-col h-full cursor-pointer"
                      >
                         <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 blur-3xl rounded-full" />
                         <div className="flex justify-between items-start mb-4">
                            <Database className="w-4 h-4 text-purple-500/60" />
                            <div className="flex gap-2">
                               <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditKbNode(node);
                                  }}
                                  className="p-1 opacity-0 group-hover:opacity-100 text-white/20 hover:text-[#4ade80] transition-all"
                               >
                                  <Sliders className="w-3 h-3" />
                               </button>
                               <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteKbNode(node.id);
                                  }}
                                  className="p-1 opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-500 transition-all"
                               >
                                  <Trash2 className="w-3 h-3" />
                               </button>
                            </div>
                         </div>
                         <div className="flex-1 overflow-hidden relative mb-6">
                            <p className="text-[11px] text-white/70 leading-relaxed font-mono italic whitespace-pre-wrap">
                               {node.content}
                            </p>
                            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#080808] via-[#080808]/80 to-transparent" />
                         </div>
                         <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-auto">
                            <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest px-2 py-1 bg-white/5 rounded">{node.category}</span>
                            <span className="text-[8px] font-mono text-white/20 uppercase">{new Date(node.created_at).toLocaleDateString()}</span>
                         </div>
                      </div>
                   )) : (
                     <div className="col-span-full py-32 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-6 bg-white/[0.01]">
                        <Network className="w-16 h-16 text-white/5" />
                        <div className="text-center space-y-2">
                           <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest italic">Knowledge_Lattice_Locus_Empty</p>
                           <p className="text-[8px] text-white/10 uppercase">Neural engine is operating on base protocol only.</p>
                        </div>
                        <button 
                          onClick={handleInjectData}
                          className="px-8 py-3 bg-purple-600/10 border border-purple-500/20 rounded-md text-[9px] font-bold text-purple-400 uppercase tracking-widest hover:bg-purple-600/20 transition-all"
                        >
                          Inject_First_Knowledge_Seed
                        </button>
                     </div>
                   )}
                </div>
             </section>
          </motion.div>
        ) : (
          <motion.div
            key="performance"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-4 h-4 text-orange-400" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] font-mono text-white/70">
                  AGENT_PERFORMANCE_LOGS
                </h2>
              </div>
              <button
                onClick={() => setShowLogModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-400/10 border border-orange-400/20 text-orange-400 text-[9px] font-black uppercase tracking-widest hover:bg-orange-400/15 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                LOG_PERFORMANCE
              </button>
            </div>

            {/* Error handling */}
            {perfError && (
              <div className="flex items-center gap-3 px-5 py-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-xs font-mono text-red-400">{perfError}</span>
                <button onClick={() => setPerfError(null)} className="ml-auto">
                  <X className="w-4 h-4 text-red-400/50 hover:text-red-400" />
                </button>
              </div>
            )}

            {/* Content loading state */}
            {loadingPerf ? (
              <div className="flex items-center justify-center py-24">
                <div className="w-5 h-5 border-2 border-orange-400/20 border-t-orange-400 rounded-full animate-spin" />
              </div>
            ) : perfLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 border border-dashed border-white/10 rounded-3xl gap-4">
                <BarChart3 className="w-8 h-8 text-white/10" />
                <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">
                  Aucun log de performance
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {perfLogs.map((log) => (
                  <div key={log.id} className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">
                        {new Date(log.period_start).toLocaleDateString()} → {new Date(log.period_end).toLocaleDateString()}
                      </span>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded border uppercase ${
                        log.quality_score >= 80 ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        log.quality_score >= 50 ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                        'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        QUALITÉ {log.quality_score ?? '—'}/100
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <div className="text-[8px] text-white/20 uppercase tracking-widest">TOKENS</div>
                        <div className="text-sm font-black text-white font-mono">{log.tokens_consumed?.toLocaleString() ?? '—'}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[8px] text-white/20 uppercase tracking-widest">TÂCHES</div>
                        <div className="text-sm font-black text-white font-mono">{log.tasks_completed ?? '—'}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[8px] text-white/20 uppercase tracking-widest">TEMPS RÉP.</div>
                        <div className="text-sm font-black text-white font-mono">{log.avg_response_time ?? '—'}ms</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>


      {/* KB MODAL */}
      <AnimatePresence>
        {showKbModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-[#222222] border border-white/20 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
             >
                <div className="p-8 border-b border-white/10 flex justify-between items-center bg-purple-500/5">
                   <div className="flex items-center gap-4">
                      <Database className="w-5 h-5 text-purple-500" />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-white">
                        {editingNode ? 'Edit_Knowledge_Node' : 'Inject_Knowledge_Node'}
                      </h3>
                   </div>
                   <button onClick={() => setShowKbModal(false)} className="text-white/20 hover:text-white transition-colors">
                      <X className="w-5 h-5" />
                   </button>
                </div>
                
                <div className="p-8 space-y-8 overflow-y-auto">
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Node_Category</label>
                      <input 
                        value={kbForm.category}
                        onChange={(e) => setKbForm({...kbForm, category: e.target.value.toUpperCase()})}
                        className="w-full bg-black border border-white/10 rounded-lg px-6 py-4 text-sm font-bold text-white outline-none focus:border-purple-500/40 transition-all font-mono"
                        placeholder="E.G. TECHNICAL_SPEC, MARKET_DATA"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Data_Lattice_Content</label>
                      <textarea 
                        value={kbForm.content}
                        onChange={(e) => setKbForm({...kbForm, content: e.target.value})}
                        className="w-full h-80 bg-black border border-white/10 rounded-lg px-6 py-6 text-sm font-mono text-white/80 leading-relaxed outline-none focus:border-purple-500/40 transition-all resize-none"
                        placeholder="Insert architectural knowledge data here..."
                      />
                   </div>
                </div>

                <div className="p-8 border-t border-white/10 flex justify-end gap-4 bg-black/40">
                   <button 
                     onClick={() => setShowKbModal(false)}
                     className="px-8 py-3 text-[10px] font-bold text-white/40 uppercase tracking-widest hover:text-white transition-colors"
                   >
                      Cancel
                   </button>
                   <button 
                     onClick={saveKbNode}
                     className="px-10 py-3 bg-purple-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all"
                   >
                      Sync_to_Lattice
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PERFORMANCE LOG MODAL */}
      <AnimatePresence>
        {showLogModal && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm shadow-2xl">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-10 w-full max-w-lg space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest text-orange-400">LOG_PERFORMANCE</h3>
                <button onClick={() => setShowLogModal(false)}>
                  <X className="w-4 h-4 text-white/30 hover:text-white" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-widest text-white/40 mb-2 font-bold">PERIOD_START</label>
                  <input type="datetime-local" value={logForm.period_start}
                    onChange={e => setLogForm({...logForm, period_start: e.target.value})}
                    className="w-full bg-[#111111] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:border-orange-400/50 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-widest text-white/40 mb-2 font-bold">PERIOD_END</label>
                  <input type="datetime-local" value={logForm.period_end}
                    onChange={e => setLogForm({...logForm, period_end: e.target.value})}
                    className="w-full bg-[#111111] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:border-orange-400/50 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-widest text-white/40 mb-2 font-bold">TOKENS_CONSUMED</label>
                  <input type="number" value={logForm.tokens_consumed}
                    onChange={e => setLogForm({...logForm, tokens_consumed: e.target.value})}
                    placeholder="0"
                    className="w-full bg-[#111111] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:border-orange-400/50 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-widest text-white/40 mb-2 font-bold">TASKS_COMPLETED</label>
                  <input type="number" value={logForm.tasks_completed}
                    onChange={e => setLogForm({...logForm, tasks_completed: e.target.value})}
                    placeholder="0"
                    className="w-full bg-[#111111] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:border-orange-400/50 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-widest text-white/40 mb-2 font-bold">AVG_RESPONSE_TIME (ms)</label>
                  <input type="number" value={logForm.avg_response_time}
                    onChange={e => setLogForm({...logForm, avg_response_time: e.target.value})}
                    placeholder="0"
                    className="w-full bg-[#111111] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:border-orange-400/50 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-widest text-white/40 mb-2 font-bold">QUALITY_SCORE (0-100)</label>
                  <input type="number" min="0" max="100" value={logForm.quality_score}
                    onChange={e => setLogForm({...logForm, quality_score: e.target.value})}
                    placeholder="0"
                    className="w-full bg-[#111111] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:border-orange-400/50 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowLogModal(false)}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-white/30 text-xs font-mono uppercase tracking-widest hover:border-white/20 transition-all font-bold"
                >
                  ANNULER
                </button>
                <button
                  onClick={handleSaveLog}
                  disabled={savingLog || !logForm.period_start || !logForm.period_end}
                  className="flex-1 py-3 rounded-xl bg-orange-400 text-black text-xs font-black uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                >
                  {savingLog ? <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : <BarChart3 className="w-4 h-4" />}
                  {savingLog ? 'SAVING...' : 'COMMIT_LOG'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SYNC_AGENT_BUTTON (FLOATING_SYSTEM) */}
      <div className="fixed bottom-12 right-12 z-[200]">
         <motion.button 
           whileHover={{ scale: 1.05 }}
           whileTap={{ scale: 0.95 }}
           onClick={handleSync}
           disabled={isSyncing}
           className={`px-8 py-4 rounded-xl flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.3em] font-mono transition-all relative overflow-hidden shadow-2xl ${
             isSyncing 
               ? 'bg-white/10 text-white/40 cursor-wait' 
               : 'bg-[#4ade80] text-black hover:shadow-[0_0_40px_rgba(74,222,128,0.3)] border-t border-white/30'
           }`}
         >
            {isSyncing ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Zap className="w-5 h-5 fill-black animate-pulse" />
            )}
            <span className="relative z-10">{isSyncing ? 'SYNCING...' : 'SYNC_AGENT_STATE'}</span>
            
            {/* NEON_IMPULSE */}
            <div className="absolute inset-0 bg-white/20 opacity-0 hover:opacity-10 transition-opacity" />
         </motion.button>
      </div>

      {/* SHADOW_MODE_CHAT_DRAWER */}
      <AnimatePresence>
        {showShadowChat && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full lg:w-[500px] bg-[#1a1a1a] border-l border-white/10 z-[250] shadow-2xl flex flex-col p-10 font-mono"
          >
             <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-4">
                   <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_#3b82f6]" />
                   <h3 className="text-sm font-bold uppercase tracking-[0.3em]">Shadow_Mode // Neural_Preview</h3>
                </div>
                <button 
                   onClick={() => setShowShadowChat(false)}
                   className="p-3 bg-white/5 rounded-xl hover:text-red-500 transition-colors"
                >
                   <X className="w-5 h-5" />
                </button>
             </div>
             
             <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-8 mb-8 overflow-y-auto custom-scrollbar flex flex-col gap-6">
                <div className="p-5 bg-white/[0.02] border border-white/5 rounded-xl max-w-[85%] self-start border-l-2 border-l-blue-500">
                   <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">System_Origin</p>
                   <p className="text-xs text-white/80 leading-relaxed italic">Secure Neural Connection Established. You are interacting with the configuration state before sync. This session is local.</p>
                </div>
                {/* MOCK CHAT BUBBLES */}
                <div className="p-5 bg-white/[0.02] border border-white/5 rounded-xl max-w-[85%] self-start border-l-2 border-l-blue-500">
                   <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">{agentName}</p>
                   <p className="text-xs text-white/80 leading-relaxed">Neural Lattice ready for validation. How shall we calibrate the protocol?</p>
                </div>
             </div>
             
             <div className="mt-auto space-y-4">
                <div className="relative">
                   <input 
                      disabled
                      className="w-full bg-black border border-white/5 rounded-xl px-6 py-5 text-xs text-white/40 italic flex items-center gap-2 outline-none group"
                      placeholder="Simulation: Shadow mode prevents actual inference..."
                   />
                </div>
                <p className="text-[8px] font-bold text-white/10 uppercase tracking-widest text-center">Protocol: 0X-SHADOW-LINK : READONLY_MOCK_ENV</p>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
