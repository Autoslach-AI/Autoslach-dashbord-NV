"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight, Check, FileText, Calendar, DollarSign, Pencil } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [queryId, setQueryId] = useState('');
  const [queryName, setQueryName] = useState('');
  const [searching, setSearching] = useState(false);
  const [prospect, setProspect] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [edits, setEdits] = useState<any>({});
  const [editingName, setEditingName] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [expandedField, setExpandedField] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!queryId.trim() || !queryName.trim()) {
      setError('Les 2 champs sont obligatoires — ID et Nom de l\'entreprise.');
      return;
    }
    setSearching(true);
    setError('');
    setProspect(null);

    const res = await fetch(`/api/admin/prospect/search?id=${encodeURIComponent(queryId)}&name=${encodeURIComponent(queryName)}`);
    const data = await res.json();

    if (data.prospect) {
      setProspect(data.prospect);
      setTemplate(data.template || null);
      setEdits({
        name: data.prospect.name,
        sector: data.prospect.sector,
        region: data.prospect.region,
        custom_notes: data.prospect.custom_notes || ''
      });
      setStep(2);
    } else {
      setError('Aucun prospect trouvé. Vérifiez l\'ID ET le nom — les 2 doivent correspondre.');
    }
    setSearching(false);
  };

  const handleSync = async () => {
    setSaving(true);
    await fetch(`/api/admin/prospect/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enterprise_id: prospect.enterprise_id,
        ...edits
      })
    });
    setStep(3);
    setTimeout(() => {
      router.push(`/admin/system/${prospect.enterprise_id}`);
    }, 1500);
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

  const assets = prospect?.assets_urls
    ? (typeof prospect.assets_urls === 'string'
      ? JSON.parse(prospect.assets_urls)
      : prospect.assets_urls)
    : [];

  // Extraire rendez-vous depuis message ELITE
  const extractRdv = (message: string) => {
    if (!message) return null;
    const match = message.match(/Rendez-vous\s*:\s*(.+)/i);
    return match ? match[1].trim() : null;
  };

  const extractBudget = (message: string) => {
    if (!message) return null;
    const match = message.match(/Budget\s*:\s*([^\n]+)/i);
    return match ? match[1].trim() : null;
  };

  const rdv = prospect?.package_type === 'ELITE' ? extractRdv(prospect?.message) : null;

  const budgetFromMessage = prospect?.package_type === 'ELITE' 
    ? extractBudget(prospect?.message) 
    : null;

  return (
    <div className="min-h-screen bg-[#080808] text-white flex items-center justify-center p-8">
      <div className="w-full max-w-2xl">

        {/* HEADER */}
        <div className="mb-12 text-center">
          <p className="text-[10px] font-mono text-[#10B981] uppercase tracking-[0.4em] mb-3">Autoslash AI · Oracle</p>
          <h1 className="text-[28px] font-black uppercase tracking-tight text-white mb-2">Synchronisation Système</h1>
          <p className="text-[11px] text-white/30 font-mono">Connecter un prospect signé à Dashboard 2</p>
        </div>

        {/* PROGRESS */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {['RECHERCHE', 'VÉRIFICATION', 'SYNC'].map((label, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                step > i + 1 ? 'bg-[#10B981] text-black' :
                step === i + 1 ? 'bg-[#10B981]/20 border border-[#10B981] text-[#10B981]' :
                'bg-white/5 border border-white/10 text-white/20'
              }`}>
                {step > i + 1 ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest ${step === i + 1 ? 'text-white' : 'text-white/20'}`}>
                {label}
              </span>
              {i < 2 && <div className="w-8 h-px bg-white/10" />}
            </div>
          ))}
        </div>

        {/* ÉTAPE 1 — RECHERCHE */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="text"
                  value={queryId}
                  onChange={(e) => setQueryId(e.target.value)}
                  placeholder="ID prospect — ex: AS-B-2026-0001"
                  className="w-full bg-[#111] border border-white/10 rounded-xl pl-12 pr-4 py-4 text-[12px] font-mono text-white focus:border-[#10B981]/40 outline-none transition-all"
                />
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="text"
                  value={queryName}
                  onChange={(e) => setQueryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Nom de l'entreprise — ex: Flow AI"
                  className="w-full bg-[#111] border border-white/10 rounded-xl pl-12 pr-4 py-4 text-[12px] font-mono text-white focus:border-[#10B981]/40 outline-none transition-all"
                />
              </div>
            </div>
            {error && <p className="text-[10px] text-red-400 font-mono text-center">{error}</p>}
            <button
              onClick={handleSearch}
              disabled={searching || !queryId.trim() || !queryName.trim()}
              className="w-full py-4 bg-[#10B981] text-black font-black text-[11px] uppercase tracking-[0.2em] rounded-xl hover:bg-[#0ea572] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {searching ? 'RECHERCHE EN COURS...' : 'SCANNER LE PROSPECT'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ÉTAPE 2 — VÉRIFICATION */}
        {step === 2 && prospect && (
          <div className="space-y-5">

            {/* HEADER PROSPECT */}
            <div className="flex items-center justify-between p-4 bg-[#111] border border-white/5 rounded-xl">
              <div>
                <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest mb-1">{prospect.project_id}</p>
                <p className="text-[18px] font-black text-white uppercase">{prospect.name}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                  style={{
                    backgroundColor: `${getPlanColor(prospect.package_type)}20`,
                    color: getPlanColor(prospect.package_type),
                    border: `1px solid ${getPlanColor(prospect.package_type)}40`
                  }}>
                  {prospect.package_type}
                </span>
                <span className="text-[9px] font-mono text-white/30">
                  {new Date(prospect.created_at).toLocaleDateString('fr-FR', {
                    day: '2-digit', month: 'long', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>
            </div>

            {/* INFOS NON EDITABLES / EDITABLES CRAYON */}
            <div className="grid grid-cols-2 gap-2">
              {/* NAME — éditable au crayon */}
              <div className="p-3 bg-[#111] border border-white/5 rounded-lg col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Entreprise</p>
                  <button onClick={() => setEditingName(!editingName)} className="text-[#10B981]/40 hover:text-[#10B981] transition-all">
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
                {editingName
                  ? <input 
                      type="text" 
                      value={edits.name || ''} 
                      onChange={(e) => setEdits({...edits, name: e.target.value})} 
                      onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
                      className="w-full bg-black border border-[#10B981]/30 rounded px-2 py-1 text-[11px] font-mono text-white outline-none" 
                    />
                  : <p className="text-[11px] font-mono text-white/60">{edits.name || '—'}</p>
                }
              </div>

              {/* CONTACT — éditable au crayon */}
              <div className="p-3 bg-[#111] border border-white/5 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Contact</p>
                  <button onClick={() => setEditingContact(!editingContact)} className="text-[#10B981]/40 hover:text-[#10B981] transition-all">
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
                {editingContact
                  ? <input 
                      type="text" 
                      value={edits.contact_name || ''} 
                      onChange={(e) => setEdits({...edits, contact_name: e.target.value})} 
                      onKeyDown={(e) => e.key === 'Enter' && setEditingContact(false)}
                      className="w-full bg-black border border-[#10B981]/30 rounded px-2 py-1 text-[11px] font-mono text-white outline-none" 
                    />
                  : <p className="text-[11px] font-mono text-white/60">{prospect.contact_name || '—'}</p>
                }
              </div>

              {/* EMAIL — lecture seule */}
              <div className="p-3 bg-[#111] border border-white/5 rounded-lg">
                <p className="text-[8px] font-black uppercase tracking-widest text-white/30 mb-1">Email</p>
                <p className="text-[11px] font-mono text-white/60">{prospect.email || '—'}</p>
              </div>

              {/* TÉLÉPHONE — lecture seule */}
              <div className="p-3 bg-[#111] border border-white/5 rounded-lg">
                <p className="text-[8px] font-black uppercase tracking-widest text-white/30 mb-1">Téléphone</p>
                <p className="text-[11px] font-mono text-white/60">{prospect.phone || '—'}</p>
              </div>

              <div className="p-3 bg-[#111] border border-white/5 rounded-lg">
                <p className="text-[8px] font-black uppercase tracking-widest text-white/30 mb-1">Secteur</p>
                <p className="text-[10px] font-mono text-white/60">{prospect.sector || '—'}</p>
              </div>

              <div className="p-3 bg-[#111] border border-white/5 rounded-lg">
                <p className="text-[8px] font-black uppercase tracking-widest text-white/30 mb-1">Région</p>
                <p className="text-[10px] font-mono text-white/60">{prospect.region || '—'}</p>
              </div>
            </div>

            {/* ELITE — BUDGET + RDV */}
            {prospect.package_type === 'ELITE' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-[#F59E0B]/5 border border-[#F59E0B]/20 rounded-lg flex items-center gap-3">
                  <DollarSign className="w-4 h-4 text-[#F59E0B]" />
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-[#F59E0B]/60 mb-1">Budget</p>
                    <p className="text-[11px] font-black text-[#F59E0B]">
                      {prospect.monthly_cost > 0
                        ? new Intl.NumberFormat('fr-FR').format(prospect.monthly_cost) + ' FCFA'
                        : budgetFromMessage || '—'}
                    </p>
                  </div>
                </div>
                {rdv && (
                  <div className="p-3 bg-[#F59E0B]/5 border border-[#F59E0B]/20 rounded-lg flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-[#F59E0B]" />
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-[#F59E0B]/60 mb-1">Rendez-vous</p>
                      <p className="text-[11px] font-black text-[#F59E0B]">{rdv}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TEMPLATE choisi — sauf ELITE et CONTACT */}
            {template && prospect.package_type !== 'ELITE' && (
              <div className="p-3 bg-[#111] border border-white/5 rounded-lg space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Template choisi</p>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-white">{template.title}</p>
                  <p className="text-[11px] font-black text-[#10B981]">
                    {new Intl.NumberFormat('fr-FR').format(template.price_fcfa)} FCFA
                  </p>
                </div>
                {template.preview_url && (
                  <a href={template.preview_url} target="_blank" rel="noopener noreferrer"
                    className="text-[9px] font-mono text-[#10B981]/60 hover:text-[#10B981] transition-all truncate block"
                  >
                    🔗 {template.preview_url}
                  </a>
                )}
              </div>
            )}

            {expandedField && (
              <div 
                className="fixed inset-0 bg-black/70 z-40"
                onClick={() => setExpandedField(null)}
              />
            )}

            {/* MESSAGE */}
            {prospect.message && (
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/30">Message du prospect</label>
                <div
                  onClick={() => setExpandedField(expandedField === 'message' ? null : 'message')}
                  className={`bg-[#111] border border-white/5 rounded-lg p-3 cursor-pointer hover:border-white/10 transition-all ${expandedField === 'message' ? 'fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[480px] h-[55vh] z-50 overflow-y-auto rounded-xl shadow-2xl border border-white/10 bg-[#111] p-5' : 'max-h-24 overflow-hidden'}`}
                >
                  {expandedField === 'message' && (
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Message du prospect</p>
                      <span className="text-[9px] text-white/30">✕ Cliquer pour fermer</span>
                    </div>
                  )}
                  <p className="text-[10px] font-mono text-white/50 leading-relaxed whitespace-pre-wrap">{prospect.message}</p>
                </div>
              </div>
            )}

            {/* FICHIERS */}
            {assets.length > 0 && (
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/30">
                  Fichiers joints ({assets.length})
                </label>
                <div className="space-y-1">
                  {assets.map((url: string, i: number) => {
                    const filename = decodeURIComponent(url.split('/').pop() || '');
                    const ext = filename.split('.').pop()?.toLowerCase();
                    const isImage = ['png', 'jpg', 'jpeg', 'webp'].includes(ext || '');
                    const isPdf = ext === 'pdf';
                    const isVideo = ext === 'mp4';
                    const isDoc = ['docx', 'doc', 'xlsx', 'xls', 'csv'].includes(ext || '');
                    
                    const icon = isPdf ? '📄' : isImage ? '🖼️' : isVideo ? '🎬' : isDoc ? '📝' : '📎';
                    
                    return (
                      <div key={i} className="flex items-center gap-2 p-2 bg-[#111] border border-white/5 rounded-lg">
                        <span className="text-[14px]">{icon}</span>
                        <span className="text-[10px] font-mono text-white/40 truncate flex-1">{filename}</span>
                        {isDoc ? (
                          <a href={url} download={filename}
                            className="text-[9px] font-black uppercase tracking-widest text-[#10B981] hover:text-white transition-all px-2 py-1 border border-[#10B981]/20 rounded"
                          >
                            ↓ Télécharger
                          </a>
                        ) : (
                          <a href={url} target="_blank" rel="noopener noreferrer"
                            className="text-[9px] font-black uppercase tracking-widest text-[#10B981] hover:text-white transition-all px-2 py-1 border border-[#10B981]/20 rounded"
                          >
                            → Ouvrir
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* NOTES INTERNES */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-black uppercase tracking-widest text-[#10B981]">Notes internes</label>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setEditingNotes(!editingNotes)}
                    className="text-[#10B981]/40 hover:text-[#10B981] transition-all"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setExpandedField(expandedField === 'notes' ? null : 'notes')}
                    className="text-white/20 hover:text-white/60 transition-all text-[10px]"
                  >
                    ⤢
                  </button>
                </div>
              </div>
              <textarea
                value={edits.custom_notes || ''}
                onChange={(e) => setEdits({...edits, custom_notes: e.target.value})}
                onKeyDown={(e) => e.key === 'Enter' && setEditingNotes(false)}
                placeholder="Notes internes sur ce prospect..."
                readOnly={!editingNotes}
                className={`w-full bg-[#111] border rounded-lg px-3 py-2 text-[11px] font-mono text-white/70 outline-none resize-none transition-all
                  ${editingNotes ? 'border-[#10B981]/40' : 'border-white/5 cursor-default'}
                  ${expandedField === 'notes' 
                    ? 'fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[480px] h-[55vh] z-50 rounded-xl shadow-2xl border border-[#10B981]/20 bg-[#111] px-4 py-4' 
                    : ''}`}
                rows={3}
              />
            </div>

            {/* ACTIONS */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all"
              >
                RETOUR
              </button>
              <button
                onClick={handleSync}
                disabled={saving}
                className="flex-1 py-3 bg-[#10B981] text-black font-black text-[11px] uppercase tracking-[0.2em] rounded-xl hover:bg-[#0ea572] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {saving ? 'SYNCHRONISATION...' : 'OUVRIR LE SYSTÈME CLIENT'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ÉTAPE 3 — SYNC */}
        {step === 3 && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-[#10B981]" />
            </div>
            <div>
              <h2 className="text-[20px] font-black text-white uppercase mb-2">Système Synchronisé</h2>
              <p className="text-[11px] font-mono text-white/30">Redirection vers Dashboard 2...</p>
            </div>
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#10B981] rounded-full" style={{ width: '100%' }} />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
