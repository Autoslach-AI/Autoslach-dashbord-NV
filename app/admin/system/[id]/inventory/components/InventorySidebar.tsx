"use client";

import React from 'react';
import { Package, FolderOpen, LayoutGrid, Search, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

interface InventoryStatsProps {
  categoriesCount: number;
  itemsCount: number;
  maxCategories: number;
  maxItems: number;
  activePage: string;
  setActivePage: (page: string) => void;
  onAddCategory: () => void;
}

export function InventorySidebar({ 
  categoriesCount, 
  itemsCount, 
  maxCategories, 
  maxItems,
  activePage,
  setActivePage,
  onAddCategory
}: InventoryStatsProps) {
  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.4em]">Structure_Lattice</h3>
        <nav className="space-y-2">
          {[
            { id: 'CATALOGUE', label: 'Catalogue', icon: LayoutGrid },
            { id: 'CATÉGORIES', label: 'Catégories', icon: FolderOpen },
            { id: 'ITEMS', label: 'Items', icon: Package },
          ].map(page => (
            <button
              key={page.id}
              onClick={() => setActivePage(page.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all border group ${
                activePage === page.id 
                  ? 'bg-[#4ade80]/10 border-[#4ade80]/20 text-[#4ade80]' 
                  : 'border-transparent text-white/20 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              <page.icon className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">{page.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* METRICS */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.4em]">Resource_Quota</h3>
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
             <p className="text-[8px] text-white/40 uppercase tracking-widest">Catégories_Deployed</p>
             <div className="flex justify-between items-end">
                <span className={`text-sm font-bold ${categoriesCount >= maxCategories * 0.8 ? 'text-orange-400' : 'text-[#4ade80]'}`}>
                  {categoriesCount} / {maxCategories}
                </span>
                <span className="text-[8px] text-white/20 uppercase">Units</span>
             </div>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
             <p className="text-[8px] text-white/40 uppercase tracking-widest">Inventory_Items</p>
             <div className="flex justify-between items-end">
                <span className={`text-sm font-bold ${itemsCount >= maxItems * 0.8 ? 'text-orange-400' : 'text-[#4ade80]'}`}>
                  {itemsCount} / {maxItems}
                </span>
                <span className="text-[8px] text-white/20 uppercase">Units</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
