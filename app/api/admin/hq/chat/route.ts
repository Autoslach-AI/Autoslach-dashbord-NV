import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabase()
    const body = await req.json()
    const { agent_id, messages } = body

    if (!agent_id || !messages) {
      return NextResponse.json(
        { error: 'agent_id et messages requis' },
        { status: 400 }
      )
    }

    // 1 — Lire la config de l'agent
    const { data: agentConfig, error: configError } = await supabase
      .from('agent_configs')
      .select('*')
      .eq('agent_id', agent_id)
      .single()

    if (configError || !agentConfig) {
      return NextResponse.json(
        { error: 'Agent introuvable' },
        { status: 404 }
      )
    }

    // 1.5 — Récupérer les compétences activées pour cet agent (tous agents confondus)
    const { data: skillRows } = await supabase
      .from('hq_agent_skills')
      .select(`
        is_active,
        skills_library (
          name,
          category,
          content
        )
      `)
      .eq('agent_id', agent_id)
      .eq('is_active', true)
      .is('deleted_at', null)

    const skillsBlock = skillRows && skillRows.length > 0
      ? `\n\n=== COMPÉTENCES ACTIVES ===\n` +
        skillRows.map((r: any) =>
          `\n## ${r.skills_library?.name}${r.skills_library?.category ? ` (${r.skills_library.category})` : ''}\n${r.skills_library?.content}`
        ).join('\n') +
        `\n\n=== FIN DES COMPÉTENCES ===\n`
      : ''

    // 1.6 — Récupérer les documents de la base de connaissances visibles 
    // pour cet agent (AXON voit tout, les autres voient leurs ajouts + le partagé)
    let knowledgeQuery = supabase
      .from('hq_knowledge_base')
      .select('name, category, content, source_agent')
      .is('deleted_at', null)

    if (agent_id !== 'axon') {
      knowledgeQuery = knowledgeQuery.or(`source_agent.eq.${agent_id},visibility.eq.shared`)
    }

    const { data: knowledgeRows } = await knowledgeQuery
      .order('created_at', { ascending: false })
      .limit(20)

    const MAX_CHARS_PER_DOC = 3000

    const knowledgeBlock = knowledgeRows && knowledgeRows.length > 0
      ? `\n\n=== BASE DE CONNAISSANCES ===\n` +
        knowledgeRows.map((r: any) => {
          const truncated = r.content.length > MAX_CHARS_PER_DOC
            ? r.content.slice(0, MAX_CHARS_PER_DOC) + '\n[...document tronqué, voir la base de connaissances pour le contenu complet]'
            : r.content
          return `\n## ${r.name}${r.category ? ` (${r.category})` : ''}\n${truncated}`
        }).join('\n') +
        `\n\n=== FIN DE LA BASE DE CONNAISSANCES ===\n`
      : ''

    // 2 — Construire le contexte Supabase pour AXON Oracle
    let contextBlock = ''

    if (agent_id === 'axon') {
      // Récupérer les patterns mémoire (top 10 par importance)
      const { data: memories } = await supabase
        .from('axon_memory')
        .select('memory_type, sujet, detail, count, importance_score, last_seen_at')
        .eq('is_resolved', false)
        .order('importance_score', { ascending: false })
        .limit(10)

      // Récupérer les logs intelligence récents
      const { data: logs } = await supabase
        .from('admin_intelligence_logs')
        .select('issue_type, severity_level, raw_context, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

      // Récupérer le dernier snapshot pipeline
      const { data: snapshot } = await supabase
        .from('prospect_daily_snapshots')
        .select('*')
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single()

      // Récupérer stats prospects actuelles
      const { count: totalProspects } = await supabase
        .from('enterprises')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PROSPECT')

      const { count: totalClients } = await supabase
        .from('enterprises')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ACTIVE')

      contextBlock = `
=== CONTEXTE AUTOSLASH AI — DONNÉES RÉELLES ===

PIPELINE COMMERCIAL :
- Total prospects : ${totalProspects ?? 0}
- Clients actifs : ${totalClients ?? 0}
${snapshot ? `- Snapshot du ${snapshot.snapshot_date} : ${snapshot.new_count} nouveaux, ${snapshot.converted_count} convertis, pipeline ${snapshot.valeur_pipeline_fcfa?.toLocaleString('fr-FR')} FCFA` : '- Aucun snapshot disponible'}

PATTERNS MÉMORISÉS (axon_memory) :
${memories && memories.length > 0
  ? memories.map(m => `- [${m.memory_type}] ${m.sujet} — vu ${m.count}x (score: ${m.importance_score})`).join('\n')
  : '- Aucun pattern détecté encore'
}

ALERTES RÉCENTES (admin_intelligence_logs) :
${logs && logs.length > 0
  ? logs.map(l => `- [${l.severity_level}] ${l.issue_type} : ${l.raw_context}`).join('\n')
  : '- Aucune alerte active'
}

=== FIN DU CONTEXTE ===
`
    }

    // 3 — Construire le system prompt avec contexte injecté
    const systemPrompt = agentConfig.system_prompt
      ? `${agentConfig.system_prompt}\n\n${contextBlock}${skillsBlock}${knowledgeBlock}`
      : `Tu es AXON, l'assistant stratégique d'Amadou, fondateur d'Autoslash AI. Tu analyses les données de la plateforme et fournis des insights actionnables. Tu ne prends jamais d'actions directes — tu suggères uniquement.\n\n${contextBlock}${skillsBlock}${knowledgeBlock}`

    // 4 — Appeler le bon fournisseur selon agentConfig.provider
    let reply = ''

    if (agentConfig.provider === 'Anthropic') {
      const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY_HQ?.trim() ?? '',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: agentConfig.model ?? 'claude-sonnet-5',
          system: systemPrompt,
          max_tokens: agentConfig.max_tokens_per_session ?? 1000,
          messages: messages.map((m: any) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content
          }))
        })
      })

      if (!anthropicResponse.ok) {
        const err = await anthropicResponse.json()
        return NextResponse.json(
          { error: `Anthropic error: ${err.error?.message ?? 'Unknown'}` },
          { status: 500 }
        )
      }

      const anthropicData = await anthropicResponse.json()
      reply = anthropicData.content?.[0]?.text ?? ''

    } else {
      // ⚠️ TEMPORAIRE : clé unique partagée entre les 3 agents.
      // À remplacer par le futur système de pool de clés (par agent + par client,
      // rotation interne, arrêt strict côté client à l'épuisement).
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${agentConfig.model ?? 'gemini-3.6-flash'}:generateContent?key=${process.env.GEMINI_API_KEY_TEMP?.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: systemPrompt }]
            },
            contents: messages.map((m: any) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }]
            })),
            generationConfig: {
              temperature:     0.7,
              maxOutputTokens: agentConfig.max_tokens_per_session ?? 1000
            }
          })
        }
      )

      if (!geminiResponse.ok) {
        const err = await geminiResponse.json()
        return NextResponse.json(
          { error: `Gemini error: ${err.error?.message ?? 'Unknown'}` },
          { status: 500 }
        )
      }

      const geminiData = await geminiResponse.json()
      reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    }

    return NextResponse.json({ reply })

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}
