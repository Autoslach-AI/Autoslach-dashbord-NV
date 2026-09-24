import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — charger toutes les intégrations d'une enterprise
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const enterprise_id = searchParams.get('enterprise_id')
    if (!enterprise_id) return NextResponse.json({ error: 'enterprise_id requis' }, { status: 400 })

    const { data, error } = await supabase
      .from('enterprise_integrations')
      .select('*')
      .eq('enterprise_id', enterprise_id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — créer une intégration
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { enterprise_id, service_name, integration_type, endpoint_url, secret_key, connected_agent_id, config } = body
    if (!enterprise_id || !service_name || !integration_type) {
      return NextResponse.json({ error: 'enterprise_id, service_name et integration_type requis' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('enterprise_integrations')
      .insert([{ enterprise_id, service_name, integration_type, endpoint_url, secret_key, connected_agent_id, config: config ?? {}, is_active: true }])
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH — activer/désactiver une intégration
export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { id, is_active } = body
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    const { data, error } = await supabase
      .from('enterprise_integrations')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
