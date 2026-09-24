"use client";

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Zap, LayoutDashboard, Users, ArrowLeft,
  Terminal, Sliders, Power, Save, Loader2, AlertCircle,
  CheckCircle2, ChevronDown, Clock, Wrench, Plus, Upload,
  PenLine, Trash2, X, FileCode, Eye, Code2
} from 'lucide-react';
import { useUser } from '@/lib/contexts/user-context';
import DoubleRibbonIntelligent, { NavItem } from '@/components/DoubleRibbonIntelligent';
import { createClient } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

type AgentTabId = 'axon' | 'business' | 'commercial';

interface AgentConfigRow {
  id:                      string;
  agent_id:                string;
  provider:                string;
  model:                   string;
  max_tokens_per_session:  number | null;
  max_requests_per_day:    number | null;
  system_prompt:           string | null;
  is_active:               boolean;
  created_at:              string;
  updated_at:              string;
}

interface AvailableModel {
  id:           string;
  name:         string;
  provider:     string;
  model_string: string;
  complexity:   string;
  is_active:    boolean;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const AGENT_TABS: Array<{ id: AgentTabId; label: string; color: string; glow: string; description: string }> = [
  { id: 'axon',       label: 'AXON',       color: '#39FF14', glow: 'rgba(57,255,20,0.5)',  description: 'Analyste stratégique — pipeline, prospects, performance' },
  { id: 'business',   label: 'BUSINESS',   color: '#3b82f6', glow: 'rgba(59,130,246,0.5)', description: 'Commercial automatique — e-mails, relances, fiches prospects' },
  { id: 'commercial', label: 'COMMERCIAL', color: '#a855f7', glow: 'rgba(168,85,247,0.5)', description: 'Vitrine interactive — simulateur, qualification des leads' },
];

// ─── Rendu Markdown minimal (sans dépendance externe) ─────────────────────────

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  // Découpe une ligne en segments : **gras**, `code inline`, texte normal
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**')) {
      parts.push(<strong key={`${keyPrefix}-b-${i}`} className="font-bold text-white">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`')) {
      parts.push(
        <code key={`${keyPrefix}-c-${i}`} className="bg-white/10 text-orange-300 px-1.5 py-0.5 rounded text-[11px] font-mono">
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
    i++;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function MarkdownLite({ content }: { content: string }) {
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let listBuffer: { text: string; indent: number }[] = [];
  let blockIndex = 0;

  const flushList = () => {
    if (listBuffer.length === 0) return;
    const key = `list-${blockIndex++}`;
    blocks.push(
      <ul key={key} className="space-y-1.5 my-3">
        {listBuffer.map((item, idx) => (
          <li
            key={`${key}-${idx}`}
            className="flex items-start gap-2 text-[13px] text-white/70 leading-relaxed"
            style={{ marginLeft: item.indent * 20 }}
          >
            <span className="text-orange-400/60 mt-1.5 shrink-0">•</span>
            <span>{renderInline(item.text, `${key}-${idx}`)}</span>
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trimEnd();
    const bulletMatch = line.match(/^(\s*)[-*]\s+(.*)$/);

    if (bulletMatch) {
      const indent = Math.floor(bulletMatch[1].length / 2);
      listBuffer.push({ text: bulletMatch[2], indent });
      return;
    }

    flushList();

    if (line.startsWith('### ')) {
      blocks.push(<h3 key={blockIndex++} className="text-[13px] font-bold text-white mt-4 mb-1">{renderInline(line.slice(4), `h3-${blockIndex}`)}</h3>);
    } else if (line.startsWith('## ')) {
      blocks.push(<h2 key={blockIndex++} className="text-[15px] font-bold text-white mt-5 mb-2">{renderInline(line.slice(3), `h2-${blockIndex}`)}</h2>);
    } else if (line.startsWith('# ')) {
      blocks.push(<h1 key={blockIndex++} className="text-lg font-bold text-white mt-2 mb-3">{renderInline(line.slice(2), `h1-${blockIndex}`)}</h1>);
    } else if (line.trim() === '') {
      blocks.push(<div key={blockIndex++} className="h-2" />);
    } else {
      blocks.push(<p key={blockIndex++} className="text-[13px] text-white/70 leading-relaxed">{renderInline(line, `p-${blockIndex}`)}</p>);
    }
  });
  flushList();

  return <div className="space-y-0.5">{blocks}</div>;
}

// ─── Composant principal ─────────────────────────────────────────────────────

function AgentSettingsPageContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { user, profile } = useUser();

  const initialTab = (searchParams.get('tab') as AgentTabId) || 'axon';
  const [activeAgentId, setActiveAgentId] = useState<AgentTabId>(
    ['axon', 'business', 'commercial'].includes(initialTab) ? initialTab : 'axon'
  );

  const [configs,        setConfigs]        = useState<Record<string, AgentConfigRow>>({});
  const [loading,        setLoading]        = useState(true);
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [error,          setError]          = useState<string | null>(null);
  const [saveState,      setSaveState]      = useState<'idle' | 'saving' | 'saved'>('idle');

  // ── Champs édités localement (déférés jusqu'au SYNC) ──────────────────────
  const [systemPrompt,        setSystemPrompt]        = useState('');
  const [model,                setModel]               = useState('');
  const [provider,             setProvider]            = useState('');
  const [maxTokensPerSession,  setMaxTokensPerSession] = useState<number>(2000);
  const [maxRequestsPerDay,    setMaxRequestsPerDay]   = useState<number>(10);
  const [isActive,             setIsActive]            = useState(true);

  const currentTabMeta = AGENT_TABS.find(t => t.id === activeAgentId)!;

  // ── Détection de modifications non sauvegardées ───────────────────────────
  const [pendingTabId, setPendingTabId] = useState<AgentTabId | null>(null);

  const isDirty = (() => {
    const cfg = configs[activeAgentId];
    if (!cfg) return false;
    return (
      systemPrompt !== (cfg.system_prompt || '') ||
      model !== (cfg.model || '') ||
      provider !== (cfg.provider || '') ||
      maxTokensPerSession !== (cfg.max_tokens_per_session ?? 2000) ||
      maxRequestsPerDay !== (cfg.max_requests_per_day ?? 10) ||
      isActive !== (cfg.is_active ?? true)
    );
  })();

  // ── Charger toutes les configs + les modèles disponibles ─────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/hq/agents');
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      const byId: Record<string, AgentConfigRow> = {};
      (json.data ?? []).forEach((row: AgentConfigRow) => {
        byId[row.agent_id] = row;
      });
      setConfigs(byId);

      const supabase = createClient();
      const { data: models } = await supabase
        .from('available_models')
        .select('*')
        .eq('is_active', true)
        .order('complexity');
      setAvailableModels(models || []);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des configurations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Synchroniser les champs locaux quand on change d'onglet ou que les données arrivent ──
  useEffect(() => {
    const cfg = configs[activeAgentId];
    if (cfg) {
      setSystemPrompt(cfg.system_prompt || '');
      setModel(cfg.model || '');
      setProvider(cfg.provider || '');
      setMaxTokensPerSession(cfg.max_tokens_per_session ?? 2000);
      setMaxRequestsPerDay(cfg.max_requests_per_day ?? 10);
      setIsActive(cfg.is_active ?? true);
    }
    setSaveState('idle');
  }, [activeAgentId, configs]);

  const switchTab = (tabId: AgentTabId) => {
    setActiveAgentId(tabId);
    setTrashOpen(false);
    router.replace(`/admin/hq/agents/axon/settings?tab=${tabId}`, { scroll: false });
  };

  const handleTabChange = (tabId: AgentTabId) => {
    if (tabId === activeAgentId) return;
    if (isDirty) {
      setPendingTabId(tabId);
    } else {
      switchTab(tabId);
    }
  };

  const confirmDiscardAndSwitch = () => {
    if (pendingTabId) switchTab(pendingTabId);
    setPendingTabId(null);
  };

  const confirmSaveAndSwitch = async () => {
    const targetTab = pendingTabId;
    setPendingTabId(null);
    if (targetTab) {
      await handleSave();
      switchTab(targetTab);
    }
  };

  const handleModelChange = (modelString: string) => {
    setModel(modelString);
    const matched = availableModels.find(m => m.model_string === modelString);
    if (matched) {
      setProvider(matched.provider);
    }
  };

  const handleSave = async () => {
    setSaveState('saving');
    setError(null);
    try {
      const res = await fetch('/api/admin/hq/agents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id:               activeAgentId,
          system_prompt:          systemPrompt,
          model:                  model,
          provider:               provider,
          max_tokens_per_session: maxTokensPerSession,
          max_requests_per_day:   maxRequestsPerDay,
          is_active:              isActive
        })
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setConfigs(prev => ({ ...prev, [activeAgentId]: json.data }));
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la sauvegarde.");
      setSaveState('idle');
    }
  };

  const systemPromptCharCount = systemPrompt.length;

  // ── Compétences (skills) ───────────────────────────────────────────────────
  interface AgentSkill {
    id:          string; // id de la ligne hq_agent_skills
    skill_id:    string;
    name:        string;
    category:    string | null;
    content:     string;
    is_active:   boolean;
    deleted_at?: string | null;
  }

  const [skills,        setSkills]        = useState<AgentSkill[]>([]);
  const [skillsLoading, setSkillsLoading]  = useState(true);
  const [addSkillOpen,  setAddSkillOpen]   = useState(false);
  const [addSkillMode,  setAddSkillMode]   = useState<'file' | 'manual'>('manual');
  const [skillForm,     setSkillForm]      = useState({ name: '', category: '', content: '' });
  const [savingSkill,   setSavingSkill]    = useState(false);
  const [skillsError,   setSkillsError]    = useState<string | null>(null);
  const skillFileInputRef = React.useRef<HTMLInputElement>(null);

  // ── Corbeille ────────────────────────────────────────────────────────────
  const [trashOpen,     setTrashOpen]     = useState(false);
  const [trashSkills,   setTrashSkills]   = useState<AgentSkill[]>([]);
  const [trashLoading,  setTrashLoading]  = useState(false);
  const [trashError,    setTrashError]    = useState<string | null>(null);
  const [restoringId,   setRestoringId]   = useState<string | null>(null);
  const [purgingId,     setPurgingId]     = useState<string | null>(null);

  const loadTrash = useCallback(async (agentId: AgentTabId) => {
    setTrashLoading(true);
    setTrashError(null);
    try {
      const res = await fetch(`/api/admin/hq/skills?agent_id=${agentId}&trash=true`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setTrashSkills(json.data ?? []);
    } catch (err: any) {
      setTrashError(err.message || "Erreur lors du chargement de la corbeille.");
    } finally {
      setTrashLoading(false);
    }
  }, []);

  const openTrash = () => {
    setTrashOpen(true);
    loadTrash(activeAgentId);
  };

  const restoreSkill = async (skill: AgentSkill) => {
    setRestoringId(skill.id);
    setTrashError(null);
    try {
      const res = await fetch('/api/admin/hq/skills', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: skill.id, restore: true })
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setTrashSkills(prev => prev.filter(s => s.id !== skill.id));
      setSkills(prev => [...prev, { ...skill, deleted_at: null }]);
    } catch (err: any) {
      setTrashError(err.message || "Erreur lors de la restauration.");
    } finally {
      setRestoringId(null);
    }
  };

  // ── Confirmation stylée pour les suppressions ─────────────────────────────
  const [confirmAction, setConfirmAction] = useState<{ type: 'trash' | 'purge'; skill: AgentSkill } | null>(null);

  const requestPurgeSkill = (skill: AgentSkill) => {
    setConfirmAction({ type: 'purge', skill });
  };

  const performPurgeSkill = async (skill: AgentSkill) => {
    setPurgingId(skill.id);
    setTrashError(null);
    try {
      const res = await fetch('/api/admin/hq/skills', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: skill.id, permanent: true })
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setTrashSkills(prev => prev.filter(s => s.id !== skill.id));
    } catch (err: any) {
      setTrashError(err.message || "Erreur lors de la suppression définitive.");
    } finally {
      setPurgingId(null);
    }
  };

  const loadSkills = useCallback(async (agentId: AgentTabId) => {
    setSkillsLoading(true);
    setSkillsError(null);
    try {
      const res = await fetch(`/api/admin/hq/skills?agent_id=${agentId}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setSkills(json.data ?? []);
    } catch (err: any) {
      setSkillsError(err.message || "Erreur lors du chargement des compétences.");
    } finally {
      setSkillsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSkills(activeAgentId);
  }, [activeAgentId, loadSkills]);

  const handleSkillFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setSkillForm(prev => ({
        ...prev,
        name: prev.name || file.name.replace(/\.[^/.]+$/, ''),
        content: text
      }));
    };
    reader.readAsText(file);
  };

  const handleAddSkill = async () => {
    if (!skillForm.name.trim() || !skillForm.content.trim()) return;
    setSavingSkill(true);
    setSkillsError(null);
    try {
      const res = await fetch('/api/admin/hq/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: activeAgentId,
          name:     skillForm.name.trim(),
          category: skillForm.category.trim() || null,
          content:  skillForm.content
        })
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setSkills(prev => [...prev, json.data]);
      setSkillForm({ name: '', category: '', content: '' });
      setAddSkillOpen(false);
    } catch (err: any) {
      setSkillsError(err.message || "Erreur lors de l'ajout de la compétence.");
    } finally {
      setSavingSkill(false);
    }
  };

  const toggleSkillActive = async (skill: AgentSkill) => {
    const newState = !skill.is_active;
    setSkills(prev => prev.map(s => s.id === skill.id ? { ...s, is_active: newState } : s));
    try {
      const res = await fetch('/api/admin/hq/skills', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: skill.id, is_active: newState })
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
    } catch (err: any) {
      // rollback en cas d'échec
      setSkills(prev => prev.map(s => s.id === skill.id ? { ...s, is_active: skill.is_active } : s));
      setSkillsError(err.message || "Erreur lors de la mise à jour.");
    }
  };

  const requestDeleteSkill = (skill: AgentSkill) => {
    setConfirmAction({ type: 'trash', skill });
  };

  const performDeleteSkill = async (skill: AgentSkill) => {
    const previous = skills;
    setSkills(prev => prev.filter(s => s.id !== skill.id));
    try {
      const res = await fetch('/api/admin/hq/skills', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: skill.id })
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
    } catch (err: any) {
      setSkills(previous); // rollback
      setSkillsError(err.message || "Erreur lors de la suppression.");
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, skill } = confirmAction;
    setConfirmAction(null);
    if (type === 'trash') {
      await performDeleteSkill(skill);
    } else {
      await performPurgeSkill(skill);
    }
  };

  // ── Visualisation / édition d'une compétence ───────────────────────────────
  const [viewingSkill,    setViewingSkill]    = useState<AgentSkill | null>(null);
  const [skillEditMode,   setSkillEditMode]   = useState(false);
  const [skillViewMode,   setSkillViewMode]   = useState<'rendered' | 'raw'>('rendered');
  const [skillEditForm,   setSkillEditForm]   = useState({ name: '', category: '', content: '' });
  const [savingSkillEdit, setSavingSkillEdit] = useState(false);
  const [skillEditError,  setSkillEditError]  = useState<string | null>(null);

  const openSkillView = (skill: AgentSkill) => {
    setViewingSkill(skill);
    setSkillEditMode(false);
    setSkillViewMode('rendered');
    setSkillEditForm({ name: skill.name, category: skill.category || '', content: skill.content });
    setSkillEditError(null);
  };

  const closeSkillView = () => {
    setViewingSkill(null);
    setSkillEditMode(false);
    setSkillEditError(null);
  };

  const saveSkillEdit = async () => {
    if (!viewingSkill) return;
    if (!skillEditForm.name.trim() || !skillEditForm.content.trim()) return;

    setSavingSkillEdit(true);
    setSkillEditError(null);
    try {
      const res = await fetch('/api/admin/hq/skills', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill_id: viewingSkill.skill_id,
          name:     skillEditForm.name.trim(),
          category: skillEditForm.category.trim() || null,
          content:  skillEditForm.content
        })
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      const updated: AgentSkill = {
        ...viewingSkill,
        name:     json.data.name,
        category: json.data.category,
        content:  json.data.content
      };
      setSkills(prev => prev.map(s => s.id === updated.id ? updated : s));
      setViewingSkill(updated);
      setSkillEditMode(false);
    } catch (err: any) {
      setSkillEditError(err.message || "Erreur lors de la mise à jour.");
    } finally {
      setSavingSkillEdit(false);
    }
  };

  // ── Nav ─────────────────────────────────────────────────────────────────
  const primaryItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, onClick: () => router.push('/admin') },
    { id: 'prospects', label: 'Prospects', icon: Users,           path:    '/admin/prospects' },
    { id: 'hq-agents', label: 'Agents HQ', icon: Brain,           path:    '/admin/hq/agents' }
  ];

  return (
    <DoubleRibbonIntelligent
      primaryItems={primaryItems}
      secondaryItems={[]}
      brandName="AUTOSLASH"
      brandIcon={Zap}
      userProfile={{
        name:  profile?.full_name || 'Amadou',
        email: user?.email        || 'admin@autoslash.ai'
      }}
    >
      <div className="min-h-screen bg-[#0A0A0A] font-mono text-white/90 p-6 lg:p-12 pb-40">
        <div className="max-w-[1000px] mx-auto space-y-16">

          {/* ── HEADER ─────────────────────────────────────────────────── */}
          <div className="flex justify-between items-end">
            <div className="space-y-4">
              <button
                onClick={() => router.push('/admin/hq/agents')}
                className="flex items-center gap-2 text-white/30 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Retour au chat
              </button>
              <div className="flex items-center gap-3">
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: currentTabMeta.color, boxShadow: `0 0 10px ${currentTabMeta.color}` }}
                />
                <span className="text-[10px] font-bold text-white/40 tracking-[0.4em] uppercase">
                  Status // Agent_Configuration
                </span>
              </div>
              <h1 className="text-5xl font-normal text-white tracking-tighter">
                {currentTabMeta.label}
              </h1>
              <p className="text-xs text-white/40">{currentTabMeta.description}</p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-white/20 uppercase tracking-widest mb-1">Table</p>
              <p className="text-xs font-bold text-white/60 tracking-wider">agent_configs</p>
            </div>
          </div>

          {/* ── TAB NAVIGATION ─────────────────────────────────────────── */}
          <div className="flex border-b border-white/10 gap-10">
            {AGENT_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`pb-4 text-[10px] font-bold uppercase tracking-[0.3em] transition-all relative flex items-center gap-2 ${
                  activeAgentId === tab.id ? 'text-white' : 'text-white/20 hover:text-white/40'
                }`}
              >
                {tab.label}
                {activeAgentId === tab.id && isDirty && (
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400" title="Modifications non sauvegardées" />
                )}
                {activeAgentId === tab.id && (
                  <motion.div
                    layoutId="settings-tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ backgroundColor: tab.color, boxShadow: `0 0 10px ${tab.color}` }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* ── ERREUR ─────────────────────────────────────────────────── */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 px-5 py-4 bg-red-500/10 border border-red-500/20 rounded-2xl"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-xs font-mono text-red-400 flex-1">{error}</span>
                <button onClick={() => setError(null)} className="text-red-400/50 hover:text-red-400">✕</button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── CONTENU ────────────────────────────────────────────────── */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
              <p className="text-[10px] text-white/20 uppercase tracking-widest">Chargement de la configuration...</p>
            </div>
          ) : (
            <motion.div
              key={activeAgentId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-16"
            >

              {/* SECTION_01 // STATUS */}
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: currentTabMeta.color, boxShadow: `0 0 10px ${currentTabMeta.color}` }} />
                  <h2 className="text-sm font-bold text-white uppercase tracking-[0.3em]">Section_01 // Status</h2>
                </div>

                <div className="bg-[#141414] border border-white/10 rounded-2xl p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl border ${isActive ? 'bg-white/5 border-white/10' : 'bg-orange-500/10 border-orange-500/20'}`}>
                      <Power className={`w-5 h-5 ${isActive ? 'text-white/60' : 'text-orange-400'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{isActive ? 'Agent actif' : 'Agent désactivé'}</p>
                      <p className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">agent_id : {activeAgentId}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsActive(!isActive)}
                    className={`relative w-14 h-7 rounded-full transition-all cursor-pointer shrink-0 ${
                      isActive ? 'bg-[#39FF14]/30' : 'bg-white/10'
                    }`}
                  >
                    <motion.div
                      animate={{ x: isActive ? 28 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className={`absolute top-1 w-5 h-5 rounded-full ${isActive ? 'bg-[#39FF14]' : 'bg-white/40'}`}
                    />
                  </button>
                </div>

                {(configs[activeAgentId]?.created_at || configs[activeAgentId]?.updated_at) && (
                  <div className="flex items-center gap-6 px-2 text-[9px] text-white/20 uppercase tracking-widest">
                    {configs[activeAgentId]?.updated_at && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        Modifié le {new Date(configs[activeAgentId].updated_at).toLocaleString('fr-FR')}
                      </span>
                    )}
                  </div>
                )}
              </section>

              {/* SECTION_02 // MODEL_CONFIG */}
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-6 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-[0.3em]">Section_02 // Model_Config</h2>
                </div>

                <div className="bg-[#141414] border border-white/10 rounded-2xl p-8 space-y-8">

                  {/* Modèle */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Modèle actif</label>
                    <div className="bg-black border border-white/10 rounded-xl px-5 py-3.5 hover:border-white/20 transition-all relative group">
                      <select
                        value={model}
                        onChange={(e) => handleModelChange(e.target.value)}
                        className="w-full bg-black text-[13px] font-bold text-white outline-none cursor-pointer appearance-none relative z-10"
                      >
                        <option value="">SÉLECTIONNER UN MODÈLE</option>
                        {availableModels.map((m) => (
                          <option key={m.id} value={m.model_string} className="bg-black text-white">
                            {m.name} — {m.provider} ({m.complexity})
                          </option>
                        ))}
                        {model && !availableModels.some(m => m.model_string === model) && (
                          <option value={model} className="bg-black text-white">
                            {model} (valeur actuelle)
                          </option>
                        )}
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-white/20 group-hover:text-white/40 transition-colors">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    {provider && (
                      <p className="text-[9px] text-white/20 uppercase tracking-widest px-1">Fournisseur : {provider}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Max tokens / session */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Tokens max / session</label>
                      <div className="bg-black border border-white/10 rounded-xl px-5 py-3.5">
                        <input
                          type="number"
                          value={maxTokensPerSession}
                          onChange={(e) => setMaxTokensPerSession(parseInt(e.target.value) || 0)}
                          className="w-full bg-transparent text-[13px] font-bold text-white outline-none font-mono"
                        />
                      </div>
                    </div>

                    {/* Max requests / jour */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Requêtes max / jour</label>
                      <div className="bg-black border border-white/10 rounded-xl px-5 py-3.5">
                        <input
                          type="number"
                          value={maxRequestsPerDay}
                          onChange={(e) => setMaxRequestsPerDay(parseInt(e.target.value) || 0)}
                          className="w-full bg-transparent text-[13px] font-bold text-white outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION_03 // SYSTEM_PROMPT */}
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <Terminal className="w-4 h-4" style={{ color: currentTabMeta.color }} />
                  <h2 className="text-sm font-bold text-white uppercase tracking-[0.3em]">Section_03 // System_Prompt</h2>
                </div>

                <div className="bg-black border border-white/10 rounded-2xl p-6 relative focus-within:border-white/20 transition-all">
                  <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="w-full h-72 bg-transparent text-[13px] font-mono text-white/80 outline-none placeholder:text-white/10 leading-relaxed resize-none"
                    placeholder={`Instructions système pour ${currentTabMeta.label}...`}
                  />
                  <div className="absolute bottom-4 right-6 text-[9px] font-bold uppercase tracking-widest text-white/20">
                    {systemPromptCharCount.toLocaleString('fr-FR')} caractères
                  </div>
                </div>
              </section>

              {/* SECTION_04 // SKILLS */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Wrench className="w-4 h-4 text-orange-400" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-[0.3em]">Section_04 // Skills</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={openTrash}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-white/40 text-[9px] font-black uppercase tracking-widest hover:text-white hover:border-white/20 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Corbeille
                    </button>
                    <button
                      onClick={() => { setAddSkillOpen(true); setAddSkillMode('manual'); setSkillForm({ name: '', category: '', content: '' }); }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-400/10 border border-orange-400/20 text-orange-400 text-[9px] font-black uppercase tracking-widest hover:bg-orange-400/15 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ajouter une compétence
                    </button>
                  </div>
                </div>

                {skillsError && (
                  <div className="flex items-center gap-3 px-5 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span className="text-xs font-mono text-red-400 flex-1">{skillsError}</span>
                    <button onClick={() => setSkillsError(null)} className="text-red-400/50 hover:text-red-400">✕</button>
                  </div>
                )}

                {skillsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
                  </div>
                ) : skills.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 border border-dashed border-white/10 rounded-2xl gap-3">
                    <Wrench className="w-6 h-6 text-white/10" />
                    <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">
                      Aucune compétence assignée à {currentTabMeta.label}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {skills.map((skill) => (
                      <div
                        key={skill.id}
                        onClick={() => openSkillView(skill)}
                        className="bg-[#141414] border border-white/10 rounded-xl px-5 py-4 flex items-center justify-between gap-4 cursor-pointer hover:border-orange-400/30 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileCode className={`w-4 h-4 shrink-0 ${skill.is_active ? 'text-orange-400' : 'text-white/20'}`} />
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-white truncate">{skill.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {skill.category && (
                                <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest bg-white/5 px-1.5 py-0.5 rounded">
                                  {skill.category}
                                </span>
                              )}
                              <span className="text-[9px] text-white/20">{skill.content.length.toLocaleString('fr-FR')} caractères</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleSkillActive(skill); }}
                            title={skill.is_active ? 'Désactiver' : 'Activer'}
                            className={`relative w-10 h-5 rounded-full transition-all cursor-pointer ${
                              skill.is_active ? 'bg-orange-400/30' : 'bg-white/10'
                            }`}
                          >
                            <motion.div
                              animate={{ x: skill.is_active ? 20 : 2 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              className={`absolute top-0.5 w-4 h-4 rounded-full ${skill.is_active ? 'bg-orange-400' : 'bg-white/40'}`}
                            />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); requestDeleteSkill(skill); }}
                            title="Retirer"
                            className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

            </motion.div>
          )}

        </div>
      </div>

      {/* ── MODALE AJOUT DE COMPÉTENCE ────────────────────────────────── */}
      <AnimatePresence>
        {addSkillOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
            onClick={() => !savingSkill && setAddSkillOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] font-mono"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <Wrench className="w-4 h-4 text-orange-400" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-white">
                    Nouvelle compétence — {currentTabMeta.label}
                  </h3>
                </div>
                <button onClick={() => !savingSkill && setAddSkillOpen(false)} className="text-white/30 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sélecteur de mode */}
              <div className="flex gap-2 px-6 pt-5 shrink-0">
                <button
                  onClick={() => setAddSkillMode('manual')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer border ${
                    addSkillMode === 'manual'
                      ? 'bg-orange-400/10 border-orange-400/30 text-orange-400'
                      : 'bg-white/[0.02] border-white/10 text-white/40 hover:text-white/60'
                  }`}
                >
                  <PenLine className="w-3.5 h-3.5" />
                  Saisie manuelle
                </button>
                <button
                  onClick={() => setAddSkillMode('file')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer border ${
                    addSkillMode === 'file'
                      ? 'bg-orange-400/10 border-orange-400/30 text-orange-400'
                      : 'bg-white/[0.02] border-white/10 text-white/40 hover:text-white/60'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Importer un fichier
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto">
                {addSkillMode === 'file' && (
                  <div
                    onClick={() => skillFileInputRef.current?.click()}
                    className="border border-dashed border-white/20 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-orange-400/40 transition-all"
                  >
                    <Upload className="w-6 h-6 text-white/30" />
                    <p className="text-[10px] text-white/40 uppercase tracking-widest text-center">
                      {skillForm.content ? 'Fichier chargé — cliquer pour remplacer' : 'Cliquer pour choisir un fichier (.md, .txt)'}
                    </p>
                    <input
                      ref={skillFileInputRef}
                      type="file"
                      accept=".md,.txt"
                      className="hidden"
                      onChange={handleSkillFileChange}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Nom</label>
                  <input
                    value={skillForm.name}
                    onChange={(e) => setSkillForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40 transition-all"
                    placeholder="Ex : Analyse de pipeline"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Catégorie (optionnel)</label>
                  <input
                    value={skillForm.category}
                    onChange={(e) => setSkillForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40 transition-all"
                    placeholder="Ex : Analyse, Commercial, Support"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Contenu</label>
                  <textarea
                    value={skillForm.content}
                    onChange={(e) => setSkillForm(prev => ({ ...prev, content: e.target.value }))}
                    className="w-full h-48 bg-black border border-white/10 rounded-lg px-4 py-3 text-[12px] font-mono text-white/80 outline-none focus:border-orange-400/40 transition-all resize-none leading-relaxed"
                    placeholder="Décris ici la compétence, les instructions ou le contexte que l'agent doit suivre..."
                  />
                </div>
              </div>

              <div className="p-6 border-t border-white/10 flex justify-end gap-3 shrink-0 bg-black/30">
                <button
                  onClick={() => setAddSkillOpen(false)}
                  disabled={savingSkill}
                  className="px-6 py-2.5 text-[10px] font-bold text-white/40 uppercase tracking-widest hover:text-white transition-colors disabled:opacity-40"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddSkill}
                  disabled={savingSkill || !skillForm.name.trim() || !skillForm.content.trim()}
                  className="px-8 py-2.5 bg-orange-400 text-black text-[10px] font-black uppercase tracking-widest rounded-lg hover:shadow-[0_0_20px_rgba(251,146,60,0.3)] transition-all disabled:opacity-40 disabled:hover:shadow-none flex items-center gap-2 cursor-pointer"
                >
                  {savingSkill ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  {savingSkill ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODALE VISUALISATION / ÉDITION D'UNE COMPÉTENCE ─────────────── */}
      <AnimatePresence>
        {viewingSkill && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
            onClick={() => !savingSkillEdit && closeSkillView()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] font-mono"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <FileCode className={`w-4 h-4 shrink-0 ${viewingSkill.is_active ? 'text-orange-400' : 'text-white/20'}`} />
                  {skillEditMode ? (
                    <input
                      value={skillEditForm.name}
                      onChange={(e) => setSkillEditForm(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-black border border-white/10 rounded-lg px-3 py-1.5 text-sm font-bold text-white outline-none focus:border-orange-400/40 transition-all min-w-0"
                    />
                  ) : (
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white truncate">{viewingSkill.name}</h3>
                  )}
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded border uppercase shrink-0 ${
                    viewingSkill.is_active
                      ? 'bg-orange-400/10 text-orange-400 border-orange-400/20'
                      : 'bg-white/5 text-white/30 border-white/10'
                  }`}>
                    {viewingSkill.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!skillEditMode && (
                    <button
                      onClick={() => setSkillEditMode(true)}
                      title="Modifier"
                      className="p-2 rounded-lg text-white/40 hover:text-orange-400 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      <PenLine className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => !savingSkillEdit && closeSkillView()}
                    className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {skillEditError && (
                <div className="mx-6 mt-4 flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl shrink-0">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-xs text-red-400 flex-1">{skillEditError}</span>
                  <button onClick={() => setSkillEditError(null)} className="text-red-400/50 hover:text-red-400">✕</button>
                </div>
              )}

              <div className="p-6 space-y-5 overflow-y-auto">
                {skillEditMode ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Catégorie</label>
                      <input
                        value={skillEditForm.category}
                        onChange={(e) => setSkillEditForm(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40 transition-all"
                        placeholder="Ex : Analyse, Commercial, Support"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Contenu</label>
                      <textarea
                        value={skillEditForm.content}
                        onChange={(e) => setSkillEditForm(prev => ({ ...prev, content: e.target.value }))}
                        className="w-full h-72 bg-black border border-white/10 rounded-lg px-4 py-3 text-[12px] font-mono text-white/80 outline-none focus:border-orange-400/40 transition-all resize-none leading-relaxed"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {viewingSkill.category && (
                      <span className="inline-block text-[9px] font-bold text-white/40 uppercase tracking-widest bg-white/5 px-2 py-1 rounded mb-2">
                        {viewingSkill.category}
                      </span>
                    )}
                    <div className="bg-black border border-white/[0.06] rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
                        <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">SKILL.md</span>
                        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                          <button
                            onClick={() => setSkillViewMode('rendered')}
                            title="Aperçu"
                            className={`p-1.5 rounded-md transition-all cursor-pointer ${
                              skillViewMode === 'rendered' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSkillViewMode('raw')}
                            title="Source brute"
                            className={`p-1.5 rounded-md transition-all cursor-pointer ${
                              skillViewMode === 'raw' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'
                            }`}
                          >
                            <Code2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="p-5 max-h-[420px] overflow-y-auto">
                        {skillViewMode === 'rendered' ? (
                          <MarkdownLite content={viewingSkill.content} />
                        ) : (
                          <pre className="whitespace-pre-wrap text-[12px] text-white/70 leading-relaxed font-mono">
                            {viewingSkill.content}
                          </pre>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {skillEditMode && (
                <div className="p-6 border-t border-white/10 flex justify-end gap-3 shrink-0 bg-black/30">
                  <button
                    onClick={() => {
                      setSkillEditMode(false);
                      setSkillEditForm({ name: viewingSkill.name, category: viewingSkill.category || '', content: viewingSkill.content });
                      setSkillEditError(null);
                    }}
                    disabled={savingSkillEdit}
                    className="px-6 py-2.5 text-[10px] font-bold text-white/40 uppercase tracking-widest hover:text-white transition-colors disabled:opacity-40"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={saveSkillEdit}
                    disabled={savingSkillEdit || !skillEditForm.name.trim() || !skillEditForm.content.trim()}
                    className="px-8 py-2.5 bg-orange-400 text-black text-[10px] font-black uppercase tracking-widest rounded-lg hover:shadow-[0_0_20px_rgba(251,146,60,0.3)] transition-all disabled:opacity-40 disabled:hover:shadow-none flex items-center gap-2 cursor-pointer"
                  >
                    {savingSkillEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {savingSkillEdit ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODALE CORBEILLE ─────────────────────────────────────────── */}
      <AnimatePresence>
        {trashOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
            onClick={() => setTrashOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh] font-mono"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <Trash2 className="w-4 h-4 text-white/40" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-white">
                    Corbeille — {currentTabMeta.label}
                  </h3>
                </div>
                <button onClick={() => setTrashOpen(false)} className="text-white/30 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {trashError && (
                <div className="mx-6 mt-4 flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl shrink-0">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-xs text-red-400 flex-1">{trashError}</span>
                  <button onClick={() => setTrashError(null)} className="text-red-400/50 hover:text-red-400">✕</button>
                </div>
              )}

              <div className="p-6 overflow-y-auto">
                {trashLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
                  </div>
                ) : trashSkills.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Trash2 className="w-6 h-6 text-white/10" />
                    <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">
                      Corbeille vide
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {trashSkills.map((skill) => (
                      <div
                        key={skill.id}
                        className="bg-black border border-white/10 rounded-xl px-5 py-4 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-white/60 truncate">{skill.name}</p>
                          {skill.category && (
                            <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest bg-white/5 px-1.5 py-0.5 rounded mt-1 inline-block">
                              {skill.category}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => restoreSkill(skill)}
                            disabled={restoringId === skill.id}
                            className="px-3 py-1.5 rounded-lg bg-[#39FF14]/10 border border-[#39FF14]/20 text-[#39FF14] text-[9px] font-bold uppercase tracking-widest hover:bg-[#39FF14]/20 transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                          >
                            {restoringId === skill.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                            Restaurer
                          </button>
                          <button
                            onClick={() => requestPurgeSkill(skill)}
                            disabled={purgingId === skill.id}
                            className="px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400/70 text-[9px] font-bold uppercase tracking-widest hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                          >
                            {purgingId === skill.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                            Supprimer définitivement
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODALE CONFIRMATION SUPPRESSION (corbeille / définitive) ────── */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
            onClick={() => setConfirmAction(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl font-mono"
            >
              <div className="p-8 space-y-3">
                <div className="flex items-center gap-3">
                  <AlertCircle className={`w-5 h-5 shrink-0 ${confirmAction.type === 'purge' ? 'text-red-400' : 'text-orange-400'}`} />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-white">
                    {confirmAction.type === 'purge' ? 'Suppression définitive' : 'Envoyer à la corbeille'}
                  </h3>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  {confirmAction.type === 'purge' ? (
                    <>Supprimer définitivement <span className="text-white/80 font-bold">"{confirmAction.skill.name}"</span> ?
                    Cette action est irréversible, elle ne pourra plus être restaurée.</>
                  ) : (
                    <>Envoyer <span className="text-white/80 font-bold">"{confirmAction.skill.name}"</span> à la corbeille ?
                    Tu pourras la restaurer à tout moment depuis là.</>
                  )}
                </p>
              </div>

              <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-black/30">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="px-6 py-2.5 text-[10px] font-bold text-white/40 uppercase tracking-widest hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmAction}
                  className={`px-8 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer ${
                    confirmAction.type === 'purge'
                      ? 'bg-red-500 text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                      : 'bg-orange-400 text-black hover:shadow-[0_0_20px_rgba(251,146,60,0.3)]'
                  }`}
                >
                  {confirmAction.type === 'purge' ? 'Supprimer définitivement' : 'Envoyer à la corbeille'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODALE CONFIRMATION MODIFICATIONS NON SAUVEGARDÉES ──────────── */}
      <AnimatePresence>
        {pendingTabId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
            onClick={() => setPendingTabId(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl font-mono"
            >
              <div className="p-8 space-y-3">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-400 shrink-0" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-white">
                    Modifications non sauvegardées
                  </h3>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  Tu as des changements sur <span className="text-white/80 font-bold">{currentTabMeta.label}</span> qui
                  ne sont pas encore synchronisés. Que veux-tu faire avant de passer à un autre onglet ?
                </p>
              </div>

              <div className="p-6 border-t border-white/10 flex flex-col gap-2 bg-black/30">
                <button
                  onClick={confirmSaveAndSwitch}
                  disabled={saveState === 'saving'}
                  className="w-full py-3 rounded-xl bg-[#39FF14]/10 border border-[#39FF14]/30 text-[#39FF14] text-[10px] font-black uppercase tracking-widest hover:bg-[#39FF14]/20 transition-all disabled:opacity-50"
                >
                  Enregistrer puis changer d'onglet
                </button>
                <button
                  onClick={confirmDiscardAndSwitch}
                  className="w-full py-3 rounded-xl border border-red-500/20 text-red-400/80 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 hover:text-red-400 transition-all"
                >
                  Ignorer les modifications et changer
                </button>
                <button
                  onClick={() => setPendingTabId(null)}
                  className="w-full py-3 rounded-xl text-white/40 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-all"
                >
                  Annuler — rester sur {currentTabMeta.label}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BOUTON SYNC FLOTTANT ───────────────────────────────────────── */}
      <div className="fixed bottom-10 right-10 z-[200]">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={saveState === 'saving' || loading}
          className={`px-7 py-3.5 rounded-xl flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.25em] font-mono transition-all shadow-2xl border ${
            saveState === 'saved'
              ? 'bg-[#39FF14]/10 text-[#39FF14] border-[#39FF14]/30'
              : saveState === 'saving'
                ? 'bg-white/5 text-white/40 border-white/10 cursor-wait'
                : 'bg-white text-black border-white/30 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]'
          }`}
        >
          {saveState === 'saving' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saveState === 'saved' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>
            {saveState === 'saving' ? 'SYNC EN COURS...' : saveState === 'saved' ? 'SYNCHRONISÉ' : `SYNC_${currentTabMeta.label}_STATE`}
          </span>
        </motion.button>
      </div>

    </DoubleRibbonIntelligent>
  );
}

export default function AgentSettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0A] font-mono text-white/90 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
        <p className="text-[10px] text-white/20 uppercase tracking-widest">Initialisation...</p>
      </div>
    }>
      <AgentSettingsPageContent />
    </Suspense>
  );
}
