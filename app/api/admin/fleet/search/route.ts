import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    let query = supabaseAdmin
      .from('enterprises')
      .select(`
        id, 
        name, 
        sector, 
        package_type, 
        token_budget, 
        total_tokens_consumed, 
        status, 
        comm_mode, 
        last_event_text, 
        last_event_at, 
        region, 
        monthly_cost
      `)
      .not('status', 'in', '("PROSPECT","INACTIVE")');

    if (q) {
      query = query.or(`name.ilike.%${q}%,status.ilike.%${q}%,package_type.ilike.%${q}%,region.ilike.%${q}%,sector.ilike.%${q}%,comm_mode.ilike.%${q}%`);
    }

    const { data: enterprises, error: entError } = await query;
    if (entError) throw entError;

    // Data for intelligence (duplicated logic from fleet/route.ts for consistency in response)
    const { data: systemLogs } = await supabaseAdmin
      .from('system_logs')
      .select('enterprise_id, status_color, created_at')
      .order('created_at', { ascending: false });

    const { data: unreadCounts } = await supabaseAdmin
      .from('client_messages')
      .select('enterprise_id, is_read')
      .eq('is_read', false);

    const processedClients = (enterprises || []).map(ent => {
      const id = ent.id;
      const lastSystemLog = systemLogs?.find(l => l.enterprise_id === id);
      const unreadCount = unreadCounts?.filter(m => m.enterprise_id === id).length || 0;
      const tokenUsagePercent = ent.token_budget > 0 
        ? Math.round((ent.total_tokens_consumed / ent.token_budget) * 100) 
        : 0;

      let intelligenceType = 'STABLE';
      let intelligenceSeverity = null;
      let intelligenceMessage = 'Système optimal';
      let intelligenceSourceUrl = `/admin/system/${id}`;
      let intelligenceCreatedAt = ent.last_event_at;

      if (lastSystemLog?.status_color === 'red') {
        intelligenceType = 'SYSTEM_ERROR';
        intelligenceSeverity = 'CRITICAL';
        intelligenceMessage = 'Erreur système critique détectée';
        intelligenceSourceUrl = `/admin/system/${id}/agents`;
        intelligenceCreatedAt = lastSystemLog.created_at;
      } else if (tokenUsagePercent > 80) {
        intelligenceType = 'TOKEN_WARNING';
        intelligenceSeverity = 'WARNING';
        intelligenceMessage = `Client à ${tokenUsagePercent}% de son budget tokens`;
        intelligenceSourceUrl = `/admin/system/${id}/settings`;
        intelligenceCreatedAt = new Date().toISOString();
      } else if (unreadCount > 0) {
        intelligenceType = 'MESSAGE';
        intelligenceSeverity = 'INFO';
        intelligenceMessage = `${unreadCount} message(s) non lu(s)`;
        intelligenceSourceUrl = `/admin/system/${id}/messages`;
        intelligenceCreatedAt = new Date().toISOString(); 
      }

      return {
        ...ent,
        token_usage_percent: tokenUsagePercent,
        unread_messages: unreadCount,
        intelligence: {
          type: intelligenceType,
          severity: intelligenceSeverity,
          message: intelligenceMessage,
          source_url: intelligenceSourceUrl,
          created_at: intelligenceCreatedAt
        }
      };
    });

    const severityOrder: Record<string, number> = {
      'CRITICAL': 0,
      'WARNING': 1,
      'INFO': 2,
      null: 3
    };

    processedClients.sort((a, b) => {
      const sevA = a.intelligence.severity as string | null;
      const sevB = b.intelligence.severity as string | null;
      return (severityOrder[sevA as any] ?? 3) - (severityOrder[sevB as any] ?? 3);
    });

    const regions = Array.from(new Set(enterprises?.map(e => e.region).filter(Boolean)));
    const plans = ["STARTUP", "BUSINESS", "ENTERPRISE", "ELITE"];

    return NextResponse.json({
      clients: processedClients,
      availablePlans: plans,
      availableRegions: regions,
      total: processedClients.length
    });

  } catch (error: any) {
    console.error("SEARCH_API_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
