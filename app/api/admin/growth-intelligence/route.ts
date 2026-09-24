import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const revalidate = 30;

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Fetch Enterprises for usage and status
  const { data: enterprises, error: entError } = await supabase
    .from('enterprises')
    .select('id, name, token_budget, total_tokens_consumed, status, package_type')

  if (entError) {
    return NextResponse.json({ error: entError.message }, { status: 500 })
  }

  // 2. Fetch Upsell logs
  const { data: logs, error: logsError } = await supabase
    .from('admin_intelligence_logs')
    .select('*')
    .eq('is_upsell_opportunity', true)
    .order('created_at', { ascending: false })
    .limit(3)

  const upsellOpportunities = enterprises
    .filter(e => {
      const usagePercent = e.token_budget > 0 ? (e.total_tokens_consumed / e.token_budget) * 100 : 0
      return usagePercent > 80
    })
    .map(e => ({
      enterprise_id: e.id,
      name: e.name,
      package_type: e.package_type,
      usage_percent: Math.round((e.total_tokens_consumed / e.token_budget) * 100),
      recommendation: e.package_type === 'BUSINESS' ? 'Proposer upgrade ENTERPRISE' : 'Proposer upgrade BUSINESS'
    }))

  const churnRisks = enterprises
    .filter(e => e.status === 'WARNING' || e.status === 'CRITICAL')
    .map(e => ({
      enterprise_id: e.id,
      name: e.name,
      status: e.status
    }))

  return NextResponse.json({
    upsellOpportunities,
    churnRisks,
    totalOpportunities: upsellOpportunities.length + churnRisks.length
  })
}
