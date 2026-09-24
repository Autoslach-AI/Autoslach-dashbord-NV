"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, Download, RefreshCw,
  LayoutGrid, List, X, AlertTriangle, Loader2,
  ChevronDown, ExternalLink, Camera
} from 'lucide-react';
import { useUser } from '@/lib/contexts/user-context';
import DoubleRibbonIntelligent, { NavItem } from '@/components/DoubleRibbonIntelligent';
import { LayoutDashboard, Zap, TrendingUp, DollarSign, UserCheck, Bell, Users2 } from 'lucide-react';
import { exportExcel, exportTXT, exportWord } from '@/lib/exportProspects';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Prospect {
  enterprise_id:        string;
  name:                 string;
  contact_name:         string | null;
  email:                string | null;
  phone:                string | null;
  region:               string | null;
  sector:               string | null;
  package_type:         string | null;
  template_id:          string | null;
  template_title:       string | null;
  template_price_fcfa:  number | null;
  template_preview_url: string | null;
  monthly_cost:         number | null;
  message:              string | null;
  status:               string;
  prospect_status:      string | null;
  prospect_score:       number | null;
  rappel_at:            string | null;
  internal_notes:       string | null;
  verbatim:             string | null;
  source_contact:       string | null;
  next_action:          string | null;
  valeur_estimee_fcfa:  number | null;
  created_at:           string;
  activated_at:         string | null;
  logo_url?:            string | null;
  assets_urls?:         any;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Extrait "Budget : X FCFA" depuis le message brut */
function parseBudgetFromMessage(message: string | null): number | null {
  if (!message) return null
  const match = message.match(/Budget\s*:\s*([\d\s]+)\s*FCFA/i)
  if (!match) return null
  const cleaned = match[1].replace(/\s/g, '')
  const val = parseInt(cleaned)
  return isNaN(val) ? null : val
}

/** Résolution de la valeur budget à afficher */
function resolveBudget(p: Prospect): { value: number; source: 'estimee' | 'message' | 'template' } | null {
  if (p.valeur_estimee_fcfa && p.valeur_estimee_fcfa > 0) {
    return { value: p.valeur_estimee_fcfa, source: 'estimee' }
  }
  const fromMsg = parseBudgetFromMessage(p.message)
  if (fromMsg && fromMsg > 0) {
    return { value: fromMsg, source: 'message' }
  }
  if (p.template_price_fcfa && p.template_price_fcfa > 0) {
    return { value: p.template_price_fcfa, source: 'template' }
  }
  return null
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const PACKAGE_TYPES    = ['ALL', 'STARTUP', 'BUSINESS', 'ENTERPRISE', 'ELITE']
const PROSPECT_STATUTS = ['ALL', 'RAPPELER', 'CONVERTI', 'ANNULÉ']
const PERIODS          = [
  { label: 'Tout',    value: 'ALL'   },
  { label: 'Jour',    value: 'DAY'   },
  { label: 'Semaine', value: 'WEEK'  },
  { label: 'Mois',    value: 'MONTH' },
  { label: 'Année',   value: 'YEAR'  }
]

const STATUS_COLORS: Record<string, string> = {
  RAPPELER:     'bg-orange-500/10 text-orange-400 border-orange-500/20',
  CONVERTI:     'bg-[#39FF14]/10 text-[#39FF14] border-[#39FF14]/20',
  ANNULÉ:       'bg-white/5 text-white/30 border-white/10'
}

const PACKAGE_COLORS: Record<string, string> = {
  STARTUP:    'bg-white/5 text-white/40 border-white/10',
  BUSINESS:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ENTERPRISE: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  ELITE:      'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
}

function getHeatBadge(score: number | null): { label: string; color: string } {
  if (!score || score < 30) return { label: 'COLD', color: 'text-white/30' }
  if (score < 60)           return { label: 'WARM', color: 'text-yellow-400' }
  return                           { label: 'HOT',  color: 'text-red-400'    }
}

const LIMIT = 50

// ─── Composant principal ──────────────────────────────────────────────────────

export default function ProspectsPage() {
  const router             = useRouter()
  const { user, profile }  = useUser()

  const [view, setView]               = useState<'TABLE' | 'KANBAN'>('TABLE')
  const [search, setSearch]           = useState('')
  const [filterPackage, setFilterPackage] = useState('ALL')
  const [filterStatus, setFilterStatus]   = useState('ALL')
  const [filterPeriod, setFilterPeriod]   = useState('ALL')

  const [prospects, setProspects]     = useState<Prospect[]>([])
  const [total, setTotal]             = useState(0)
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [hasMore, setHasMore]         = useState(true)
  const offsetRef = useRef(0)
  const skipPanelSyncRef = useRef(false)

  const [selected, setSelected]           = useState<Prospect | null>(null)
  const [savingAction, setSavingAction]   = useState(false)
  const [panelForm, setPanelForm]         = useState({
    prospect_status:     '',
    rappel_at:           '',
    internal_notes:      '',
    verbatim:            '',
    next_action:         '',
    valeur_estimee_fcfa: '',
    source_contact:      ''
  })
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [snapshots, setSnapshots]         = useState<any[]>([])
  const [loadingSnapshot, setLoadingSnapshot] = useState(false)
  const [snapshotSuccess, setSnapshotSuccess] = useState(false)

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadProspects = useCallback(async (reset = false) => {
    if (reset) {
      offsetRef.current = 0
      setProspects([])
      setHasMore(true)
    }
    const currentOffset = offsetRef.current
    if (currentOffset === 0) setLoading(true)
    else setLoadingMore(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('offset', String(currentOffset))
      params.set('limit',  String(LIMIT))
      if (filterPackage !== 'ALL') params.set('package_type',    filterPackage)
      if (filterStatus  !== 'ALL') params.set('prospect_status', filterStatus)
      if (filterPeriod  !== 'ALL') params.set('period',          filterPeriod)
      if (search)                  params.set('search',          search)

      const res = await fetch(`/api/admin/prospects?${params.toString()}`)
      const { data, total: t, error: err } = await res.json()
      if (err) throw new Error(err)

      setProspects(prev => reset ? (data ?? []) : [...prev, ...(data ?? [])])
      setTotal(t ?? 0)
      offsetRef.current = currentOffset + LIMIT
      setHasMore((data ?? []).length === LIMIT)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [filterPackage, filterStatus, filterPeriod, search])

  useEffect(() => { loadProspects(true) }, [filterPackage, filterStatus, filterPeriod])
  useEffect(() => {
    const t = setTimeout(() => loadProspects(true), 400)
    return () => clearTimeout(t)
  }, [search])

  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
        loadProspects(false)
      }
    }, { threshold: 0.1 })
    if (sentinelRef.current) observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loading, loadProspects])

  useEffect(() => {
    if (!selected) return
    if (skipPanelSyncRef.current) {
      skipPanelSyncRef.current = false
      return
    }
    setPanelForm({
      prospect_status:     selected.prospect_status     ?? 'NEW',
      rappel_at:           selected.rappel_at
                             ? new Date(selected.rappel_at).toISOString().slice(0, 16)
                             : '',
      internal_notes:      selected.internal_notes      ?? '',
      verbatim:            selected.verbatim             ?? '',
      next_action:         selected.next_action          ?? '',
      valeur_estimee_fcfa: selected.valeur_estimee_fcfa?.toString() ?? '',
      source_contact:      selected.source_contact       ?? ''
    })
  }, [selected])

  useEffect(() => {
    const fetchSnapshots = async () => {
      const res  = await fetch('/api/admin/prospects/snapshot')
      const json = await res.json()
      if (json.data) setSnapshots(json.data)
    }
    fetchSnapshots()
  }, [])

  const handleSnapshot = async () => {
    setLoadingSnapshot(true)
    setSnapshotSuccess(false)
    try {
      const res = await fetch('/api/admin/prospects/snapshot', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal':   'true'
        }
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)

      // Recharger les snapshots
      const res2  = await fetch('/api/admin/prospects/snapshot')
      const json2 = await res2.json()
      if (json2.data) setSnapshots(json2.data)

      setSnapshotSuccess(true)
      setTimeout(() => setSnapshotSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingSnapshot(false)
    }
  }

  function buildExportData() {
    return prospects.map(p => {
      const budget = resolveBudget(p)
      return {
        enterprise_id:        p.enterprise_id,
        name:                 p.name,
        email:                p.email,
        phone:                p.phone,
        package_type:         p.package_type,
        template_title:       p.template_title,
        template_preview_url: p.template_preview_url,
        budget:               budget ? budget.value : null,
        budget_source:        budget ? budget.source : null,
        prospect_status:      p.prospect_status,
        rappel_at:            p.rappel_at,
        region:               p.region,
        sector:               p.sector,
        internal_notes:       p.internal_notes,
        message:              p.message,
        created_at:           p.created_at
      }
    })
  }

  const handleSavePanel = async (fields: Partial<typeof panelForm>) => {
    if (!selected) return
    setSavingAction(true)
    setError(null)
    try {
      const payload: any = { enterprise_id: selected.enterprise_id }

      if (fields.prospect_status !== undefined)
        payload.prospect_status = fields.prospect_status

      if (fields.rappel_at !== undefined) {
        payload.rappel_at = fields.rappel_at && fields.rappel_at.trim() !== ''
          ? new Date(fields.rappel_at).toISOString()
          : null
      }

      if (fields.internal_notes !== undefined)
        payload.internal_notes = fields.internal_notes

      if (fields.verbatim !== undefined)
        payload.verbatim = fields.verbatim

      if (fields.next_action !== undefined)
        payload.next_action = fields.next_action

      if (fields.source_contact !== undefined)
        payload.source_contact = fields.source_contact

      const res = await fetch('/api/admin/prospects', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
      })

      const json = await res.json()
      if (json.error) throw new Error(json.error)

      // Construire le prospect mis à jour sans refetch
      const updated: Prospect = {
        ...selected,
        ...payload,
        // Remettre enterprise_id proprement
        enterprise_id: selected.enterprise_id,
        // Préserver les champs enrichis
        template_title:       selected.template_title,
        template_price_fcfa:  selected.template_price_fcfa,
        template_preview_url: selected.template_preview_url,
        logo_url:             selected.logo_url,
        assets_urls:          selected.assets_urls,
      }

      // Mettre à jour le tableau
      setProspects(prev => prev.map(p =>
        p.enterprise_id === selected.enterprise_id ? updated : p
      ))

      // Bloquer le useEffect pour ne pas écraser panelForm
      skipPanelSyncRef.current = true

      // Mettre à jour le prospect sélectionné
      setSelected(updated)

      // Mettre à jour le formulaire avec les nouvelles valeurs
      setPanelForm(prev => ({
        ...prev,
        ...fields,
        // Reformater rappel_at pour datetime-local si présent
        ...(fields.rappel_at !== undefined && payload.rappel_at
          ? { rappel_at: new Date(payload.rappel_at).toISOString().slice(0, 16) }
          : fields.rappel_at !== undefined && !payload.rappel_at
          ? { rappel_at: '' }
          : {}
        )
      }))

    } catch (err: any) {
      setError(`Erreur sauvegarde : ${err.message}`)
    } finally {
      setSavingAction(false)
    }
  }

  const totalPipelineFCFA = prospects.reduce((acc, p) => {
    const budget = resolveBudget(p)
    return acc + (budget ? budget.value : 0)
  }, 0)

  const totalRappelsDus = prospects.filter(
    p =>
      p.prospect_status === 'RAPPELER' ||
      (p.rappel_at && new Date(p.rappel_at) <= new Date())
  ).length

  const totalConverti = prospects.filter(
    p => p.prospect_status === 'CONVERTI'
  ).length

  const primaryItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, onClick: () => router.push('/admin') },
    { id: 'prospects', label: 'Prospects', icon: Users,           path: '/admin/prospects' }
  ]

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <DoubleRibbonIntelligent
      primaryItems={primaryItems}
      secondaryItems={[]}
      brandName="AUTOSLASH"
      brandIcon={Zap}
      userProfile={{
        name:  profile?.full_name || 'Amadou',
        email: user?.email        || 'admin@autoslash.ai',
      }}
    >
      <div className="min-h-screen bg-[#0A0A0A] font-mono">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-10 space-y-8">

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex flex-col space-y-6">

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="NOM, TÉLÉPHONE, ID..."
                  className="bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-[10px] font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-[#39FF14]/30 transition-all w-64"
                />
              </div>
              <div className="relative">
                <select
                  value={filterPackage}
                  onChange={e => setFilterPackage(e.target.value)}
                  className="appearance-none bg-white/[0.03] border border-white/10 rounded-xl pl-4 pr-10 py-2 text-[9px] font-black uppercase text-white hover:text-white/80 focus:outline-none focus:border-[#39FF14]/30 transition-all cursor-pointer"
                >
                  {PACKAGE_TYPES.map(p => (
                    <option key={p} value={p} style={{ color: 'black', backgroundColor: 'white' }}>
                      {p === 'ALL' ? 'TOUS LES PLANS' : p}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="appearance-none bg-white/[0.03] border border-white/10 rounded-xl pl-4 pr-10 py-2 text-[9px] font-black uppercase text-white hover:text-white/80 focus:outline-none focus:border-[#39FF14]/30 transition-all cursor-pointer"
                >
                  {PROSPECT_STATUTS.map(s => (
                    <option key={s} value={s} style={{ color: 'black', backgroundColor: 'white' }}>
                      {s === 'ALL' ? 'TOUS LES STATUTS' : s}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={filterPeriod}
                  onChange={e => setFilterPeriod(e.target.value)}
                  className="appearance-none bg-white/[0.03] border border-white/10 rounded-xl pl-4 pr-10 py-2 text-[9px] font-black uppercase text-white hover:text-white/80 focus:outline-none focus:border-[#39FF14]/30 transition-all cursor-pointer"
                >
                  {PERIODS.map(p => (
                    <option key={p.value} value={p.value} style={{ color: 'black', backgroundColor: 'white' }}>
                      {p.value === 'ALL' ? 'TOUTE LA PÉRIODE' : p.label.toUpperCase()}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(v => !v)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/20 text-white text-[11px] font-black uppercase tracking-widest hover:bg-white/5 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  EXPORTER
                  <ChevronDown className="w-3 h-3" />
                </button>
                <AnimatePresence>
                  {showExportMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="absolute right-0 top-full mt-2 z-[60] bg-[#111111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl min-w-[200px]"
                    >
                      {[
                        {
                          label: 'Excel (.xlsx)',
                          icon: '📊',
                          action: () => {
                            exportExcel(
                              buildExportData(),
                              `prospects_${new Date().toISOString().split('T')[0]}`
                            )
                            setShowExportMenu(false)
                          }
                        },
                        {
                          label: 'Word (.docx)',
                          icon: '📝',
                          action: async () => {
                            await exportWord(
                              buildExportData(),
                              `prospects_${new Date().toISOString().split('T')[0]}`
                            )
                            setShowExportMenu(false)
                          }
                        },
                        {
                          label: 'Document (.txt)',
                          icon: '📄',
                          action: () => {
                            exportTXT(
                              buildExportData(),
                              `prospects_${new Date().toISOString().split('T')[0]}`
                            )
                            setShowExportMenu(false)
                          }
                        },
                      ].map(({ label, icon, action }) => (
                        <button
                          key={label}
                          onClick={action}
                          className="w-full flex items-center gap-3 px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-white hover:bg-white/5 transition-all border-b border-white/5 last:border-0"
                        >
                          <span className="text-base">{icon}</span>
                          {label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Snapshot journalier */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                HISTORIQUE_PIPELINE
              </h2>
              {snapshots.length > 0 && (
                <span className="text-[8px] font-mono text-white/20">
                  {snapshots.length} jours enregistrés
                </span>
              )}
            </div>
            <button
              onClick={handleSnapshot}
              disabled={loadingSnapshot}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all disabled:opacity-50 cursor-pointer ${
                snapshotSuccess
                  ? 'bg-[#39FF14]/10 border-[#39FF14]/30 text-[#39FF14]'
                  : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
              }`}
            >
              {loadingSnapshot ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : snapshotSuccess ? (
                <>✓ SNAPSHOT_SAUVEGARDÉ</>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5" />
                  SNAPSHOT_MAINTENANT
                </>
              )}
            </button>
          </div>

          {/* Tableau historique */}
          {snapshots.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-white/5 bg-[#0B0B0B]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.01]">
                    {[
                      'DATE', 'TOTAL', 'NOUVEAUX',
                      'CONVERTIS', 'ANNULÉS', 'RAPPELS_DUS',
                      'PIPELINE_FCFA', 'TYPE'
                    ].map(col => (
                      <th key={col} className="px-4 py-3 text-[9px] font-black text-white/30 tracking-[0.2em] uppercase">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {snapshots.map((s, idx) => (
                    <tr
                      key={s.id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        idx === 0 ? 'bg-[#39FF14]/[0.02]' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {idx === 0 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#39FF14] shrink-0" />
                          )}
                          <span className="text-[10px] font-black text-white font-mono">
                            {new Date(s.snapshot_date).toLocaleDateString('fr-FR', {
                              day: '2-digit', month: 'short', year: 'numeric'
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-black text-white font-mono">
                          {s.total_prospects}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-black text-[#39FF14] font-mono">
                          +{s.new_count}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-black text-[#39FF14]/70 font-mono">
                          {s.converted_count}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-mono text-white/40">
                          {s.annulled_count}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-mono ${
                          s.rappels_dus > 0 ? 'text-orange-400 font-black' : 'text-white/40'
                        }`}>
                          {s.rappels_dus}
                          {s.rappels_dus > 0 && ' ⚡'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-black text-[#39FF14] font-mono">
                          {s.valeur_pipeline_fcfa > 0
                            ? s.valeur_pipeline_fcfa.toLocaleString('fr-FR') + ' F'
                            : '—'
                          }
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[8px] font-mono text-white/20 uppercase">
                          {s.period_type ?? 'DAY'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">

              {/* Carte 1 — Total Prospects */}
              <div className="bg-[#0D0D0D] border border-white/8 rounded-2xl p-5 flex flex-col gap-3 hover:border-white/15 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10">
                    <Users2 className="w-4 h-4 text-white/40" />
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/25">
                    TOTAL
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/40">
                    TOTAL_PROSPECTS
                  </span>
                  <div className="flex items-end gap-2">
                    <span className="text-[32px] font-black text-white font-mono leading-none">
                      {total}
                    </span>
                    <span className="text-[10px] font-mono text-white/30 mb-1">
                      ({prospects.length} affichés)
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-white/25">
                    Toutes périodes confondues
                  </span>
                </div>
              </div>

              {/* Carte 2 — Pipeline FCFA */}
              <div className="bg-[#0D0D0D] border border-[#39FF14]/15 rounded-2xl p-5 flex flex-col gap-3 hover:border-[#39FF14]/30 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#39FF14]/5 border border-[#39FF14]/15">
                    <DollarSign className="w-4 h-4 text-[#39FF14]/60" />
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#39FF14]/30">
                    FCFA
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/40">
                    PIPELINE_FCFA
                  </span>
                  <div className="flex items-end gap-2 flex-wrap">
                    <span className="text-[28px] font-black text-[#39FF14] font-mono leading-none">
                      {totalPipelineFCFA > 0
                        ? totalPipelineFCFA.toLocaleString('fr-FR')
                        : '—'
                      }
                    </span>
                    {totalPipelineFCFA > 0 && (
                      <span className="text-[12px] font-black text-[#39FF14]/60 mb-1">F</span>
                    )}
                  </div>
                  <span className="text-[9px] font-mono text-white/25">
                    Valeur totale estimée
                  </span>
                </div>
              </div>

              {/* Carte 3 — Convertis */}
              <div className="bg-[#0D0D0D] border border-white/8 rounded-2xl p-5 flex flex-col gap-3 hover:border-[#39FF14]/20 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#39FF14]/5 border border-[#39FF14]/10">
                    <UserCheck className="w-4 h-4 text-[#39FF14]/50" />
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#39FF14]/10 border border-[#39FF14]/20">
                    <TrendingUp className="w-2.5 h-2.5 text-[#39FF14]" />
                    <span className="text-[8px] font-black text-[#39FF14]">
                      {total > 0 ? Math.round((totalConverti / total) * 100) : 0}%
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/40">
                    CONVERTIS
                  </span>
                  <span className="text-[32px] font-black text-white font-mono leading-none">
                    {totalConverti}
                  </span>
                  <span className="text-[9px] font-mono text-white/25">
                    Taux de conversion
                  </span>
                </div>
              </div>

              {/* Carte 4 — RAPPELS_DUS */}
              <div
                className="bg-[#0D0D0D] border border-orange-500/15 rounded-2xl p-5 flex flex-col gap-3 hover:border-orange-500/30 transition-all cursor-pointer active:scale-[0.98]"
                onClick={() => {
                  setFilterStatus('RAPPELER')
                  window.scrollTo({ top: 400, behavior: 'smooth' })
                }}
                title="Voir les prospects à rappeler"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/5 border border-orange-500/15">
                    <Bell className="w-4 h-4 text-orange-400/60" />
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-orange-400/30">
                    EN RETARD
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/40">
                    RAPPELS_DUS
                  </span>
                  <span className={`text-[32px] font-black font-mono leading-none ${
                    totalRappelsDus > 0 ? 'text-orange-400' : 'text-white/30'
                  }`}>
                    {totalRappelsDus}
                  </span>
                  <span className="text-[9px] font-mono text-white/25">
                    {totalRappelsDus > 0
                      ? 'À rappeler immédiatement ⚡'
                      : 'Aucun rappel en retard'
                    }
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* ── Erreur ──────────────────────────────────────────────────── */}
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

          {/* ── Contenu ─────────────────────────────────────────────────── */}
          {loading ? (
            <div className="flex items-center justify-center py-32">
              <Loader2 className="w-6 h-6 text-[#39FF14] animate-spin" />
            </div>
          ) : prospects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 border border-dashed border-white/10 rounded-3xl gap-4">
              <Users className="w-8 h-8 text-white/10" />
              <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Aucun prospect trouvé</p>
            </div>
          ) : (
            <>
              {view === 'TABLE' && (
                <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#0B0B0B]">
                  <table className="w-full text-left border-collapse table-auto">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.01]">
                        <th className="px-4 py-4 w-10">
                          <input type="checkbox" className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 accent-[#39FF14] focus:ring-0 cursor-pointer" />
                        </th>
                        {[
                          { label: 'NOM',         width: '160px' },
                          { label: 'EMAIL',       width: '180px' },
                          { label: 'PLAN',        width: '140px' },
                          { label: 'STATUT',      width: '130px' },
                          { label: 'RÉGION',      width: '100px' },
                          { label: 'BUDGET FCFA', width: '130px' },
                          { label: 'TÉLÉPHONE',   width: '140px' },
                          { label: 'TEMPLATE',    width: '150px' },
                          { label: 'DATE',        width: '80px'  }
                        ].map(col => (
                          <th key={col.label} style={{ width: col.width }} className="px-4 py-3 text-[10px] font-black text-white/30 tracking-[0.2em] uppercase">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.02]">
                      {prospects.map((p, idx) => {
                        const heat      = getHeatBadge(p.prospect_score)
                        const rappelDue = p.rappel_at && new Date(p.rappel_at) <= new Date()
                        const budget    = resolveBudget(p)

                        return (
                          <motion.tr
                            key={p.enterprise_id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(idx * 0.01, 0.4) }}
                            onClick={() => setSelected(p)}
                            className={`group hover:bg-white/[0.02] cursor-pointer transition-colors ${rappelDue ? 'bg-orange-500/5' : ''}`}
                          >
                            <td className="px-4 py-5" onClick={e => e.stopPropagation()}>
                              <input type="checkbox" className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 accent-[#39FF14] focus:ring-0 cursor-pointer" />
                            </td>

                            {/* NOM — avatar + nom uniquement */}
                            <td className="px-4 py-5">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                  <span className="text-[11px] font-black text-white/40">{p.name[0].toUpperCase()}</span>
                                </div>
                                <span className="text-[12px] font-black text-white uppercase tracking-wider truncate max-w-[130px]">{p.name}</span>
                              </div>
                            </td>

                            {/* EMAIL */}
                            <td className="px-4 py-5">
                              <span className="text-[10px] font-mono text-white/80 truncate block max-w-[180px]">
                                {p.email ?? '—'}
                              </span>
                            </td>

                            {/* PLAN */}
                            <td className="px-4 py-5">
                              <div className="flex flex-col gap-1">
                                <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border w-fit ${
                                  PACKAGE_COLORS[p.package_type ?? ''] ?? 'bg-white/5 text-white/70 border-white/10'
                                }`}>
                                  {p.package_type ?? '—'}
                                </span>
                                {p.template_title && (
                                  <span className="text-[8px] font-mono text-white/30 truncate max-w-[140px]">{p.template_title}</span>
                                )}
                              </div>
                            </td>

                            {/* STATUT — dropdown inline */}
                            <td className="px-4 py-5 relative" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => setEditingStatusId(editingStatusId === p.enterprise_id ? null : p.enterprise_id)}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest border transition-all hover:opacity-80 ${
                                  STATUS_COLORS[p.prospect_status ?? 'RAPPELER'] ?? 'bg-white/5 text-white/70 border-white/10'
                                }`}
                              >
                                {p.prospect_status ?? 'RAPPELER'}
                                <ChevronDown className="w-2.5 h-2.5 shrink-0" />
                              </button>
                              <AnimatePresence>
                                {editingStatusId === p.enterprise_id && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    className="absolute top-full left-0 mt-1 z-[50] bg-[#111111] border border-white/10 rounded-xl overflow-hidden shadow-2xl min-w-[160px]"
                                  >
                                    {['RAPPELER', 'CONVERTI', 'ANNULÉ'].map(s => (
                                      <button
                                        key={s}
                                        onClick={async () => {
                                          setEditingStatusId(null)
                                          try {
                                            const res = await fetch('/api/admin/prospects', {
                                              method: 'POST',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({ enterprise_id: p.enterprise_id, prospect_status: s })
                                            })
                                            const { error: saveError } = await res.json()
                                            if (saveError) throw new Error(saveError)
                                            setProspects(prev => prev.map(pr =>
                                              pr.enterprise_id === p.enterprise_id ? { ...pr, prospect_status: s } : pr
                                            ))
                                            if (selected?.enterprise_id === p.enterprise_id) {
                                              setSelected(prev => prev ? { ...prev, prospect_status: s } : null)
                                            }
                                          } catch (err: any) { setError(err.message) }
                                        }}
                                        className={`w-full flex items-center px-4 py-2.5 text-[8px] font-black uppercase tracking-widest transition-all hover:bg-white/5 ${
                                          p.prospect_status === s ? STATUS_COLORS[s] : 'text-white/70'
                                        }`}
                                      >
                                        {p.prospect_status === s && <span className="w-1.5 h-1.5 rounded-full bg-current mr-2 shrink-0" />}
                                        {s}
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </td>

                            {/* RÉGION */}
                            <td className="px-4 py-5">
                              <span className="text-[10px] font-mono text-white/90">{p.region ?? '—'}</span>
                            </td>

                            {/* BUDGET FCFA — logique resolveBudget inchangée */}
                            <td className="px-4 py-5">
                              {budget ? (
                                <div className="flex flex-col">
                                  <span className="text-[12px] font-black font-mono text-[#39FF14]/90">
                                    {budget.value.toLocaleString('fr-FR')} F
                                  </span>
                                  {budget.source === 'template' && (
                                    <span className="text-[8px] font-mono text-white/40">template</span>
                                  )}
                                  {budget.source === 'message' && (
                                    <span className="text-[8px] font-mono text-white/40">extrait msg</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[9px] font-mono text-white/40">—</span>
                              )}
                            </td>

                            {/* NEXT_ACTION */}
                            <td className="px-4 py-5">
                              <span className="text-[9px] font-mono text-white/70 truncate block max-w-[140px]">
                                {p.next_action ?? p.phone ?? '—'}
                              </span>
                            </td>

                            {/* TEMPLATE — titre + lien preview */}
                            <td className="px-4 py-5" onClick={e => e.stopPropagation()}>
                              {p.template_title ? (
                                <div className="flex flex-col gap-1">
                                  <span className="text-[9px] font-mono text-white/80 truncate max-w-[140px]">
                                    {p.template_title}
                                  </span>
                                  {p.template_preview_url ? (
                                    <a
                                      href={p.template_preview_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-[8px] font-mono text-[#39FF14]/60 hover:text-[#39FF14] transition-colors underline underline-offset-2"
                                    >
                                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                      VOIR PREVIEW
                                    </a>
                                  ) : (
                                    <span className="text-[8px] font-mono text-white/30">pas de lien</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[9px] font-mono text-white/30">—</span>
                              )}
                            </td>

                            {/* DATE */}
                            <td className="px-4 py-5">
                              <span className="text-[9px] font-mono text-white/60">
                                {new Date(p.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                              </span>
                            </td>
                          </motion.tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {view === 'KANBAN' && (
                <div className="text-[9px] font-mono text-white/20 text-center py-8">KANBAN — Étape suivante</div>
              )}

              <div ref={sentinelRef} className="h-4" />
              {loadingMore && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 text-[#39FF14] animate-spin" />
                </div>
              )}
            </>
          )}


        </div>
      </div>

      {/* ── Side Panel ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 right-0 w-full max-w-[520px] bg-[#0A0A0A] border-l border-white/10 z-[101] flex flex-col font-mono overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-white/5">
                <div className="space-y-1">
                  <h2 className="text-sm font-black uppercase tracking-widest text-white">{selected.name}</h2>
                  <div className="flex items-center gap-2">
                    <span className={`text-[7px] font-black px-2 py-0.5 rounded border uppercase ${
                      PACKAGE_COLORS[selected.package_type ?? ''] ?? 'bg-white/5 text-white/30 border-white/10'
                    }`}>
                      {selected.package_type ?? '—'}
                    </span>
                    <span className={`text-[7px] font-black px-2 py-0.5 rounded border uppercase ${
                      STATUS_COLORS[selected.prospect_status ?? 'RAPPELER'] ?? 'bg-white/5 text-white/30 border-white/10'
                    }`}>
                      {selected.prospect_status ?? 'RAPPELER'}
                    </span>
                    <span className={`text-[7px] font-black uppercase ${getHeatBadge(selected.prospect_score).color}`}>
                      {getHeatBadge(selected.prospect_score).label}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-2 rounded-xl border border-white/10 text-white/30 hover:text-white hover:border-white/20 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 no-scrollbar">

                {/* Message original du client */}
                <div className="space-y-3">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/60">
                    MESSAGE_CLIENT
                  </h3>
                  <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl">
                    <p className="text-[12px] font-mono text-white leading-relaxed whitespace-pre-wrap">
                      {selected.message ?? '— Aucun message —'}
                    </p>
                  </div>
                </div>

                {/* Template demandé */}
                {selected.template_id && selected.template_title && (
                  <div className="space-y-3">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/60">
                      TEMPLATE_DEMANDÉ
                    </h3>
                    <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-black text-white uppercase tracking-wider">
                          {selected.template_title}
                        </span>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded border uppercase ${
                          PACKAGE_COLORS[selected.package_type ?? ''] ?? 'bg-white/5 text-white/30 border-white/10'
                        }`}>
                          {selected.package_type}
                        </span>
                      </div>
                      {selected.template_price_fcfa && selected.template_price_fcfa > 0 && (
                        <div className="text-[14px] font-black font-mono text-[#39FF14]">
                          {selected.template_price_fcfa.toLocaleString('fr-FR')} FCFA
                        </div>
                      )}
                      {selected.template_preview_url && (
                        <a
                          href={selected.template_preview_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[10px] font-mono text-[#39FF14]/70 hover:text-[#39FF14] transition-colors"
                          onClick={e => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          VOIR PREVIEW
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Statut actuel */}
                <div className="space-y-3">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/60">
                    STATUT
                  </h3>
                  <div className="flex gap-2">
                    {(['RAPPELER', 'CONVERTI', 'ANNULÉ'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => {
                          setPanelForm(f => ({ ...f, prospect_status: s }))
                          handleSavePanel({ prospect_status: s })
                        }}
                        disabled={savingAction}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                          (panelForm.prospect_status || selected.prospect_status) === s
                            ? STATUS_COLORS[s] ?? 'bg-white/10 text-white border-white/20'
                            : 'border-white/10 text-white/40 hover:border-white/30 hover:text-white/80'
                        } disabled:opacity-50`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date de rappel — visible uniquement si statut RAPPELER */}
                {(panelForm.prospect_status === 'RAPPELER' || selected.prospect_status === 'RAPPELER') && (
                  <div className="space-y-3">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/60">
                      DATE_RAPPEL
                    </h3>
                    <div className="flex items-center gap-3">
                      <input
                        type="datetime-local"
                        value={panelForm.rappel_at}
                        onChange={e => setPanelForm(f => ({ ...f, rappel_at: e.target.value }))}
                        className="flex-1 bg-white/[0.05] border border-white/20 rounded-xl px-4 py-3 text-[12px] font-mono text-white focus:outline-none focus:border-[#39FF14]/50 transition-all"
                      />
                      <button
                        onClick={() => handleSavePanel({ rappel_at: panelForm.rappel_at })}
                        disabled={savingAction}
                        className="px-5 py-3 rounded-xl bg-[#39FF14]/10 border border-[#39FF14]/30 text-[#39FF14] text-[10px] font-black uppercase tracking-widest hover:bg-[#39FF14]/20 transition-all disabled:opacity-50"
                      >
                        {savingAction ? '...' : 'OK'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Commentaire — toujours visible, label change selon statut */}
                <div className="space-y-3">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/60">
                    {(panelForm.prospect_status || selected.prospect_status) === 'RAPPELER'
                      ? 'COMMENTAIRE_RELANCE'
                      : (panelForm.prospect_status || selected.prospect_status) === 'CONVERTI'
                      ? 'COMMENTAIRE_CONVERSION'
                      : (panelForm.prospect_status || selected.prospect_status) === 'ANNULÉ'
                      ? 'COMMENTAIRE_ANNULATION'
                      : 'COMMENTAIRE'}
                  </h3>
                  <textarea
                    value={panelForm.internal_notes}
                    onChange={e => setPanelForm(f => ({ ...f, internal_notes: e.target.value }))}
                    placeholder={
                      (panelForm.prospect_status || selected.prospect_status) === 'RAPPELER'
                        ? 'Pourquoi relancer ? Que lui dire ?...'
                        : (panelForm.prospect_status || selected.prospect_status) === 'CONVERTI'
                        ? 'Comment la conversion s\'est passée ?...'
                        : (panelForm.prospect_status || selected.prospect_status) === 'ANNULÉ'
                        ? 'Pourquoi annulé ? Objection principale ?...'
                        : 'Vos notes sur ce prospect...'
                    }
                    rows={5}
                    className="w-full bg-white/[0.05] border border-white/20 rounded-xl px-4 py-3 text-[12px] font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-[#39FF14]/50 transition-all resize-none"
                  />
                  <button
                    onClick={() => handleSavePanel({ internal_notes: panelForm.internal_notes })}
                    disabled={savingAction}
                    className="w-full py-3 rounded-xl bg-[#39FF14]/10 border border-[#39FF14]/30 text-[#39FF14] text-[10px] font-black uppercase tracking-widest hover:bg-[#39FF14]/20 transition-all disabled:opacity-50"
                  >
                    {savingAction ? 'SAVING...' : 'SAUVEGARDER_COMMENTAIRE'}
                  </button>
                </div>

                {/* Source contact */}
                <div className="space-y-3 pb-10">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/60">
                    SOURCE_CONTACT
                  </h3>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={panelForm.source_contact}
                      onChange={e => setPanelForm(f => ({ ...f, source_contact: e.target.value }))}
                      placeholder="Formulaire vitrine, LinkedIn, Recommandation..."
                      className="flex-1 bg-white/[0.05] border border-white/20 rounded-xl px-4 py-3 text-[12px] font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-[#39FF14]/50 transition-all"
                    />
                    <button
                      onClick={() => handleSavePanel({ source_contact: panelForm.source_contact })}
                      disabled={savingAction}
                      className="px-5 py-3 rounded-xl bg-[#39FF14]/10 border border-[#39FF14]/30 text-[#39FF14] text-[10px] font-black uppercase tracking-widest hover:bg-[#39FF14]/20 transition-all disabled:opacity-50"
                    >
                      {savingAction ? '...' : 'OK'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 py-4 border-t border-white/5">
                <p className="text-[7px] font-mono text-white/20 text-center uppercase tracking-widest">
                  CONVERTI ≠ ACTIF — Activation depuis Dashboard 2 → Profile
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DoubleRibbonIntelligent>
  )
}
