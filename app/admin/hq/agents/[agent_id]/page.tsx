"use client";

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AgentRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params?.agent_id as string;

  useEffect(() => {
    if (agentId === 'axon') {
      router.replace('/admin/hq/agents');
    } else {
      router.replace(`/admin/hq/agents/axon/settings?tab=${agentId}`);
    }
  }, [agentId, router]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center font-mono">
      <Loader2 className="w-6 h-6 text-[#39FF14] animate-spin" />
    </div>
  );
}
