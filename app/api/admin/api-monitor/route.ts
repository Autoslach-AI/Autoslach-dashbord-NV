import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const revalidate = 30;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '30')
  const plan = searchParams.get('plan')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const rangeStart = new Date()
  rangeStart.setDate(rangeStart.getDate() - days)

  // 1. Get available plans dynamically from plan_definitions (only those that allow agents)
  const { data: planData } = await supabase
    .from('plan_definitions')
    .select('plan_name')
    .gt('max_agents_allowed', 0)
    .order('price_cents', { ascending: true })
  
  const availablePlans = planData?.map(p => p.plan_name) || []

  // 2. Fetch tasks from both tables with relational filtering if plan is set
  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  firstDayOfMonth.setHours(0, 0, 0, 0);

  let agentTasksQuery = supabase
      .from('agent_tasks')
      .select('api_used, started_at, enterprise_id, tokens_consumed, enterprises!inner(package_type)')
      .gte('started_at', rangeStart.toISOString());
  
  let clientTasksQuery = supabase
      .from('client_agent_tasks')
      .select('api_used, started_at, enterprise_id, tokens_consumed, enterprises!inner(package_type)')
      .gte('started_at', rangeStart.toISOString());

  if (plan && plan !== 'ALL') {
    agentTasksQuery = agentTasksQuery.eq('enterprises.package_type', plan);
    clientTasksQuery = clientTasksQuery.eq('enterprises.package_type', plan);
  }

  const [agentTasksRes, clientTasksRes] = await Promise.all([
    agentTasksQuery,
    clientTasksQuery
  ]);

  const allTasks = [...(agentTasksRes.data || []), ...(clientTasksRes.data || [])];
  
  // Calculate month stats
  const monthTasks = allTasks.filter(t => new Date(t.started_at) >= firstDayOfMonth);
  const totalTokensMonth = monthTasks.reduce((sum, t) => sum + (t.tokens_consumed || 0), 0);
  const totalCallsMonth = monthTasks.length;

  // 3. Get dynamic API keys from the filtered data
  const apiKeys = Array.from(new Set(allTasks.map(t => t.api_used).filter(Boolean))) as string[]

  // 4. Prepare daily data
  const dailyMap: { [date: string]: any } = {}
  const totals: { [api: string]: number } = {}

  // Initialize totals
  apiKeys.forEach(k => totals[k] = 0)

  allTasks.forEach(task => {
    if (!task.api_used || !task.started_at) return
    
    const date = task.started_at.split('T')[0]
    if (!dailyMap[date]) {
      dailyMap[date] = { date } as any
      apiKeys.forEach(k => dailyMap[date][k] = 0)
    }
    
    dailyMap[date][task.api_used] = (dailyMap[date][task.api_used] || 0) + 1
    totals[task.api_used] = (totals[task.api_used] || 0) + 1
  })

  // Fill in missing days to ensure a continuous graph if data exists
  if (allTasks.length > 0) {
    const dates = Object.keys(dailyMap).sort();
    const start = new Date(dates[0]);
    const end = new Date();
    const current = new Date(start);
    
    while (current <= end) {
      const dStr = current.toISOString().split('T')[0];
      if (!dailyMap[dStr]) {
        dailyMap[dStr] = { date: dStr };
        apiKeys.forEach(k => dailyMap[dStr][k] = 0);
      }
      current.setDate(current.getDate() + 1);
    }
  }

  // Sort daily data by date
  const dailyData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date))

  // Find most used
  let mostUsed = ''
  let maxCount = -1
  apiKeys.forEach(k => {
    if (totals[k] > maxCount) {
      maxCount = totals[k]
      mostUsed = k
    }
  })

  return NextResponse.json({
    apiKeys,
    availablePlans,
    dailyData,
    totals,
    mostUsed,
    totalTokensMonth,
    totalCallsMonth
  })
}
