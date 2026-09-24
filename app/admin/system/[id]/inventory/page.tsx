'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { createClient } from '@/lib/supabase';
import { 
  Search, Plus, Package, Pencil, Trash2, Eye, EyeOff, 
  X, Upload, MoreVertical, Layers, Grid3X3, 
  List, ArrowUpDown, Filter, Download, AlertCircle, Check
} from 'lucide-react';

// Components
import { InventorySidebar } from './components/InventorySidebar';
import { CategoryModal } from './components/CategoryModal';
import { ItemModal } from './components/ItemModal';
import { ItemCard } from './components/ItemCard';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface AttributeField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'color' | 'date';
  options?: string[];
  required: boolean;
  unit?: string;
}

interface Category {
  id: string;
  enterprise_id: string;
  name: string;
  description: string | null;
  color: string;
  attribute_schema: AttributeField[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface InventoryItem {
  id: string;
  enterprise_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  unit: string;
  image_url: string | null;
  is_active: boolean;
  stock_status: 'AVAILABLE' | 'OUT_OF_STOCK' | 'DISCONTINUED';
  attributes: Record<string, any>;
  tags: string[];
  created_at: string;
}

const STOCK_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  AVAILABLE:    { label: 'Disponible', color: '#4ade80', bg: 'rgba(74,222,128,0.1)'  },
  OUT_OF_STOCK: { label: 'Rupture',    color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  DISCONTINUED: { label: 'Arrêté',     color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
};

export default function InventoryPage() {
  const params = useParams();
  const id = params?.id as string;

  const sanitizeFilename = (filename: string): string => {
    const ext = filename.split('.').pop() || '';
    const nameWithoutExt = filename.slice(0, filename.lastIndexOf('.'));
    const sanitized = nameWithoutExt
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    return `${sanitized}.${ext}`;
  };

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [planDef, setPlanDef] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // UI State
  const [activePage, setActivePage] = useState('CATALOGUE');
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [contextItemId, setContextItemId] = useState<string | null>(null);

  // Modals
  const [showCatModal, setShowCatModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // ── LOAD ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      
      // Load Enterprise/Plan
      const { data: ent } = await supabase.from('enterprises').select('package_type').eq('enterprise_id', id).single();
      if (ent?.package_type) {
        const { data: plan } = await supabase.from('plan_definitions').select('*').eq('plan_name', ent.package_type).single();
        setPlanDef(plan);
      }
      
      // Load Categories & Items
      const { data: cats } = await supabase.from('inventory_categories').select('*').eq('enterprise_id', id).order('sort_order');
      const { data: its } = await supabase.from('inventory_items').select('*').eq('enterprise_id', id).order('name');
      
      setCategories(cats || []);
      setItems(its || []);
      if (cats && cats.length > 0) setActiveCatId(cats[0].id);
      setLoading(false);
    };
    load();
  }, [id]);

  // ── COMPUTED ──────────────────────────────────────────────────────────────────

  const maxCats = planDef?.max_inventory_categories === -1 ? Infinity : (planDef?.max_inventory_categories ?? 5);
  const maxItems = planDef?.max_inventory_items === -1 ? Infinity : (planDef?.max_inventory_items ?? 20);

  const filteredItems = items
    .filter(item => {
      const catMatch = activePage === 'CATALOGUE' ? (activeCatId ? item.category_id === activeCatId : true) : true;
      const statusMatch = filterStatus === 'ALL' || item.stock_status === filterStatus;
      const searchMatch = !searchQuery || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return catMatch && statusMatch && searchMatch;
    })
    .sort((a, b) => {
      const av = (a as any)[sortField] ?? '';
      const bv = (b as any)[sortField] ?? '';
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });

  const stats = {
    total: items.length,
    outOfStock: items.filter(i => i.stock_status === 'OUT_OF_STOCK').length,
    inactive: items.filter(i => !i.is_active).length,
    value: items.reduce((acc, curr) => acc + (curr.price || 0), 0)
  };

  // ── HANDLERS ────────────────────────────────────────────────────────────────

  const handleSaveCategory = async (cat: Partial<Category>, schema: AttributeField[]) => {
    const supabase = createClient();
    const payload = { 
      ...cat,
      enterprise_id: id,
      attribute_schema: schema,
      sort_order: categories.length
    };

    if (editingCat) {
      const { error } = await supabase.from('inventory_categories').update(payload).eq('id', editingCat.id);
      if (error) { alert(error.message); return; }
      setCategories(prev => prev.map(c => c.id === editingCat.id ? { ...c, ...payload } as Category : c));
    } else {
      const { data, error } = await supabase.from('inventory_categories').insert(payload).select().single();
      if (error) { alert(error.message); return; }
      setCategories(prev => [...prev, data]);
    }
    setShowCatModal(false);
  };

  const handleSaveItem = async (item: Partial<InventoryItem>) => {
    const payload = {
      ...item,
      enterprise_id: id,
      category_id: editingItem?.category_id || activeCatId || null
    };

    if (editingItem) {
      const res = await fetch('/api/admin/inventory/item', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingItem.id, ...payload })
      });
      const { data, error } = await res.json();
      if (error) { alert(error); return; }
      setItems(prev => prev.map(i => i.id === editingItem.id ? data : i));
    } else {
      const res = await fetch('/api/admin/inventory/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const { data, error } = await res.json();
      if (error) { alert(error); return; }
      setItems(prev => [...prev, data]);
    }
    setShowItemModal(false);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Supprimer cet item ?')) return;

    try {
      const res = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'row', table: 'inventory_items', column: 'id', id: itemId })
      });
      const { error } = await res.json();
      if (error) throw new Error(error);

      setItems(prev => prev.filter(i => i.id !== itemId));
      setContextItemId(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!confirm('Supprimer cette catégorie ? Tous les items resteront mais seront sans catégorie.')) return;

    try {
      const res = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'row', table: 'inventory_categories', column: 'id', id: catId })
      });
      const { error } = await res.json();
      if (error) throw new Error(error);

      setCategories(prev => prev.filter(c => c.id !== catId));
      if (activeCatId === catId) setActiveCatId(categories[0]?.id || null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Supprimer ces ${selectedIds.length} items ?`)) return;

    try {
      // We could do it in parallel or add a bulk delete endpoint. 
      // For now, let's use the row delete for each ID.
      const promises = selectedIds.map(id => fetch('/api/admin/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'row', table: 'inventory_items', column: 'id', id })
      }));

      const results = await Promise.all(promises);
      for (const res of results) {
        const { error } = await res.json();
        if (error) throw new Error(error);
      }

      setItems(prev => prev.filter(i => !selectedIds.includes(i.id)));
      setSelectedIds([]);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const uploadImage = async (file: File) => {
    const supabase = createClient();
    const sanitizedName = sanitizeFilename(file.name);
    const path = `${id}/inventory/${Date.now()}-${sanitizedName}`;
    const { error } = await supabase.storage.from('enterprise-assets').upload(path, file);
    if (error) { alert(error.message); return; }
    const { data: urlData } = supabase.storage.from('enterprise-assets').getPublicUrl(path);
    return urlData.publicUrl;
  };

  const toggleSelect = (itemId: string) => {
    setSelectedIds(prev => prev.includes(itemId) ? prev.filter(i => i !== itemId) : [...prev, itemId]);
  };

  const exportCSV = () => {
    const headers = ['Nom', 'Prix', 'Devise', 'Unité', 'Stock', 'Statut'];
    const rows = filteredItems.map(i => [i.name, i.price, i.currency, i.unit, i.stock_status, i.is_active ? 'Actif' : 'Inactif']);
    const csvContent = [headers, ...rows].map(e => e.join(',')).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `export_inventory_${id}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
      <div className="w-2 h-2 bg-[#4ade80] rounded-full shadow-[0_0_10px_#4ade80] animate-pulse" />
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-white font-mono overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-80 border-r border-white/5 p-8 flex flex-col bg-[#222222]">
        <InventorySidebar 
          categoriesCount={categories.length}
          itemsCount={items.length}
          maxCategories={maxCats}
          maxItems={maxItems}
          activePage={activePage}
          setActivePage={setActivePage}
          onAddCategory={() => { setEditingCat(null); setShowCatModal(true); }}
        />
        
        {/* Category Selector if in Catalog Mode */}
        {activePage === 'CATALOGUE' && categories.length > 0 && (
          <div className="mt-12 space-y-4">
             <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.4em]">Clusters</p>
             <div className="space-y-1">
                {categories.map(cat => (
                  <button 
                    key={cat.id}
                    onClick={() => setActiveCatId(cat.id)}
                    className={`w-full flex items-center justify-between px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${activeCatId === cat.id ? 'bg-white/5 text-white border border-white/10' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.02]'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </div>
                    <span>{items.filter(i => i.category_id === cat.id).length}</span>
                  </button>
                ))}
             </div>
          </div>
        )}
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-[#1a1a1a] z-10">
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase">{activePage} // {categories.find(c => c.id === activeCatId)?.name || 'ROOT'}</h1>
            <div className="flex items-center gap-4 mt-1">
               <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-[#4ade80]">
                 <div className="w-1 h-1 bg-[#4ade80] rounded-full animate-pulse" />
                 Lattice_Active
               </div>
               <span className="text-white/10">|</span>
               <p className="text-[9px] text-white/30 uppercase tracking-widest">
                 {filteredItems.length} Nodes_Detected
               </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5">
              {(['table', 'grid'] as const).map(v => (
                <button key={v} onClick={() => setViewMode(v)}
                  className={`p-2 rounded-lg transition-all ${viewMode === v ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}>
                  {v === 'table' ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
                </button>
              ))}
            </div>
            <button onClick={() => { setEditingItem(null); setShowItemModal(true); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#4ade80] text-black text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-[#3bc870] transition-all shadow-[0_0_20px_rgba(74,222,128,0.15)]">
              <Plus className="w-4 h-4" /> Deploy_Unit
            </button>
          </div>
        </header>

        {/* TOOLBAR */}
        <div className="px-8 py-4 border-b border-white/5 flex items-center gap-4 bg-[#202020]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <input 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Query_Node_Reference..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-[11px] text-white outline-none focus:border-[#4ade80]/40 transition-all font-mono"
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg">
            <Filter className="w-3.5 h-3.5 text-white/20" />
            <select 
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-transparent text-[10px] font-bold uppercase tracking-widest text-white/60 outline-none cursor-pointer"
            >
              <option value="ALL">All_Statuses</option>
              {Object.entries(STOCK_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold text-white/40 hover:text-white transition-all uppercase tracking-widest border border-white/5 rounded-lg hover:border-white/20">
            <Download className="w-3.5 h-3.5" /> Export_Data
          </button>
        </div>

        {/* MAIN DISPLAY */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          
          {/* STATS STRIP */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total_Nodes', value: stats.total, color: 'text-white' },
              { label: 'Rupture_Stock', value: stats.outOfStock, color: 'text-red-500' },
              { label: 'Inactive_Lattice', value: stats.inactive, color: 'text-white/30' },
              { label: 'Lattice_Valuation', value: `${stats.value.toLocaleString()} FCFA`, color: 'text-[#4ade80]' },
            ].map(s => (
              <div key={s.label} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                <p className="text-[8px] text-white/30 uppercase tracking-[0.3em] font-black">{s.label}</p>
                <p className={`text-lg font-bold tracking-tighter mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {activePage === 'CATALOGUE' && (
            <>
              {viewMode === 'table' ? (
                <div className="bg-white/[0.01] border border-white/5 rounded-3xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02]">
                        <th className="px-6 py-4 w-10">
                          <button 
                            onClick={() => setSelectedIds(selectedIds.length === filteredItems.length ? [] : filteredItems.map(i => i.id))}
                            className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${selectedIds.length === filteredItems.length && filteredItems.length > 0 ? 'bg-[#4ade80] border-[#4ade80]' : 'border-white/10'}`}
                          >
                            {selectedIds.length === filteredItems.length && filteredItems.length > 0 && <Check className="w-3 h-3 text-black" />}
                          </button>
                        </th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.4em] text-white/30">Node_Description</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.4em] text-white/30">Valuation</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.4em] text-white/30">Protocol_Status</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.4em] text-white/30">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredItems.map(item => (
                        <tr key={item.id} className={`group hover:bg-white/[0.02] transition-all ${selectedIds.includes(item.id) ? 'bg-[#4ade80]/5' : ''}`}>
                          <td className="px-6 py-4">
                            <button onClick={() => toggleSelect(item.id)}
                              className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${selectedIds.includes(item.id) ? 'bg-[#4ade80] border-[#4ade80]' : 'border-white/10 group-hover:border-white/30'}`}>
                              {selectedIds.includes(item.id) && <Check className="w-3 h-3 text-black" />}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                  {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-white/20" />}
                               </div>
                               <div>
                                  <p className="text-[11px] font-bold uppercase tracking-wider">{item.name}</p>
                                  <p className="text-[9px] text-white/30 truncate max-w-[200px]">{item.description || 'No detailed specs'}</p>
                               </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-[11px] font-bold text-[#4ade80]">{item.price.toLocaleString()} <span className="text-[9px] text-white/20 ml-1">{item.currency}</span></p>
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-2">
                               <div className="w-1 h-1 rounded-full" style={{ backgroundColor: STOCK_CONFIG[item.stock_status].color }} />
                               <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: STOCK_CONFIG[item.stock_status].color }}>{STOCK_CONFIG[item.stock_status].label}</span>
                             </div>
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                <button onClick={() => { setEditingItem(item); setShowItemModal(true); }} className="p-2 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleDeleteItem(item.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredItems.length === 0 && (
                    <div className="py-20 text-center">
                       <p className="text-[10px] text-white/20 uppercase tracking-widest italic">Zero_Nodes_Synchronized_In_Lattice</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                   {filteredItems.map(item => (
                     <ItemCard 
                        key={item.id} 
                        item={item as any} 
                        category={{ id: item.category_id! }} 
                        onEdit={() => { setEditingItem(item); setShowItemModal(true); }} 
                        onDelete={() => handleDeleteItem(item.id)} 
                        onToggle={() => {}} 
                     />
                   ))}
                </div>
              )}
            </>
          )}

          {activePage === 'CATÉGORIES' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {categories.map(cat => (
                 <motion.div key={cat.id} whileHover={{ y: -4 }} className="bg-white/[0.01] border border-white/5 p-8 rounded-3xl group transition-all hover:border-white/20">
                    <div className="flex items-center justify-between mb-8">
                       <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 group-hover:border-white/30 transition-all">
                          <Layers className="w-6 h-6 text-[#4ade80]" />
                       </div>
                       <div className="flex items-center gap-2">
                          <button onClick={() => { setEditingCat(cat); setShowCatModal(true); }} className="p-2 rounded-lg hover:bg-white/10 text-white/20 hover:text-white transition-all"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all"><Trash2 className="w-4 h-4" /></button>
                       </div>
                    </div>
                    <div className="space-y-4">
                       <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color, boxShadow: `0 0 10px ${cat.color}` }} />
                          <h3 className="text-sm font-bold uppercase tracking-[0.2em]">{cat.name}</h3>
                       </div>
                       <p className="text-[10px] text-white/30 uppercase tracking-widest leading-relaxed">{cat.description || 'Lattice Cluster Protocol // Unspecified'}</p>
                       <div className="pt-4 flex items-center justify-between border-t border-white/5">
                          <div className="flex items-center gap-2">
                             <Package className="w-3 h-3 text-white/20" />
                             <span className="text-[9px] font-bold text-white/40">{items.filter(i => i.category_id === cat.id).length} Units</span>
                          </div>
                          <span className="text-[8px] font-black text-white/10 uppercase tracking-widest">{cat.attribute_schema?.length || 0} Attrib_Slots</span>
                       </div>
                    </div>
                 </motion.div>
               ))}
               <button onClick={() => { setEditingCat(null); setShowCatModal(true); }} 
                 className="bg-white/[0.01] border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center p-8 gap-4 hover:border-[#4ade80]/40 transition-all group">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#4ade80]/20 transition-all">
                     <Plus className="w-6 h-6 text-white/10 group-hover:text-[#4ade80]" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 group-hover:text-white">Initialize_New_Cluster</p>
               </button>
            </div>
          )}

        </div>

        {/* BULK ACTIONS */}
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div 
               initial={{ y: 100, x: '-50%' }} animate={{ y: 0, x: '-50%' }} exit={{ y: 100, x: '-50%' }}
               className="fixed bottom-12 left-1/2 z-50 flex items-center gap-8 px-8 py-4 bg-[#111] border border-white/10 rounded-2xl shadow-2xl backdrop-blur-3xl"
            >
              <div className="flex items-center gap-4 pr-8 border-r border-white/10">
                 <div className="w-8 h-8 rounded-lg bg-[#4ade80] text-black flex items-center justify-center font-black text-xs">
                   {selectedIds.length}
                 </div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Cluster_Nodes_Selected</p>
              </div>
              <div className="flex items-center gap-4">
                 <button className="flex items-center gap-2 text-[10px] font-bold text-white/40 hover:text-white transition-all uppercase tracking-widest">
                    <Eye className="w-4 h-4" /> Toggle_Visibility
                 </button>
                 <button onClick={handleBulkDelete} className="flex items-center gap-2 text-[10px] font-bold text-red-500/60 hover:text-red-500 transition-all uppercase tracking-widest">
                    <Trash2 className="w-4 h-4" /> Purge_Selected
                 </button>
                 <button onClick={() => setSelectedIds([])} className="p-2 ml-4 rounded-xl bg-white/5 text-white/20 hover:text-white">
                    <X className="w-4 h-4" />
                 </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* MODALS */}
      <CategoryModal 
        isOpen={showCatModal} 
        onClose={() => setShowCatModal(false)}
        onSave={handleSaveCategory}
        editingCategory={editingCat as any}
      />

      <ItemModal 
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        onSave={handleSaveItem}
        onUploadImage={uploadImage}
        editingItem={editingItem as any}
        selectedCategory={categories.find(c => c.id === (editingItem?.category_id || activeCatId)) || null}
      />

    </div>
  );
}
