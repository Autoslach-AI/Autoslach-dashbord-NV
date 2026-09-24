import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { CanvasFactory } from 'pdf-parse/worker'
import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = 'hq-knowledge-base'

function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
}

async function extractText(file: File, buffer: Buffer): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase()

  if (ext === 'pdf') {
    const parser = new PDFParse({ data: new Uint8Array(buffer), CanvasFactory })
    try {
      const result = await parser.getText()
      return result.text
    } finally {
      await parser.destroy()
    }
  }

  if (ext === 'docx') {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  throw new Error('Type de fichier non supporté (PDF ou DOCX uniquement)')
}

async function withSignedUrl(row: any) {
  if (!row.storage_path) return { ...row, file_url: null }
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(row.storage_path, 60 * 10) // 10 minutes
  return { ...row, file_url: data?.signedUrl ?? null }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const agent_id = searchParams.get('agent_id')
    const trash = searchParams.get('trash') === 'true'

    if (!agent_id) {
      return NextResponse.json({ error: 'agent_id requis' }, { status: 400 })
    }

    let query = supabase.from('hq_knowledge_base').select('*')

    query = trash
      ? query.not('deleted_at', 'is', null)
      : query.is('deleted_at', null)

    // AXON voit tout. BUSINESS/COMMERCIAL voient leurs ajouts + le partagé.
    if (agent_id !== 'axon') {
      query = query.or(`source_agent.eq.${agent_id},visibility.eq.shared`)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const withUrls = await Promise.all((data || []).map(withSignedUrl))
    return NextResponse.json({ data: withUrls })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const source_agent = formData.get('source_agent') as string
    const visibility = (formData.get('visibility') as string) || 'shared'
    const nameField = formData.get('name') as string | null
    const category = formData.get('category') as string | null
    const manualContent = formData.get('content') as string | null
    const file = formData.get('file') as File | null

    if (!source_agent) {
      return NextResponse.json({ error: 'source_agent requis' }, { status: 400 })
    }

    let content = manualContent || ''
    let storage_path: string | null = null
    let name = nameField || ''

    if (file) {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      content = await extractText(file, buffer)

      const sanitized = sanitizeFileName(file.name)
      storage_path = `${source_agent}/${Date.now()}-${sanitized}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storage_path, buffer, {
          contentType: file.type,
          upsert: false
        })

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 400 })
      }

      if (!name) name = file.name.replace(/\.[^/.]+$/, '')
    }

    if (!name || !content) {
      return NextResponse.json({ error: 'name et content (ou file) requis' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('hq_knowledge_base')
      .insert({
        source_agent,
        visibility,
        name,
        category: category || null,
        content,
        storage_path
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const withUrl = await withSignedUrl(data)
    return NextResponse.json({ data: withUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { id, restore, visibility, name, category, content } = body

    if (!id) {
      return NextResponse.json({ error: 'id requis' }, { status: 400 })
    }

    if (restore === true) {
      const { data, error } = await supabase
        .from('hq_knowledge_base')
        .update({ deleted_at: null })
        .eq('id', id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ data: await withSignedUrl(data) })
    }

    const fields: Record<string, any> = {}
    if (visibility !== undefined) fields.visibility = visibility
    if (name !== undefined) fields.name = name
    if (category !== undefined) fields.category = category
    if (content !== undefined) fields.content = content

    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('hq_knowledge_base')
      .update(fields)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data: await withSignedUrl(data) })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json()
    const { id, permanent } = body

    if (!id) {
      return NextResponse.json({ error: 'id requis' }, { status: 400 })
    }

    if (permanent === true) {
      const { data: row } = await supabase
        .from('hq_knowledge_base')
        .select('storage_path')
        .eq('id', id)
        .single()

      if (row?.storage_path) {
        await supabase.storage.from(BUCKET).remove([row.storage_path])
      }

      const { error } = await supabase
        .from('hq_knowledge_base')
        .delete()
        .eq('id', id)

      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    const { error } = await supabase
      .from('hq_knowledge_base')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
