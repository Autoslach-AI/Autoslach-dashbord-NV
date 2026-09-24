import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const revalidate = 30;

export async function GET() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Fetch available plans (excluding those with no agents allowed like STARTUP)
    const { data: plansData } = await supabaseAdmin
      .from('plan_definitions')
      .select('plan_name')
      .gt('max_agents_allowed', 0)
      .order('price_cents', { ascending: true });
    
    const availablePlans = plansData?.map(p => p.plan_name) || [];

    // 2. Fetch clients from v_clients_dev
    const { data: clients, error: clientError } = await supabaseAdmin
      .from('v_clients_dev')
      .select('*')
      .order('created_at', { ascending: false });

    if (clientError) throw clientError;

    // 3. Fetch all active intelligence logs to process priorities
    const { data: intelLogs } = await supabaseAdmin
      .from('admin_intelligence_logs')
      .select('client_id, issue_type, raw_context, created_at')
      .order('created_at', { ascending: false });

    const processedClients = (clients || []).map(client => {
      const id = client.id;
      const clientLogs = intelLogs?.filter(l => l.client_id === id) || [];
      
      // Strict Priority Logic
      // Priority 1: SECURITY
      const securityLog = clientLogs.find(l => l.issue_type === 'SECURITY');
      // Priority 2: AGENT_ERROR
      const agentErrorLog = clientLogs.find(l => l.issue_type === 'AGENT_ERROR');
      // Priority 3: TOKEN_WARNING
      const tokenWarningLog = clientLogs.find(l => l.issue_type === 'TOKEN_WARNING');
      // Priority 4: CHURN_RISK
      const churnRiskLog = clientLogs.find(l => l.issue_type === 'CHURN_RISK');
      // Priority 5: MESSAGE
      const messageLog = clientLogs.find(l => l.issue_type === 'MESSAGE');
      // Priority 6: UPSELL
      const upsellLog = clientLogs.find(l => l.issue_type === 'UPSELL');

      let intel: any = {
        type: 'OPTIMAL',
        color: 'gray',
        message: 'SYSTÈME OPTIMAL',
        clickable: false,
        link: null,
        created_at: null
      };

      const topLog = securityLog || agentErrorLog || tokenWarningLog || churnRiskLog || messageLog || upsellLog;

      if (securityLog) {
        intel = {
          type: 'SECURITY',
          color: 'red',
          message: 'ALERTE SÉCURITÉ DÉTECTÉE',
          clickable: true,
          link: `/admin/system/${id}/agents`,
          created_at: securityLog.created_at
        };
      } else if (agentErrorLog) {
        intel = {
          type: 'AGENT_ERROR',
          color: 'red',
          message: agentErrorLog.raw_context || 'ERREUR AGENT',
          clickable: true,
          link: `/admin/system/${id}/agents`,
          created_at: agentErrorLog.created_at
        };
      } else if (tokenWarningLog) {
        intel = {
          type: 'TOKEN_WARNING',
          color: 'orange',
          message: tokenWarningLog.raw_context || 'LIMITE TOKENS PROCHE',
          clickable: true,
          link: `/admin/system/${id}/settings`,
          created_at: tokenWarningLog.created_at
        };
      } else if (churnRiskLog) {
        intel = {
          type: 'CHURN_RISK',
          color: 'orange',
          message: churnRiskLog.raw_context || 'RISQUE DE DÉPART',
          clickable: true,
          link: `/admin/system/${id}`,
          created_at: churnRiskLog.created_at
        };
      } else if (messageLog) {
        intel = {
          type: 'MESSAGE',
          color: 'blue',
          message: `NOUVEAU MESSAGE — ${messageLog.raw_context?.substring(0, 30)}...`,
          clickable: true,
          link: `/admin`,
          created_at: messageLog.created_at
        };
      } else if (upsellLog) {
        intel = {
          type: 'UPSELL',
          color: 'green',
          message: upsellLog.raw_context || 'OPPORTUNITÉ UPSELL',
          clickable: true,
          link: `/admin/system/${id}/settings`,
          created_at: upsellLog.created_at
        };
      }

      // Calculate token usage percent
      const tokenUsagePercent = client.token_budget > 0 
        ? (client.total_tokens_consumed / client.token_budget) * 100 
        : 0;

      return {
        ...client,
        token_usage_percent: tokenUsagePercent,
        intelligence: intel
      };
    });

    return NextResponse.json({
      clients: processedClients,
      availablePlans: availablePlans,
      total: processedClients.length
    });

  } catch (error: any) {
    console.error("FLEET_API_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
