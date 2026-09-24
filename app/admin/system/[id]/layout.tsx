"use client";

import React, { useEffect, useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  User, 
  Users,
  Settings, 
  Cpu, 
  Shield, 
  Zap,
  ChevronRight,
  ArrowLeft,
  X,
  Palette,
  Database,
  Bell
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { SystemProvider, useSystem } from './SystemContext';
import { createClient } from '@/lib/supabase';
import DoubleRibbonIntelligent, { NavItem } from '@/components/DoubleRibbonIntelligent';

const supabase = createClient();

interface ClientData {
  projectId: string;
  companyName: string;
  level: string;
  agents: string[];
  brandColor: string;
}

function SystemLayoutInner({ children, clientData, id }: { children: React.ReactNode, clientData: ClientData, id: string }) {
  const pathname = usePathname();
  const { agentsState } = useSystem();

  const primaryNav: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: `/admin/system/${id}` },
    { id: 'prospects', label: 'Prospect', icon: Users, path: `/admin/system/${id}/prospects` },
    { id: 'lifecycle', label: 'Lifecycle', icon: Zap, path: `/admin/system/${id}/lifecycle` },
    { id: 'analytics', label: 'Analytics', icon: Cpu, path: `/admin/system/${id}/analytics` },
    { id: 'projects', label: 'Projects', icon: LayoutDashboard, path: `/admin/system/${id}/projects` },
    { id: 'inventory', label: 'Inventory', icon: Zap, path: `/admin/system/${id}/inventory` },
    { id: 'knowledge', label: 'Knowledge', icon: Database, path: `/admin/system/${id}/knowledge` },
    { id: 'agents', label: 'Agents', icon: Cpu, type: 'trigger' },
    { id: 'branding',       label: 'Branding',       icon: Palette, path: `/admin/system/${id}/branding` },
    { id: 'notifications',  label: 'Notifications',   icon: Bell,    path: `/admin/system/${id}/notifications` },
    { id: 'profile',        label: 'Profile',         icon: User,    path: `/admin/system/${id}/profile` },
    { id: 'settings', label: 'Settings', icon: Settings, path: `/admin/system/${id}/settings` },
  ];

  // Map visible agents to secondary items
  let visibleAgents = clientData.agents;
  if (clientData.level === "Projet Startup") visibleAgents = visibleAgents.slice(0, 2);
  else if (clientData.level === "Projet Business") visibleAgents = visibleAgents.slice(0, 10);

  const secondaryNav: NavItem[] = visibleAgents.map(agentId => ({
    id: agentId,
    label: agentsState[agentId]?.name || agentId.replace(/_/g, ' '),
    icon: Cpu,
    path: `/admin/system/${id}/agent/${agentId}`
  }));

  return (
    <DoubleRibbonIntelligent
      primaryItems={primaryNav}
      secondaryItems={secondaryNav}
      brandName={clientData.companyName}
      brandIcon={Shield}
      userProfile={{
        name: clientData.companyName,
        email: clientData.level,
      }}
    >
      <div className="max-w-7xl mx-auto min-h-screen">
        {children}
      </div>
    </DoubleRibbonIntelligent>
  );
}

export default function ClientSystemLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const id = params?.id as string;
  const [clientData, setClientData] = useState<ClientData | null>(null);

  useEffect(() => {
    async function fetchClient() {
      if (!id) return;
      
      const res = await fetch(`/api/admin/enterprise/${id}`);
      const { enterprise, agents: agentsData } = await res.json();
      
      if (enterprise) {
        setClientData({
          projectId: enterprise.id,
          companyName: enterprise.name,
          level: enterprise.package_type === 'ENTERPRISE' ? 'Projet Entreprise' : 
                 enterprise.package_type === 'BUSINESS' ? 'Projet Business' : 'Projet Startup',
          agents: agentsData?.map((a: any) => a.id) || [],
          brandColor: enterprise.brand_color || "#4ade80"
        });
      } else {
        setClientData({
          projectId: id,
          companyName: "Disconnected Node",
          level: "Lattice Unknown",
          agents: [],
          brandColor: "#ef4444"
        });
      }
    }

    fetchClient();
  }, [id]);

  if (!clientData) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white/20 font-mono text-xs uppercase tracking-widest">Loading_System_Lattice...</div>;

  return (
    <SystemProvider enterpriseId={id}>
      <SystemLayoutInner clientData={clientData} id={id}>
        {children}
      </SystemLayoutInner>
    </SystemProvider>
  );
}
