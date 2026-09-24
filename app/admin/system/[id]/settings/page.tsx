"use client";

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  CreditCard, 
  Plug, 
  Bell, 
  AlertTriangle, 
  Save, 
  ChevronRight, 
  Info,
  ExternalLink,
  Mail,
  ShieldCheck,
  Zap,
  Box,
  Server,
  X,
  Plus,
  Loader2,
  Trash2
} from 'lucide-react';
import { useSystem } from '../SystemContext';
import { motion, AnimatePresence } from 'framer-motion';

const sections = [
  { id: 'general',      label: 'GÉNÉRAL',         icon: Settings,      active: true  },
  { id: 'plan',         label: 'PLAN & CONTRAT',   icon: CreditCard,    active: true  },
  { id: 'integrations', label: 'INTÉGRATIONS',     icon: Plug,          active: true },
  { id: 'notifications',label: 'NOTIFICATIONS',    icon: Bell,          active: false },
  { id: 'danger',       label: 'DANGER ZONE',      icon: AlertTriangle, active: true }
];

export default function SettingsPage() {
  const { enterprise, planDef, refreshEnterprise, loading } = useSystem();
  const [activeSection, setActiveSection] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // States for General
  const [generalForm, setGeneralForm] = useState({
    name: '',
    sector: '',
    region: '',
    email: '',
    phone: '',
    is_test: false,
    warning_flag: false
  });

  // States for Overrides
  const [overridesForm, setOverridesForm] = useState({
    max_agents_override: '',
    token_budget_override: '',
    is_custom_pricing: false,
    custom_notes: ''
  });

  const [integrations, setIntegrations]       = useState<any[]>([])
  const [loadingIntegrations, setLoadingIntegrations] = useState(false)
  const [showIntegrationModal, setShowIntegrationModal] = useState(false)
  const [integrationForm, setIntegrationForm] = useState({
    service_name: '',
    integration_type: 'webhook_in',
    endpoint_url: '',
    secret_key: '',
    connected_agent_id: '',
    config: '{}'
  })

  const [thresholdValue, setThresholdValue] = useState<number>(80)
  const [savingThreshold, setSavingThreshold] = useState(false)
  const [alertConfig, setAlertConfig] = useState<Record<string, boolean>>({
    AGENT_ERROR:       true,
    CHURN_RISK:        true,
    SECURITY:          true,
    FEEDBACK_NEGATIF:  true,
    TOKEN_WARNING:     true
  })
  const [savingAlerts, setSavingAlerts] = useState(false)
  const [confirmAction, setConfirmAction] = useState<string | null>(null)
  const [executingDanger, setExecutingDanger] = useState(false)

  useEffect(() => {
    if (enterprise) {
      setGeneralForm({
        name: enterprise.name || '',
        sector: enterprise.sector || '',
        region: enterprise.region || '',
        email: enterprise.email || '',
        phone: enterprise.phone || '',
        is_test: enterprise.is_test || false,
        warning_flag: enterprise.warning_flag || false
      });

      setOverridesForm({
        max_agents_override: enterprise.max_agents_override?.toString() || '',
        token_budget_override: enterprise.token_budget_override?.toString() || '',
        is_custom_pricing: enterprise.is_custom_pricing || false,
        custom_notes: enterprise.custom_notes || ''
      });
      setThresholdValue(enterprise.alert_threshold ?? 80);
      if (enterprise.notification_config && typeof enterprise.notification_config === 'object') {
        setAlertConfig({
          AGENT_ERROR:      enterprise.notification_config.AGENT_ERROR      ?? true,
          CHURN_RISK:       enterprise.notification_config.CHURN_RISK       ?? true,
          SECURITY:         enterprise.notification_config.SECURITY         ?? true,
          FEEDBACK_NEGATIF: enterprise.notification_config.FEEDBACK_NEGATIF ?? true,
          TOKEN_WARNING:    enterprise.notification_config.TOKEN_WARNING     ?? true
        })
      }
    }
  }, [enterprise]);

  useEffect(() => {
    if (activeSection === 'integrations') loadIntegrations()
  }, [activeSection, enterprise?.enterprise_id])

  const handleSaveGeneral = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch('/api/admin/enterprise/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enterprise_id: enterprise.enterprise_id,
          ...generalForm
        })
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      
      await refreshEnterprise();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveOverrides = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch('/api/admin/enterprise/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enterprise_id: enterprise.enterprise_id,
          max_agents_override: overridesForm.max_agents_override === '' ? null : parseInt(overridesForm.max_agents_override),
          token_budget_override: overridesForm.token_budget_override === '' ? null : parseInt(overridesForm.token_budget_override),
          is_custom_pricing: overridesForm.is_custom_pricing,
          custom_notes: overridesForm.custom_notes
        })
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      
      await refreshEnterprise();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const loadIntegrations = async () => {
    if (!enterprise?.enterprise_id) return
    setLoadingIntegrations(true)
    try {
      const res = await fetch(`/api/admin/enterprise/integrations?enterprise_id=${enterprise.enterprise_id}`)
      const { data, error } = await res.json()
      if (error) throw new Error(error)
      setIntegrations(data ?? [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingIntegrations(false)
    }
  }

  const handleCreateIntegration = async () => {
    setIsSaving(true)
    setError(null)
    try {
      let parsedConfig = {}
      try { parsedConfig = JSON.parse(integrationForm.config) } catch { parsedConfig = {} }

      const res = await fetch('/api/admin/enterprise/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enterprise_id:      enterprise.enterprise_id,
          service_name:       integrationForm.service_name,
          integration_type:   integrationForm.integration_type,
          endpoint_url:       integrationForm.endpoint_url || null,
          secret_key:         integrationForm.secret_key || null,
          connected_agent_id: integrationForm.connected_agent_id || null,
          config:             parsedConfig
        })
      })
      const { data, error: createError } = await res.json()
      if (createError) throw new Error(createError)
      setIntegrations(prev => [data, ...prev])
      setShowIntegrationModal(false)
      setIntegrationForm({ service_name: '', integration_type: 'webhook_in', endpoint_url: '', secret_key: '', connected_agent_id: '', config: '{}' })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleIntegration = async (id: string, current: boolean) => {
    try {
      const res = await fetch('/api/admin/enterprise/integrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !current })
      })
      const { error: toggleError } = await res.json()
      if (toggleError) throw new Error(toggleError)
      setIntegrations(prev => prev.map(i => i.id === id ? { ...i, is_active: !current } : i))
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDeleteIntegration = async (id: string) => {
    try {
      const res = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'row', table: 'enterprise_integrations', column: 'id', id })
      })
      const { error: delError } = await res.json()
      if (delError) throw new Error(delError)
      setIntegrations(prev => prev.filter(i => i.id !== id))
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleSaveThreshold = async () => {
    setSavingThreshold(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/enterprise/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enterprise_id: enterprise.enterprise_id,
          alert_threshold: thresholdValue
        })
      })
      const { error: saveError } = await res.json()
      if (saveError) throw new Error(saveError)
      await refreshEnterprise()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSavingThreshold(false)
    }
  }

  const handleSaveAlerts = async () => {
    setSavingAlerts(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/enterprise/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enterprise_id:       enterprise.enterprise_id,
          notification_config: alertConfig
        })
      })
      const { error: saveError } = await res.json()
      if (saveError) throw new Error(saveError)
      await refreshEnterprise()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSavingAlerts(false)
    }
  }

  const handleDangerAction = async (action: string) => {
    setExecutingDanger(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/enterprise/danger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enterprise_id: enterprise.enterprise_id,
          action
        })
      })
      const { error: dangerError } = await res.json()
      if (dangerError) throw new Error(dangerError)
      await refreshEnterprise()
      setConfirmAction(null)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setExecutingDanger(false)
    }
  }

  if (loading || !enterprise) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-white/20 font-mono text-xs uppercase tracking-widest">
        Loading_Central_Config...
      </div>
    );
  }

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2 font-bold">PROJECT_ID</label>
                  <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                    <Box className="w-4 h-4 text-[#39FF14]" />
                    <span className="font-mono text-sm text-white/30 truncate">{enterprise.project_id}</span>
                    <span className="ml-auto bg-white/10 px-2 py-0.5 rounded text-[9px] font-bold text-white/60">READ_ONLY</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2 font-bold">NOM_ENTREPRISE</label>
                  <input 
                    type="text" 
                    value={generalForm.name} 
                    onChange={(e) => setGeneralForm({...generalForm, name: e.target.value})}
                    className="w-full bg-[#111111] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#39FF14]/50 outline-none transition-all font-mono" 
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2 font-bold">SECTEUR_ACTIVITÉ</label>
                  <input 
                    type="text" 
                    value={generalForm.sector} 
                    onChange={(e) => setGeneralForm({...generalForm, sector: e.target.value})}
                    placeholder="Ex: Retail, FinTech, IA..."
                    className="w-full bg-[#111111] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#39FF14]/50 outline-none transition-all font-mono" 
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2 font-bold font-mono">RÉGION</label>
                  <input 
                    type="text" 
                    value={generalForm.region} 
                    onChange={(e) => setGeneralForm({...generalForm, region: e.target.value})}
                    placeholder="Ex: Dakar, Paris, West Africa..."
                    className="w-full bg-[#111111] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#39FF14]/50 outline-none transition-all font-mono" 
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2 font-bold">EMAIL_CONTACT</label>
                  <input 
                    type="email" 
                    value={generalForm.email} 
                    onChange={(e) => setGeneralForm({...generalForm, email: e.target.value})}
                    className="w-full bg-[#111111] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#39FF14]/50 outline-none transition-all font-mono" 
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2 font-bold font-mono">TÉLÉPHONE</label>
                  <input 
                    type="text" 
                    value={generalForm.phone} 
                    onChange={(e) => setGeneralForm({...generalForm, phone: e.target.value})}
                    className="w-full bg-[#111111] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#39FF14]/50 outline-none transition-all font-mono" 
                  />
                </div>

                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="space-y-1">
                      <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                        MODE TEST {generalForm.is_test && <span className="text-[9px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded cursor-default border border-orange-500/20">ACTIF</span>}
                      </div>
                      <div className="text-[10px] text-white/30">Désactive la facturation réelle et active les logs débug.</div>
                    </div>
                    <button 
                      onClick={() => setGeneralForm({...generalForm, is_test: !generalForm.is_test})}
                      className={`w-12 h-6 rounded-full relative transition-all ${generalForm.is_test ? 'bg-orange-500' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${generalForm.is_test ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="space-y-1">
                      <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-red-400">
                        WARNING FLAG {generalForm.warning_flag && <span className="text-[9px] bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded cursor-default border border-red-500/20 animate-pulse">LOCK</span>}
                      </div>
                      <div className="text-[10px] text-white/30 truncate">Affiche une alerte rouge critique sur le dashboard client.</div>
                    </div>
                    <button 
                      onClick={() => setGeneralForm({...generalForm, warning_flag: !generalForm.warning_flag})}
                      className={`w-12 h-6 rounded-full relative transition-all ${generalForm.warning_flag ? 'bg-red-500' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${generalForm.warning_flag ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-white/5 flex items-center justify-between">
              <div className="text-[10px] font-mono text-white/20 uppercase tracking-[0.3em]">
                Last_Oracle_Sync: {new Date().toISOString().split('T')[0]}
              </div>
              <button 
                onClick={handleSaveGeneral}
                disabled={isSaving}
                className="bg-[#39FF14] text-black px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50 disabled:scale-100"
              >
                {isSaving ? 'Synching...' : <><Save className="w-4 h-4" /> SAVE_GENERAL_CONFIG</>}
              </button>
            </div>
          </motion.div>
        );

      case 'plan':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">

            {/* BLOC 1 — Plan souscrit */}
            <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50">PLAN_CONTRACT_NODE</h2>
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                  enterprise.package_type === 'ELITE'      ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                  enterprise.package_type === 'ENTERPRISE' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' :
                  enterprise.package_type === 'BUSINESS'   ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                             'bg-white/5 text-white/40 border border-white/10'
                }`}>
                  {enterprise.package_type || 'STARTUP'}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {!enterprise.is_custom_pricing && (
                  <div className="bg-black/40 rounded-2xl p-5 border border-white/5 space-y-2">
                    <div className="text-[9px] font-black uppercase tracking-widest text-white/30">PRIX_BASE</div>
                    <div className="text-xl font-black text-white font-mono">
                      {planDef?.base_price_fcfa?.toLocaleString() ?? '—'} <span className="text-xs text-white/30">FCFA</span>
                    </div>
                  </div>
                )}
                <div className="bg-black/40 rounded-2xl p-5 border border-white/5 space-y-2">
                  <div className="text-[9px] font-black uppercase tracking-widest text-white/30">MAX_AGENTS</div>
                  <div className="text-xl font-black text-[#39FF14] font-mono">
                    {enterprise.max_agents_override ?? planDef?.max_agents_allowed ?? '—'}
                    {enterprise.max_agents_override && <span className="text-[8px] text-orange-400 ml-2">OVERRIDE</span>}
                  </div>
                </div>
                <div className="bg-black/40 rounded-2xl p-5 border border-white/5 space-y-2">
                  <div className="text-[9px] font-black uppercase tracking-widest text-white/30">KB_NODES</div>
                  <div className="text-xl font-black text-white font-mono">
                    {planDef?.max_kb_nodes === -1 ? '∞' : planDef?.max_kb_nodes ?? '—'}
                  </div>
                </div>
                <div className="bg-black/40 rounded-2xl p-5 border border-white/5 space-y-2">
                  <div className="text-[9px] font-black uppercase tracking-widest text-white/30">STORAGE</div>
                  <div className="text-xl font-black text-white font-mono">
                    {planDef?.max_kb_storage_mb === -1 ? '∞' : `${planDef?.max_kb_storage_mb ?? '—'}`} <span className="text-xs text-white/30">MB</span>
                  </div>
                </div>
                <div className="bg-black/40 rounded-2xl p-5 border border-white/5 space-y-2">
                  <div className="text-[9px] font-black uppercase tracking-widest text-white/30">RAG</div>
                  <div className={`text-sm font-black uppercase ${planDef?.kb_rag_enabled ? 'text-[#39FF14]' : 'text-white/20'}`}>
                    {planDef?.kb_rag_enabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}
                  </div>
                </div>
                <div className="bg-black/40 rounded-2xl p-5 border border-white/5 space-y-2">
                  <div className="text-[9px] font-black uppercase tracking-widest text-white/30">ACTIVATED_AT</div>
                  <div className="text-sm font-black text-white/60 font-mono">
                    {enterprise.activated_at ? new Date(enterprise.activated_at).toLocaleDateString('fr-FR') : '—'}
                  </div>
                </div>
              </div>

              {enterprise.package_type !== 'ELITE' && (
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#39FF14]/20 text-[#39FF14] text-[10px] font-black uppercase tracking-widest hover:bg-[#39FF14]/5 transition-all"
                >
                  <Zap className="w-3.5 h-3.5" />
                  UPGRADE_PLAN
                </button>
              )}
            </div>

            {/* BLOC 2 — Token Budget */}
            <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 space-y-6">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50">TOKEN_BUDGET_MONITOR</h2>

              {enterprise.token_budget === -1 || enterprise.token_budget_override === -1 ? (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#39FF14] animate-pulse" />
                  <span className="text-sm font-black text-[#39FF14] uppercase tracking-widest">INFRASTRUCTURE DÉDIÉE — ILLIMITÉ</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const budget   = enterprise.token_budget_override ?? enterprise.token_budget ?? 1
                    const consumed = enterprise.total_tokens_consumed ?? 0
                    const pct      = Math.min((consumed / budget) * 100, 100)
                    const color    = pct > 90 ? '#EF4444' : pct > 70 ? '#F97316' : '#39FF14'
                    return (
                      <>
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-white/40">CONSOMMÉS</span>
                          <span style={{ color }}>{consumed.toLocaleString()} / {budget.toLocaleString()} tokens</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[9px] font-mono text-white/20">
                          <span>0%</span>
                          <span style={{ color }}>{pct.toFixed(1)}% UTILISÉ</span>
                          <span>100%</span>
                        </div>
                      </>
                    )
                  })()}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                      <div className="text-[9px] text-white/30 uppercase tracking-widest mb-1">COÛT_MENSUEL</div>
                      <div className="text-lg font-black text-white font-mono">
                        {enterprise.monthly_cost?.toLocaleString() ?? '—'} <span className="text-xs text-white/30">FCFA</span>
                      </div>
                    </div>
                    <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                      <div className="text-[9px] text-white/30 uppercase tracking-widest mb-1">ALERT_THRESHOLD</div>
                      <div className="text-lg font-black text-white font-mono">
                        {enterprise.alert_threshold ?? '—'}%
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* BLOC 3 — Overrides Amadou */}
            <div className="bg-violet-500/5 border border-violet-500/20 rounded-3xl p-8 space-y-8">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-violet-400" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-violet-400">OVERRIDE_CONSOLE — AMADOU ONLY</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2 font-bold font-mono">
                    MAX_AGENTS_OVERRIDE <span className="text-white/20">(vide = plan par défaut)</span>
                  </label>
                  <input
                    type="number"
                    value={overridesForm.max_agents_override}
                    onChange={(e) => setOverridesForm({...overridesForm, max_agents_override: e.target.value})}
                    placeholder={`Défaut plan : ${planDef?.max_agents_allowed ?? '—'}`}
                    className="w-full bg-[#111111] border border-violet-500/20 rounded-xl px-4 py-3 text-sm focus:border-violet-500/50 outline-none transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2 font-bold font-mono">
                    TOKEN_BUDGET_OVERRIDE <span className="text-white/20">(-1 = illimité)</span>
                  </label>
                  <input
                    type="number"
                    value={overridesForm.token_budget_override}
                    onChange={(e) => setOverridesForm({...overridesForm, token_budget_override: e.target.value})}
                    placeholder={`Défaut plan : ${enterprise.token_budget ?? '—'}`}
                    className="w-full bg-[#111111] border border-violet-500/20 rounded-xl px-4 py-3 text-sm focus:border-violet-500/50 outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-black/30 border border-violet-500/10 rounded-2xl">
                <div className="space-y-1">
                  <div className="text-xs font-black uppercase tracking-wider text-white/70">IS_CUSTOM_PRICING</div>
                  <div className="text-[9px] text-white/30 font-mono">Masque les prix standards — affiche custom_notes</div>
                </div>
                <button
                  onClick={() => setOverridesForm({...overridesForm, is_custom_pricing: !overridesForm.is_custom_pricing})}
                  className={`w-12 h-6 rounded-full relative transition-all ${overridesForm.is_custom_pricing ? 'bg-violet-500' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${overridesForm.is_custom_pricing ? 'right-1' : 'left-1'}`} />
                </button>
              </div>

              {overridesForm.is_custom_pricing && (
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2 font-bold font-mono">CUSTOM_NOTES</label>
                  <textarea
                    value={overridesForm.custom_notes}
                    onChange={(e) => setOverridesForm({...overridesForm, custom_notes: e.target.value})}
                    placeholder="Notes contractuelles visibles uniquement par Autoslash..."
                    className="w-full bg-[#111111] border border-violet-500/20 rounded-xl px-4 py-3 text-sm focus:border-violet-500/50 outline-none transition-all font-mono h-28 resize-none"
                  />
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleSaveOverrides}
                  disabled={isSaving}
                  className="bg-violet-600 text-white px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-violet-500 transition-all flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {isSaving ? 'SYNCING...' : 'COMMIT_INTERNAL_OVERRIDES'}
                </button>
              </div>
            </div>

            {/* Modal Upgrade */}
            <AnimatePresence>
              {showUpgradeModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center"
                  onClick={() => setShowUpgradeModal(false)}
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-10 max-w-md w-full space-y-6"
                  >
                    <h3 className="text-lg font-black uppercase tracking-widest text-white">UPGRADE_PLAN</h3>
                    <p className="text-sm text-white/40 font-mono leading-relaxed">
                      Pour faire évoluer l'infrastructure de cette enterprise vers un plan supérieur, contactez Autoslash directement.
                    </p>
                    
                    <a 
                      href={`mailto:contact@autoslash.ai?subject=UPGRADE REQUEST — ${enterprise.name} — ${enterprise.project_id}`}
                      className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-[#39FF14]/10 border border-[#39FF14]/20 text-[#39FF14] text-xs font-black uppercase tracking-widest hover:bg-[#39FF14]/20 transition-all"
                    >
                      <Mail className="w-4 h-4" />
                      CONTACTER AUTOSLASH
                    </a>
                    <button
                      onClick={() => setShowUpgradeModal(false)}
                      className="w-full py-3 rounded-xl border border-white/10 text-white/30 text-xs font-mono uppercase tracking-widest hover:border-white/20 transition-all"
                    >
                      ANNULER
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        );

      case 'integrations':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

            {/* Header + bouton créer */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50">NEURAL_CONNECTOR</h2>
                <p className="text-[9px] font-mono text-white/20">Tout outil connecté par Autoslash — webhooks entrants, sortants, API keys</p>
              </div>
              <button
                onClick={() => setShowIntegrationModal(true)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#39FF14]/10 border border-[#39FF14]/20 text-[#39FF14] text-[10px] font-black uppercase tracking-widest hover:bg-[#39FF14]/15 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                NEW_CONNECTOR
              </button>
            </div>

            {/* Liste des intégrations */}
            {loadingIntegrations ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-5 h-5 text-[#39FF14] animate-spin" />
              </div>
            ) : integrations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 border border-dashed border-white/10 rounded-3xl gap-4">
                <Plug className="w-8 h-8 text-white/10" />
                <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Aucun connecteur configuré</p>
                <p className="text-[9px] font-mono text-white/10">Autoslash connecte les outils de l'enterprise ici</p>
              </div>
            ) : (
              <div className="space-y-4">
                {integrations.map((integration) => (
                  <div key={integration.id} className="flex items-center gap-6 p-6 bg-white/[0.03] border border-white/10 rounded-2xl group hover:border-white/20 transition-all">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${integration.is_active ? 'bg-[#39FF14] shadow-[0_0_8px_#39FF14]' : 'bg-white/20'}`} />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-white uppercase tracking-wide">{integration.service_name}</span>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${
                          integration.integration_type === 'webhook_in'  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          integration.integration_type === 'webhook_out' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' :
                          'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                        }`}>
                          {integration.integration_type}
                        </span>
                      </div>
                      {integration.endpoint_url && (
                        <p className="text-[9px] font-mono text-white/30 truncate">{integration.endpoint_url}</p>
                      )}
                      {integration.connected_agent_id && (
                        <p className="text-[9px] font-mono text-white/20">AGENT → {integration.connected_agent_id}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => handleToggleIntegration(integration.id, integration.is_active)}
                        className={`w-10 h-5 rounded-full relative transition-all ${integration.is_active ? 'bg-[#39FF14]' : 'bg-white/10'}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${integration.is_active ? 'right-0.5' : 'left-0.5'}`} />
                      </button>
                      <button
                        onClick={() => handleDeleteIntegration(integration.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-red-500/10 text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Modal création */}
            <AnimatePresence>
              {showIntegrationModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-6"
                  onClick={() => setShowIntegrationModal(false)}
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-10 w-full max-w-lg space-y-6"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black uppercase tracking-widest text-white">NEW_CONNECTOR</h3>
                      <button onClick={() => setShowIntegrationModal(false)}>
                        <X className="w-4 h-4 text-white/30 hover:text-white" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[9px] uppercase tracking-widest text-white/40 mb-2 font-bold">SERVICE_NAME <span className="text-white/20">(nom libre — ex: WhatsApp Business, WooCommerce, ERP Client...)</span></label>
                        <input
                          type="text"
                          value={integrationForm.service_name}
                          onChange={(e) => setIntegrationForm({...integrationForm, service_name: e.target.value})}
                          placeholder="Nom de l'outil ou service..."
                          className="w-full bg-[#111111] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#39FF14]/50 outline-none transition-all font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] uppercase tracking-widest text-white/40 mb-2 font-bold">INTEGRATION_TYPE</label>
                        <select
                          value={integrationForm.integration_type}
                          onChange={(e) => setIntegrationForm({...integrationForm, integration_type: e.target.value})}
                          className="w-full bg-[#111111] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#39FF14]/50 outline-none transition-all font-mono text-white"
                        >
                          <option value="webhook_in">WEBHOOK_IN — L'outil envoie vers Autoslash</option>
                          <option value="webhook_out">WEBHOOK_OUT — Autoslash envoie vers l'outil</option>
                          <option value="api_key">API_KEY — Connexion par clé API</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] uppercase tracking-widest text-white/40 mb-2 font-bold">ENDPOINT_URL <span className="text-white/20">(optionnel)</span></label>
                        <input
                          type="text"
                          value={integrationForm.endpoint_url}
                          onChange={(e) => setIntegrationForm({...integrationForm, endpoint_url: e.target.value})}
                          placeholder="https://..."
                          className="w-full bg-[#111111] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#39FF14]/50 outline-none transition-all font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] uppercase tracking-widest text-white/40 mb-2 font-bold">SECRET_KEY <span className="text-white/20">(optionnel)</span></label>
                        <input
                          type="password"
                          value={integrationForm.secret_key}
                          onChange={(e) => setIntegrationForm({...integrationForm, secret_key: e.target.value})}
                          placeholder="Clé secrète ou token..."
                          className="w-full bg-[#111111] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#39FF14]/50 outline-none transition-all font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] uppercase tracking-widest text-white/40 mb-2 font-bold">CONNECTED_AGENT_ID <span className="text-white/20">(optionnel — ID de l'agent responsable)</span></label>
                        <input
                          type="text"
                          value={integrationForm.connected_agent_id}
                          onChange={(e) => setIntegrationForm({...integrationForm, connected_agent_id: e.target.value})}
                          placeholder="ID agent..."
                          className="w-full bg-[#111111] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#39FF14]/50 outline-none transition-all font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setShowIntegrationModal(false)}
                        className="flex-1 py-3 rounded-xl border border-white/10 text-white/30 text-xs font-mono uppercase tracking-widest hover:border-white/20 transition-all"
                      >
                        ANNULER
                      </button>
                      <button
                        onClick={handleCreateIntegration}
                        disabled={isSaving || !integrationForm.service_name}
                        className="flex-1 py-3 rounded-xl bg-[#39FF14] text-black text-xs font-black uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                      >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}
                        COMMIT_CONNECTOR
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        );

      case 'notifications':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">

            {/* BLOC 1 — Alert Threshold */}
            <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 space-y-8">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-[#39FF14]" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50">ALERT_THRESHOLD_CONFIG</h2>
              </div>

              <p className="text-[9px] font-mono text-white/30 leading-relaxed">
                Seuil de consommation tokens à partir duquel Autoslash génère une alerte critique pour cette enterprise.
              </p>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">SEUIL_ACTUEL</span>
                  <span className={`text-2xl font-black font-mono ${
                    thresholdValue > 90 ? 'text-red-400' :
                    thresholdValue > 70 ? 'text-orange-400' :
                    'text-[#39FF14]'
                  }`}>
                    {thresholdValue}%
                  </span>
                </div>

                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={thresholdValue}
                  onChange={(e) => setThresholdValue(Number(e.target.value))}
                  className="w-full accent-[#39FF14] cursor-pointer"
                />

                <div className="flex items-center justify-between text-[8px] font-mono text-white/20">
                  <span>10% — ALERTE PRÉCOCE</span>
                  <span>100% — CRITIQUE UNIQUEMENT</span>
                </div>

                {/* Barre visuelle de prévisualisation */}
                <div className="space-y-2">
                  <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">PREVIEW</span>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden relative">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${thresholdValue}%`,
                        backgroundColor: thresholdValue > 90 ? '#EF4444' : thresholdValue > 70 ? '#F97316' : '#39FF14'
                      }}
                    />
                  </div>
                  <div className="flex justify-end">
                    <span className="text-[8px] font-mono text-white/20">
                      Alerte déclenchée à {thresholdValue}% de consommation
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveThreshold}
                  disabled={savingThreshold}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl bg-[#39FF14] text-black text-xs font-black uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
                >
                  {savingThreshold ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {savingThreshold ? 'SAVING...' : 'SAVE_THRESHOLD'}
                </button>
              </div>
            </div>

            {/* BLOC 2 — Intelligence Alerts Config */}
            <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 space-y-8">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-[#39FF14]" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50">INTELLIGENCE_ALERTS_CONFIG</h2>
              </div>

              <p className="text-[9px] font-mono text-white/30 leading-relaxed">
                Activer ou désactiver chaque type d'alerte métier pour cette enterprise. Les alertes désactivées n'apparaîtront plus dans l'Intelligence Hub.
              </p>

              <div className="space-y-4">
                {[
                  { key: 'AGENT_ERROR',      label: 'AGENT_ERROR',      desc: 'Erreurs critiques détectées sur les agents',          color: 'text-red-400'    },
                  { key: 'CHURN_RISK',       label: 'CHURN_RISK',       desc: 'Signaux de risque de départ détectés',                color: 'text-orange-400' },
                  { key: 'SECURITY',         label: 'SECURITY',         desc: 'Alertes de sécurité et accès suspects',               color: 'text-yellow-400' },
                  { key: 'FEEDBACK_NEGATIF', label: 'FEEDBACK_NÉGATIF', desc: 'Retours négatifs capturés par les agents',            color: 'text-violet-400' },
                  { key: 'TOKEN_WARNING',    label: 'TOKEN_WARNING',    desc: 'Consommation tokens approchant le seuil configuré',   color: 'text-blue-400'   }
                ].map(({ key, label, desc, color }) => (
                  <div key={key} className="flex items-center justify-between p-5 bg-black/30 border border-white/5 rounded-2xl hover:border-white/10 transition-all">
                    <div className="space-y-1">
                      <div className={`text-xs font-black uppercase tracking-wider ${color}`}>{label}</div>
                      <div className="text-[9px] font-mono text-white/30">{desc}</div>
                    </div>
                    <button
                      onClick={() => setAlertConfig(prev => ({ ...prev, [key]: !prev[key] }))}
                      className={`w-12 h-6 rounded-full relative transition-all shrink-0 ml-6 ${alertConfig[key] ? 'bg-[#39FF14]' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${alertConfig[key] ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveAlerts}
                  disabled={savingAlerts}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl bg-[#39FF14] text-black text-xs font-black uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
                >
                  {savingAlerts ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {savingAlerts ? 'SAVING...' : 'SAVE_ALERT_CONFIG'}
                </button>
              </div>
            </div>

          </motion.div>
        );

      case 'danger':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      
            {/* Header warning */}
            <div className="flex items-center gap-4 p-5 bg-red-500/5 border border-red-500/20 rounded-2xl">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-red-400">ZONE CRITIQUE — AMADOU ONLY</p>
                <p className="text-[9px] font-mono text-white/30">Ces actions sont irréversibles ou à impact immédiat sur l'infrastructure de l'enterprise.</p>
              </div>
            </div>
      
            {/* Action 1 — Suspend / Reactivate */}
            <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">
                    {enterprise.status === 'SUSPENDED' ? 'RÉACTIVER_ENTERPRISE' : 'SUSPENDRE_ENTERPRISE'}
                  </h3>
                  <p className="text-[9px] font-mono text-white/30">
                    {enterprise.status === 'SUSPENDED' 
                      ? 'Remet l\'enterprise en statut ACTIVE — agents et accès restaurés immédiatement.' 
                      : 'Passe l\'enterprise en statut SUSPENDED — tous les agents sont désactivés immédiatement.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-6">
                  <div className={`w-2 h-2 rounded-full ${enterprise.status === 'SUSPENDED' ? 'bg-red-400 animate-pulse' : 'bg-[#39FF14]'}`} />
                  <span className="text-[9px] font-mono text-white/40 uppercase">{enterprise.status}</span>
                </div>
              </div>
      
              {confirmAction === 'SUSPEND' || confirmAction === 'REACTIVATE' ? (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                  <p className="text-[9px] font-mono text-red-400 flex-1">
                    Confirmer l'action {confirmAction} sur {enterprise.name} ?
                  </p>
                  <button 
                    onClick={() => handleDangerAction(confirmAction)}
                    disabled={executingDanger}
                    className="px-4 py-2 rounded-xl bg-red-500 text-white text-[9px] font-black uppercase tracking-widest hover:bg-red-400 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {executingDanger ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    CONFIRMER
                  </button>
                  <button 
                    onClick={() => setConfirmAction(null)}
                    className="px-4 py-2 rounded-xl border border-white/10 text-white/30 text-[9px] font-mono uppercase tracking-widest hover:border-white/20 transition-all"
                  >
                    ANNULER
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setConfirmAction(enterprise.status === 'SUSPENDED' ? 'REACTIVATE' : 'SUSPEND')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                    enterprise.status === 'SUSPENDED' 
                      ? 'border-[#39FF14]/20 text-[#39FF14] hover:bg-[#39FF14]/5' 
                      : 'border-red-500/20 text-red-400 hover:bg-red-500/5'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {enterprise.status === 'SUSPENDED' ? 'REACTIVATE_ENTERPRISE' : 'SUSPEND_ENTERPRISE'}
                </button>
              )}
            </div>
      
            {/* Action 2 — Reset tokens */}
            <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 space-y-6">
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-white">RESET_TOKEN_COUNTER</h3>
                <p className="text-[9px] font-mono text-white/30">
                  Remet le compteur `total_tokens_consumed` à zéro pour cette enterprise. Action manuelle de fin de cycle de facturation.
                </p>
                <p className="text-[9px] font-mono text-orange-400">
                  Consommation actuelle : {enterprise.total_tokens_consumed?.toLocaleString() ?? '0'} tokens
                </p>
              </div>
      
              {confirmAction === 'RESET_TOKENS' ? (
                <div className="flex items-center gap-3 p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
                  <p className="text-[9px] font-mono text-orange-400 flex-1">
                    Remettre le compteur à zéro pour {enterprise.name} ?
                  </p>
                  <button 
                    onClick={() => handleDangerAction('RESET_TOKENS')}
                    disabled={executingDanger}
                    className="px-4 py-2 rounded-xl bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest hover:bg-orange-400 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {executingDanger ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    CONFIRMER
                  </button>
                  <button 
                    onClick={() => setConfirmAction(null)}
                    className="px-4 py-2 rounded-xl border border-white/10 text-white/30 text-[9px] font-mono uppercase tracking-widest hover:border-white/20 transition-all"
                  >
                    ANNULER
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setConfirmAction('RESET_TOKENS')}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-widest hover:bg-orange-500/5 transition-all"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  RESET_TOKEN_COUNTER
                </button>
              )}
            </div>
      
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex text-white font-mono selection:bg-[#39FF14] selection:text-black">
      {/* SIDEBAR SETTINGS */}
      <aside className="w-[260px] border-r border-white/5 flex flex-col pt-24 shrink-0 px-6">
        <div className="space-y-2">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => s.active && setActiveSection(s.id)}
                disabled={!s.active}
                className={`w-full group relative flex items-center gap-4 px-5 py-4 rounded-2xl transition-all border ${
                  activeSection === s.id 
                    ? 'bg-[#39FF14]/5 border-[#39FF14]/20 text-[#39FF14]' 
                    : s.active 
                      ? 'border-transparent text-white/40 hover:bg-white/5 hover:text-white' 
                      : 'border-transparent text-white/10 cursor-not-allowed opacity-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${activeSection === s.id ? 'text-[#39FF14]' : 'text-current opacity-60'}`} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{s.label}</span>
                {!s.active && (
                   <span className="ml-auto text-[7px] font-black bg-white/5 px-1.5 py-0.5 rounded text-white/20 whitespace-nowrap">SOON</span>
                )}
                {activeSection === s.id && (
                  <motion.div layoutId="setting-active" className="absolute left-0 w-1 h-1/2 bg-[#39FF14] rounded-full shadow-[0_0_10px_#39FF14]" />
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 pt-24 px-16 max-w-[1200px]">
        {/* HEADER */}
        <div className="mb-16 space-y-4">
          <div className="flex items-center gap-4 text-white/20 text-[10px] font-bold uppercase tracking-[0.4em]">
            <span>CONTROL_PANEL</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#39FF14]">{activeSection}</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tighter text-white uppercase italic">
            Configurate_System//<span className="text-[#39FF14] opacity-80">{enterprise.name?.replace(/\s/g, '_')}</span>
          </h1>
        </div>

        {renderSectionContent()}
      </main>

      {/* TOASTS ERREUR / SUCCES */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 right-10 bg-red-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[1000] border border-red-400/50"
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider">{error}</span>
            <button onClick={() => setError(null)} className="ml-4 hover:opacity-50 transition-all"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 right-10 bg-[#39FF14] text-black px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[1000]"
          >
            <ShieldCheck className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">DATABASE_SYNC_STABLE // COMMIT_SUCCESS</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL UPGRADE */}
      <AnimatePresence>
        {showUpgradeModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[2000] flex items-center justify-center p-6">
             <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md w-full bg-[#111111] border border-white/10 p-12 rounded-[2.5rem] text-center space-y-10 shadow-[0_0_100px_rgba(57,255,20,0.05)]"
             >
                <div className="w-24 h-24 bg-violet-600/10 rounded-full flex items-center justify-center mx-auto text-violet-500 shadow-[0_0_40px_rgba(139,92,246,0.1)]">
                   <Zap className="w-10 h-10 animate-pulse" />
                </div>
                <div className="space-y-4">
                   <h2 className="text-3xl font-bold tracking-tight text-white uppercase italic">Flow_Upgrade_Locked</h2>
                   <p className="text-white/40 text-[11px] font-mono leading-relaxed uppercase tracking-wider">
                      Évoluer vers le plan supérieur nécessite une resynchronisation manuelle des ressources. <br/>
                      Veuillez contacter le support Autoslash pour lancer la procédure d'upgrade.
                   </p>
                </div>
                <div className="flex flex-col gap-4">
                   <a 
                    href={`mailto:contact@autoslash.ai?subject=Upgrade Plan: ${enterprise.name}&body=Bonjour Amadou, nous aimerions surclasser le plan de ${enterprise.name}.`}
                    className="w-full bg-white text-black py-4 rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-[#39FF14] transition-all"
                   >
                     <Mail className="w-4 h-4" /> CONTACT_AUTOSLASH_DIRECT
                   </a>
                   <button 
                    onClick={() => setShowUpgradeModal(false)}
                    className="w-full py-4 rounded-2xl font-black text-[9px] uppercase tracking-[0.4em] text-white/20 hover:text-white transition-all"
                   >
                      ABORT_SEQUENCE
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


