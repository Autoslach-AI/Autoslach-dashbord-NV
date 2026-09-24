import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
 
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
 
// POST — sauvegarde branding complet
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { enterprise_id, assets_urls, logo_url, name, email } = body
 
    if (!enterprise_id) {
      return NextResponse.json({ error: 'enterprise_id requis' }, { status: 400 })
    }
 
    const updatePayload: Record<string, any> = { assets_urls }
    if (logo_url !== undefined) updatePayload.logo_url = logo_url
    if (name !== undefined && name !== '') updatePayload.name = name
    if (email !== undefined && email !== '') updatePayload.email = email
 
    const { data, error } = await supabase
      .from('enterprises')
      .update(updatePayload)
      .eq('enterprise_id', enterprise_id)
      .select()
      .single()
 
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
 
// PUT — Neural auto-gen meta description via Claude
export async function PUT(req: Request) {
  try {
    const { name, sector, package_type } = await req.json()
 
    if (!name) {
      return NextResponse.json({ error: 'name requis pour la génération' }, { status: 400 })
    }
 
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
 
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `Tu es un expert en copywriting SEO pour le marché africain francophone.
Génère une description SEO professionnelle, percutante et concise pour cette entreprise.
 
Nom : ${name}
Secteur : ${sector || 'non précisé'}
Package : ${package_type || 'BUSINESS'}
 
Contraintes :
- 150 à 200 caractères maximum
- Ton professionnel et moderne
- Orienté résultats et bénéfices clients
- Aucune mention d'Autoslash AI
- Réponds UNIQUEMENT avec la description, sans guillemets ni explication`
        }
      ]
    })
 
    const description =
      message.content[0].type === 'text' ? message.content[0].text.trim() : ''
 
    return NextResponse.json({ description })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
