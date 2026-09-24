"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Package, 
  Users, 
  LogOut,
  Shield,
  LayoutDashboard,
  HelpCircle,
  Cpu
} from 'lucide-react';
import { CLIENT_CONFIG } from '@/lib/config/client-config';

export function AdminSidebar({ email }: { email?: string }) {
  const pathname = usePathname();

  const handleLogout = () => {
    // Mock Logout for UI Only Mode
    window.location.href = '/';
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-72 bg-[hsl(20,14.3%,4.1%)] border-r border-white/5 z-50 flex flex-col font-sans transition-all">
      <div className="p-8 h-24 flex items-center border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
            <Shield className="w-5 h-5 text-black" />
          </div>
          <Link href="/admin" className="text-xl font-black tracking-tighter text-white">{CLIENT_CONFIG.identity.name}<span className="text-white/20">.HUB</span></Link>
        </div>
      </div>
      
      <nav className="flex-1 p-6 flex flex-col gap-3 mt-4 overflow-y-auto">
        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 ml-2 mb-2">CREATOR CONTROL PANEL</label>
        
        <NavItem 
          href="/admin" 
          icon={<Cpu />} 
          label="The Cockpit" 
          active={pathname === '/admin'} 
        />
        
        <NavItem 
          href="/admin/support" 
          icon={<HelpCircle />} 
          label="Support Center" 
          active={pathname === '/admin/support'} 
        />
        
        <NavItem 
          href="/admin/inventory" 
          icon={<Package />} 
          label="Inventory Management" 
          active={pathname.startsWith('/admin/inventory')} 
        />
        
        <NavItem 
          href="/admin/sections" 
          icon={<LayoutDashboard />} 
          label="Homepage Sections" 
          active={pathname === '/admin/sections'} 
        />
      </nav>

      <div className="p-8 border-t border-white/5 bg-black/20">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-black text-white/40">
            AD
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-[11px] font-black uppercase tracking-widest text-white">The Creator</p>
            <p className="text-[9px] text-white/20 truncate font-bold uppercase italic">{email || 'Not Signed In'}</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.3em] font-black transition-all text-white/60 hover:text-white"
        >
          <LogOut className="w-4 h-4" />
          Terminate
        </button>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, href, active = false }: { icon: React.ReactNode, label: string, href: string, active?: boolean }) {
  return (
    <Link 
      href={href}
      className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all group ${active ? 'bg-white text-black font-bold' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
    >
      <span className="w-5 h-5">{icon}</span>
      <span className="text-[11px] uppercase tracking-widest font-black">{label}</span>
      {active && <div className="ml-auto w-1 h-1 bg-black rounded-full"></div>}
    </Link>
  );
}
