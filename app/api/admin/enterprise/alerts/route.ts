import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const EXCLUDED_TYPES = ['NEW_PROSPECT', 'TOKEN_WARNING']

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const enterprise_id  = searchParams.get('enterprise_id')
    const issue_type     = searchParams.get('issue_type')
    const severity       = searchParams.get('severity')
    const page           = parseInt(searchParams.get('page')      ?? '1')
    const page_size      = parseInt(searchParams.get('page_size') ?? '10')

    if (!enterprise_id) {
      return NextResponse.json({ error: 'enterprise_id requis' }, { status: 400 })
    }

    const from = (page - 1) * page_size
    const to   = from + page_size - 1

    let query = supabase
      .from('admin_intelligence_logs')
      .select('id, issue_type, severity_level, raw_context, created_at, is_upsell_opportunity', { count: 'exact' })
      .eq('client_id', enterprise_id)
      .not('issue_type', 'in', `(${EXCLUDED_TYPES.join(',')})`)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (issue_type) query = query.eq('issue_type', issue_type)
    if (severity)   query = query.eq('severity_level', severity)

    const { data, error, count } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data, total: count ?? 0 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
