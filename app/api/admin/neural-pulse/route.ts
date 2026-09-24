import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const revalidate = 30;

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // 1. Fetch system_logs for today
  const { data: sysLogs } = await supabase
    .from('system_logs')
    .select('*')
    .gte('created_at', startOfToday.toISOString())
    .order('created_at', { ascending: false });

  // 2. Fetch latest client_agent_task
  const { data: latestClientTask } = await supabase
    .from('client_agent_tasks')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(1);

  // 3. Fetch community events from intelligence logs
  const { data: communityEvents } = await supabase
    .from('admin_intelligence_logs')
    .select('*')
    .eq('issue_type', 'COMMUNITY_EVENT')
    .gte('created_at', twentyFourHoursAgo.toISOString())
    .order('created_at', { ascending: false });

  const lastSysLog = sysLogs?.[0] || null;
  const lastClientTask = latestClientTask?.[0] || null;
  const lastCommunityEvent = communityEvents?.[0] || null;

  // Determination of the main event to display
  // Priority: Community Event (if any) > System Log > Client Task
  let displayEvent = null;
  let eventSource = 'NONE';
  let enterpriseId = null;
  let statusColor = 'live';

  if (lastCommunityEvent) {
    displayEvent = {
        description: lastCommunityEvent.raw_context,
        type: 'COMMUNITY'
    };
    eventSource = 'COMMUNITY';
    statusColor = 'sync'; // Community events are sync-like
  } else if (lastSysLog) {
    displayEvent = {
        description: lastSysLog.description,
        type: lastSysLog.event_type
    };
    eventSource = 'SYSTEM';
    enterpriseId = lastSysLog.enterprise_id;
    statusColor = lastSysLog.status_color || 'live';
  } else if (lastClientTask) {
    displayEvent = {
        description: lastClientTask.task_description,
        type: 'TASK'
    };
    eventSource = 'TASK';
    enterpriseId = lastClientTask.enterprise_id;
    statusColor = 'live';
  }

  let globalStatus = 'LIVE';
  if (statusColor === 'red' || statusColor === 'error') globalStatus = 'ERROR';
  else if (statusColor === 'orange' || statusColor === 'sync') globalStatus = 'SYNC';
  else globalStatus = 'LIVE';

  return NextResponse.json({
    totalEvents: (sysLogs?.length || 0) + (communityEvents?.length || 0) + (latestClientTask?.length || 0),
    lastEvent: displayEvent,
    eventSource,
    enterpriseId,
    statusColor,
    globalStatus,
    hasCommunityEvent: !!lastCommunityEvent
  }, {
    headers: { 'Cache-Control': 'no-store, max-age=0' }
  });
}
