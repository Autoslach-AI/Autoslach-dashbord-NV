import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, enterprise_id } = body

    if (!enterprise_id || !action) {
      return NextResponse.json({ error: 'enterprise_id et action requis' }, { status: 400 })
    }

    // Action 1 — Suspendre l'enterprise
    if (action === 'SUSPEND') {
      const { error } = await supabase
        .from('enterprises')
        .update({ status: 'SUSPENDED' })
        .eq('enterprise_id', enterprise_id)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ success: true, action: 'SUSPEND' })
    }

    // Action 2 — Réactiver l'enterprise
    if (action === 'REACTIVATE') {
      const { error } = await supabase
        .from('enterprises')
        .update({ status: 'ACTIVE' })
        .eq('enterprise_id', enterprise_id)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ success: true, action: 'REACTIVATE' })
    }

    // Action 3 — Reset tokens
    if (action === 'RESET_TOKENS') {
      const { error } = await supabase
        .from('enterprises')
        .update({ total_tokens_consumed: 0 })
        .eq('enterprise_id', enterprise_id)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ success: true, action: 'RESET_TOKENS' })
    }

    return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
