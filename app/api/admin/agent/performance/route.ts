import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const agent_id = searchParams.get('agent_id')
    if (!agent_id) return NextResponse.json({ error: 'agent_id requis' }, { status: 400 })

    const { data, error } = await supabase
      .from('agent_performance_logs')
      .select('*')
      .eq('agent_id', agent_id)
      .order('period_start', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { agent_id, enterprise_id, period_start, period_end, tokens_consumed, tasks_completed, avg_response_time, quality_score } = body

    if (!agent_id || !enterprise_id || !period_start || !period_end) {
      return NextResponse.json({ error: 'agent_id, enterprise_id, period_start, period_end requis' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('agent_performance_logs')
      .insert([{ agent_id, enterprise_id, period_start, period_end, tokens_consumed, tasks_completed, avg_response_time, quality_score }])
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
