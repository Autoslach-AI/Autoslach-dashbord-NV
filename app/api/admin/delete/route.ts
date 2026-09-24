import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { type, table, id, column, bucket, path } = body

    // Suppression ligne dans une table
    if (type === 'row') {
      if (!table || !id || !column) {
        return NextResponse.json({ error: 'table, id et column requis' }, { status: 400 })
      }
      const { error } = await supabase.from(table).delete().eq(column, id)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    // Suppression fichier storage
    if (type === 'storage') {
      if (!bucket || !path) {
        return NextResponse.json({ error: 'bucket et path requis' }, { status: 400 })
      }
      const { error } = await supabase.storage.from(bucket).remove([path])
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'type invalide : utiliser row ou storage' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
