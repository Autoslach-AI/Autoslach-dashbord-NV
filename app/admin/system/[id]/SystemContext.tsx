"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
const supabase = createClient();

interface AgentState {
  name: string;
  isActive: boolean;
  icon?: string;
}

interface SystemContextType {
  enterpriseId: string | null;
  enterprise: any | null;
  planDef: any | null;
  agentsState: Record<string, AgentState>;
  updateAgent: (agentId: string, newState: Partial<AgentState>) => void;
  refreshEnterprise: () => Promise<void>;
  loading: boolean;
}

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export function SystemProvider({ children, enterpriseId }: { children: React.ReactNode, enterpriseId: string | null }) {
  const [agentsState, setAgentsState] = useState<Record<string, AgentState>>({});
  const [enterprise, setEnterprise] = useState<any | null>(null);
  const [planDef, setPlanDef] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!enterpriseId) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/admin/enterprise/${enterpriseId}`);
      const { enterprise: ent, agents: agentsData, planDef: plan } = await res.json();

      if (ent) {
        setEnterprise(ent);
        setPlanDef(plan);
        const newAgentsState: Record<string, AgentState> = {};
        agentsData?.forEach((agent: any) => {
          newAgentsState[agent.id] = {
            name: agent.name,
            isActive: agent.status === 'active'
          };
        });
        setAgentsState(newAgentsState);
      }
    } catch (error) {
      console.error('Error loading system context:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [enterpriseId]);

  const refreshEnterprise = async () => {
    await loadData();
  };

  const updateAgent = (agentId: string, newState: Partial<AgentState>) => {
    setAgentsState(prev => ({
      ...prev,
      [agentId]: {
        ...prev[agentId],
        ...newState,
        // Default values if not initialized
        name: prev[agentId]?.name || newState.name || agentId.replace(/_/g, ' '),
        isActive: prev[agentId]?.isActive ?? (newState.isActive ?? true),
      }
    }));
  };

  return (
    <SystemContext.Provider value={{ 
      enterpriseId, 
      enterprise, 
      planDef, 
      agentsState, 
      updateAgent, 
      refreshEnterprise, 
      loading 
    }}>
      {children}
    </SystemContext.Provider>
  );
}

export function useSystem() {
  const context = useContext(SystemContext);
  if (context === undefined) {
    throw new Error('useSystem must be used within a SystemProvider');
  }
  return context;
}
