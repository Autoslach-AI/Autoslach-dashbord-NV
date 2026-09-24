import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const revalidate = 30

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: clients, error } = await supabase
    .from('v_clients_dev')
    .select('id, status, name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const counts = {
    STABLE: 0,
    WARNING: 0,
    CRITICAL: 0
  }

  const metadata: Record<string, { id: string, name: string } | null> = {
    STABLE: null,
    WARNING: null,
    CRITICAL: null
  }

  clients?.forEach(client => {
    const status = client.status as keyof typeof counts
    if (counts[status] !== undefined) {
      counts[status]++
      if (!metadata[status]) {
        metadata[status] = { id: client.id, name: client.name }
      }
    }
  })

  const total = clients?.length || 0
  const score = total > 0 
    ? Math.round((counts.STABLE * 100 + counts.WARNING * 50 + counts.CRITICAL * 0) / total)
    : 100

  return NextResponse.json({
    counts,
    metadata,
    score,
    total,
    summary: `${counts.CRITICAL} CRITICAL / ${counts.WARNING} WARNING`
  })
}
