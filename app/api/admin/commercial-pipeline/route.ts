import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const revalidate = 30

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Prospects en attente (filtrés par is_test = false via la vue v_prospects_all)
  const { data: prospectLogs, count: prospectsCount } = await supabase
    .from('v_prospects_all')
    .select('id, name, package_type', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(1);

  const lastProspect = prospectLogs?.[0] || null;

  // 2. Upsell opportunities (filtrées par is_test = false)
  const { data: upsellLogs, count: upsellCount } = await supabase
    .from('admin_intelligence_logs')
    .select('id, client_id, enterprises!inner(name)', { count: 'exact' })
    .eq('issue_type', 'UPSELL')
    .eq('enterprises.is_test', false)
    .order('created_at', { ascending: false })
    .limit(1);

  const lastUpsell = upsellLogs?.[0] as any;

  // 3. Churn risks (depuis v_clients_dev comme demandé)
  const { data: churnLogs, count: churnCount } = await supabase
    .from('v_clients_dev')
    .select('id, name, status', { count: 'exact' })
    .in('status', ['WARNING', 'CRITICAL'])
    .order('status', { ascending: true })
    .limit(1);

  const lastChurn = churnLogs?.[0] as any;

  return NextResponse.json({
    total: (prospectsCount || 0) + (upsellCount || 0) + (churnCount || 0),
    prospects: { 
      count: prospectsCount || 0, 
      label: lastProspect ? `${lastProspect.name} · ${lastProspect.package_type}` : "Aucun prospect"
    },
    upsell: { 
      count: upsellCount || 0, 
      label: lastUpsell ? (Array.isArray(lastUpsell.enterprises) ? lastUpsell.enterprises[0]?.name : lastUpsell.enterprises?.name) || "Opportunité" : "Aucune opportunité",
      clientId: lastUpsell?.client_id
    },
    churn: { 
      count: churnCount || 0, 
      label: lastChurn ? `${lastChurn.name} · ${lastChurn.status}` : "Aucun risque",
      enterpriseId: lastChurn?.id
    }
  })
}
