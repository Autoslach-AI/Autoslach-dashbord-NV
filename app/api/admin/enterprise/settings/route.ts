import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { enterprise_id, ...fields } = body

    if (!enterprise_id) {
      return NextResponse.json({ error: 'enterprise_id requis' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('enterprises')
      .update(fields)
      .eq('enterprise_id', enterprise_id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
