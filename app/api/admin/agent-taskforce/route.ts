import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const revalidate = 30;

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Fetch agents info
  const { data: agents, error: agentsError } = await supabase
    .from('agent_config')
    .select('agent_id, name, primary_api, status, current_task')
    .in('agent_id', ['ARCHITECTE', 'BACKEND', 'FRONTEND', 'QA', 'AI_CORE'])

  if (agentsError) {
    return NextResponse.json({ error: agentsError.message }, { status: 500 })
  }

  // 2. Fetch avg neural load for each agent for the last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: tasks, error: tasksError } = await supabase
    .from('agent_tasks')
    .select('agent_id, neural_load')
    .gte('started_at', thirtyDaysAgo.toISOString())

  if (tasksError) {
    return NextResponse.json({ error: tasksError.message }, { status: 500 })
  }

  const agentsWithLoad = agents.map(agent => {
    const agentTasks = tasks.filter(t => t.agent_id === agent.agent_id)
    const avgLoad = agentTasks.length > 0 
      ? agentTasks.reduce((acc, t) => acc + (t.neural_load || 0), 0) / agentTasks.length
      : 0

    return {
      ...agent,
      avg_neural_load: avgLoad
    }
  })

  return NextResponse.json({ agents: agentsWithLoad })
}
