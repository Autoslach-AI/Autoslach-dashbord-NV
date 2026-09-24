"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Calendar, DollarSign, Check, Upload, Pencil, Trash2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase';
const supabase = createClient();

export default function ProfilePage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id as string;
  const logoInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [enterprise, setEnterprise] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null); // 'message' | 'notes' | 'logo' | 'avatar'

  useEffect(() => {
    if (!id) return;
    async function fetchData() {
      const res = await fetch(`/api/admin/enterprise/${id}`);
      const { enterprise } = await res.json();
      setEnterprise(enterprise);
      setNotes(enterprise?.custom_notes || '');
      setLogoUrl(enterprise?.logo_url || null);
      setAvatarUrl(enterprise?.avatar_url || null);
      if (enterprise?.template_id) {
        const tRes = await fetch(`/api/admin/template/${enterprise.template_id}`);
        const { template } = await tRes.json();
        setTemplate(template);
      }
      setLoading(false);
    }
    fetchData();
  }, [id]);

  const uploadImage = async (file: File, type: 'logo' | 'avatar') => {
    const ext = file.name.split('.').pop();
    const path = `${type}s/${id}_${type}.${ext}`;
    const { error } = await supabase.storage
      .from('enterprise-assets')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) return null;
    const { data } = supabase.storage.from('enterprise-assets').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const url = await uploadImage(file, 'logo');
    if (url) {
      setLogoUrl(url);
      await fetch('/api/admin/prospect/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enterprise_id: id, logo_url: url })
      });
    }
    setUploadingLogo(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const url = await uploadImage(file, 'avatar');
    if (url) {
      setAvatarUrl(url);
      await fetch('/api/admin/prospect/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enterprise_id: id, avatar_url: url })
      });
    }
    setUploadingAvatar(false);
  };

  const handleDeleteLogo = async () => {
    setLogoUrl(null);
    await fetch('/api/admin/prospect/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enterprise_id: id, logo_url: null })
    });
  };

  const handleDeleteAvatar = async () => {
    setAvatarUrl(null);
    await fetch('/api/admin/prospect/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enterprise_id: id, avatar_url: null })
    });
  };

  const handleActivate = async () => {
    setActivating(true);
    await fetch('/api/admin/enterprise/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enterprise_id: id })
    });
    setActivated(true);
    setActivating(false);
    setEnterprise({ ...enterprise, status: 'ACTIVE', activated_at: new Date().toISOString() });
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    await fetch('/api/admin/prospect/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enterprise_id: id, custom_notes: notes })
    });
    setSavingNotes(false);
    setEditingNotes(false);
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

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE': return '#10B981';
      case 'PROSPECT': return '#F59E0B';
      case 'WARNING': return '#F59E0B';
      case 'CRITICAL': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const extractRdv = (msg: string) => msg?.match(/Rendez-vous\s*:\s*(.+)/i)?.[1]?.trim() || null;
  const extractBudget = (msg: string) => msg?.match(/Budget\s*:\s*([^\n]+)/i)?.[1]?.trim() || null;

  const assets = enterprise?.assets_urls
    ? (typeof enterprise.assets_urls === 'string' ? JSON.parse(enterprise.assets_urls) : enterprise.assets_urls)
    : [];

  const rdv = enterprise?.package_type === 'ELITE' ? extractRdv(enterprise?.message) : null;
  const budgetFromMessage = enterprise?.package_type === 'ELITE' ? extractBudget(enterprise?.message) : null;
  const initials = enterprise?.name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || '??';
  const contactInitials = enterprise?.contact_name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || '??';
  const isProspect = enterprise?.status === 'PROSPECT';
  const daysSince = enterprise?.created_at
    ? Math.floor((Date.now() - new Date(enterprise.created_at).getTime()) / 86400000)
    : 0;

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-white/5 border-t-[#10B981] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-8">
      <div className="max-w-3xl mx-auto space-y-4">

        {/* ── BLOC 1 — HEADER ENTREPRISE ── */}
        <div className="bg-[#111] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center gap-6">

            {/* LOGO ENTREPRISE */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <div
                className="w-16 h-16 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden cursor-pointer group relative"
                style={{ backgroundColor: `${getPlanColor(enterprise?.package_type)}15` }}
                onClick={() => zoom === 'logo' ? setZoom(null) : (logoUrl ? setZoom('logo') : logoInputRef.current?.click())}
              >
                {logoUrl
                  ? <img src={logoUrl} alt="logo" className="w-full h-full object-cover" />
                  : <span className="text-[18px] font-black" style={{ color: getPlanColor(enterprise?.package_type) }}>{initials}</span>
                }
                {!logoUrl && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center rounded-xl">
                    {uploadingLogo ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload className="w-4 h-4 text-white" />}
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                <button onClick={() => logoInputRef.current?.click()} className="text-[8px] font-black uppercase tracking-widest text-white/20 hover:text-[#10B981] transition-all px-2 py-1 border border-white/5 rounded">
                  {uploadingLogo ? '...' : 'Upload'}
                </button>
                {logoUrl && (
                  <button onClick={handleDeleteLogo} className="text-[8px] font-black uppercase tracking-widest text-white/20 hover:text-red-400 transition-all px-2 py-1 border border-white/5 rounded">
                    Del
                  </button>
                )}
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </div>

            {/* INFOS ENTREPRISE */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest">{enterprise?.project_id}</p>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase"
                  style={{ backgroundColor: `${getPlanColor(enterprise?.package_type)}20`, color: getPlanColor(enterprise?.package_type), border: `1px solid ${getPlanColor(enterprise?.package_type)}40` }}>
                  {enterprise?.package_type}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase"
                  style={{ backgroundColor: `${getStatusColor(enterprise?.status)}10`, color: getStatusColor(enterprise?.status), border: `1px solid ${getStatusColor(enterprise?.status)}30` }}>
                  {enterprise?.status}
                </span>
              </div>
              <h1 className="text-[22px] font-black text-white uppercase tracking-tight">{enterprise?.name}</h1>
              <p className="text-[10px] font-mono text-white/30 mt-1">{enterprise?.sector} · {enterprise?.region}</p>
            </div>

            {/* BOUTON ACTIVER */}
            {isProspect && !activated && (
              <button onClick={handleActivate} disabled={activating}
                className="px-5 py-3 bg-[#10B981] text-black font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-[#0ea572] transition-all disabled:opacity-40 flex-shrink-0">
                {activating ? 'ACTIVATION...' : 'ACTIVER LE CLIENT'}
              </button>
            )}
            {(activated || enterprise?.status === 'ACTIVE') && (
              <div className="flex items-center gap-2 px-4 py-2 bg-[#10B981]/10 border border-[#10B981]/20 rounded-xl flex-shrink-0">
                <Check className="w-4 h-4 text-[#10B981]" />
                <span className="text-[10px] font-black text-[#10B981] uppercase">Actif</span>
              </div>
            )}
          </div>
        </div>

        {/* ── BLOC 2 — CONTACT ── */}
        <div className="bg-[#111] border border-white/5 rounded-2xl p-6">
          <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-4">Contact</p>
          <div className="flex items-start gap-6">

            {/* AVATAR CONTACT */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <div
                className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center overflow-hidden cursor-pointer group relative bg-[#1a1a1a]"
                onClick={() => zoom === 'avatar' ? setZoom(null) : (avatarUrl ? setZoom('avatar') : avatarInputRef.current?.click())}
              >
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  : <span className="text-[14px] font-black text-white/40">{contactInitials}</span>
                }
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center rounded-full">
                  {uploadingAvatar ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload className="w-3 h-3 text-white" />}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => avatarInputRef.current?.click()} className="text-[8px] font-black uppercase tracking-widest text-white/20 hover:text-[#10B981] transition-all px-2 py-1 border border-white/5 rounded">
                  {uploadingAvatar ? '...' : 'Upload'}
                </button>
                {avatarUrl && (
                  <button onClick={handleDeleteAvatar} className="text-[8px] font-black uppercase tracking-widest text-white/20 hover:text-red-400 transition-all px-2 py-1 border border-white/5 rounded">
                    Del
                  </button>
                )}
              </div>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>

            {/* INFOS CONTACT */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 flex-1">
              {[
                { label: 'Nom contact', value: enterprise?.contact_name },
                { label: 'Email', value: enterprise?.email },
                { label: 'Téléphone', value: enterprise?.phone },
                { label: 'Secteur', value: enterprise?.sector },
                { label: 'Région', value: enterprise?.region },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/20 mb-1">{label}</p>
                  <p className="text-[11px] font-mono text-white/70">{value || '—'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── BLOC 3 — TIMELINE ── */}
        <div className="bg-[#111] border border-white/5 rounded-2xl p-5">
          <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-4">Timeline</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Date soumission', value: enterprise?.created_at ? new Date(enterprise.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
              { label: 'Date activation', value: enterprise?.activated_at ? new Date(enterprise.activated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
              { label: 'Jours depuis soumission', value: `${daysSince} jours` },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[8px] font-black uppercase tracking-widest text-white/20 mb-1">{label}</p>
                <p className="text-[12px] font-mono text-white/70">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── BLOC 4 — COMMANDE ── */}
        {enterprise?.package_type === 'ELITE' ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-[#F59E0B]/5 border border-[#F59E0B]/20 rounded-2xl flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-[#F59E0B] flex-shrink-0" />
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest text-[#F59E0B]/60 mb-1">Budget</p>
                <p className="text-[13px] font-black text-[#F59E0B]">
                  {enterprise?.monthly_cost > 0 ? new Intl.NumberFormat('fr-FR').format(enterprise.monthly_cost) + ' FCFA' : budgetFromMessage || '—'}
                </p>
              </div>
            </div>
            {rdv && (
              <div className="p-4 bg-[#F59E0B]/5 border border-[#F59E0B]/20 rounded-2xl flex items-center gap-3">
                <Calendar className="w-5 h-5 text-[#F59E0B] flex-shrink-0" />
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-[#F59E0B]/60 mb-1">Rendez-vous</p>
                  <p className="text-[13px] font-black text-[#F59E0B]">{rdv}</p>
                </div>
              </div>
            )}
          </div>
        ) : template ? (
          <div className="bg-[#111] border border-white/5 rounded-2xl p-5 space-y-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Template choisi</p>
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-black text-white">{template.title}</p>
              <p className="text-[13px] font-black text-[#10B981]">{new Intl.NumberFormat('fr-FR').format(template.price_fcfa)} FCFA</p>
            </div>
            {template.preview_url && (
              <a href={template.preview_url} target="_blank" rel="noopener noreferrer"
                className="text-[9px] font-mono text-[#10B981]/60 hover:text-[#10B981] transition-all block truncate">
                🔗 {template.preview_url}
              </a>
            )}
          </div>
        ) : null}

        {/* ── BLOC 5 — MESSAGE (zoom au clic) ── */}
        {enterprise?.message && (
          <div className="bg-[#111] border border-white/5 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Message du prospect</p>
              <button onClick={() => setZoom(zoom === 'message' ? null : 'message')}
                className="text-[9px] text-white/20 hover:text-white/60 transition-all">⤢</button>
            </div>
            <p className="text-[10px] font-mono text-white/50 leading-relaxed whitespace-pre-wrap max-h-24 overflow-hidden cursor-pointer"
              onClick={() => setZoom(zoom === 'message' ? null : 'message')}>
              {enterprise.message}
            </p>
          </div>
        )}

        {/* ── BLOC 6 — FICHIERS ── */}
        {assets.length > 0 && (
          <div className="bg-[#111] border border-white/5 rounded-2xl p-5 space-y-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Fichiers joints ({assets.length})</p>
            <div className="space-y-1">
              {assets.map((url: string, i: number) => {
                const filename = decodeURIComponent(url.split('/').pop() || '');
                const ext = filename.split('.').pop()?.toLowerCase();
                const isDoc = ['docx','doc','xlsx','xls'].includes(ext||'');
                const icon = ext==='pdf'?'📄':['png','jpg','jpeg','webp'].includes(ext||'')?'🖼️':ext==='mp4'?'🎬':'📝';
                return (
                  <div key={i} className="flex items-center gap-2 p-2 bg-black/30 border border-white/5 rounded-lg">
                    <span>{icon}</span>
                    <span className="text-[10px] font-mono text-white/40 truncate flex-1">{filename}</span>
                    <a href={url} target={isDoc?'_self':'_blank'} download={isDoc?filename:undefined} rel="noopener noreferrer"
                      className="text-[9px] font-black text-[#10B981] hover:text-white transition-all px-2 py-1 border border-[#10B981]/20 rounded uppercase">
                      {isDoc?'↓':'→'}
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── BLOC 7 — NOTES INTERNES ── */}
        <div className="bg-[#111] border border-white/5 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Notes internes</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setZoom(zoom === 'notes' ? null : 'notes')}
                className="text-[9px] text-white/20 hover:text-white/60 transition-all">⤢</button>
              {editingNotes && (
                <button onClick={handleSaveNotes} disabled={savingNotes}
                  className="px-3 py-1 bg-[#10B981] text-black font-black text-[9px] uppercase tracking-widest rounded-lg disabled:opacity-40">
                  {savingNotes ? '...' : 'SAUVEGARDER'}
                </button>
              )}
              <button onClick={() => setEditingNotes(!editingNotes)}
                className="text-white/20 hover:text-[#10B981] transition-all">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {editingNotes ? (
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
              className="w-full bg-black border border-[#10B981]/20 rounded-lg px-3 py-2 text-[11px] font-mono text-white/70 focus:border-[#10B981]/40 outline-none resize-none" />
          ) : (
            <p className="text-[10px] font-mono text-white/40 leading-relaxed cursor-pointer"
              onClick={() => setZoom(zoom === 'notes' ? null : 'notes')}>
              {notes || 'Aucune note — cliquer sur le crayon pour ajouter'}
            </p>
          )}
        </div>

      </div>

      {/* ── OVERLAY ZOOM ── */}
      {zoom && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8"
          onClick={() => setZoom(null)}>
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-xl max-h-[70vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/30">
                {zoom === 'message' ? 'Message du prospect' : zoom === 'notes' ? 'Notes internes' : zoom === 'logo' ? 'Logo entreprise' : 'Photo contact'}
              </p>
              <button onClick={() => setZoom(null)} className="text-white/20 hover:text-white transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            {zoom === 'message' && (
              <p className="text-[11px] font-mono text-white/60 leading-relaxed whitespace-pre-wrap">{enterprise?.message}</p>
            )}
            {zoom === 'notes' && (
              editingNotes ? (
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={10}
                  className="w-full bg-black border border-[#10B981]/20 rounded-lg px-3 py-2 text-[11px] font-mono text-white/70 focus:border-[#10B981]/40 outline-none resize-none" />
              ) : (
                <p className="text-[11px] font-mono text-white/60 leading-relaxed">{notes || 'Aucune note'}</p>
              )
            )}
            {(zoom === 'logo' || zoom === 'avatar') && (
              <img
                src={zoom === 'logo' ? logoUrl! : avatarUrl!}
                alt={zoom}
                className="w-full h-auto rounded-xl object-contain max-h-[50vh]"
              />
            )}
          </div>
        </div>
      )}

    </div>
  );
}
