import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const { enterprise_id } = await request.json();

  const { error } = await supabase
    .from('enterprises')
    .update({ 
      status: 'ACTIVE',
      activated_at: new Date().toISOString()
    })
    .eq('enterprise_id', enterprise_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
