"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Search, 
  Download, 
  ArrowLeft,
  LayoutDashboard,
  RefreshCcw,
  Activity,
  Package,
  Database,
  FileText,
  Brain,
  MoreHorizontal,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  CheckCircle2,
  Check,
  Bell,
  Power,
  TrendingUp,
  DollarSign,
  Cpu,
  ShieldAlert,
  ArrowUpRight,
  User,
  Globe,
  Briefcase
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/contexts/user-context';
import DoubleRibbonIntelligent, { NavItem } from '@/components/DoubleRibbonIntelligent';
import { createClient } from '@/lib/supabase';

const supabase = createClient();

type PlanType = 'ALL' | string;
type StatusType = 'ALL' | 'STABLE' | 'WARNING' | 'CRITICAL';

interface ClientNode {
  id: string;
  project_id: string;
  name: string;
  package_type: string;
  status: string;
  total_tokens_consumed: number;
  token_budget: number;
  region: string;
  sector: string;
  monthly_cost: number;
  activated_at: string;
  created_at: string;
  agent_count: number;
  intelligence?: {
    issue_type: string;
    raw_context: string;
    severity_level: string;
    created_at: string;
  };
}

// Helper Dropdown Component
const Dropdown = ({ label, options, value, onChange }: { 
  label: string, 
  options: string[], 
  value: string, 
  onChange: (val: string) => void 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 bg-[#0A0A0A] border border-[#2A2A2A] px-3 py-1.5 rounded text-[10px] font-bold tracking-widest text-white uppercase hover:border-[#10B981]/40 transition-all min-w-[120px] justify-between group"
      >
        <span className={`truncate ${value !== 'ALL' ? 'text-[#10B981]' : ''}`}>
          {value === 'ALL' ? label : value}
        </span>
        <span className="text-[8px] opacity-40 group-hover:opacity-100 transition-opacity">▼</span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute top-full right-0 mt-2 w-full min-w-[160px] bg-[#111111] border border-[#2A2A2A] rounded-lg shadow-2xl z-[100] py-2 max-h-[280px] overflow-y-auto custom-scrollbar"
          >
            <button 
              onClick={() => { onChange('ALL'); setIsOpen(false); }}
              className={`w-full px-4 py-2.5 flex items-center justify-between text-left text-[10px] font-bold tracking-widest uppercase hover:bg-white/5 transition-all ${value === 'ALL' ? 'text-[#10B981]' : 'text-white/40'}`}
            >
              <span>{label}</span>
              {value === 'ALL' && <Check className="w-3 h-3 text-[#10B981]" />}
            </button>
            <div className="h-[1px] bg-[#2A2A2A] my-1 mx-2" />
            {options.map((opt: string) => (
              <button 
                key={opt}
                onClick={() => { onChange(opt); setIsOpen(false); }}
                className={`w-full px-4 py-2.5 flex items-center justify-between text-left text-[10px] font-bold tracking-widest uppercase hover:bg-white/5 transition-all ${value === opt ? 'text-[#10B981]' : 'text-white/40'}`}
              >
                <span>{opt}</span>
                {value === opt && <Check className="w-3 h-3 text-[#10B981]" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function FleetPage() {
  const router = useRouter();
  const { user, profile } = useUser();
  const [clients, setClients] = useState<ClientNode[]>([]);
  const [plans, setPlans] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<PlanType>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusType>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [hoveredClient, setHoveredClient] = useState<ClientNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [stats, setStats] = useState({
    activeSystems: 0,
    stableCount: 0,
    warningCount: 0,
    criticalCount: 0,
    totalRevenue: 0,
    avgMaintenance: 0,
    totalTokens: 0,
    totalBudget: 0,
    activeAlerts: 0,
    criticalAlerts: 0,
    warningAlerts: 0
  });

  const pageSize = 30;

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // 1. Fetch plans
      const { data: planData } = await supabase
        .from('plan_definitions')
        .select('plan_name')
        .order('base_price_fcfa', { ascending: true });

      if (planData) setPlans(planData.map((p: any) => p.plan_name));

      // 2. Fetch clients
      const { data: clientsData, error: clientError } = await supabase
        .from('v_clients_dev')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientError) throw clientError;

      // 4. Fetch intelligence logs with priority
      const { data: logsData } = await supabase
        .from('admin_intelligence_logs')
        .select('client_id, issue_type, raw_context, severity_level, created_at')
        .not('issue_type', 'eq', 'NEW_PROSPECT')
        .order('created_at', { ascending: false });

      const logsMap: Record<string, any> = {};
      const priority: Record<string, number> = {
        'SECURITY': 6,
        'AGENT_ERROR': 5,
        'TOKEN_WARNING': 4,
        'CHURN_RISK': 3,
        'MESSAGE': 2,
        'UPSELL': 1
      };

      logsData?.forEach((log: any) => {
        // Enforce latest log enrichment by taking the first encountered (query is ordered by date desc)
        if (!logsMap[log.client_id]) {
          logsMap[log.client_id] = log;
        }
      });

      const { data: agentCounts } = await supabase
        .from('agents')
        .select('enterprise_id')

      const countMap = agentCounts?.reduce((acc: Record<string, number>, a: any) => {
        acc[a.enterprise_id] = (acc[a.enterprise_id] || 0) + 1
        return acc
      }, {}) ?? {}

      const processed = (clientsData || []).map((c: any) => ({
        ...c,
        agent_count: countMap?.[c.id] || 0,
        intelligence: logsMap[c.id] || null
      }));

      setClients(processed);

      // Calculate Stats
      const realClientIds = (clientsData || []).map((c: any) => c.id);
      const alertsForStats = (logsData || []).filter((l: any) => 
        realClientIds.includes(l.client_id) && 
        l.issue_type !== 'UPSELL'
      );

      const stable = processed.filter((c: any) => c.status === 'STABLE').length;
      const warning = processed.filter((c: any) => c.status === 'WARNING').length;
      const critical = processed.filter((c: any) => c.status === 'CRITICAL').length;
      const totalRev = processed.reduce((acc: number, c: any) => acc + (c.monthly_cost || 0), 0);
      const totalTok = processed.reduce((acc: number, c: any) => acc + (c.total_tokens_consumed || 0), 0);
      const totalBud = processed.reduce((acc: number, c: any) => acc + (c.token_budget || 0), 0);
      
      const alertCount = alertsForStats.length;
      const critAlerts = alertsForStats.filter((l: any) => l.severity_level === 'CRITICAL').length;
      const warnAlerts = alertsForStats.filter((l: any) => l.severity_level === 'WARNING').length;

      setStats({
        activeSystems: processed.length,
        stableCount: stable,
        warningCount: warning,
        criticalCount: critical,
        totalRevenue: totalRev,
        avgMaintenance: processed.length > 0 ? Math.round(totalRev / processed.length) : 0,
        totalTokens: totalTok,
        totalBudget: totalBud,
        activeAlerts: alertCount,
        criticalAlerts: critAlerts,
        warningAlerts: warnAlerts
      });

    } catch (err) {
      console.error("Fleet Data Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredClients = useMemo(() => {
    const statusPriority: Record<string, number> = {
      'CRITICAL': 3,
      'WARNING': 2,
      'STABLE': 1
    };

    return clients
      .filter(c => {
        const q = searchQuery.toLowerCase();
        const matchesSearch = 
          c.name.toLowerCase().includes(q) ||
          c.project_id?.toLowerCase().includes(q) ||
          c.package_type.toLowerCase().includes(q) ||
          c.region.toLowerCase().includes(q) ||
          c.sector.toLowerCase().includes(q);
        
        const matchesPlan = planFilter === 'ALL' || c.package_type === planFilter;
        const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;

        return matchesSearch && matchesPlan && matchesStatus;
      })
      .sort((a, b) => {
        const prioA = statusPriority[a.status] || 0;
        const prioB = statusPriority[b.status] || 0;
        if (prioA !== prioB) return prioB - prioA;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [clients, searchQuery, planFilter, statusFilter]);

  const paginatedClients = filteredClients.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(filteredClients.length / pageSize);

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const primaryItems: NavItem[] = [
    { id: 'BACK', label: 'REVENIR', icon: ArrowLeft, onClick: () => router.push('/admin') },
    { id: 'NEURAL_HUB', label: 'Dashboard', icon: LayoutDashboard, onClick: () => router.push('/admin') },
    { id: 'MEMORY_VAULT', label: 'Lifecycle', icon: RefreshCcw },
    { id: 'BUSINESS_CONFIG', label: 'Analytics', icon: Activity },
    { id: 'UNIVERSAL_INVENTORY', label: 'Projects', icon: Package },
    { id: 'DATA_LIB', label: 'Data Library', icon: Database },
    { id: 'REPORTS', label: 'Reports', icon: FileText },
    { id: 'WORD_ASSISTANT', label: 'Word Assistant', icon: Zap, type: 'trigger' }
  ];

  const secondaryItems: NavItem[] = [
    { id: 'SUPPORT_AGENT', label: 'Support Agent', icon: Brain },
    { id: 'DEV_AGENT', label: 'Dev Agent', icon: Brain }
  ];

  return (
    <DoubleRibbonIntelligent
      primaryItems={primaryItems}
      secondaryItems={secondaryItems}
      brandName=""
      brandIcon={Zap}
      userProfile={{
        name: profile?.full_name || 'Admin',
        email: user?.email || 'admin@node.io',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'admin'}`
      }}
    >
      <div className="flex-1 flex flex-col min-h-screen bg-[#0A0A0A] overflow-y-auto custom-scrollbar relative">
        <div className="px-8 py-10 flex flex-col gap-20">
          {/* STATS CARDS - ADMIN DASHBOARD STYLE */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* CARD 1: SYSTÈMES ACTIFS */}
            <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6 rounded-lg relative overflow-hidden group transition-all">
              <div className="flex justify-between items-start mb-6">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">SYSTÈMES ACTIFS</p>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] font-black text-white/40 uppercase tracking-widest">
                  <RefreshCcw className="w-2.5 h-2.5 animate-spin-slow" />
                  LIVE
                </div>
              </div>
              <div className="flex items-end justify-between mb-4">
                <p className="text-2xl font-black text-[#10B981] leading-none">{stats.activeSystems}</p>
                <Cpu className="w-5 h-5 text-gray-800 group-hover:text-[#10B981]/40 transition-colors" />
              </div>
              <div className="pt-4 border-t border-white/[0.03]">
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                  {stats.stableCount} STABLE · {stats.warningCount} WARNING · {stats.criticalCount} CRITICAL
                </p>
              </div>
            </div>

            {/* CARD 2: REVENUS TOTAL */}
            <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6 rounded-lg relative overflow-hidden group transition-all">
              <div className="flex justify-between items-start mb-6">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">REVENUS TOTAL</p>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] font-black text-white/40 uppercase tracking-widest">
                  <RefreshCcw className="w-2.5 h-2.5 animate-spin-slow" />
                  LIVE
                </div>
              </div>
              <div className="flex items-end justify-between mb-4">
                <p className="text-2xl font-black text-[#3B82F6] leading-none">{(stats.totalRevenue || 0).toLocaleString('fr-FR')} FCFA</p>
                <DollarSign className="w-5 h-5 text-gray-800 group-hover:text-[#3B82F6]/40 transition-colors" />
              </div>
              <div className="pt-4 border-t border-white/[0.03]">
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                  MOYENNE : {stats.avgMaintenance.toLocaleString('fr-FR')} FCFA/CLIENT
                </p>
              </div>
            </div>

            {/* CARD 3: TOKENS CONSOMMÉS */}
            <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6 rounded-lg relative overflow-hidden group transition-all">
              <div className="flex justify-between items-start mb-6">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">TOKENS CONSOMMÉS</p>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] font-black text-white/40 uppercase tracking-widest">
                  <RefreshCcw className="w-2.5 h-2.5 animate-spin-slow" />
                  LIVE
                </div>
              </div>
              <div className="flex items-end justify-between mb-4">
                <p className="text-2xl font-black text-[#8B5CF6] leading-none">{(stats.totalTokens || 0).toLocaleString('fr-FR')}</p>
                <TrendingUp className="w-5 h-5 text-gray-800 group-hover:text-[#8B5CF6]/40 transition-colors" />
              </div>
              <div className="pt-4 border-t border-white/[0.03]">
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                  {stats.totalBudget > 0 ? Math.round((stats.totalTokens / stats.totalBudget) * 100) : 0}% DU BUDGET TOTAL UTILISÉ
                </p>
              </div>
            </div>

            {/* CARD 4: ALERTES ACTIVES */}
            <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6 rounded-lg relative overflow-hidden group transition-all">
              <div className="flex justify-between items-start mb-6">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">ALERTES ACTIVES</p>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] font-black text-white/40 uppercase tracking-widest">
                  <RefreshCcw className="w-2.5 h-2.5 animate-spin-slow" />
                  LIVE
                </div>
              </div>
              <div className="flex items-end justify-between mb-4">
                <p className={`text-2xl font-black leading-none ${stats.activeAlerts === 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                  {stats.activeAlerts}
                </p>
                <ShieldAlert className={`w-5 h-5 group-hover:opacity-100 transition-opacity ${stats.activeAlerts === 0 ? 'text-gray-800' : 'text-[#EF4444]/40'}`} />
              </div>
              <div className="pt-4 border-t border-white/[0.03]">
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                  {stats.activeAlerts === 0 
                    ? 'AUCUNE ALERTE ACTIVE' 
                    : `${stats.criticalAlerts} CRITIQUE · ${stats.warningAlerts} WARNING`}
                </p>
              </div>
            </div>
          </div>

          {/* NAVIGATION BAR - SIMPLE VERSION */}
          <div className="flex flex-col md:flex-row items-center gap-3 p-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg">
            {/* SEARCH */}
            <div className="flex-1 flex items-center gap-3 px-3">
              <Search className="w-4 h-4 text-gray-500 group-focus-within:text-[#10B981] transition-colors" />
              <input 
                type="text"
                placeholder="Rechercher par nom, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none text-[10px] font-bold tracking-widest text-white placeholder:text-gray-600 outline-none w-full uppercase"
              />
            </div>

            {/* DROPDOWNS & ACTIONS */}
            <div className="flex items-center gap-2">
              <Dropdown 
                label="All Nodes" 
                options={plans} 
                value={planFilter} 
                onChange={setPlanFilter} 
              />
              <Dropdown 
                label="All Status" 
                options={['STABLE', 'WARNING', 'CRITICAL']} 
                value={statusFilter} 
                onChange={(val) => setStatusFilter(val as StatusType)} 
              />
            </div>
          </div>

          {/* TABLE - EXLM STYLE */}
          <div className="w-full border-t border-[#1A1A1A] overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1400px]">
              <thead>
                <tr className="border-b border-[#1A1A1A]">
                  <th className="px-4 py-6 text-[10px] font-bold text-gray-600 uppercase tracking-widest w-[20%] text-left">Nœud Cluster</th>
                  <th className="px-4 py-6 text-[10px] font-bold text-gray-600 uppercase tracking-widest text-left">Plan</th>
                  <th className="px-4 py-6 text-[10px] font-bold text-gray-600 uppercase tracking-widest text-left">Fleet Status</th>
                  <th className="px-4 py-6 text-[10px] font-bold text-gray-600 uppercase tracking-widest text-left">Token Usage</th>
                  <th className="px-4 py-6 text-[10px] font-bold text-gray-600 uppercase tracking-widest text-right">Agents</th>
                  <th className="px-4 py-6 text-[10px] font-bold text-gray-600 uppercase tracking-widest text-left">Intelligence Mode</th>
                  <th className="px-4 py-6 text-[10px] font-bold text-gray-600 uppercase tracking-widest text-left">Région · Secteur</th>
                  <th className="px-4 py-6 text-[10px] font-bold text-gray-600 uppercase tracking-widest text-right">Cost (FCFA)</th>
                  <th className="px-4 py-6 text-[10px] font-bold text-gray-600 uppercase tracking-widest text-right">Date Activation</th>
                  <th className="px-4 py-6 text-[10px] font-bold text-gray-600 uppercase tracking-widest text-center w-[40px]">⋯</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]">
                {loading ? (
                  <tr><td colSpan={10} className="px-6 py-20 text-center text-white/10 font-mono text-[10px] tracking-widest">CONNECTING TO NEURAL HUB...</td></tr>
                ) : paginatedClients.map(client => {
                  const usage = client.token_budget > 0 ? (client.total_tokens_consumed / client.token_budget) * 100 : 0;
                  const intelligence = client.intelligence;
                  return (
                    <tr 
                      key={client.id}
                      onMouseMove={handleMouseMove}
                      onMouseEnter={() => setHoveredClient(client)}
                      onMouseLeave={() => setHoveredClient(null)}
                      onClick={() => router.push(`/admin/system/${client.id}`)}
                      className="group h-[72px] hover:bg-white/[0.02] transition-all cursor-pointer"
                    >
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white/40">
                            {client.name.substring(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-[12px] font-bold text-white group-hover:text-[#10B981] transition-colors">{client.name}</p>
                              <span className="text-[8px] font-bold text-[#10B981] bg-[#10B981]/10 px-1.5 py-0.5 rounded uppercase tracking-tighter">Live</span>
                            </div>
                            <p className="text-[9px] font-medium text-gray-600 uppercase tracking-tight">{client.project_id || `ID-${client.id.substring(0,8)}`}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${
                          client.package_type === 'STARTUP' ? 'bg-gray-500/10 text-gray-500' :
                          client.package_type === 'BUSINESS' ? 'bg-[#3B82F6]/10 text-[#3B82F6]' :
                          client.package_type === 'ENTERPRISE' ? 'bg-[#10B981]/10 text-[#10B981]' :
                          client.package_type === 'ELITE' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' :
                          'bg-white/5 text-white/40'
                        }`}>
                          {client.package_type}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            client.status === 'CRITICAL' ? 'bg-red-500' :
                            client.status === 'WARNING' ? 'bg-amber-500' :
                            'bg-[#10B981]'
                          }`} />
                          <span className={`text-[10px] font-bold uppercase tracking-tight ${
                            client.status === 'CRITICAL' ? 'text-red-500' :
                            client.status === 'WARNING' ? 'text-amber-500' :
                            'text-[#10B981]'
                          }`}>
                            {client.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                         <div className="flex flex-col gap-1 w-32">
                            <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
                               <div 
                                 className={`h-full transition-all duration-1000 ${usage > 90 ? 'bg-red-500' : usage > 70 ? 'bg-amber-500' : 'bg-[#10B981]'}`}
                                 style={{ width: `${Math.min(usage, 100)}%` }}
                               />
                            </div>
                            <span className="text-[9px] font-mono font-bold text-gray-500">{Math.round(usage)}%</span>
                         </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <p className="text-[12px] font-bold text-white tabular-nums">{client.agent_count}</p>
                      </td>
                      <td className="px-4 py-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (intelligence) router.push(`/admin/system/${client.id}/intelligence`);
                          }}
                          className="flex flex-col items-start gap-0.5 group/intel"
                        >
                          {intelligence ? (
                            <span className="text-[10px] font-bold" style={{ color: intelligence.severity_level === 'CRITICAL' ? '#EF4444' : intelligence.severity_level === 'WARNING' ? '#F59E0B' : '#10B981' }}>
                              {intelligence.raw_context}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold" style={{ color: '#4B5563' }}>SYSTÈME OPTIMAL</span>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-2">
                         <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-white tracking-tight">{client.region}</span>
                            <span className="text-[9px] font-medium text-gray-600 uppercase tracking-tighter">{client.sector}</span>
                         </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <p className="text-[12px] font-black text-white tabular-nums">{(client.monthly_cost || 0).toLocaleString('fr-FR')} <span className="text-[9px] text-gray-600">FCFA</span></p>
                      </td>
                      <td className="px-4 py-2 text-right">
                         <p className="text-[10px] font-bold text-gray-500 font-mono">
                            {client.activated_at 
                              ? new Date(client.activated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                              : new Date(client.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                            }
                         </p>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-center">
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setMousePos({ x: e.clientX, y: e.clientY });
                              setActiveMenuId(activeMenuId === client.id ? null : client.id); 
                            }}
                            className="p-1 hover:bg-white/5 rounded text-gray-600 hover:text-white transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* PAGINATION - EXLM STYLE */}
            <div className="px-4 py-6 border-t border-[#1A1A1A] flex items-center justify-between">
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                Showing {paginatedClients.length} of {filteredClients.length} nodes
              </p>
              <div className="flex items-center gap-1">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="w-8 h-8 flex items-center justify-center rounded bg-[#1A1A1A] text-gray-500 hover:text-white disabled:opacity-20"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
                  <button 
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 rounded text-[11px] font-bold transition-all ${currentPage === i + 1 ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded bg-[#1A1A1A] text-gray-500 hover:text-white disabled:opacity-20"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* HOVER CONTEXT CARD - P2P STYLE */}
        <AnimatePresence>
          {hoveredClient && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'fixed',
                left: mousePos.x + 20,
                top: mousePos.y - 100,
                zIndex: 9999,
                pointerEvents: 'none'
              }}
              className="w-[260px] bg-[#0F1014] border border-[#2A2A2A] rounded-xl p-3 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
            >
               <div className="space-y-2">
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="text-sm font-bold text-white tracking-tight">{hoveredClient.name}</h4>
                      <p className="text-xs font-medium text-gray-500">{hoveredClient.package_type}</p>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-[#10B981] text-xs font-bold uppercase tracking-widest">{hoveredClient.project_id}</span>
                       <span className="text-gray-600 text-xs">•</span>
                       <span className="text-gray-600 text-xs uppercase tracking-tighter">{hoveredClient.sector}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">NEURAL USAGE</p>
                      <p className="text-sm font-bold text-white">{Math.round((hoveredClient.total_tokens_consumed / (hoveredClient.token_budget || 1)) * 100)}%</p>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-[#10B981]" style={{ width: `${Math.min((hoveredClient.total_tokens_consumed / (hoveredClient.token_budget || 1)) * 100, 100)}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div className="flex flex-col">
                       <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">TOTAL AGENTS</p>
                       <p className="text-sm font-bold text-white">{hoveredClient.agent_count}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">STATUS</p>
                       <p className={`text-sm font-bold uppercase ${hoveredClient.status === 'CRITICAL' ? 'text-red-500' : 'text-[#10B981]'}`}>{hoveredClient.status}</p>
                    </div>
                  </div>

                  {hoveredClient.intelligence && (
                    <div className="bg-red-500/5 border border-red-500/10 p-2 rounded-lg">
                       <p className="text-xs font-black text-red-500 uppercase tracking-widest mb-0.5">{hoveredClient.intelligence.issue_type}</p>
                       <p className="text-sm text-red-500/60 leading-tight line-clamp-2">{hoveredClient.intelligence.raw_context}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs font-bold text-[#10B981] group cursor-pointer pt-1 py-1.5">
                    <span className="tracking-widest uppercase">Open neural pathway</span>
                    <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CONTEXT MENU */}
        <AnimatePresence>
          {activeMenuId && (
            <div className="fixed inset-0 z-[100]" onClick={() => setActiveMenuId(null)}>
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{ top: mousePos.y, left: mousePos.x - 200 }}
                className="absolute w-52 bg-[#111111] border border-white/10 rounded-xl shadow-2xl py-2 overflow-hidden"
              >
                <button onClick={() => router.push(`/admin/system/${activeMenuId}`)} className="w-full px-4 py-2.5 text-left text-[10px] font-bold text-white/60 hover:text-white hover:bg-white/5 flex items-center gap-3 transition-all uppercase tracking-widest">
                  <Zap className="w-3.5 h-3.5" /> OUVRIR SYSTÈME
                </button>
                <button onClick={() => router.push(`/admin/system/${activeMenuId}/agents`)} className="w-full px-4 py-2.5 text-left text-[10px] font-bold text-white/60 hover:text-white hover:bg-white/5 flex items-center gap-3 transition-all uppercase tracking-widest">
                  <Brain className="w-3.5 h-3.5" /> VOIR AGENTS
                </button>
                <div className="h-px bg-white/5 my-1" />
                <button className="w-full px-4 py-2.5 text-left text-[10px] font-bold text-red-500/60 hover:text-red-500 hover:bg-red-500/5 flex items-center gap-3 transition-all uppercase tracking-widest">
                  <Power className="w-3.5 h-3.5" /> DÉSACTIVER
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DoubleRibbonIntelligent>
  );
}
