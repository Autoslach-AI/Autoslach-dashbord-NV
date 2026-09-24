"use client";

import React, { useState, useEffect } from 'react';
import { X, Check, Plus } from 'lucide-react';
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
  description: string | null;
  color: string;
  attribute_schema: AttributeField[];
  is_active: boolean;
  sort_order: number;
}

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: Partial<Category>, schema: AttributeField[]) => Promise<void>;
  editingCategory: Category | null;
}

export function CategoryModal({ isOpen, onClose, onSave, editingCategory }: CategoryModalProps) {
  const [form, setForm] = useState<Partial<Category>>({
    name: '',
    description: '',
    color: '#4ade80',
    is_active: true
  });
  const [attrSchema, setAttrSchema] = useState<AttributeField[]>([]);

  useEffect(() => {
    if (editingCategory) {
      setForm({ ...editingCategory });
      setAttrSchema(editingCategory.attribute_schema || []);
    } else {
      setForm({
        name: '',
        description: '',
        color: '#4ade80',
        is_active: true
      });
      setAttrSchema([]);
    }
  }, [editingCategory, isOpen]);

  const updateAttr = (index: number, field: keyof AttributeField, value: any) => {
    const newSchema = [...attrSchema];
    (newSchema[index] as any)[field] = value;
    setAttrSchema(newSchema);
  };

  const removeAttr = (index: number) => {
    setAttrSchema(prev => prev.filter((_, i) => i !== index));
  };

  const addAttr = () => {
    setAttrSchema(prev => [...prev, { 
      key: `attr_${Date.now()}`, 
      label: '', 
      type: 'text', 
      required: false 
    }]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-24">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-4xl bg-black border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-full"
          >
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-xl font-bold uppercase tracking-[0.2em]">{editingCategory ? 'Update' : 'Establish'}_Category_Node</h2>
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-mono">Neural Configuration Lattice</p>
              </div>
              <button onClick={onClose} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
                <X className="w-5 h-5 text-white/50" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Category_Name</label>
                    <input 
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({...form, name: e.target.value})}
                      className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-6 py-4 text-xs font-bold text-white uppercase tracking-widest outline-none focus:border-[#4ade80]/40 transition-all"
                      placeholder="Lattice_Identifier"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Cluster_Color_Node</label>
                    <div className="grid grid-cols-8 gap-2">
                       {['#4ade80', '#c084fc', '#f472b6', '#38bdf8', '#fbbf24', '#f87171', '#94a3b8', '#ffffff'].map(c => (
                         <button
                           key={c}
                           onClick={() => setForm({...form, color: c})}
                           className={`w-full aspect-square rounded-lg border transition-all ${form.color === c ? 'scale-110 border-white shadow-[0_0_10px_rgba(255,255,255,0.2)]' : 'border-transparent'}`}
                           style={{ backgroundColor: c }}
                         />
                       ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Node_Description</label>
                  <textarea 
                    value={form.description || ''}
                    onChange={(e) => setForm({...form, description: e.target.value})}
                    className="w-full h-[180px] bg-[#0D0D0D] border border-white/10 rounded-xl px-6 py-4 text-xs text-white/60 outline-none focus:border-[#4ade80]/40 transition-all resize-none"
                    placeholder="Detailed lattice specification..."
                  />
                </div>
              </div>

              {/* ATTRIBUTES BUILDER */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                   <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Dynamic_Attribute_Schema</h3>
                   <button
                     onClick={addAttr}
                     className="flex items-center gap-2 text-[9px] font-bold text-[#4ade80] uppercase tracking-widest hover:text-[#3bc870] transition-colors"
                   >
                     <Plus className="w-3 h-3" /> Insert_Field
                   </button>
                </div>
                
                <div className="space-y-4">
                  {attrSchema.length === 0 ? (
                    <div className="p-12 border border-dashed border-white/5 rounded-2xl text-center">
                       <p className="text-[10px] text-white/20 uppercase tracking-widest">No_Custom_Attributes_Assigned</p>
                    </div>
                  ) : (
                    attrSchema.map((attr, i) => (
                      <div key={i} className="space-y-4 p-6 bg-white/[0.02] border border-white/5 rounded-2xl group relative">
                        <button 
                          onClick={() => removeAttr(i)}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <div className="grid grid-cols-3 gap-6">
                          <div className="space-y-2">
                            <label className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Field_Label</label>
                            <input
                              value={attr.label}
                              onChange={(e) => updateAttr(i, 'label', e.target.value)}
                              placeholder="Ex: Taille..."
                              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-[11px] text-white outline-none focus:border-white/20"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Data_Type</label>
                            <select
                              value={attr.type}
                              onChange={(e) => updateAttr(i, 'type', e.target.value as any)}
                              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-[11px] text-white outline-none appearance-none font-mono"
                            >
                              <option value="text">Texte libre</option>
                              <option value="number">Nombre</option>
                              <option value="boolean">Oui/Non</option>
                              <option value="select">Liste choix unique</option>
                              <option value="multiselect">Liste choix multiple</option>
                              <option value="color">Couleur</option>
                              <option value="date">Date</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-4 pt-6">
                            <label className="flex items-center gap-3 cursor-pointer group/cb">
                              <div 
                                onClick={() => updateAttr(i, 'required', !attr.required)}
                                className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center ${attr.required ? 'bg-[#4ade80] border-[#4ade80]' : 'border-white/20 hover:border-white/40'}`}
                              >
                                {attr.required && <Check className="w-3 h-3 text-black" />}
                              </div>
                              <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest group-hover/cb:text-white/60 transition-colors">Mandatory</span>
                            </label>
                          </div>
                        </div>
                        
                        {(attr.type === 'select' || attr.type === 'multiselect') && (
                          <div className="space-y-2 pt-2 border-t border-white/5">
                            <label className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Lattice_Options // Comma Separated</label>
                            <input
                              value={(attr.options || []).join(', ')}
                              onChange={(e) => updateAttr(i, 'options', e.target.value.split(',').map(s => s.trim()))}
                              placeholder="Small, Medium, Large..."
                              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-[11px] text-white/60 outline-none focus:border-white/20 italic"
                            />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-white/5 bg-white/[0.01] flex justify-end gap-4">
              <button onClick={onClose} className="px-8 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest hover:text-white transition-colors">Cancel_Abort</button>
              <button 
                onClick={() => onSave(form, attrSchema)}
                className="px-10 py-4 bg-[#4ade80] text-black text-[10px] font-bold uppercase tracking-widest rounded-2xl hover:bg-[#3bc870] transition-all shadow-[0_0_20px_rgba(74,222,128,0.2)]"
              >
                Commit_Lattice_Update
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
