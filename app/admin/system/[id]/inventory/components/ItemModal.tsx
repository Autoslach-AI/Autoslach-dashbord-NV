"use client";

import React, { useState, useEffect } from 'react';
import { X, Package, Upload, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  name: string;
  attribute_schema: AttributeField[];
}

interface InventoryItem {
  id: string;
  category_id: string;
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
  sort_order: number;
}

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<InventoryItem>) => Promise<void>;
  onUploadImage: (file: File) => Promise<string | void>;
  editingItem: InventoryItem | null;
  selectedCategory: Category | null;
}

export function ItemModal({ isOpen, onClose, onSave, onUploadImage, editingItem, selectedCategory }: ItemModalProps) {
  const [form, setForm] = useState<Partial<InventoryItem>>({
    name: '',
    description: '',
    price: 0,
    currency: 'FCFA',
    unit: 'unité',
    image_url: '',
    is_active: true,
    stock_status: 'AVAILABLE',
    attributes: {},
    tags: []
  });

  useEffect(() => {
    if (editingItem) {
      setForm({ ...editingItem });
    } else {
      setForm({
        name: '',
        description: '',
        price: 0,
        currency: 'FCFA',
        unit: 'unité',
        image_url: '',
        is_active: true,
        stock_status: 'AVAILABLE',
        attributes: {},
        tags: []
      });
    }
  }, [editingItem, isOpen]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await onUploadImage(file);
      if (url) setForm(prev => ({ ...prev, image_url: url }));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-12">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            onClick={onClose}
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, x: 20 }}
            animate={{ scale: 1, opacity: 1, x: 0 }}
            exit={{ scale: 0.95, opacity: 0, x: 20 }}
            className="relative w-full max-w-5xl bg-black border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-full"
          >
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl border flex items-center justify-center bg-white/5 border-white/10">
                  <Package className="w-6 h-6 text-[#4ade80]" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-bold uppercase tracking-[0.2em]">{editingItem ? 'Update' : 'Establish'}_Inventory_Unit</h2>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-mono">Cluster: {selectedCategory?.name}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
                <X className="w-5 h-5 text-white/50" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar grid grid-cols-2 gap-12">
               {/* LEFT COLUMN - CORE STATS */}
               <div className="space-y-10">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Item_Identification_Title</label>
                      <input 
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({...form, name: e.target.value})}
                        className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-6 py-5 text-[13px] font-bold text-white outline-none focus:border-[#4ade80]/40 transition-all"
                        placeholder="Unit Identifier..."
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Valuation_Neural_Price</label>
                        <div className="relative">
                           <input 
                            type="number"
                            value={form.price}
                            onChange={(e) => setForm({...form, price: Number(e.target.value)})}
                            className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-6 py-5 text-[13px] font-bold text-white outline-none focus:border-[#4ade80]/40 transition-all pr-20"
                            placeholder="0.00"
                          />
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-bold text-white/20 uppercase">{form.currency}</div>
                        </div>
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Metric_Unit</label>
                         <input 
                            type="text"
                            value={form.unit}
                            onChange={(e) => setForm({...form, unit: e.target.value})}
                            className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-6 py-5 text-[13px] font-bold text-white outline-none focus:border-[#4ade80]/40 transition-all"
                            placeholder="Unité, Kg, Litre..."
                          />
                      </div>
                    </div>

                    <div className="space-y-3">
                       <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Neural_Unit_Media</label>
                       <div 
                         className="border-2 border-dashed border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 bg-white/[0.01] hover:bg-white/[0.02] hover:border-[#4ade80]/20 transition-all group"
                         onClick={() => document.getElementById('item-img-upload')?.click()}
                       >
                         <input 
                           id="item-img-upload"
                           type="file" 
                           className="hidden" 
                           accept="image/*"
                           onChange={handleUpload}
                         />
                         {form.image_url ? (
                           <div className="relative w-full aspect-video rounded-xl overflow-hidden group">
                              <img src={form.image_url} className="w-full h-full object-cover transition-all group-hover:scale-105" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                 <Upload className="w-6 h-6 text-white" />
                              </div>
                           </div>
                         ) : (
                           <>
                             <div className="p-4 rounded-full bg-white/5 text-white/20 group-hover:text-[#4ade80] transition-colors">
                               <Upload className="w-6 h-6" />
                             </div>
                             <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] group-hover:text-white/60">Commit_Visual_Asset</p>
                           </>
                         )}
                       </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                     <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] border-b border-white/5 pb-4">Availability_Protocol</h3>
                     <div className="grid grid-cols-2 gap-4">
                        {[
                          { id: 'AVAILABLE', label: 'In_Stock', color: '#4ade80' },
                          { id: 'OUT_OF_STOCK', label: 'Rupture', color: '#f87171' },
                          { id: 'DISCONTINUED', label: 'Deprecated', color: '#94a3b8' },
                        ].map(status => (
                          <button
                            key={status.id}
                            onClick={() => setForm({...form, stock_status: status.id as any})}
                            className={`px-6 py-4 rounded-2xl border text-[10px] font-bold uppercase tracking-widest transition-all ${
                              form.stock_status === status.id 
                                ? `bg-[${status.color}] text-black border-[${status.color}] shadow-[0_0_15px_rgba(74,222,128,0.2)]`
                                : 'bg-white/[0.02] border-white/5 text-white/40 hover:border-white/10 hover:bg-white/[0.04]'
                            }`}
                            style={form.stock_status === status.id ? { backgroundColor: status.color, color: '#000', borderColor: status.color } : {}}
                          >
                            {status.label}
                          </button>
                        ))}
                     </div>
                  </div>
               </div>

               {/* RIGHT COLUMN - DYNAMIC ATTRIBUTES */}
               <div className="space-y-10">
                  <div className="space-y-6">
                     <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] border-b border-white/5 pb-4">Dynamic_Attribute_Matrix</h3>
                     <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {selectedCategory?.attribute_schema?.map((field: AttributeField) => (
                          <div key={field.key} className="space-y-2 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                            <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">{field.label} {field.required && <span className="text-red-400">*</span>}</label>
                            
                            {field.type === 'text' && (
                              <input 
                                type="text"
                                value={form.attributes?.[field.key] || ''}
                                onChange={(e) => setForm(f => ({ ...f, attributes: { ...f.attributes, [field.key]: e.target.value }}))}
                                className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-xs text-white outline-none focus:border-[#4ade80]/40 transition-all"
                              />
                            )}
                            
                            {field.type === 'number' && (
                              <div className="relative">
                                <input 
                                  type="number"
                                  value={form.attributes?.[field.key] || ''}
                                  onChange={(e) => setForm(f => ({ ...f, attributes: { ...f.attributes, [field.key]: Number(e.target.value) }}))}
                                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-xs text-white outline-none focus:border-[#4ade80]/40 transition-all pr-12"
                                />
                                {field.unit && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] text-white/20">{field.unit}</span>}
                              </div>
                            )}

                            {field.type === 'boolean' && (
                              <div className="flex gap-2">
                                {[true, false].map(v => (
                                  <button
                                    key={String(v)}
                                    onClick={() => setForm(f => ({ ...f, attributes: { ...(f.attributes || {}), [field.key]: v }}))}
                                    className={`flex-1 py-3 rounded-lg border text-[9px] font-bold uppercase tracking-widest transition-all ${form.attributes?.[field.key] === v ? 'bg-[#4ade80]/10 border-[#4ade80]/40 text-[#4ade80]' : 'border-white/5 text-white/20'}`}
                                  >
                                    {v ? 'OUI_TRUE' : 'NON_FALSE'}
                                  </button>
                                ))}
                              </div>
                            )}

                            {(field.type === 'select' || field.type === 'multiselect') && (
                              <div className="relative">
                                <select 
                                  value={field.type === 'select' ? (form.attributes?.[field.key] || '') : ''}
                                  onChange={(e) => {
                                    if (field.type === 'select') {
                                      setForm(f => ({ ...f, attributes: { ...(f.attributes || {}), [field.key]: e.target.value }}))
                                    } else {
                                      const current = form.attributes?.[field.key] || [];
                                      if (!current.includes(e.target.value)) {
                                        setForm(f => ({ ...f, attributes: { ...(f.attributes || {}), [field.key]: [...current, e.target.value] }}))
                                      }
                                    }
                                  }}
                                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-xs text-white outline-none appearance-none"
                                >
                                  <option value="">Select Option...</option>
                                  {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
                                
                                {field.type === 'multiselect' && form.attributes?.[field.key]?.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-3">
                                    {form.attributes?.[field.key].map((v: string) => (
                                      <span key={v} className="px-2 py-1 bg-white/5 border border-white/5 text-[8px] font-bold uppercase rounded flex items-center gap-1">
                                        {v}
                                        <X className="w-2 h-2 cursor-pointer hover:text-red-400" onClick={() => {
                                          const current = form.attributes?.[field.key] || [];
                                          setForm(f => ({ 
                                            ...f, 
                                            attributes: { 
                                              ...(f.attributes || {}), 
                                              [field.key]: current.filter((x: string) => x !== v)
                                            }
                                          }));
                                        }} />
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                     </div>
                  </div>

                  <div className="space-y-4">
                     <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] border-b border-white/5 pb-4">Neural_Tags_Lattice</h3>
                     <div className="flex flex-wrap gap-2 p-4 bg-[#0D0D0D] border border-white/10 rounded-2xl min-h-[60px]">
                       {(form.tags || []).map((tag, i) => (
                         <span key={i} className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/5 text-white/40 text-[9px] font-bold rounded-lg uppercase tracking-widest group">
                           {tag}
                           <button onClick={() => setForm(prev => ({ ...prev, tags: (prev.tags || []).filter((_, j) => j !== i)}))} className="hover:text-red-400"><X className="w-2.5 h-2.5" /></button>
                         </span>
                       ))}
                       <input 
                          type="text" 
                          className="bg-transparent text-[10px] text-white outline-none flex-1 font-mono min-w-[120px] uppercase tracking-widest px-2"
                          placeholder="Insert_Tag_Code..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = e.currentTarget.value.trim().toUpperCase();
                              if (val && !form.tags?.includes(val)) {
                                setForm(prev => ({ ...prev, tags: [...(prev.tags || []), val] }));
                                e.currentTarget.value = '';
                              }
                            }
                          }}
                       />
                     </div>
                  </div>
               </div>
            </div>

            <div className="p-8 border-t border-white/5 bg-white/[0.01] flex justify-end gap-6 items-center">
               <div className="mr-auto flex items-center gap-6">
                  <label className="flex items-center gap-3 cursor-pointer group/node">
                    <div 
                      onClick={() => setForm({...form, is_active: !form.is_active})}
                      className={`w-6 h-6 rounded-lg border transition-all flex items-center justify-center ${form.is_active ? 'bg-[#4ade80] border-[#4ade80]' : 'border-white/20'}`}
                    >
                      {form.is_active && <Check className="w-4 h-4 text-black font-bold" />}
                    </div>
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] group-hover:text-white transition-colors">Node_Active</span>
                  </label>
               </div>
              <button onClick={onClose} className="px-8 py-4 text-[10px] font-bold text-white/40 uppercase tracking-[0.4em] hover:text-white transition-colors">Abort_Sequence</button>
              <button 
                onClick={() => onSave(form)}
                className="px-12 py-5 bg-[#4ade80] text-black text-[11px] font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-[#3bc870] transition-all shadow-[0_0_30px_rgba(74,222,128,0.2)]"
              >
                Commit_Inventory_Unit
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
