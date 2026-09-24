import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const revalidate = 30;

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: logs, error } = await supabase
    .from('admin_intelligence_logs')
    .select(`
      *,
      enterprises!inner(name)
    `)
    .in('issue_type', ['AGENT_ERROR', 'SECURITY', 'CHURN_RISK', 'FEEDBACK_NEGATIF'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('INTELLIGENCE_SUMMARY_ERROR:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const totalActive = logs?.length || 0
  const latestLog = logs?.[0] || null

  return NextResponse.json({
    totalActive,
    topMessage: latestLog?.raw_context || null,
    topSeverity: latestLog?.severity_level || null,
    topIssueType: latestLog?.issue_type || null,
    topEnterpriseId: latestLog?.client_id || null,
    clientName: latestLog?.enterprises?.name || null
  })
}
