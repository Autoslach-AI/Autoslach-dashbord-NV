import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file     = formData.get('file')   as File   | null
    const path     = formData.get('path')   as string | null
    const bucket   = (formData.get('bucket') as string | null) ?? 'enterprise-assets'

    if (!file || !path) {
      return NextResponse.json({ error: 'file et path requis' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer      = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true
      })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 })

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)
    return NextResponse.json({ url: urlData.publicUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
