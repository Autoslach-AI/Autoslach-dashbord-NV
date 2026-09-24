"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Trash2, Loader2, AlertTriangle, X,
  RefreshCw, Filter, ChevronLeft, ChevronRight, Save, Settings
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Alert {
  id: string;
  issue_type: string;
  severity_level: string | null;
  raw_context: string | null;
  created_at: string;
  is_upsell_opportunity: boolean;
}

// ─── Constantes ─────────────────────────────────────────────────────────────

const ISSUE_TYPES = ['AGENT_ERROR', 'CHURN_RISK', 'SECURITY', 'FEEDBACK_NEGATIF']

const SEVERITY_LEVELS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

const ISSUE_COLORS: Record<string, string> = {
  AGENT_ERROR:      'text-red-400',
  CHURN_RISK:       'text-orange-400',
  SECURITY:         'text-yellow-400',
  FEEDBACK_NEGATIF: 'text-violet-400',
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/20',
  HIGH:     'bg-orange-500/10 text-orange-400 border-orange-500/20',
  MEDIUM:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  LOW:      'bg-white/5 text-white/30 border-white/10',
}

const PAGE_SIZE = 10

// ─── Composant principal ─────────────────────────────────────────────────────

export default function NotificationsPage() {
  const params    = useParams()
  const id        = params?.id as string

  const [alerts, setAlerts]             = useState<Alert[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [deletingId, setDeletingId]     = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const [filterType, setFilterType]         = useState<string>('ALL')
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL')
  const [page, setPage]                     = useState(1)
  const [total, setTotal]                   = useState(0)

  // Tab navigation
  const [activeTab, setActiveTab] = useState<'alerts' | 'config'>('alerts')

  // Alert config (déplacé depuis Settings)
  const [thresholdValue, setThresholdValue]   = useState<number>(80)
  const [savingThreshold, setSavingThreshold] = useState(false)
  const [alertConfig, setAlertConfig]         = useState<Record<string, boolean>>({
    AGENT_ERROR:       true,
    CHURN_RISK:        true,
    SECURITY:          true,
    FEEDBACK_NEGATIF:  true,
    TOKEN_WARNING:     true
  })
  const [savingAlerts, setSavingAlerts]       = useState(false)
  const [configSuccess, setConfigSuccess]     = useState(false)

  // ── Chargement ────────────────────────────────────────────────────────────
  const loadAlerts = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ enterprise_id: id })
      if (filterType !== 'ALL')     params.set('issue_type', filterType)
      if (filterSeverity !== 'ALL') params.set('severity', filterSeverity)
      params.set('page',      String(page))
      params.set('page_size', String(PAGE_SIZE))

      const res = await fetch(`/api/admin/enterprise/alerts?${params.toString()}`)
      const { data, total: t, error: err } = await res.json()
      if (err) throw new Error(err)
      setAlerts(data ?? [])
      setTotal(t ?? 0)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [id, filterType, filterSeverity, page])

  useEffect(() => { loadAlerts() }, [loadAlerts])

  // Reset page quand filtre change
  useEffect(() => { setPage(1) }, [filterType, filterSeverity])

  useEffect(() => {
    if (!id) return
    const loadConfig = async () => {
      const res = await fetch(`/api/admin/enterprise/${id}`)
      const { enterprise } = await res.json()
      if (!enterprise) return
      setThresholdValue(enterprise.alert_threshold ?? 80)
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
    loadConfig()
  }, [id])

  // ── Suppression ───────────────────────────────────────────────────────────
  const handleDelete = async (alertId: string) => {
    setDeletingId(alertId)
    try {
      const res = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:   'row',
          table:  'admin_intelligence_logs',
          column: 'id',
          id:     alertId
        })
      })
      const { error: delError } = await res.json()
      if (delError) throw new Error(delError)
      setAlerts(prev => prev.filter(a => a.id !== alertId))
      setTotal(prev => prev - 1)
      setConfirmDelete(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleSaveThreshold = async () => {
    setSavingThreshold(true)
    try {
      const res = await fetch('/api/admin/enterprise/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enterprise_id: id, alert_threshold: thresholdValue })
      })
      const { error: saveError } = await res.json()
      if (saveError) throw new Error(saveError)
      setConfigSuccess(true)
      setTimeout(() => setConfigSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSavingThreshold(false)
    }
  }

  const handleSaveAlerts = async () => {
    setSavingAlerts(true)
    try {
      const res = await fetch('/api/admin/enterprise/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enterprise_id: id, notification_config: alertConfig })
      })
      const { error: saveError } = await res.json()
      if (saveError) throw new Error(saveError)
      setConfigSuccess(true)
      setTimeout(() => setConfigSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSavingAlerts(false)
    }
  }

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(total / PAGE_SIZE)

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-16 pb-32 space-y-10 bg-[#0A0A0A] min-h-screen">

      {/* ── Header + Tabs ─────────────────────────────────────────────────── */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-white/[0.03] border border-white/10">
              <Bell className="w-3.5 h-3.5 text-[#39FF14]" />
            </div>
            <h1 className="text-[10px] font-black uppercase tracking-[0.3em] font-mono text-white/90">
              NOTIFICATIONS
            </h1>
            {activeTab === 'alerts' && total > 0 && (
              <span className="px-2 py-0.5 rounded bg-[#39FF14]/10 border border-[#39FF14]/20 text-[8px] font-black text-[#39FF14] uppercase tracking-widest">
                {total} TOTAL
              </span>
            )}
          </div>
          {activeTab === 'alerts' && (
            <button
              onClick={loadAlerts}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-white/40 text-[9px] font-mono uppercase tracking-widest hover:border-[#39FF14]/20 hover:text-[#39FF14] transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              REFRESH
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-white/5 pb-0">
          {[
            { id: 'alerts', label: 'INTELLIGENCE_ALERTS' },
            { id: 'config', label: 'ALERT_CONFIG' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'alerts' | 'config')}
              className={`px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] font-mono transition-all border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-[#39FF14] text-[#39FF14]'
                  : 'border-transparent text-white/30 hover:text-white/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab INTELLIGENCE_ALERTS ────────────────────────────────────────── */}
      {activeTab === 'alerts' && (
        <>
          {/* ── Filtres ───────────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-3 h-3 text-white/20" />
              <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest">FILTRES</span>
            </div>

            {/* Filtre type */}
            <div className="flex items-center gap-2 flex-wrap">
              {['ALL', ...ISSUE_TYPES].map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border ${
                    filterType === type
                      ? 'bg-[#39FF14]/10 border-[#39FF14]/20 text-[#39FF14]'
                      : 'border-white/5 text-white/30 hover:border-white/10'
                  }`}
                >
                  {type === 'ALL' ? 'TOUS' : type}
                </button>
              ))}
            </div>

            <div className="w-px h-4 bg-white/10" />

            {/* Filtre sévérité */}
            <div className="flex items-center gap-2 flex-wrap">
              {['ALL', ...SEVERITY_LEVELS].map(sev => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border ${
                    filterSeverity === sev
                      ? 'bg-white/10 border-white/20 text-white'
                      : 'border-white/5 text-white/30 hover:border-white/10'
                  }`}
                >
                  {sev === 'ALL' ? 'TOUTES' : sev}
                </button>
              ))}
            </div>
          </div>

          {/* ── Erreur ────────────────────────────────────────────────────────── */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 px-5 py-4 bg-red-500/10 border border-red-500/20 rounded-2xl"
              >
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-xs font-mono text-red-400">{error}</span>
                <button onClick={() => setError(null)} className="ml-auto">
                  <X className="w-4 h-4 text-red-400/50 hover:text-red-400" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Liste alertes ─────────────────────────────────────────────────── */}
          {loading ? (
            <div className="flex items-center justify-center py-32">
              <Loader2 className="w-6 h-6 text-[#39FF14] animate-spin" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 border border-dashed border-white/10 rounded-3xl gap-4">
              <div className="w-2 h-2 rounded-full bg-[#39FF14] animate-pulse" />
              <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">
                Aucune alerte — système stable
              </p>
              {(filterType !== 'ALL' || filterSeverity !== 'ALL') && (
                <button
                  onClick={() => { setFilterType('ALL'); setFilterSeverity('ALL') }}
                  className="text-[9px] font-mono text-[#39FF14]/50 hover:text-[#39FF14] transition-colors uppercase tracking-widest"
                >
                  Effacer les filtres
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {alerts.map((alert, idx) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: idx * 0.03 }}
                    className="group flex items-start gap-4 p-6 bg-white/[0.03] border border-white/10 rounded-2xl hover:border-white/20 transition-all"
                  >
                    {/* Point sévérité */}
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      alert.severity_level === 'CRITICAL' ? 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]' :
                      alert.severity_level === 'HIGH'     ? 'bg-orange-400' :
                      alert.severity_level === 'MEDIUM'   ? 'bg-yellow-400' :
                      'bg-white/20'
                    }`} />

                    {/* Contenu */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${ISSUE_COLORS[alert.issue_type] ?? 'text-white/40'}`}>
                          {alert.issue_type}
                        </span>
                        {alert.severity_level && (
                          <span className={`text-[7px] font-black px-2 py-0.5 rounded border uppercase tracking-widest ${SEVERITY_COLORS[alert.severity_level] ?? 'bg-white/5 text-white/30 border-white/10'}`}>
                            {alert.severity_level}
                          </span>
                        )}
                        {alert.is_upsell_opportunity && (
                          <span className="text-[7px] font-black px-2 py-0.5 rounded bg-[#39FF14]/10 text-[#39FF14] uppercase tracking-widest border border-[#39FF14]/20">
                            UPSELL
                          </span>
                        )}
                      </div>

                      {alert.raw_context && (
                        <p className="text-[9px] font-mono text-white/40 leading-relaxed line-clamp-2">
                          {alert.raw_context}
                        </p>
                      )}

                      <p className="text-[8px] font-mono text-white/20">
                        {new Date(alert.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex items-center gap-2">
                      {confirmDelete === alert.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDelete(alert.id)}
                            disabled={deletingId === alert.id}
                            className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-[8px] font-black uppercase tracking-widest hover:bg-red-400 transition-all disabled:opacity-50 flex items-center gap-1"
                          >
                            {deletingId === alert.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                            SUPPRIMER
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-3 py-1.5 rounded-lg border border-white/10 text-white/30 text-[8px] font-mono uppercase tracking-widest hover:border-white/20 transition-all"
                          >
                            NON
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(alert.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-red-500/10 text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* ── Pagination ─────────────────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl border border-white/10 text-white/30 hover:border-white/20 hover:text-white transition-all disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">
                PAGE {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-xl border border-white/10 text-white/30 hover:border-white/20 hover:text-white transition-all disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Tab ALERT_CONFIG ──────────────────────────────────────────────── */}
      {activeTab === 'config' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">

          {/* BLOC 1 — Threshold */}
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
                }`}>{thresholdValue}%</span>
              </div>
              <input
                type="range" min={10} max={100} step={5}
                value={thresholdValue}
                onChange={(e) => setThresholdValue(Number(e.target.value))}
                className="w-full accent-[#39FF14] cursor-pointer"
              />
              <div className="flex items-center justify-between text-[8px] font-mono text-white/20">
                <span>10% — ALERTE PRÉCOCE</span>
                <span>100% — CRITIQUE UNIQUEMENT</span>
              </div>
              <div className="space-y-2">
                <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">PREVIEW</span>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${thresholdValue}%`,
                      backgroundColor: thresholdValue > 90 ? '#EF4444' : thresholdValue > 70 ? '#F97316' : '#39FF14'
                    }}
                  />
                </div>
                <div className="flex justify-end">
                  <span className="text-[8px] font-mono text-white/20">Alerte déclenchée à {thresholdValue}% de consommation</span>
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
              Activer ou désactiver chaque type d'alerte métier pour cette enterprise.
            </p>
            <div className="space-y-4">
              {[
                { key: 'AGENT_ERROR',      label: 'AGENT_ERROR',      desc: 'Erreurs critiques détectées sur les agents',         color: 'text-red-400'    },
                { key: 'CHURN_RISK',       label: 'CHURN_RISK',       desc: 'Signaux de risque de départ détectés',               color: 'text-orange-400' },
                { key: 'SECURITY',         label: 'SECURITY',         desc: 'Alertes de sécurité et accès suspects',              color: 'text-yellow-400' },
                { key: 'FEEDBACK_NEGATIF', label: 'FEEDBACK_NÉGATIF', desc: 'Retours négatifs capturés par les agents',           color: 'text-violet-400' },
                { key: 'TOKEN_WARNING',    label: 'TOKEN_WARNING',    desc: 'Consommation tokens approchant le seuil configuré',  color: 'text-blue-400'   }
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

          {/* Toast succès config */}
          <AnimatePresence>
            {configSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="fixed bottom-10 right-10 bg-[#39FF14] text-black px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[1000] font-bold text-xs uppercase tracking-widest"
              >
                <Save className="w-5 h-5" />
                CONFIG_SAVED // SYNC_STABLE
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      )}

    </div>
  )
}
