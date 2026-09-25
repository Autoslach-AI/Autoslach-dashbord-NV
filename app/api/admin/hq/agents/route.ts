import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('agent_configs')
      .select('*')
      .order('agent_id')

    if (error) return NextResponse.json(
      { error: error.message }, { status: 400 }
    )

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message }, { status: 500 }
    )
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = getSupabase()
    const body = await req.json()
    const { agent_id, ...fields } = body

    if (!agent_id) return NextResponse.json(
      { error: 'agent_id requis' }, { status: 400 }
    )

    const { data, error } = await supabase
      .from('agent_configs')
      .update(fields)
      .eq('agent_id', agent_id)
      .select()
      .single()

    if (error) return NextResponse.json(
      { error: error.message }, { status: 400 }
    )

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message }, { status: 500 }
    )
  }
}
