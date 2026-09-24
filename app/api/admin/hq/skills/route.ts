import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const agent_id = searchParams.get('agent_id')
    const trash = searchParams.get('trash') === 'true'

    if (!agent_id) {
      return NextResponse.json({ error: 'agent_id requis' }, { status: 400 })
    }

    let query = supabase
      .from('hq_agent_skills')
      .select(`
        id,
        is_active,
        agent_id,
        skill_id,
        deleted_at,
        skills_library ( name, category, content )
      `)
      .eq('agent_id', agent_id)

    query = trash
      ? query.not('deleted_at', 'is', null)
      : query.is('deleted_at', null)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const mapped = (data || []).map((row: any) => ({
      id: row.id,
      is_active: row.is_active,
      agent_id: row.agent_id,
      skill_id: row.skill_id,
      deleted_at: row.deleted_at,
      name: row.skills_library?.name,
      category: row.skills_library?.category,
      content: row.skills_library?.content
    }))

    return NextResponse.json({ data: mapped })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { agent_id, name, category, content } = body

    if (!agent_id || !name || !content) {
      return NextResponse.json({ error: 'agent_id, name et content sont requis' }, { status: 400 })
    }

    const { data: skillData, error: skillError } = await supabase
      .from('skills_library')
      .insert({ name, category: category || null, content, is_global: false })
      .select()
      .single()

    if (skillError) {
      return NextResponse.json({ error: skillError.message }, { status: 400 })
    }

    const { data: junctionData, error: junctionError } = await supabase
      .from('hq_agent_skills')
      .insert({ agent_id, skill_id: skillData.id, is_active: true })
      .select()
      .single()

    if (junctionError) {
      return NextResponse.json({ error: junctionError.message }, { status: 400 })
    }

    return NextResponse.json({
      data: {
        id: junctionData.id,
        is_active: junctionData.is_active,
        agent_id: junctionData.agent_id,
        skill_id: junctionData.skill_id,
        deleted_at: junctionData.deleted_at,
        name: skillData.name,
        category: skillData.category,
        content: skillData.content
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { id, is_active, skill_id, name, category, content, restore } = body

    // Cas 3 : restauration depuis la corbeille
    if (id && restore === true) {
      const { data, error } = await supabase
        .from('hq_agent_skills')
        .update({ deleted_at: null })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json({ data })
    }

    // Cas 1 : toggle d'activation
    if (id && is_active !== undefined) {
      const { data, error } = await supabase
        .from('hq_agent_skills')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json({ data })
    }

    // Cas 2 : édition du contenu
    if (skill_id) {
      const fields: Record<string, any> = {}
      if (name !== undefined) fields.name = name
      if (category !== undefined) fields.category = category
      if (content !== undefined) fields.content = content

      if (Object.keys(fields).length === 0) {
        return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })
      }

      const { data, error } = await supabase
        .from('skills_library')
        .update(fields)
        .eq('id', skill_id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json({ data })
    }

    return NextResponse.json(
      { error: 'Requête invalide : fournir (id + is_active), (id + restore), ou (skill_id + champs)' },
      { status: 400 }
    )
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
      const { error } = await supabase
        .from('hq_agent_skills')
        .delete()
        .eq('id', id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json({ success: true })
    }

    // Suppression douce (corbeille)
    const { error } = await supabase
      .from('hq_agent_skills')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
