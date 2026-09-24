import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const conversation_id = searchParams.get('conversation_id')

    if (!conversation_id) {
      return NextResponse.json({ error: 'conversation_id requis' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('hq_agent_messages')
      .select('*')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true })

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
    const body = await req.json()
    const { conversation_id, sender, content, attachments } = body

    if (!conversation_id || !sender || content === undefined) {
      return NextResponse.json(
        { error: 'conversation_id, sender et content sont requis' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('hq_agent_messages')
      .insert({
        conversation_id,
        sender,
        content,
        attachments: attachments ?? []
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
