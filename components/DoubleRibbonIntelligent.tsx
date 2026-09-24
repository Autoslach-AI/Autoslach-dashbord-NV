'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  ChevronLeft,
  MoreHorizontal, 
  Settings, 
  Search, 
  X,
  LucideIcon
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path?: string;
  type?: 'link' | 'trigger';
  onClick?: () => void;
}

export interface DoubleRibbonProps {
  primaryItems: NavItem[];
  secondaryItems?: NavItem[];
  secondaryTitle?: string;
  userProfile?: {
    name: string;
    email: string;
    avatar?: string;
  };
  onExit?: () => void;
  children: React.ReactNode;
  brandName?: string;
  brandIcon?: LucideIcon;
}

export default function DoubleRibbonIntelligent({
  primaryItems,
  secondaryItems = [],
  secondaryTitle = "Neural_Fleet_Nodes",
  userProfile,
  onExit,
  children,
  brandName = "THE ORACLE",
  brandIcon: BrandIcon
}: DoubleRibbonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPrimaryCollapsed, setIsPrimaryCollapsed] = useState(false);
  const [primaryWidth, setPrimaryWidth] = useState(288); // Default w-72 is 288px
  const [isResizing, setIsResizing] = useState(false);
  const [isSecondaryOpen, setIsSecondaryOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = mouseMoveEvent.clientX;
        if (newWidth >= 80 && newWidth <= 600) {
          setPrimaryWidth(newWidth);
          if (newWidth < 120) {
            setIsPrimaryCollapsed(true);
          } else {
            setIsPrimaryCollapsed(false);
          }
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const handleNavClick = (item: NavItem) => {
    if (item.onClick) {
      item.onClick();
    }
    
    if (item.type === 'trigger') {
      setIsSecondaryOpen(!isSecondaryOpen);
    } else if (item.path) {
      router.push(item.path);
      setIsSecondaryOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#e0e0e0] font-sans selection:bg-white selection:text-black flex overflow-hidden">
      
      {/* PRIMARY RIBBON */}
      <aside 
        ref={sidebarRef}
        style={{ width: isPrimaryCollapsed ? 80 : primaryWidth }}
        className={`fixed left-0 top-0 bottom-0 bg-[#0A0A0A] border-r border-white/10 z-[100] flex flex-col items-center py-8 ${
          isResizing ? '' : 'transition-all duration-500'
        }`}
      >
        {/* RESIZE HANDLE */}
        <div 
          onMouseDown={startResizing}
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#4ade80]/20 transition-colors z-[110]"
        />
        <div className="w-full h-full flex flex-col items-center px-4">
        {/* BRAND AREA */}
        <div className="flex items-center justify-between gap-3 text-white/80 mb-12 px-4 w-full">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-md bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              {BrandIcon ? <BrandIcon className="w-3.5 h-3.5 text-white/40" /> : <Settings className="w-3.5 h-3.5 text-white/40" />}
            </div>
            {!isPrimaryCollapsed && <span className="text-[11px] font-bold tracking-tight uppercase truncate">{brandName}</span>}
          </div>
          <button 
            onClick={() => setIsPrimaryCollapsed(!isPrimaryCollapsed)}
            className="w-6 h-6 rounded bg-white/5 border border-white/10 flex items-center justify-center hover:border-[#4ade80]/40 transition-all text-white/20 hover:text-[#4ade80]"
          >
             {isPrimaryCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          </button>
        </div>

          {/* NAVIGATION */}
          <nav className="space-y-4 flex-1 w-full overflow-y-auto no-scrollbar">
            {primaryItems.map((item) => {
              const isActive = pathname === item.path || (item.type === 'trigger' && isSecondaryOpen);
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={`w-full flex items-center transition-all font-bold uppercase text-[10px] tracking-tight relative group ${
                    isPrimaryCollapsed ? 'justify-center h-12' : 'px-4 py-2.5 gap-3 rounded-lg'
                  } ${
                    isActive 
                      ? 'bg-white/5 text-white' 
                      : 'text-white/30 hover:text-white/60 hover:bg-white/[0.01]'
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${isActive ? 'text-[#4ade80]' : 'text-current'} transition-colors shrink-0`} />
                  {!isPrimaryCollapsed && <span className="flex-1 text-left tracking-[0.1em]">{item.label}</span>}
                  {isActive && !isPrimaryCollapsed && <motion.div layoutId="nav_active" className="absolute left-0 w-1 h-4 bg-[#4ade80] rounded-r-full" />}
                </button>
              );
            })}
          </nav>

          {/* PROFILE / ADMIN NODE */}
          <div className="mt-auto w-full border-t border-white/5 pt-4 space-y-4 relative">
             <AnimatePresence>
               {showProfileMenu && (
                 <motion.div 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: 10 }}
                   className="absolute bottom-full left-0 w-full mb-2 bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden z-[110] shadow-2xl p-1"
                 >
                    <button 
                      onClick={() => setShowProfileMenu(false)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:bg-white/5 hover:text-white transition-all rounded-lg"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Settings</span>
                    </button>
                 </motion.div>
               )}
             </AnimatePresence>
            
            <div 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className={`flex items-center gap-3 transition-all cursor-pointer group rounded-xl ${isPrimaryCollapsed ? 'justify-center h-12' : 'px-2 py-4 hover:bg-white/5'}`}
            >
               <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                  {userProfile?.avatar ? (
                    <img src={userProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <Settings className="w-3.5 h-3.5 text-white/20" />
                  )}
               </div>
               {!isPrimaryCollapsed && (
                 <>
                   <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold truncate text-white/80">{userProfile?.name || 'Admin'}</p>
                      <p className="text-[8px] font-medium truncate text-white/20 uppercase tracking-wider">{userProfile?.email || 'admin@system.io'}</p>
                   </div>
                   <MoreHorizontal className="w-3.5 h-3.5 text-white/20 group-hover:text-white transition-colors" />
                 </>
               )}
            </div>
          </div>
        </div>
      </aside>

      {/* SECONDARY RIBBON */}
      <AnimatePresence>
         {isSecondaryOpen && (
            <motion.aside
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              style={{ left: (isPrimaryCollapsed ? 80 : primaryWidth) + 16 }}
              className={`fixed top-4 bottom-4 bg-[#0a0a0a] border border-white/10 z-[90] flex flex-col py-24 transition-all duration-500 rounded-2xl shadow-2xl w-80`}
            >
               <div className="px-8 mb-10 text-left">
                  <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] font-mono">{secondaryTitle}</h3>
               </div>
               <nav className="flex-1 overflow-y-auto no-scrollbar px-4 space-y-2">
                  {secondaryItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.path) router.push(item.path);
                        setIsPrimaryCollapsed(true);
                      }}
                      className="w-full flex items-center gap-6 px-8 py-5 rounded-2xl transition-all border border-transparent text-white/20 hover:text-white/80 hover:bg-white/[0.02] group"
                    >
                      <div className="relative shrink-0 flex items-center justify-center">
                        <item.icon className="w-4 h-4 text-current transition-colors group-hover:text-[#4ade80]" />
                        <div className="absolute -top-1.5 -right-1.5 w-1.5 h-1.5 rounded-full border border-black bg-[#4ade80] shadow-[0_0_8px_#4ade80]" />
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-[0.2em] font-mono truncate text-left group-hover:text-white transition-colors">
                        {item.label}
                      </span>
                    </button>
                  ))}
               </nav>
            </motion.aside>
         )}
      </AnimatePresence>

      {/* MAIN CONTENT AREA */}
      <main 
        style={{ 
          marginLeft: (isPrimaryCollapsed ? 80 : primaryWidth) + (isSecondaryOpen ? 340 : 16) 
        }}
        className={`flex-1 flex flex-col overflow-hidden bg-[#0A0A0A] relative border border-white/10 m-4 rounded-2xl ${
          isResizing ? '' : 'transition-all duration-500'
        }`}
      >
        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
           {children}
        </div>
      </main>
    </div>
  );
}
