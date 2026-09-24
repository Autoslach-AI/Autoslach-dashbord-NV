"use client";

import React from 'react';
import { Package, Pencil, Eye, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface InventoryItem {
  id: string;
  name: string;
  price: number;
  currency: string;
  unit: string;
  image_url: string | null;
  is_active: boolean;
  stock_status: 'AVAILABLE' | 'OUT_OF_STOCK' | 'DISCONTINUED';
  attributes: Record<string, any>;
}

interface Category {
  id: string;
}

interface ItemCardProps {
  item: InventoryItem;
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}

export function ItemCard({ item, category, onEdit, onDelete, onToggle }: ItemCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-[#111] border rounded-xl overflow-hidden group transition-all hover:border-white/20 ${item.is_active ? 'border-white/10' : 'border-white/5 opacity-50'}`}
    >
      {/* Image */}
      <div className="h-32 bg-white/5 flex items-center justify-center relative overflow-hidden">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <Package className="w-8 h-8 text-white/10" />
        )}
        {/* Badge stock */}
        <div className={`absolute top-2 right-2 text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
          item.stock_status === 'AVAILABLE' ? 'bg-green-500/20 text-green-400' :
          item.stock_status === 'OUT_OF_STOCK' ? 'bg-red-500/20 text-red-400' :
          'bg-white/10 text-white/40'
        }`}>
          {item.stock_status === 'AVAILABLE' ? 'Dispo' : item.stock_status === 'OUT_OF_STOCK' ? 'Rupture' : 'Arrêté'}
        </div>
        {/* Actions hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
          <button onClick={onEdit} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all">
            <Pencil className="w-3.5 h-3.5 text-white" />
          </button>
          <button onClick={onToggle} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all">
            <Eye className="w-3.5 h-3.5 text-white" />
          </button>
          <button onClick={onDelete} className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/40 transition-all">
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      </div>
      {/* Infos */}
      <div className="p-3 space-y-1.5">
        <p className="text-[12px] font-bold text-white truncate font-mono uppercase tracking-wider">{item.name}</p>
        <p className="text-[11px] text-[#4ade80] font-bold font-mono">
          {item.price > 0 ? `${item.price.toLocaleString()} ${item.currency}` : 'Prix sur demande'}
          {item.unit !== 'unité' && <span className="text-white/30 font-normal"> / {item.unit}</span>}
        </p>
        <div className="pt-1 space-y-0.5">
          {Object.entries(item.attributes || {}).slice(0, 2).map(([key, val]) => (
            <p key={key} className="text-[9px] text-white/30 uppercase tracking-wider font-mono">
              {key.split('_').join(' ')}: <span className="text-white/50">{String(val)}</span>
            </p>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
