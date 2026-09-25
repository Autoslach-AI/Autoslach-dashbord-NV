import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: Request) {
  try {
    const supabase = getSupabase()
    const { searchParams } = new URL(req.url)
    const agent_id = searchParams.get('agent_id')
    const status = searchParams.get('status') || 'active'
    const project_id = searchParams.get('project_id')

    if (!agent_id) {
      return NextResponse.json({ error: 'agent_id requis' }, { status: 400 })
    }

    let query = supabase
      .from('hq_agent_conversations')
      .select('*')
      .eq('agent_id', agent_id)

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    if (project_id !== null && project_id !== undefined) {
      if (project_id === 'none' || project_id === 'null') {
        query = query.is('project_id', null)
      } else {
        query = query.eq('project_id', project_id)
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabase()
    const body = await req.json()
    const { agent_id, title, name, project_id } = body
    const conversationTitle = title || name || 'Nouvelle conversation'

    if (!agent_id) {
      return NextResponse.json({ error: 'agent_id requis' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('hq_agent_conversations')
      .insert({
        agent_id,
        title: conversationTitle,
        project_id: project_id || null
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = getSupabase()
    const body = await req.json()
    const { id, title, name, status, project_id } = body

    if (!id) {
      return NextResponse.json({ error: 'id requis' }, { status: 400 })
    }

    const updates: Record<string, any> = {}
    if (title !== undefined) updates.title = title
    if (name !== undefined && title === undefined) updates.title = name
    if (status !== undefined) updates.status = status
    if (project_id !== undefined) {
      updates.project_id = (project_id === 'none' || project_id === 'null' || project_id === '') ? null : project_id
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('hq_agent_conversations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = getSupabase()
    const body = await req.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'id requis' }, { status: 400 })
    }

    const { error } = await supabase
      .from('hq_agent_conversations')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
