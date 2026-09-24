import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    // Vérifier authorization pour le cron
    const authHeader = req.headers.get('authorization')
    const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`
    const isInternal = req.headers.get('x-internal') === 'true'
    if (!isCron && !isInternal) {
      return NextResponse.json(
        { error: 'Non autorisé' }, { status: 401 }
      )
    }

    // 1 — Compter tous les prospects
    const { count: total } = await supabase
      .from('enterprises')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PROSPECT')

    // 2 — Nouveaux aujourd'hui
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { count: new_count } = await supabase
      .from('enterprises')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PROSPECT')
      .gte('created_at', today.toISOString())

    // 3 — Convertis aujourd'hui
    const { count: converted_count } = await supabase
      .from('enterprises')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PROSPECT')
      .eq('prospect_status', 'CONVERTI')
      .gte('updated_at', today.toISOString())

    // 4 — Perdus aujourd'hui
    const { count: lost_count } = await supabase
      .from('enterprises')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PROSPECT')
      .eq('prospect_status', 'PERDU')
      .gte('updated_at', today.toISOString())

    // 5 — Annulés aujourd'hui
    const { count: annulled_count } = await supabase
      .from('enterprises')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PROSPECT')
      .eq('prospect_status', 'ANNULÉ')
      .gte('updated_at', today.toISOString())

    // 6 — Rappels dus
    const { count: rappels_dus } = await supabase
      .from('enterprises')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PROSPECT')
      .or(`prospect_status.eq.RAPPELER,rappel_at.lte.${new Date().toISOString()}`)

    // 7 — Valeur pipeline totale
    const { data: allProspects } = await supabase
      .from('enterprises')
      .select('valeur_estimee_fcfa, template_id, message')
      .eq('status', 'PROSPECT')

    let valeur_pipeline_fcfa = 0
    for (const p of allProspects ?? []) {
      if (p.valeur_estimee_fcfa && p.valeur_estimee_fcfa > 0) {
        valeur_pipeline_fcfa += p.valeur_estimee_fcfa
      } else if (p.message) {
        const match = p.message.match(/Budget\s*:\s*([\d\s]+)\s*FCFA/i)
        if (match) {
          const val = parseInt(match[1].replace(/\s/g, ''))
          if (!isNaN(val)) valeur_pipeline_fcfa += val
        }
      }
    }

    // 8 — UPSERT snapshot
    const snapshotDate = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('prospect_daily_snapshots')
      .upsert({
        snapshot_date:        snapshotDate,
        period_type:          'DAY',
        total_prospects:      total      ?? 0,
        new_count:            new_count  ?? 0,
        converted_count:      converted_count ?? 0,
        lost_count:           lost_count ?? 0,
        annulled_count:       annulled_count  ?? 0,
        rappels_dus:          rappels_dus     ?? 0,
        valeur_pipeline_fcfa: valeur_pipeline_fcfa,
        notes: `Snapshot ${isCron ? 'automatique' : 'manuel'} — ${new Date().toLocaleString('fr-FR')}`
      }, {
        onConflict: 'snapshot_date'
      })
      .select()
      .single()

    if (error) return NextResponse.json(
      { error: error.message }, { status: 400 }
    )

    return NextResponse.json({
      success: true,
      data,
      message: `Snapshot du ${snapshotDate} sauvegardé`
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message }, { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('prospect_daily_snapshots')
      .select('*')
      .order('snapshot_date', { ascending: false })
      .limit(30)

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
