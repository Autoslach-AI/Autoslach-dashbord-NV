import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { data: enterprise, error: entError } = await supabase
    .from('enterprises')
    .select('*')
    .eq('enterprise_id', params.id)
    .single();

  const { data: agents } = await supabase
    .from('agents')
    .select('id, name, status, primary_api, neural_load, current_task')
    .eq('enterprise_id', params.id);

  const { data: planDef } = await supabase
    .from('plan_definitions')
    .select('*')
    .eq('plan_name', enterprise?.package_type)
    .single();

  return NextResponse.json({ enterprise, agents, planDef });
}
