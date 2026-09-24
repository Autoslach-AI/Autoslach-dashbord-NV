'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase';
import { getAgentsByEnterprise } from '@/lib/db/actions';
import JSZip from 'jszip';

import { 
  Search, 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  Folder, 
  FileCode, 
  Monitor, 
  Info, 
  MoreVertical, 
  Eye, 
  Code,
  ShoppingBag,
  Sparkles,
  FileText,
  UploadCloud,
  X,
  Upload,
  Pencil,
  Copy,
  Hash,
  Zap
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

function FileTreeNode({ node, depth = 0, selectedFile, onSelectFile, skillId, expandedFolders, toggleFolder }: any) {
  const nodeId = `${skillId}-${node.name}-${depth}`;
  if (node.type === 'folder') {
    return (
      <div>
        <button
          onClick={() => toggleFolder(nodeId)}
          className="flex items-center gap-2 w-full text-left py-1.5 px-3 hover:bg-white/5 rounded-lg transition-all"
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          {expandedFolders.has(nodeId) ? <ChevronDown className="w-3 h-3 text-white/40" /> : <ChevronRight className="w-3 h-3 text-white/40" />}
          <Folder className="w-3.5 h-3.5 text-yellow-400/60" />
          <span className="text-[11px] text-white/60 font-mono truncate">{node.name}</span>
        </button>
        {expandedFolders.has(nodeId) && (
          <div>
            {node.children?.map((child: any, i: number) => (
              <FileTreeNode key={i} node={child} depth={depth + 1} selectedFile={selectedFile} onSelectFile={onSelectFile} skillId={skillId} expandedFolders={expandedFolders} toggleFolder={toggleFolder} />
            ))}
          </div>
        )}
      </div>
    );
  }
  const isSelected = selectedFile?.name === node.name && selectedFile?.skillId === skillId;
  return (
    <button
      onClick={() => onSelectFile({ skillId, name: node.name, content: node.content || '' })}
      className={`flex items-center gap-2 w-full text-left py-1.5 rounded-lg transition-all hover:bg-white/5 ${isSelected ? 'bg-white/10 text-white' : 'text-white/50'}`}
      style={{ paddingLeft: `${12 + depth * 16}px` }}
    >
      <FileCode className="w-3.5 h-3.5 text-[#4ade80]/60 flex-shrink-0" />
      <span className="text-[11px] font-mono truncate">{node.name}</span>
    </button>
  );
}

function SkillItem({ skill, selectedFile, onSelectFile, onDelete, expandedFolders, toggleFolder }: any) {
  const skillFolderId = `skill-${skill.id}`;
  const isExpanded = expandedFolders.has(skillFolderId);

  if (skill.file_tree) {
    return (
      <div className="group">
        <div className="flex items-center justify-between">
          <button
            onClick={() => toggleFolder(skillFolderId)}
            className="flex items-center gap-2 flex-1 py-2 px-3 hover:bg-white/5 rounded-lg transition-all text-left"
          >
            {isExpanded ? <ChevronDown className="w-3 h-3 text-white/40" /> : <ChevronRight className="w-3 h-3 text-white/40" />}
            <div className="w-5 h-5 rounded bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center flex-shrink-0">
              <Folder className="w-2.5 h-2.5 text-yellow-400" />
            </div>
            <span className="text-[11px] font-mono tracking-tight flex-1 truncate text-white/60">{skill.name}</span>
          </button>
          <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all pr-3">
            <X className="w-3 h-3" />
          </button>
        </div>
        {isExpanded && skill.file_tree.children?.map((child: any, i: number) => (
          <FileTreeNode key={i} node={child} depth={1} selectedFile={selectedFile} onSelectFile={onSelectFile} skillId={skill.id} expandedFolders={expandedFolders} toggleFolder={toggleFolder} />
        ))}
      </div>
    );
  }

  // Skill simple sans file_tree
  const isSelected = selectedFile?.skillId === skill.id && selectedFile?.name === skill.name;
  return (
    <div
      onClick={() => onSelectFile({ skillId: skill.id, name: skill.name, content: skill.description || '' })}
      className={`flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer transition-all hover:bg-white/10 group ${isSelected ? 'bg-white/10 text-white' : 'text-white/60'}`}
    >
      <div className="w-5 h-5 rounded bg-[#4ade80]/10 border border-[#4ade80]/20 flex items-center justify-center flex-shrink-0">
        <Zap className="w-2.5 h-2.5 text-[#4ade80]" />
      </div>
      <span className="text-[11px] font-mono tracking-tight flex-1 truncate">{skill.name}</span>
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

export default function AgentSkillsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const agentId = params?.agentId as string;
  
  const [agentName, setAgentName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSkillActive, setIsSkillActive] = useState(true);

  // UI States
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showCreateSubMenu, setShowCreateSubMenu] = useState(false);
  const [showEditInstructionsModal, setShowEditInstructionsModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Form States
  const [skillForm, setSkillForm] = useState({ name: '', description: '', instructions: '' });
  const [skills, setSkills] = useState<any[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; skillId: string; skillName: string } | null>(null);

  // File Tree States
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['skill-creator']));
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');

  const toggleFolder = (folderId: string) => {
    const newSet = new Set(expandedFolders);
    if (newSet.has(folderId)) {
      newSet.delete(folderId);
    } else {
      newSet.add(folderId);
    }
    setExpandedFolders(newSet);
  };

  const handleFileClick = (file: any) => {
    setSelectedFile(file);
    setEditedContent(file.content);
    setIsEditing(false);
  };

  useEffect(() => {
    const fetchAgent = async () => {
      const { data: agents } = await getAgentsByEnterprise(id);
      const currentAgent = (agents as any[])?.find((a: any) => a.id === agentId);
      if (currentAgent) {
        setAgentName(currentAgent.name);
      }
      
      const supabase = createClient();
      const { data: skillsData } = await supabase
        .from('agent_skills')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at');
      setSkills(skillsData || []);
      
      setLoading(false);
    };
    fetchAgent();
  }, [id, agentId]);

  if (loading) return null;

  return (
    <div className="relative p-6 lg:p-12 max-w-[1400px] mx-auto space-y-12 pb-64 font-mono">
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
           <p className="text-xs font-bold text-white/60 tracking-wider">0X-{id?.substring(0, 8).toUpperCase()}</p>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex border-b border-white/10 gap-10">
        <button 
          onClick={() => router.push(`/admin/system/${id}/agent/${agentId}`)}
          className="pb-4 text-[10px] font-bold uppercase text-white/20 hover:text-white/40 tracking-[0.3em] transition-all relative"
        >
          Core_Config
        </button>
        <button 
          onClick={() => router.push(`/admin/system/${id}/agent/${agentId}?tab=KNOWLEDGE`)}
          className="pb-4 text-[10px] font-bold uppercase text-white/20 hover:text-white/40 tracking-[0.3em] transition-all relative"
        >
          Knowledge_Base
        </button>
        <button 
          className="pb-4 text-[10px] font-bold uppercase text-white tracking-[0.3em] transition-all relative"
        >
          Skills
          <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4ade80] shadow-[0_0_10px_#4ade80]" />
        </button>
      </div>

      {/* DUAL PANE LAYOUT */}
      <div className="flex bg-[#0D0D0D] border border-white/10 rounded-2xl overflow-hidden min-h-[700px]">
        {/* SIDEBAR */}
        <aside className="w-80 border-r border-white/10 flex flex-col bg-[#111]">
          {/* Sidebar Header */}
          <div className="p-6 flex items-center justify-between border-b border-white/5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Compétences</h3>
            <div className="flex items-center gap-3 text-white/40">
              <Search className="w-4 h-4 hover:text-white cursor-pointer transition-colors" />
              <div className="relative">
                <Plus 
                  className="w-4 h-4 hover:text-[#4ade80] cursor-pointer transition-colors" 
                  onClick={() => setShowPlusMenu(!showPlusMenu)}
                />
                
                <AnimatePresence>
                  {showPlusMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => {
                          setShowPlusMenu(false);
                          setShowCreateSubMenu(false);
                        }}
                      />
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-8 w-64 bg-[#000000] border border-white/10 rounded-xl shadow-2xl z-50 p-1"
                      >
                        <div className="flex flex-col relative">
                          <button className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg transition-colors text-left group">
                            <ShoppingBag className="w-4 h-4 text-white/40 group-hover:text-white" />
                            <span className="text-[10px] font-bold text-white tracking-[0.2em] uppercase">PARCOURIR LES COMPÉTENCES</span>
                          </button>
                          
                          <div className="relative">
                            <button 
                              onMouseEnter={() => setShowCreateSubMenu(true)}
                              className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition-colors group"
                            >
                              <div className="flex items-center gap-3">
                                <Plus className="w-4 h-4 text-white/40 group-hover:text-white" />
                                <span className="text-[10px] font-bold text-white tracking-[0.2em] uppercase">CRÉER UNE COMPÉTENCE</span>
                              </div>
                              <ChevronRight className={`w-3 h-3 text-white/20 transition-transform ${showCreateSubMenu ? 'rotate-90' : ''}`} />
                            </button>

                            <AnimatePresence>
                              {showCreateSubMenu && (
                                <motion.div 
                                  initial={{ opacity: 0, x: 5 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 5 }}
                                  onMouseLeave={() => setShowCreateSubMenu(false)}
                                  className="absolute left-[calc(100%+8px)] top-0 w-72 bg-[#000000] border border-white/10 rounded-xl shadow-2xl z-60 p-1"
                                >
                                  <button className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg transition-colors text-left group">
                                    <Sparkles className="w-4 h-4 text-white/40 group-hover:text-[#4ade80]" />
                                    <span className="text-[10px] font-bold text-white tracking-[0.15em] uppercase">Créer avec Claude</span>
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowEditInstructionsModal(true);
                                      setShowPlusMenu(false);
                                      setShowCreateSubMenu(false);
                                    }}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg transition-colors text-left group"
                                  >
                                    <FileText className="w-4 h-4 text-white/40 group-hover:text-[#4ade80]" />
                                    <span className="text-[10px] font-bold text-white tracking-[0.15em] uppercase truncate">Rédiger les instructions</span>
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowUploadModal(true);
                                      setShowPlusMenu(false);
                                      setShowCreateSubMenu(false);
                                    }}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg transition-colors text-left group"
                                  >
                                    <UploadCloud className="w-4 h-4 text-white/40 group-hover:text-[#4ade80]" />
                                    <span className="text-[10px] font-bold text-white tracking-[0.15em] uppercase">Téléverser une compétence</span>
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono">
            <div>
              <button 
                onClick={() => toggleFolder('personal-skills')}
                className="flex items-center gap-2 text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] hover:text-white transition-all mb-4 w-full text-left"
              >
                {expandedFolders.has('personal-skills') ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Compétences personnelles
              </button>
              
              <AnimatePresence>
                {expandedFolders.has('personal-skills') && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-1 overflow-hidden"
                  >
                    <div className="space-y-1">
                      {skills.length === 0 ? (
                        <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest px-3 py-4">Aucun skill configuré</p>
                      ) : (
                        skills.map((skill) => (
                          <SkillItem
                            key={skill.id}
                            skill={skill}
                            selectedFile={selectedFile}
                            onSelectFile={(file: any) => {
                              setSelectedFile({ ...file, id: file.skillId });
                              setEditedContent(file.content || '');
                              setIsEditing(false);
                            }}
                            onDelete={async () => {
                              if (!confirm('Supprimer ce skill ?')) return;
                              
                              try {
                                if (skill.storage_path) {
                                  const delStorageRes = await fetch('/api/admin/delete', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ type: 'storage', bucket: 'agent-skills', path: skill.storage_path })
                                  });
                                  const { error: storageError } = await delStorageRes.json();
                                  if (storageError) throw new Error(storageError);
                                }

                                const delRowRes = await fetch('/api/admin/delete', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ type: 'row', table: 'agent_skills', column: 'id', id: skill.id })
                                });
                                const { error: rowError } = await delRowRes.json();
                                if (rowError) throw new Error(rowError);

                                setSkills(prev => prev.filter(s => s.id !== skill.id));
                                if (selectedFile?.skillId === skill.id || selectedFile?.id === skill.id) setSelectedFile(null);
                              } catch (err: any) {
                                alert('Erreur: ' + err.message);
                              }
                            }}
                            expandedFolders={expandedFolders}
                            toggleFolder={toggleFolder}
                          />
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 flex flex-col bg-[#0D0D0D] overflow-hidden">
          {selectedFile ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Header for File */}
              <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl sticky top-0 z-10 shrink-0">
                <div className="flex items-center gap-3">
                  <FileCode className="w-4 h-4 text-[#4ade80]" />
                  <h2 className="text-sm font-bold text-white tracking-widest uppercase truncate max-w-[200px] sm:max-w-md">{selectedFile.name}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <AnimatePresence>
                    {isEditing && (
                      <motion.button
                        id="save-skill-button"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        onClick={async () => {
                          const supabase = createClient();
                          const { error } = await supabase
                            .from('agent_skills')
                            .update({ description: editedContent })
                            .eq('id', selectedFile.id);
                          if (error) { alert('Erreur: ' + error.message); return; }
                          setSkills((prev: any[]) => prev.map(s => s.id === selectedFile.id ? { ...s, description: editedContent } : s));
                          setSelectedFile((prev: any) => ({ ...prev, content: editedContent }));
                          setIsEditing(false);
                        }}
                        className="px-5 py-2 text-[10px] font-bold text-black bg-[#4ade80] rounded-lg hover:bg-[#3bc870] transition-all tracking-[0.2em] uppercase shadow-[0_0_20px_rgba(74,222,128,0.3)] flex items-center gap-2"
                      >
                        SAVE
                      </motion.button>
                    )}
                  </AnimatePresence>
                  
                  <div className="flex items-center bg-white/5 rounded-xl border border-white/10 p-1">
                    <button 
                      id="view-mode-button"
                      onClick={() => setIsEditing(false)}
                      className={`p-2 rounded-lg transition-all ${!isEditing ? 'bg-white/10 text-[#4ade80]' : 'text-white/20 hover:text-white'}`}
                      title="View Mode"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      id="edit-mode-button"
                      onClick={() => setIsEditing(true)}
                      className={`p-2 rounded-lg transition-all ${isEditing ? 'bg-white/10 text-[#4ade80]' : 'text-white/20 hover:text-white'}`}
                      title="Edit Mode"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="h-4 w-px bg-white/10 mx-2 hidden sm:block" />
                  <button 
                    id="copy-skill-button" 
                    className="p-2 text-white/40 hover:text-white transition-all hidden sm:block"
                    onClick={() => {
                      navigator.clipboard.writeText(editedContent);
                      alert('Contenu copié !');
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Editor / Viewer Area */}
              <div className="flex-1 overflow-auto font-mono text-[13px] leading-relaxed relative bg-black/20">
                {isEditing ? (
                  <textarea 
                    autoFocus
                    className="w-full h-full bg-black/40 text-white/80 p-8 outline-none resize-none selection:bg-[#4ade80]/20 min-h-[500px]"
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    spellCheck={false}
                  />
                ) : (
                  <div className="p-0 flex min-h-full">
                    {/* Line Numbers */}
                    <div className="w-14 bg-white/[0.02] border-r border-white/5 py-8 flex flex-col items-center text-white/10 select-none">
                      {editedContent.split('\n').map((_, i) => (
                        <div key={i} className="h-[1.6em] flex items-center justify-center font-mono text-[10px]">{i + 1}</div>
                      ))}
                    </div>
                    {/* Code Content */}
                    <pre className="p-8 flex-1 text-white/80 whitespace-pre overflow-x-auto custom-scrollbar">
                      {editedContent.split('\n').map((line, i) => {
                        // Simple highlighting for common section headers
                        const isHeader = line.toUpperCase().includes('INSTRUCTIONS:') || line.startsWith('#');
                        
                        return (
                          <div key={i} className={`h-[1.6em] flex items-center group/line ${isHeader ? 'bg-white/[0.03]' : 'hover:bg-white/[0.02]'} transition-colors px-4 -mx-4`}>
                            {isHeader ? (
                              <span className="text-[#4ade80] font-bold tracking-wider">{line}</span>
                            ) : line.startsWith('//') || line.startsWith('---') ? (
                              <span className="text-white/20 italic">{line}</span>
                            ) : (
                              <span className="text-white/70">{line}</span>
                            )}
                          </div>
                        );
                      })}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-12">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white/20" />
              </div>
              <p className="text-[11px] font-bold text-white/20 uppercase tracking-[0.3em]">
                Sélectionne un skill pour le visualiser
              </p>
              <p className="text-[10px] text-white/10 max-w-xs">
                Clique sur une compétence dans le ruban gauche ou crée-en une nouvelle.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {showEditInstructionsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditInstructionsModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#1E1E1E] border border-white/20 rounded-2xl shadow-3xl overflow-hidden"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white tracking-tight">Rédiger les instructions de la compétence</h2>
                <X 
                  className="w-5 h-5 text-white/60 hover:text-white cursor-pointer transition-colors" 
                  onClick={() => setShowEditInstructionsModal(false)}
                />
              </div>

              <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-white/60 uppercase tracking-[0.2em]">Nom de la compétence</label>
                  <input 
                    type="text"
                    placeholder="weekly-status-report"
                    className="w-full bg-[#252525] border border-white/10 rounded-lg px-5 py-3 text-white text-sm outline-none focus:border-[#4ade80]/40 transition-all font-mono placeholder:text-white/30"
                    value={skillForm.name}
                    onChange={(e) => setSkillForm({...skillForm, name: e.target.value})}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-white/60 uppercase tracking-[0.2em]">Description</label>
                  <textarea 
                    placeholder="Générer des rapports d'état hebdomadaires à partir du travail récent. À utiliser pour les demandes de mises à jour ou de résumés de progression."
                    className="w-full bg-[#252525] border border-white/10 rounded-lg px-5 py-4 text-white text-sm outline-none focus:border-[#4ade80]/40 transition-all font-mono min-h-[120px] resize-none placeholder:text-white/30"
                    value={skillForm.description}
                    onChange={(e) => setSkillForm({...skillForm, description: e.target.value})}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-white/60 uppercase tracking-[0.2em]">Instructions</label>
                  <textarea 
                    placeholder="Résumez mon travail récent en trois sections : réussites, obstacles et prochaines étapes. Adoptez un ton professionnel mais pas rigide..."
                    className="w-full bg-[#252525] border border-white/10 rounded-lg px-5 py-4 text-white text-sm outline-none focus:border-[#4ade80]/40 transition-all font-mono min-h-[220px] resize-none placeholder:text-white/30"
                    value={skillForm.instructions}
                    onChange={(e) => setSkillForm({...skillForm, instructions: e.target.value})}
                  />
                </div>
              </div>

              <div className="p-8 pt-0 flex justify-end gap-3">
                <button 
                  onClick={() => setShowEditInstructionsModal(false)}
                  className="px-8 py-2.5 text-[12px] font-bold text-white/60 rounded-lg transition-all bg-[#2A2A2A] hover:bg-[#333333] tracking-widest uppercase"
                >
                  Annuler
                </button>
                <button 
                  onClick={async () => {
                    if (!skillForm.name.trim()) return;
                    const supabase = createClient();
                    const { data: newSkill, error } = await supabase
                      .from('agent_skills')
                      .insert({
                        agent_id: agentId,
                        enterprise_id: id,
                        name: skillForm.name.trim(),
                        description: skillForm.description + (skillForm.instructions ? '\n\nINSTRUCTIONS:\n' + skillForm.instructions : ''),
                        is_active: true
                      })
                      .select()
                      .single();
                    if (error) { console.error('INSERT skill error:', error); alert('Erreur: ' + error.message); return; }
                    if (newSkill) {
                      setSkills(prev => [...prev, newSkill]);
                      setSelectedFile({ id: newSkill.id, name: newSkill.name, content: newSkill.description || '' });
                    }
                    setSkillForm({ name: '', description: '', instructions: '' });
                    setShowEditInstructionsModal(false);
                  }}
                  className="px-8 py-2.5 text-[12px] font-bold text-black bg-[#4ade80] rounded-lg hover:bg-[#3bc870] transition-all tracking-widest uppercase disabled:opacity-40"
                  disabled={!skillForm.name.trim()}
                >
                  Créer
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showUploadModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUploadModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#1E1E1E] border border-white/20 rounded-2xl shadow-3xl overflow-hidden"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white tracking-tight">Importer une compétence</h2>
                <X 
                  className="w-5 h-5 text-white/60 hover:text-white cursor-pointer transition-colors" 
                  onClick={() => setShowUploadModal(false)}
                />
              </div>

              <div className="p-8 space-y-10">
                <div 
                  className="border border-dashed border-white/10 rounded-2xl p-20 flex flex-col items-center justify-center gap-6 group hover:border-white/20 transition-all bg-white/[0.01] cursor-pointer"
                  onClick={() => document.getElementById('skill-file-upload')?.click()}
                >
                  <input
                    id="skill-file-upload"
                    type="file"
                    accept=".md,.zip,.skill,.txt"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const supabase = createClient();

                      // Check if it's a zip file
                      if (file.name.endsWith('.zip')) {
                        // Upload zip vers Supabase Storage
                        const storagePath = `${agentId}/${Date.now()}-${file.name}`;
                        const { error: uploadError } = await supabase.storage.from('agent-skills').upload(storagePath, file);
                        if (uploadError) { console.error('Upload error:', uploadError); alert('Erreur upload: ' + uploadError.message); return; }

                        // Extraire l'arborescence avec JSZip
                        const zip = await JSZip.loadAsync(file);
                        
                        const buildTree = async (zip: JSZip): Promise<any> => {
                          const root: any = { type: 'folder', name: file.name.replace(/\.zip$/, ''), children: [] };
                          const pathMap: Record<string, any> = { '': root };
                          
                          const sortedFiles = Object.keys(zip.files).sort();
                          
                          for (const path of sortedFiles) {
                            const zipEntry = zip.files[path];
                            const parts = path.replace(/\/$/, '').split('/');
                            const name = parts[parts.length - 1];
                            if (!name) continue;
                            
                            const parentPath = parts.slice(0, -1).join('/');
                            const parent = pathMap[parentPath] || root;
                            
                            if (zipEntry.dir) {
                              const folder = { type: 'folder', name, children: [] };
                              parent.children.push(folder);
                              pathMap[path.replace(/\/$/, '')] = folder;
                            } else {
                              const content = await zipEntry.async('string');
                              const fileNode = { type: 'file', name, content };
                              parent.children.push(fileNode);
                            }
                          }
                          return root;
                        };

                        const fileTree = await buildTree(zip);

                        // INSERT dans agent_skills
                        const { data: newSkill, error } = await supabase
                          .from('agent_skills')
                          .insert({
                            agent_id: agentId,
                            enterprise_id: id,
                            name: file.name.replace(/\.zip$/, ''),
                            description: `Fichier importé: ${file.name}`,
                            file_tree: fileTree,
                            storage_path: storagePath,
                            is_active: true
                          })
                          .select()
                          .single();

                        if (error) { alert('Erreur: ' + error.message); return; }
                        if (newSkill) setSkills(prev => [...prev, newSkill]);
                        setShowUploadModal(false);
                      } else {
                        // Handle simple file
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                          const content = event.target?.result as string;
                          const { data: newSkill, error } = await supabase
                            .from('agent_skills')
                            .insert({
                              agent_id: agentId,
                              enterprise_id: id,
                              name: file.name.replace(/\.(md|skill|txt)$/, ''),
                              description: content || `Fichier importé: ${file.name}`,
                              is_active: true
                            })
                            .select()
                            .single();
                          if (error) { console.error('INSERT skill error:', error); alert('Erreur: ' + error.message); return; }
                          if (newSkill) {
                            setSkills(prev => [...prev, newSkill]);
                          }
                          setShowUploadModal(false);
                        };
                        reader.readAsText(file);
                      }
                    }}
                  />
                  <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 group-hover:border-white/20 transition-all">
                    <Plus className="w-5 h-5 text-white/40 group-hover:text-white" />
                  </div>
                  <p className="text-[13px] font-medium text-white/60 tracking-tight">Glissez-déposez ou cliquez pour téléverser</p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]">Exigences de fichier</p>
                  </div>
                  <ul className="space-y-3">
                    <li className="flex gap-4 text-[13px] text-white/40 leading-relaxed items-start">
                      <div className="w-1 h-1 bg-white/20 rounded-full mt-2 shrink-0" />
                      <p>Le fichier .md doit contenir le nom et la description de la compétence au format YAML.</p>
                    </li>
                    <li className="flex gap-4 text-[13px] text-white/40 leading-relaxed items-start">
                      <div className="w-1 h-1 bg-white/20 rounded-full mt-2 shrink-0" />
                      <p>Le fichier .zip ou .skill doit inclure un fichier SKILL.md.</p>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 flex gap-3 text-[12px] font-medium items-center">
                  <a href="#" className="text-white/40 hover:text-white underline underline-offset-8 decoration-white/10 decoration-1 transition-colors">En savoir plus sur la création de compétences</a>
                  <span className="text-white/10">ou</span>
                  <a href="#" className="text-white/40 hover:text-white underline underline-offset-8 decoration-white/10 decoration-1 transition-colors">voir un exemple.</a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {contextMenu && (
        <>
          <div className="fixed inset-0 z-[200]" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-[201] bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl p-1 w-48"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              onClick={async () => {
                const newName = prompt('Nouveau nom :', contextMenu.skillName);
                if (!newName?.trim()) { setContextMenu(null); return; }
                const supabase = createClient();
                const { error } = await supabase.from('agent_skills').update({ name: newName.trim() }).eq('id', contextMenu.skillId);
                if (error) { alert('Erreur: ' + error.message); return; }
                setSkills((prev: any[]) => prev.map(s => s.id === contextMenu.skillId ? { ...s, name: newName.trim() } : s));
                if (selectedFile?.id === contextMenu.skillId) {
                  setSelectedFile((prev: any) => ({ ...prev, name: newName.trim() }));
                }
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-lg text-[11px] font-bold text-white/70 hover:text-white tracking-wider uppercase transition-all text-left"
            >
              <Pencil className="w-3.5 h-3.5" /> Renommer
            </button>
            <button
              onClick={async () => {
                if (!confirm('Supprimer ce skill ?')) { setContextMenu(null); return; }
                try {
                  const res = await fetch('/api/admin/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'row', table: 'agent_skills', column: 'id', id: contextMenu.skillId })
                  });
                  const { error } = await res.json();
                  if (error) throw new Error(error);

                  setSkills((prev: any[]) => prev.filter(s => s.id !== contextMenu.skillId));
                  if (selectedFile?.id === contextMenu.skillId) setSelectedFile(null);
                  setContextMenu(null);
                } catch (err: any) {
                  alert('Erreur: ' + err.message);
                }
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-red-500/10 rounded-lg text-[11px] font-bold text-red-400/70 hover:text-red-400 tracking-wider uppercase transition-all text-left"
            >
              <X className="w-3.5 h-3.5" /> Supprimer
            </button>
          </div>
        </>
      )}
    </div>
  );
}
