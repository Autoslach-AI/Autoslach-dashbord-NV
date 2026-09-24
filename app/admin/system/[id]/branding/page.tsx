"use client";
 
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette, Upload, Globe, Briefcase, Save, Zap, Sparkles,
  Plus, Trash2, Loader2, X, CheckCircle2, AlertTriangle,
  Phone, Lock
} from 'lucide-react';
import { useSystem } from '../SystemContext';
 
// ─── Types ──────────────────────────────────────────────────────────────────
 
interface BrandingAssets {
  hero: string[];
  favicon: string | null;
  colors: { primary: string; secondary: string };
  meta: { slogan: string; description: string; topbar: string[] };
  contact: { phones: string[]; address: string };
  branding: { heroTitle: string; heroSubtitle: string; currency: string };
}
 
// ─── Utilitaires ────────────────────────────────────────────────────────────
 
function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .toLowerCase();
}
 
function getMaxHeroImages(packageType: string): number {
  switch (packageType?.toUpperCase()) {
    case 'STARTUP':    return 1;
    case 'BUSINESS':   return 3;
    case 'ENTERPRISE': return 5;
    case 'ELITE':      return -1;
    default:           return 1;
  }
}
 
function isFeatureAllowed(
  packageType: string,
  feature: 'favicon' | 'topbar' | 'seo' | 'colors'
): boolean {
  const pkg = packageType?.toUpperCase();
  switch (feature) {
    case 'favicon': return ['BUSINESS', 'ENTERPRISE', 'ELITE'].includes(pkg);
    case 'topbar':  return ['BUSINESS', 'ENTERPRISE', 'ELITE'].includes(pkg);
    case 'seo':     return ['ENTERPRISE', 'ELITE'].includes(pkg);
    case 'colors':  return ['BUSINESS', 'ENTERPRISE', 'ELITE'].includes(pkg);
    default:        return false;
  }
}
 
const DEFAULT_ASSETS: BrandingAssets = {
  hero: [],
  favicon: null,
  colors: { primary: '142 70% 45%', secondary: '210 40% 98%' },
  meta: { slogan: '', description: '', topbar: [] },
  contact: { phones: [''], address: '' },
  branding: { heroTitle: '', heroSubtitle: '', currency: 'FCFA' }
};
 
// ─── Composant principal ─────────────────────────────────────────────────────
 
export default function BrandingPage() {
  const { enterprise, planDef, refreshEnterprise } = useSystem();
 
  const [assets, setAssets]             = useState<BrandingAssets>(DEFAULT_ASSETS);
  const [logoUrl, setLogoUrl]           = useState<string | null>(null);
  const [companyName, setCompanyName]   = useState('');
  const [email, setEmail]               = useState('');
 
  const [saving, setSaving]             = useState(false);
  const [saved, setSaved]               = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [generatingMeta, setGeneratingMeta] = useState(false);
  const [error, setError]               = useState<string | null>(null);
 
  // ── Chargement depuis enterprise ────────────────────────────────────────
  useEffect(() => {
    if (!enterprise) return;
 
    setLogoUrl(enterprise.logo_url || null);
    setCompanyName(enterprise.name || '');
    setEmail(enterprise.email || '');
 
    const raw = enterprise.assets_urls as BrandingAssets | null;
    if (raw) {
      setAssets({
        hero:    Array.isArray(raw.hero) ? raw.hero : [],
        favicon: raw.favicon ?? null,
        colors: {
          primary:   raw.colors?.primary   ?? DEFAULT_ASSETS.colors.primary,
          secondary: raw.colors?.secondary ?? DEFAULT_ASSETS.colors.secondary
        },
        meta: {
          slogan:      raw.meta?.slogan      ?? '',
          description: raw.meta?.description ?? '',
          topbar:      Array.isArray(raw.meta?.topbar) ? raw.meta.topbar : []
        },
        contact: {
          phones:  Array.isArray(raw.contact?.phones) && raw.contact.phones.length > 0
                     ? raw.contact.phones
                     : [''],
          address: raw.contact?.address ?? ''
        },
        branding: {
          heroTitle:    raw.branding?.heroTitle    ?? '',
          heroSubtitle: raw.branding?.heroSubtitle ?? '',
          currency:     raw.branding?.currency     ?? 'FCFA'
        }
      });
    }
  }, [enterprise]);
 
  // ── Guards ───────────────────────────────────────────────────────────────
  if (!enterprise || !planDef) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-6 h-6 text-[#39FF14] animate-spin" />
      </div>
    );
  }
 
  const packageType  = enterprise.package_type || 'STARTUP';
  const maxFileSize  = planDef.max_file_size_mb ?? 10;
  const maxHero      = getMaxHeroImages(packageType);
 
  // ── Upload handler ───────────────────────────────────────────────────────
  const handleUpload = async (
    file: File,
    field: string
  ): Promise<string | null> => {
    const fileSizeMb = file.size / (1024 * 1024);
    if (fileSizeMb > maxFileSize) {
      setError(`Fichier trop lourd : ${fileSizeMb.toFixed(1)}MB. Max autorisé : ${maxFileSize}MB (plan ${packageType})`);
      return null;
    }
 
    setUploadingField(field);
    setError(null);
 
    try {
      const ext       = file.name.split('.').pop() || 'bin';
      const base      = file.name.replace(`.${ext}`, '');
      const sanitized = sanitizeFilename(base);
      const path      = `${enterprise.enterprise_id}/branding/${field}_${sanitized}_${Date.now()}.${ext}`;
 
      const form = new FormData();
      form.append('file',   file);
      form.append('path',   path);
      form.append('bucket', 'enterprise-assets');

      const res = await fetch('/api/admin/upload', { method: 'POST', body: form });
      const { url, error: uploadError } = await res.json();
      if (uploadError) throw new Error(uploadError);
      return url;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setUploadingField(null);
    }
  };
 
  // ── Save handler ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/enterprise/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enterprise_id: enterprise.enterprise_id,
          assets_urls:   assets,
          logo_url:      logoUrl,
          name:          companyName,
          email:         email
        })
      });
      const { error: saveError } = await res.json();
      if (saveError) throw new Error(saveError);
 
      setSaved(true);
      await refreshEnterprise();
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };
 
  // ── Neural auto-gen ──────────────────────────────────────────────────────
  const handleNeuralGen = async () => {
    setGeneratingMeta(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/enterprise/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:         companyName || enterprise.name,
          sector:       enterprise.sector,
          package_type: packageType
        })
      });
      const { description, error: genError } = await res.json();
      if (genError) throw new Error(genError);
      updateField(['meta', 'description'], description);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGeneratingMeta(false);
    }
  };
 
  // ── Helper — mise à jour imbriquée ───────────────────────────────────────
  const updateField = (path: string[], value: any) => {
    setAssets(prev => {
      const next: any = { ...prev };
      let curr        = next;
      for (let i = 0; i < path.length - 1; i++) {
        curr[path[i]] = { ...curr[path[i]] };
        curr          = curr[path[i]];
      }
      curr[path[path.length - 1]] = value;
      return next;
    });
  };
 
  // ─── Micro-composants ────────────────────────────────────────────────────
 
  const SectionHeader = ({
    icon: Icon,
    title,
    badge
  }: { icon: any; title: string; badge?: string }) => (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        <div className="p-1.5 rounded-lg bg-white/[0.03] border border-white/10">
          <Icon className="w-3.5 h-3.5 text-[#39FF14]" />
        </div>
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] font-mono text-white/90">
          {title}
        </h2>
      </div>
      {badge && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#39FF14]/5 border border-[#39FF14]/10">
          <div className="w-1 h-1 bg-[#39FF14] rounded-full animate-pulse" />
          <span className="text-[7px] font-black text-[#39FF14] uppercase tracking-widest">
            {badge}
          </span>
        </div>
      )}
    </div>
  );
 
  const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="text-[9px] font-black uppercase tracking-[0.2em] font-mono text-white/30 block mb-2">
      {children}
    </label>
  );
 
  const FieldInput = ({
    value,
    onChange,
    placeholder
  }: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  }) => (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-xs text-white/80 focus:outline-none focus:border-[#39FF14]/30 transition-all font-mono placeholder:text-white/10"
    />
  );
 
  const LockedFeature = ({
    requiredPlan,
    children
  }: {
    requiredPlan: string;
    children: React.ReactNode;
  }) => (
    <div className="relative">
      <div className="opacity-20 pointer-events-none select-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl border border-white/5 backdrop-blur-[2px]">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
          <Lock className="w-3 h-3 text-white/40" />
          <span className="text-[8px] font-black uppercase tracking-widest text-white/40">
            Disponible dès le plan {requiredPlan}
          </span>
        </div>
      </div>
    </div>
  );
 
  // ─── Render ───────────────────────────────────────────────────────────────
 
  return (
    <div className="min-h-screen bg-[#0A0A0A] max-w-[1400px] mx-auto px-6 lg:px-10 py-16 pb-36 space-y-16">
 
      {/* ── Bandeau erreur ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 px-6 py-4 bg-red-500/10 border border-red-500/20 rounded-2xl"
          >
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-xs font-mono text-red-400">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4 text-red-400/50 hover:text-red-400" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
 
      {/* ── Badge plan actif ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/10">
          <span className="text-[9px] font-black uppercase tracking-widest font-mono text-white/50">
            PLAN ·{' '}
            <span className="text-[#39FF14]">{packageType}</span>
            {' · '}MAX {maxFileSize}MB / FICHIER
          </span>
        </div>
 
        <div className="px-2.5 py-1 rounded bg-white/[0.02] border border-white/5">
          <span className="text-[8px] font-mono text-white/30">
            HÉROS ·{' '}
            {maxHero === -1
              ? `${assets.hero.length} / ∞`
              : `${assets.hero.length} / ${maxHero}`}
          </span>
        </div>
 
        {maxHero === -1 && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#39FF14]/5 border border-[#39FF14]/10">
            <span className="text-[8px] font-black text-[#39FF14] uppercase tracking-widest">
              INFRASTRUCTURE DÉDIÉE
            </span>
          </div>
        )}
      </div>
 
      {/* ══════════════════════════════════════════════════════════════════
          SECTION 01 — HERO NODE MANAGER
      ══════════════════════════════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#050505] border border-white/5 rounded-[2.5rem] p-10 lg:p-14 space-y-10"
      >
        <SectionHeader icon={Zap} title="Section_01 // Hero_Node_Manager" badge="ACTIVE" />
 
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Textes hero */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Primary_Title</Label>
              <FieldInput
                value={assets.branding.heroTitle}
                onChange={v => updateField(['branding', 'heroTitle'], v)}
                placeholder="Titre principal du site..."
              />
            </div>
            <div className="space-y-2">
              <Label>Sub_Title_Core</Label>
              <textarea
                value={assets.branding.heroSubtitle}
                onChange={e => updateField(['branding', 'heroSubtitle'], e.target.value)}
                placeholder="Sous-titre ou accroche..."
                className="w-full bg-black border border-white/5 rounded-2xl px-5 py-4 text-xs text-white/80 focus:outline-none focus:border-[#39FF14]/30 transition-all font-mono h-32 resize-none leading-relaxed"
              />
            </div>
          </div>
 
          {/* Hero images */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Hero_Asset_Lattice</Label>
              <span className="text-[8px] font-mono text-white/20">
                {maxHero === -1 ? '∞ slots disponibles' : `${assets.hero.length}/${maxHero} slots`}
              </span>
            </div>
 
            <div className="grid grid-cols-2 gap-4">
              {/* Images existantes */}
              {assets.hero.map((url, idx) => (
                <div
                  key={idx}
                  className="aspect-video bg-black border border-white/5 rounded-2xl overflow-hidden relative group"
                >
                  <img
                    src={url}
                    alt={`hero_${idx}`}
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() =>
                        setAssets(prev => ({
                          ...prev,
                          hero: prev.hero.filter((_, i) => i !== idx)
                        }))
                      }
                      className="p-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
 
              {/* Slot upload si quota non atteint */}
              {(maxHero === -1 || assets.hero.length < maxHero) && (
                <label className="aspect-video border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[#39FF14]/30 hover:bg-[#39FF14]/5 transition-all group">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={async e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = await handleUpload(file, `hero_${assets.hero.length}`);
                      if (url) setAssets(prev => ({ ...prev, hero: [...prev.hero, url] }));
                    }}
                  />
                  {uploadingField?.startsWith('hero') ? (
                    <Loader2 className="w-5 h-5 text-[#39FF14] animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-white/10 group-hover:text-[#39FF14] transition-colors" />
                      <span className="text-[8px] font-black text-white/10 group-hover:text-white/40 uppercase tracking-widest">
                        Inject_Asset
                      </span>
                      <span className="text-[7px] text-white/10 font-mono">max {maxFileSize}MB</span>
                    </>
                  )}
                </label>
              )}
            </div>
          </div>
        </div>
      </motion.section>
 
      {/* ══════════════════════════════════════════════════════════════════
          SECTION 02 — CORPORATE LATTICE
      ══════════════════════════════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-[#050505] border border-white/5 rounded-[2.5rem] p-10 lg:p-14 space-y-10"
      >
        <SectionHeader icon={Briefcase} title="Section_02 // Corporate_Lattice" badge="ACTIVE" />
 
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <Label>Company_Name</Label>
            <FieldInput
              value={companyName}
              onChange={setCompanyName}
              placeholder="Nom de l'entreprise..."
            />
          </div>
          <div className="space-y-2">
            <Label>Slogan_Matrix</Label>
            <FieldInput
              value={assets.meta.slogan}
              onChange={v => updateField(['meta', 'slogan'], v)}
              placeholder="Votre slogan..."
            />
          </div>
          <div className="space-y-2">
            <Label>Corporate_Email</Label>
            <FieldInput
              value={email}
              onChange={setEmail}
              placeholder="contact@entreprise.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Currency_Protocol</Label>
            <FieldInput
              value={assets.branding.currency}
              onChange={v => updateField(['branding', 'currency'], v)}
              placeholder="FCFA"
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>Address_Node</Label>
            <FieldInput
              value={assets.contact.address}
              onChange={v => updateField(['contact', 'address'], v)}
              placeholder="Adresse physique complète..."
            />
          </div>
        </div>
 
        {/* Communication lines */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Communication_Lines (Max 3)</Label>
            {assets.contact.phones.length < 3 && (
              <button
                onClick={() =>
                  updateField(['contact', 'phones'], [...assets.contact.phones, ''])
                }
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-[#39FF14]/10 hover:text-[#39FF14] text-white/40 transition-all border border-white/5"
              >
                <Plus className="w-3 h-3" />
                <span className="text-[8px] font-black uppercase tracking-widest">Add_Line</span>
              </button>
            )}
          </div>
 
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {assets.contact.phones.map((phone, idx) => (
              <div key={idx} className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 group-focus-within:text-[#39FF14] transition-colors" />
                <input
                  value={phone}
                  onChange={e => {
                    const updated = [...assets.contact.phones];
                    updated[idx]  = e.target.value;
                    updateField(['contact', 'phones'], updated);
                  }}
                  placeholder="+221 77 000 00 00"
                  className="w-full bg-black border border-white/5 rounded-xl py-3 pl-10 pr-9 text-xs font-mono text-white/80 focus:outline-none focus:border-[#39FF14]/30 transition-all"
                />
                {assets.contact.phones.length > 1 && (
                  <button
                    onClick={() =>
                      updateField(
                        ['contact', 'phones'],
                        assets.contact.phones.filter((_, i) => i !== idx)
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-white/30 hover:text-red-400" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
 
        {/* Logo + Favicon */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Logo — toujours disponible */}
          <div className="space-y-3">
            <Label>Logo_Matrix_Slot</Label>
            <label className="h-44 border border-dashed border-white/10 rounded-2xl bg-white/[0.01] flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-[#39FF14]/20 hover:bg-[#39FF14]/5 transition-all group overflow-hidden">
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={async e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = await handleUpload(file, 'logo');
                  if (url) setLogoUrl(url);
                }}
              />
              {uploadingField === 'logo' ? (
                <Loader2 className="w-6 h-6 text-[#39FF14] animate-spin" />
              ) : logoUrl ? (
                <div className="flex flex-col items-center gap-3 w-full px-6">
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="max-h-20 max-w-full object-contain"
                  />
                  <span className="text-[7px] font-mono text-white/20 uppercase tracking-widest group-hover:text-white/40">
                    Cliquer pour remplacer · max {maxFileSize}MB
                  </span>
                </div>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-white/20 group-hover:text-[#39FF14] transition-colors" />
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] group-hover:text-white transition-colors">
                    Upload_Logo
                  </span>
                  <span className="text-[8px] text-white/20 font-mono">max {maxFileSize}MB</span>
                </>
              )}
            </label>
          </div>
 
          {/* Favicon — BUSINESS+ */}
          <div className="space-y-3">
            <Label>Favicon_Grid_Slot</Label>
            {!isFeatureAllowed(packageType, 'favicon') ? (
              <LockedFeature requiredPlan="BUSINESS">
                <div className="h-44 border border-dashed border-white/10 rounded-2xl flex items-center justify-center">
                  <Globe className="w-6 h-6 text-white/10" />
                </div>
              </LockedFeature>
            ) : (
              <label className="h-44 border border-dashed border-white/10 rounded-2xl bg-white/[0.01] flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-[#39FF14]/20 hover:bg-[#39FF14]/5 transition-all group overflow-hidden">
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const url = await handleUpload(file, 'favicon');
                    if (url) setAssets(prev => ({ ...prev, favicon: url }));
                  }}
                />
                {uploadingField === 'favicon' ? (
                  <Loader2 className="w-6 h-6 text-[#39FF14] animate-spin" />
                ) : assets.favicon ? (
                  <div className="flex flex-col items-center gap-3">
                    <img
                      src={assets.favicon}
                      alt="Favicon"
                      className="w-16 h-16 object-contain"
                    />
                    <span className="text-[7px] font-mono text-white/20 uppercase tracking-widest group-hover:text-white/40">
                      Cliquer pour remplacer
                    </span>
                  </div>
                ) : (
                  <>
                    <Globe className="w-5 h-5 text-white/20 group-hover:text-[#39FF14] transition-colors" />
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] group-hover:text-white transition-colors">
                      Upload_Favicon
                    </span>
                    <span className="text-[8px] text-white/20 font-mono">max {maxFileSize}MB</span>
                  </>
                )}
              </label>
            )}
          </div>
        </div>
      </motion.section>
 
      {/* ══════════════════════════════════════════════════════════════════
          SECTION 03 — NEURAL PALETTE (BUSINESS+)
      ══════════════════════════════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#050505] border border-white/5 rounded-[2.5rem] p-10 lg:p-14 space-y-10"
      >
        <SectionHeader icon={Palette} title="Section_03 // Neural_Palette" badge="ACTIVE" />
 
        {!isFeatureAllowed(packageType, 'colors') ? (
          <LockedFeature requiredPlan="BUSINESS">
            <div className="grid grid-cols-2 gap-8">
              {['Primary_HSL_Protocol', 'Secondary_HSL_Protocol'].map(l => (
                <div key={l} className="space-y-2">
                  <div className="h-3 w-32 bg-white/5 rounded" />
                  <div className="h-12 bg-black border border-white/5 rounded-xl" />
                </div>
              ))}
            </div>
          </LockedFeature>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Couleur primaire */}
            <div className="space-y-3">
              <Label>Primary_HSL_Protocol</Label>
              <div className="relative">
                <input
                  value={assets.colors.primary}
                  onChange={e => updateField(['colors', 'primary'], e.target.value)}
                  placeholder="142 70% 45%"
                  className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-xs text-white/80 focus:outline-none focus:border-[#39FF14]/30 transition-all font-mono pr-12"
                />
                <div
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border border-white/20 shadow-lg transition-all duration-300"
                  style={{ backgroundColor: `hsl(${assets.colors.primary})` }}
                />
              </div>
              <div
                className="h-1.5 rounded-full transition-all duration-300"
                style={{ background: `hsl(${assets.colors.primary})` }}
              />
            </div>
 
            {/* Couleur secondaire */}
            <div className="space-y-3">
              <Label>Secondary_HSL_Protocol</Label>
              <div className="relative">
                <input
                  value={assets.colors.secondary}
                  onChange={e => updateField(['colors', 'secondary'], e.target.value)}
                  placeholder="210 40% 98%"
                  className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-xs text-white/80 focus:outline-none focus:border-[#39FF14]/30 transition-all font-mono pr-12"
                />
                <div
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border border-white/20 shadow-lg transition-all duration-300"
                  style={{ backgroundColor: `hsl(${assets.colors.secondary})` }}
                />
              </div>
              <div
                className="h-1.5 rounded-full transition-all duration-300"
                style={{ background: `hsl(${assets.colors.secondary})` }}
              />
            </div>
 
            {/* Live preview */}
            <div className="md:col-span-2 space-y-3">
              <Label>Live_Preview_Node</Label>
              <div
                className="h-24 rounded-2xl flex items-center px-8 gap-4 border border-white/5 transition-all duration-500"
                style={{
                  background: `linear-gradient(135deg, hsl(${assets.colors.primary}) 0%, hsl(${assets.colors.secondary}) 100%)`
                }}
              >
                <div className="text-black/70 font-black text-sm uppercase tracking-widest font-mono truncate">
                  {companyName || 'BRAND_PREVIEW'}
                </div>
                <div className="ml-auto text-black/40 text-[9px] font-mono uppercase tracking-wider shrink-0">
                  {packageType}_NODE
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.section>
 
      {/* ══════════════════════════════════════════════════════════════════
          SECTION 04 — SEO & META KERNEL
      ══════════════════════════════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-[#050505] border border-white/5 rounded-[2.5rem] p-10 lg:p-14 space-y-10"
      >
        <SectionHeader icon={Globe} title="Section_04 // SEO_Meta_Kernel" badge="ACTIVE" />
 
        {/* Description SEO — ENTERPRISE+ */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Meta_Description_Core</Label>
            {isFeatureAllowed(packageType, 'seo') && (
              <button
                onClick={handleNeuralGen}
                disabled={generatingMeta}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#39FF14]/5 border border-[#39FF14]/10 text-[9px] font-black text-[#39FF14] hover:bg-[#39FF14]/10 transition-all disabled:opacity-50 group"
              >
                {generatingMeta ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 group-hover:scale-125 transition-transform" />
                )}
                <span className="tracking-[0.2em]">
                  {generatingMeta ? 'GENERATING...' : 'NEURAL_AUTO_GEN'}
                </span>
              </button>
            )}
          </div>
 
          {!isFeatureAllowed(packageType, 'seo') ? (
            <LockedFeature requiredPlan="ENTERPRISE">
              <textarea className="w-full bg-black border border-white/5 rounded-2xl px-6 py-5 h-32 text-xs font-mono text-white/80 resize-none" readOnly />
            </LockedFeature>
          ) : (
            <textarea
              value={assets.meta.description}
              onChange={e => updateField(['meta', 'description'], e.target.value)}
              placeholder="Description SEO de l'entreprise (générée automatiquement ou saisie manuelle)..."
              className="w-full bg-black border border-white/5 rounded-2xl px-6 py-5 text-xs text-white/80 focus:outline-none focus:border-[#39FF14]/30 transition-all font-mono h-32 resize-none leading-relaxed"
            />
          )}
        </div>
 
        {/* Topbar messages — BUSINESS+ */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Top_Bar_Messages_Array</Label>
            {isFeatureAllowed(packageType, 'topbar') && assets.meta.topbar.length < 5 && (
              <button
                onClick={() =>
                  updateField(['meta', 'topbar'], [...assets.meta.topbar, ''])
                }
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-[#39FF14]/10 hover:text-[#39FF14] text-white/40 transition-all border border-white/5"
              >
                <Plus className="w-3 h-3" />
                <span className="text-[8px] font-black uppercase tracking-widest">Add_Message</span>
              </button>
            )}
          </div>
 
          {!isFeatureAllowed(packageType, 'topbar') ? (
            <LockedFeature requiredPlan="BUSINESS">
              <div className="h-12 bg-black border border-white/5 rounded-xl" />
            </LockedFeature>
          ) : assets.meta.topbar.length === 0 ? (
            <p className="text-[9px] font-mono text-white/20 italic py-4">
              Aucun message — cliquer Add_Message pour en ajouter
            </p>
          ) : (
            <div className="space-y-3">
              {assets.meta.topbar.map((msg, idx) => (
                <div key={idx} className="relative group">
                  <input
                    value={msg}
                    onChange={e => {
                      const updated = [...assets.meta.topbar];
                      updated[idx]  = e.target.value;
                      updateField(['meta', 'topbar'], updated);
                    }}
                    placeholder={`Message bannière ${idx + 1}...`}
                    className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-xs font-mono text-white/80 focus:outline-none focus:border-[#39FF14]/30 transition-all pr-10"
                  />
                  <button
                    onClick={() =>
                      updateField(
                        ['meta', 'topbar'],
                        assets.meta.topbar.filter((_, i) => i !== idx)
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-white/30 hover:text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.section>
 
      {/* ── Bouton save fixe ──────────────────────────────────────────────── */}
      <motion.button
        whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(57,255,20,0.3)' }}
        whileTap={{ scale: 0.95 }}
        onClick={handleSave}
        disabled={saving}
        className="fixed bottom-10 right-10 z-[100] flex items-center gap-4 px-8 py-5 rounded-2xl bg-[#39FF14] text-black font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(57,255,20,0.2)] transition-all disabled:opacity-50 disabled:grayscale"
      >
        {saving ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : saved ? (
          <CheckCircle2 className="w-5 h-5" />
        ) : (
          <Save className="w-5 h-5" />
        )}
        <span className="text-[11px] font-mono">
          {saving ? 'SYNCING...' : saved ? 'SAVED ✓' : 'Save_Branding_Core'}
        </span>
      </motion.button>
 
    </div>
  );
}
