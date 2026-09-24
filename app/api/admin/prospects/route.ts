import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const package_type    = searchParams.get('package_type')
    const prospect_status = searchParams.get('prospect_status')
    const search          = searchParams.get('search')
    const period          = searchParams.get('period')
    const offset          = parseInt(searchParams.get('offset') ?? '0')
    const limit           = parseInt(searchParams.get('limit')  ?? '50')

    let query = supabase
      .from('enterprises')
      .select(
        'enterprise_id, name, contact_name, email, phone, region, sector, package_type, template_id, monthly_cost, message, status, prospect_status, prospect_score, rappel_at, internal_notes, verbatim, source_contact, next_action, valeur_estimee_fcfa, created_at, activated_at, logo_url, assets_urls',
        { count: 'exact' }
      )
      .eq('status', 'PROSPECT')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (package_type && package_type !== 'ALL') {
      query = query.eq('package_type', package_type)
    }
    if (prospect_status && prospect_status !== 'ALL') {
      query = query.eq('prospect_status', prospect_status)
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,contact_name.ilike.%${search}%,phone.ilike.%${search}%`)
    }
    if (period && period !== 'ALL') {
      const now = new Date()
      let from: Date
      if (period === 'DAY')        from = new Date(now.setHours(0,0,0,0))
      else if (period === 'WEEK')  { from = new Date(now); from.setDate(from.getDate() - 7) }
      else if (period === 'MONTH') { from = new Date(now); from.setMonth(from.getMonth() - 1) }
      else if (period === 'YEAR')  { from = new Date(now); from.setFullYear(from.getFullYear() - 1) }
      else from = new Date(0)
      query = query.gte('created_at', from.toISOString())
    }

    const { data, error, count } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // — JOIN templates côté serveur —
    const templateIds = [...new Set((data ?? []).map(e => e.template_id).filter(Boolean))]
    let templatesMap: Record<string, { title: string; price_fcfa: number; preview_url: string }> = {}

    if (templateIds.length > 0) {
      const { data: tplData } = await supabase
        .from('templates')
        .select('id, title, price_fcfa, preview_url')
        .in('id', templateIds)

      for (const t of tplData ?? []) {
        templatesMap[t.id] = {
          title:       t.title,
          price_fcfa:  t.price_fcfa,
          preview_url: t.preview_url
        }
      }
    }

    const enriched = (data ?? []).map(e => ({
      ...e,
      template_title:       e.template_id ? (templatesMap[e.template_id]?.title       ?? null) : null,
      template_price_fcfa:  e.template_id ? (templatesMap[e.template_id]?.price_fcfa  ?? null) : null,
      template_preview_url: e.template_id ? (templatesMap[e.template_id]?.preview_url ?? null) : null,
    }))

    return NextResponse.json({ data: enriched, total: count ?? 0 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
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

    if (fields.prospect_status) {
      await supabase.from('admin_intelligence_logs').insert([{
        client_id:             enterprise_id,
        issue_type:            'PROSPECT_UPDATE',
        severity_level:        fields.prospect_status === 'CONVERTI' ? 'HIGH' : 'MEDIUM',
        raw_context:           `${data.name} : statut → ${fields.prospect_status}`,
        is_upsell_opportunity: ['ENTERPRISE', 'ELITE'].includes(data.package_type)
      }])
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  return PATCH(req)
}
