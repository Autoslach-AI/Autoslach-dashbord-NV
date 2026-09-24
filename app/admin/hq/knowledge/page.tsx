"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Zap, LayoutDashboard, Users, ArrowLeft,
  Library, Plus, Upload, PenLine, Trash2, X, FileText,
  Loader2, AlertCircle, Eye, Code2, Download, Globe, Lock,
  Save
} from 'lucide-react';
import { useUser } from '@/lib/contexts/user-context';
import DoubleRibbonIntelligent, { NavItem } from '@/components/DoubleRibbonIntelligent';

// ─── Types ───────────────────────────────────────────────────────────────────

type SourceAgent = 'axon' | 'business' | 'commercial';
type Visibility = 'shared' | 'private';
type SourceFilter = 'all' | SourceAgent;

interface KBDocument {
  id:            string;
  source_agent:  SourceAgent;
  visibility:    Visibility;
  name:          string;
  category:      string | null;
  content:       string;
  storage_path:  string | null;
  file_url:      string | null;
  created_at:    string;
  deleted_at?:   string | null;
}

const SOURCE_META: Record<SourceAgent, { label: string; color: string }> = {
  axon:       { label: 'AXON',       color: '#39FF14' },
  business:   { label: 'BUSINESS',   color: '#3b82f6' },
  commercial: { label: 'COMMERCIAL', color: '#a855f7' },
};

const FILTER_TABS: Array<{ id: SourceFilter; label: string }> = [
  { id: 'all',        label: 'Tout' },
  { id: 'axon',       label: 'AXON' },
  { id: 'business',   label: 'BUSINESS' },
  { id: 'commercial', label: 'COMMERCIAL' },
];

// ─── Rendu Markdown minimal (repris de la page settings, sans dépendance) ─────

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const token = match[0];
    if (token.startsWith('**')) {
      parts.push(<strong key={`${keyPrefix}-b-${i}`} className="font-bold text-white">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`')) {
      parts.push(
        <code key={`${keyPrefix}-c-${i}`} className="bg-white/10 text-cyan-300 px-1.5 py-0.5 rounded text-[11px] font-mono">
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
          <li key={`${key}-${idx}`} className="flex items-start gap-2 text-[13px] text-white/70 leading-relaxed" style={{ marginLeft: item.indent * 20 }}>
            <span className="text-cyan-400/60 mt-1.5 shrink-0">•</span>
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

export default function KnowledgeBasePage() {
  const router = useRouter();
  const { user, profile } = useUser();

  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  // On récupère toujours en tant qu'axon (vision complète, admin) — le filtre
  // ci-dessus est purement un affichage, pas une restriction d'accès.
  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/hq/knowledge?agent_id=axon');
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setDocuments(json.data ?? []);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement de la base de connaissances.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const filteredDocuments = sourceFilter === 'all'
    ? documents
    : documents.filter(d => d.source_agent === sourceFilter || d.visibility === 'shared');

  // ── Ajout d'un document ────────────────────────────────────────────────────
  const [addOpen,   setAddOpen]   = useState(false);
  const [addMode,   setAddMode]   = useState<'file' | 'manual'>('manual');
  const [addForm,   setAddForm]   = useState({ source_agent: 'axon' as SourceAgent, visibility: 'shared' as Visibility, name: '', category: '', content: '' });
  const [addFile,   setAddFile]   = useState<File | null>(null);
  const [savingAdd, setSavingAdd] = useState(false);
  const addFileInputRef = useRef<HTMLInputElement>(null);

  const resetAddForm = () => {
    setAddForm({ source_agent: 'axon', visibility: 'shared', name: '', category: '', content: '' });
    setAddFile(null);
    setAddMode('manual');
  };

  const handleAddFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAddFile(file);
    if (!addForm.name) {
      setAddForm(prev => ({ ...prev, name: file.name.replace(/\.[^/.]+$/, '') }));
    }
  };

  const handleAddDocument = async () => {
    const isFileMode = addMode === 'file';
    if (isFileMode && !addFile) return;
    if (!isFileMode && (!addForm.name.trim() || !addForm.content.trim())) return;

    setSavingAdd(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('source_agent', addForm.source_agent);
      formData.append('visibility', addForm.visibility);
      if (addForm.name.trim()) formData.append('name', addForm.name.trim());
      if (addForm.category.trim()) formData.append('category', addForm.category.trim());

      if (isFileMode && addFile) {
        formData.append('file', addFile);
      } else {
        formData.append('content', addForm.content);
      }

      const res = await fetch('/api/admin/hq/knowledge', { method: 'POST', body: formData });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setDocuments(prev => [json.data, ...prev]);
      resetAddForm();
      setAddOpen(false);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'ajout du document.");
    } finally {
      setSavingAdd(false);
    }
  };

  // ── Visualisation / édition ────────────────────────────────────────────────
  const [viewingDoc,   setViewingDoc]   = useState<KBDocument | null>(null);
  const [editMode,     setEditMode]     = useState(false);
  const [viewMode,     setViewMode]     = useState<'rendered' | 'raw'>('rendered');
  const [editForm,     setEditForm]     = useState({ name: '', category: '', content: '', visibility: 'shared' as Visibility });
  const [savingEdit,   setSavingEdit]   = useState(false);
  const [editError,    setEditError]    = useState<string | null>(null);

  const openDocView = (doc: KBDocument) => {
    setViewingDoc(doc);
    setEditMode(false);
    setViewMode('rendered');
    setEditForm({ name: doc.name, category: doc.category || '', content: doc.content, visibility: doc.visibility });
    setEditError(null);
  };

  const closeDocView = () => {
    setViewingDoc(null);
    setEditMode(false);
    setEditError(null);
  };

  const saveDocEdit = async () => {
    if (!viewingDoc) return;
    if (!editForm.name.trim() || !editForm.content.trim()) return;

    setSavingEdit(true);
    setEditError(null);
    try {
      const res = await fetch('/api/admin/hq/knowledge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: viewingDoc.id,
          name: editForm.name.trim(),
          category: editForm.category.trim() || null,
          content: editForm.content,
          visibility: editForm.visibility
        })
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setDocuments(prev => prev.map(d => d.id === json.data.id ? json.data : d));
      setViewingDoc(json.data);
      setEditMode(false);
    } catch (err: any) {
      setEditError(err.message || "Erreur lors de la mise à jour.");
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Corbeille ────────────────────────────────────────────────────────────
  const [trashOpen,    setTrashOpen]    = useState(false);
  const [trashDocs,    setTrashDocs]    = useState<KBDocument[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashError,   setTrashError]   = useState<string | null>(null);
  const [restoringId,  setRestoringId]  = useState<string | null>(null);
  const [purgingId,    setPurgingId]    = useState<string | null>(null);

  const loadTrash = useCallback(async () => {
    setTrashLoading(true);
    setTrashError(null);
    try {
      const res = await fetch('/api/admin/hq/knowledge?agent_id=axon&trash=true');
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setTrashDocs(json.data ?? []);
    } catch (err: any) {
      setTrashError(err.message || "Erreur lors du chargement de la corbeille.");
    } finally {
      setTrashLoading(false);
    }
  }, []);

  const openTrash = () => {
    setTrashOpen(true);
    loadTrash();
  };

  const restoreDocument = async (doc: KBDocument) => {
    setRestoringId(doc.id);
    setTrashError(null);
    try {
      const res = await fetch('/api/admin/hq/knowledge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: doc.id, restore: true })
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setTrashDocs(prev => prev.filter(d => d.id !== doc.id));
      setDocuments(prev => [json.data, ...prev]);
    } catch (err: any) {
      setTrashError(err.message || "Erreur lors de la restauration.");
    } finally {
      setRestoringId(null);
    }
  };

  const performPurgeDocument = async (doc: KBDocument) => {
    setPurgingId(doc.id);
    setTrashError(null);
    try {
      const res = await fetch('/api/admin/hq/knowledge', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: doc.id, permanent: true })
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setTrashDocs(prev => prev.filter(d => d.id !== doc.id));
    } catch (err: any) {
      setTrashError(err.message || "Erreur lors de la suppression définitive.");
    } finally {
      setPurgingId(null);
    }
  };

  // ── Confirmation stylée pour les suppressions ─────────────────────────────
  const [confirmAction, setConfirmAction] = useState<{ type: 'trash' | 'purge'; doc: KBDocument } | null>(null);

  const requestDeleteDocument = (doc: KBDocument) => {
    setConfirmAction({ type: 'trash', doc });
  };

  const performDeleteDocument = async (doc: KBDocument) => {
    const previous = documents;
    setDocuments(prev => prev.filter(d => d.id !== doc.id));
    try {
      const res = await fetch('/api/admin/hq/knowledge', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: doc.id })
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
    } catch (err: any) {
      setDocuments(previous);
      setError(err.message || "Erreur lors de la suppression.");
    }
  };

  const requestPurgeDocument = (doc: KBDocument) => {
    setConfirmAction({ type: 'purge', doc });
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, doc } = confirmAction;
    setConfirmAction(null);
    if (type === 'trash') {
      await performDeleteDocument(doc);
    } else {
      await performPurgeDocument(doc);
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
      <div className="min-h-screen bg-[#0A0A0A] font-mono text-white/90 p-6 lg:p-12 pb-24">
        <div className="max-w-[1000px] mx-auto space-y-10">

          {/* ── HEADER ─────────────────────────────────────────────────── */}
          <div className="space-y-4">
            <button
              onClick={() => router.push('/admin/hq/agents')}
              className="flex items-center gap-2 text-white/30 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour au chat
            </button>
            <div className="flex items-center gap-3">
              <Library className="w-5 h-5 text-cyan-400" />
              <span className="text-[10px] font-bold text-white/40 tracking-[0.4em] uppercase">
                Bibliothèque // Partagée entre agents
              </span>
            </div>
            <h1 className="text-4xl font-normal text-white tracking-tighter">Base de connaissances</h1>
            <p className="text-xs text-white/40">
              Documents et données consultables par AXON, BUSINESS et COMMERCIAL. AXON voit tout ; les autres voient leurs ajouts et ce qui est partagé.
            </p>
          </div>

          {/* ── FILTRES + ACTIONS ─────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              {FILTER_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSourceFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer border ${
                    sourceFilter === tab.id
                      ? 'bg-white/10 border-white/20 text-white'
                      : 'bg-transparent border-white/10 text-white/30 hover:text-white/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
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
                onClick={() => { resetAddForm(); setAddOpen(true); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 text-[9px] font-black uppercase tracking-widest hover:bg-cyan-400/15 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter un document
              </button>
            </div>
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

          {/* ── LISTE ──────────────────────────────────────────────────── */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-7 h-7 text-white/20 animate-spin" />
              <p className="text-[10px] text-white/20 uppercase tracking-widest">Chargement de la bibliothèque...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 border border-dashed border-white/10 rounded-2xl gap-3">
              <Library className="w-7 h-7 text-white/10" />
              <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">
                {sourceFilter === 'all' ? 'Bibliothèque vide' : `Aucun document depuis ${SOURCE_META[sourceFilter as SourceAgent]?.label}`}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => openDocView(doc)}
                  className="bg-[#141414] border border-white/10 rounded-xl px-5 py-4 flex items-center justify-between gap-4 cursor-pointer hover:border-cyan-400/30 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-4 h-4 shrink-0 text-cyan-400" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-white truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span
                          className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border"
                          style={{ color: SOURCE_META[doc.source_agent].color, borderColor: `${SOURCE_META[doc.source_agent].color}40`, backgroundColor: `${SOURCE_META[doc.source_agent].color}15` }}
                        >
                          {SOURCE_META[doc.source_agent].label}
                        </span>
                        <span className="flex items-center gap-1 text-[8px] font-bold text-white/30 uppercase tracking-widest bg-white/5 px-1.5 py-0.5 rounded">
                          {doc.visibility === 'shared' ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                          {doc.visibility === 'shared' ? 'Partagé' : 'Privé'}
                        </span>
                        {doc.category && (
                          <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest bg-white/5 px-1.5 py-0.5 rounded">
                            {doc.category}
                          </span>
                        )}
                        {doc.storage_path && (
                          <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">
                            {doc.storage_path.split('.').pop()?.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); requestDeleteDocument(doc); }}
                    title="Retirer"
                    className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* ── MODALE AJOUT DE DOCUMENT ──────────────────────────────────── */}
      <AnimatePresence>
        {addOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
            onClick={() => !savingAdd && setAddOpen(false)}
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
                  <Library className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-white">Nouveau document</h3>
                </div>
                <button onClick={() => !savingAdd && setAddOpen(false)} className="text-white/30 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sélecteur de mode */}
              <div className="flex gap-2 px-6 pt-5 shrink-0">
                <button
                  onClick={() => setAddMode('manual')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer border ${
                    addMode === 'manual' ? 'bg-cyan-400/10 border-cyan-400/30 text-cyan-400' : 'bg-white/[0.02] border-white/10 text-white/40 hover:text-white/60'
                  }`}
                >
                  <PenLine className="w-3.5 h-3.5" />
                  Saisie manuelle
                </button>
                <button
                  onClick={() => setAddMode('file')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer border ${
                    addMode === 'file' ? 'bg-cyan-400/10 border-cyan-400/30 text-cyan-400' : 'bg-white/[0.02] border-white/10 text-white/40 hover:text-white/60'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Importer un fichier
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto">
                {addMode === 'file' && (
                  <div
                    onClick={() => addFileInputRef.current?.click()}
                    className="border border-dashed border-white/20 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-cyan-400/40 transition-all"
                  >
                    <Upload className="w-6 h-6 text-white/30" />
                    <p className="text-[10px] text-white/40 uppercase tracking-widest text-center">
                      {addFile ? `${addFile.name} — cliquer pour remplacer` : 'Cliquer pour choisir un PDF ou DOCX'}
                    </p>
                    <input
                      ref={addFileInputRef}
                      type="file"
                      accept=".pdf,.docx"
                      className="hidden"
                      onChange={handleAddFileChange}
                    />
                  </div>
                )}

                {/* Source agent */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Contexte d'origine</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(SOURCE_META) as SourceAgent[]).map(agentId => (
                      <button
                        key={agentId}
                        onClick={() => setAddForm(prev => ({ ...prev, source_agent: agentId }))}
                        className={`py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer border ${
                          addForm.source_agent === agentId ? 'text-white' : 'text-white/30 hover:text-white/60 bg-white/[0.02] border-white/10'
                        }`}
                        style={addForm.source_agent === agentId ? { backgroundColor: `${SOURCE_META[agentId].color}15`, borderColor: `${SOURCE_META[agentId].color}40`, color: SOURCE_META[agentId].color } : {}}
                      >
                        {SOURCE_META[agentId].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visibilité */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Visibilité</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setAddForm(prev => ({ ...prev, visibility: 'shared' }))}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer border ${
                        addForm.visibility === 'shared' ? 'bg-cyan-400/10 border-cyan-400/30 text-cyan-400' : 'bg-white/[0.02] border-white/10 text-white/40 hover:text-white/60'
                      }`}
                    >
                      <Globe className="w-3 h-3" />
                      Partagé (tous les agents)
                    </button>
                    <button
                      onClick={() => setAddForm(prev => ({ ...prev, visibility: 'private' }))}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer border ${
                        addForm.visibility === 'private' ? 'bg-cyan-400/10 border-cyan-400/30 text-cyan-400' : 'bg-white/[0.02] border-white/10 text-white/40 hover:text-white/60'
                      }`}
                    >
                      <Lock className="w-3 h-3" />
                      Privé (contexte seul)
                    </button>
                  </div>
                  {addForm.visibility === 'private' && addForm.source_agent === 'axon' && (
                    <p className="text-[9px] text-white/20 italic px-1">Privé pour AXON revient à "partagé", puisqu'AXON voit toujours tout.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Nom {addMode === 'file' && '(optionnel — déduit du fichier)'}</label>
                  <input
                    value={addForm.name}
                    onChange={(e) => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40 transition-all"
                    placeholder="Ex : Rapport pipeline Q3"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Catégorie (optionnel)</label>
                  <input
                    value={addForm.category}
                    onChange={(e) => setAddForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40 transition-all"
                    placeholder="Ex : Finance, Marché, Produit"
                  />
                </div>

                {addMode === 'manual' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Contenu</label>
                    <textarea
                      value={addForm.content}
                      onChange={(e) => setAddForm(prev => ({ ...prev, content: e.target.value }))}
                      className="w-full h-48 bg-black border border-white/10 rounded-lg px-4 py-3 text-[12px] font-mono text-white/80 outline-none focus:border-cyan-400/40 transition-all resize-none leading-relaxed"
                      placeholder="Colle ou écris ici le contenu du document..."
                    />
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-white/10 flex justify-end gap-3 shrink-0 bg-black/30">
                <button
                  onClick={() => setAddOpen(false)}
                  disabled={savingAdd}
                  className="px-6 py-2.5 text-[10px] font-bold text-white/40 uppercase tracking-widest hover:text-white transition-colors disabled:opacity-40"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddDocument}
                  disabled={savingAdd || (addMode === 'file' ? !addFile : (!addForm.name.trim() || !addForm.content.trim()))}
                  className="px-8 py-2.5 bg-cyan-400 text-black text-[10px] font-black uppercase tracking-widest rounded-lg hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all disabled:opacity-40 disabled:hover:shadow-none flex items-center gap-2 cursor-pointer"
                >
                  {savingAdd ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  {savingAdd ? (addMode === 'file' ? 'Extraction en cours...' : 'Ajout...') : 'Ajouter'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODALE VISUALISATION / ÉDITION ────────────────────────────── */}
      <AnimatePresence>
        {viewingDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
            onClick={() => !savingEdit && closeDocView()}
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
                  <FileText className="w-4 h-4 shrink-0 text-cyan-400" />
                  {editMode ? (
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-black border border-white/10 rounded-lg px-3 py-1.5 text-sm font-bold text-white outline-none focus:border-cyan-400/40 transition-all min-w-0"
                    />
                  ) : (
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white truncate">{viewingDoc.name}</h3>
                  )}
                  <span
                    className="text-[8px] font-black px-2 py-0.5 rounded border uppercase shrink-0"
                    style={{ color: SOURCE_META[viewingDoc.source_agent].color, borderColor: `${SOURCE_META[viewingDoc.source_agent].color}40`, backgroundColor: `${SOURCE_META[viewingDoc.source_agent].color}15` }}
                  >
                    {SOURCE_META[viewingDoc.source_agent].label}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {viewingDoc.file_url && !editMode && (
                    <a
                      href={viewingDoc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Télécharger le fichier original"
                      className="p-2 rounded-lg text-white/40 hover:text-cyan-400 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                  {!editMode && (
                    <button
                      onClick={() => setEditMode(true)}
                      title="Modifier"
                      className="p-2 rounded-lg text-white/40 hover:text-cyan-400 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      <PenLine className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => !savingEdit && closeDocView()}
                    className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {editError && (
                <div className="mx-6 mt-4 flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl shrink-0">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-xs text-red-400 flex-1">{editError}</span>
                  <button onClick={() => setEditError(null)} className="text-red-400/50 hover:text-red-400">✕</button>
                </div>
              )}

              <div className="p-6 space-y-5 overflow-y-auto">
                {editMode ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Visibilité</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setEditForm(prev => ({ ...prev, visibility: 'shared' }))}
                          className={`flex items-center justify-center gap-2 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer border ${
                            editForm.visibility === 'shared' ? 'bg-cyan-400/10 border-cyan-400/30 text-cyan-400' : 'bg-white/[0.02] border-white/10 text-white/40'
                          }`}
                        >
                          <Globe className="w-3 h-3" /> Partagé
                        </button>
                        <button
                          onClick={() => setEditForm(prev => ({ ...prev, visibility: 'private' }))}
                          className={`flex items-center justify-center gap-2 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer border ${
                            editForm.visibility === 'private' ? 'bg-cyan-400/10 border-cyan-400/30 text-cyan-400' : 'bg-white/[0.02] border-white/10 text-white/40'
                          }`}
                        >
                          <Lock className="w-3 h-3" /> Privé
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Catégorie</label>
                      <input
                        value={editForm.category}
                        onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                        Contenu {viewingDoc.storage_path && <span className="normal-case font-normal text-white/20">(le fichier original n'est pas remplacé)</span>}
                      </label>
                      <textarea
                        value={editForm.content}
                        onChange={(e) => setEditForm(prev => ({ ...prev, content: e.target.value }))}
                        className="w-full h-72 bg-black border border-white/10 rounded-lg px-4 py-3 text-[12px] font-mono text-white/80 outline-none focus:border-cyan-400/40 transition-all resize-none leading-relaxed"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1 text-[9px] font-bold text-white/30 uppercase tracking-widest bg-white/5 px-2 py-1 rounded">
                        {viewingDoc.visibility === 'shared' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {viewingDoc.visibility === 'shared' ? 'Partagé' : 'Privé'}
                      </span>
                      {viewingDoc.category && (
                        <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest bg-white/5 px-2 py-1 rounded">
                          {viewingDoc.category}
                        </span>
                      )}
                    </div>
                    <div className="bg-black border border-white/[0.06] rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
                        <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
                          {viewingDoc.storage_path ? viewingDoc.storage_path.split('/').pop() : 'CONTENU'}
                        </span>
                        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                          <button
                            onClick={() => setViewMode('rendered')}
                            className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === 'rendered' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setViewMode('raw')}
                            className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === 'raw' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}
                          >
                            <Code2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="p-5 max-h-[420px] overflow-y-auto">
                        {viewMode === 'rendered' ? (
                          <MarkdownLite content={viewingDoc.content} />
                        ) : (
                          <pre className="whitespace-pre-wrap text-[12px] text-white/70 leading-relaxed font-mono">{viewingDoc.content}</pre>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {editMode && (
                <div className="p-6 border-t border-white/10 flex justify-end gap-3 shrink-0 bg-black/30">
                  <button
                    onClick={() => {
                      setEditMode(false);
                      setEditForm({ name: viewingDoc.name, category: viewingDoc.category || '', content: viewingDoc.content, visibility: viewingDoc.visibility });
                      setEditError(null);
                    }}
                    disabled={savingEdit}
                    className="px-6 py-2.5 text-[10px] font-bold text-white/40 uppercase tracking-widest hover:text-white transition-colors disabled:opacity-40"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={saveDocEdit}
                    disabled={savingEdit || !editForm.name.trim() || !editForm.content.trim()}
                    className="px-8 py-2.5 bg-cyan-400 text-black text-[10px] font-black uppercase tracking-widest rounded-lg hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all disabled:opacity-40 disabled:hover:shadow-none flex items-center gap-2 cursor-pointer"
                  >
                    {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {savingEdit ? 'Enregistrement...' : 'Enregistrer'}
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
                  <h3 className="text-sm font-bold uppercase tracking-widest text-white">Corbeille — Base de connaissances</h3>
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
                ) : trashDocs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Trash2 className="w-6 h-6 text-white/10" />
                    <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Corbeille vide</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {trashDocs.map((doc) => (
                      <div key={doc.id} className="bg-black border border-white/10 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-white/60 truncate">{doc.name}</p>
                          <span
                            className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded mt-1 inline-block"
                            style={{ color: SOURCE_META[doc.source_agent].color, backgroundColor: `${SOURCE_META[doc.source_agent].color}15` }}
                          >
                            {SOURCE_META[doc.source_agent].label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => restoreDocument(doc)}
                            disabled={restoringId === doc.id}
                            className="px-3 py-1.5 rounded-lg bg-[#39FF14]/10 border border-[#39FF14]/20 text-[#39FF14] text-[9px] font-bold uppercase tracking-widest hover:bg-[#39FF14]/20 transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                          >
                            {restoringId === doc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                            Restaurer
                          </button>
                          <button
                            onClick={() => requestPurgeDocument(doc)}
                            disabled={purgingId === doc.id}
                            className="px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400/70 text-[9px] font-bold uppercase tracking-widest hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                          >
                            {purgingId === doc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
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

      {/* ── MODALE CONFIRMATION SUPPRESSION ──────────────────────────── */}
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
                  <AlertCircle className={`w-5 h-5 shrink-0 ${confirmAction.type === 'purge' ? 'text-red-400' : 'text-cyan-400'}`} />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-white">
                    {confirmAction.type === 'purge' ? 'Suppression définitive' : 'Envoyer à la corbeille'}
                  </h3>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  {confirmAction.type === 'purge' ? (
                    <>Supprimer définitivement <span className="text-white/80 font-bold">"{confirmAction.doc.name}"</span> ?
                    Le fichier original sera aussi effacé du stockage. Cette action est irréversible.</>
                  ) : (
                    <>Envoyer <span className="text-white/80 font-bold">"{confirmAction.doc.name}"</span> à la corbeille ?
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
                    confirmAction.type === 'purge' ? 'bg-red-500 text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'bg-cyan-400 text-black hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]'
                  }`}
                >
                  {confirmAction.type === 'purge' ? 'Supprimer définitivement' : 'Envoyer à la corbeille'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </DoubleRibbonIntelligent>
  );
}
