import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { enterprise_id, name, sector, region, custom_notes, avatar_url, logo_url } = body;

  const { error } = await supabase
    .from('enterprises')
    .update({ 
      ...(name !== undefined && { name }),
      ...(sector !== undefined && { sector }),
      ...(region !== undefined && { region }),
      ...(custom_notes !== undefined && { custom_notes }),
      ...(avatar_url !== undefined && { avatar_url }),
      ...(logo_url !== undefined && { logo_url })
    })
    .eq('enterprise_id', enterprise_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
