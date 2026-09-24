import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id') || '';
  const name = request.nextUrl.searchParams.get('name') || '';

  const { data: prospect } = await supabase
    .from('enterprises')
    .select('*')
    .ilike('project_id', `%${id}%`)
    .ilike('name', `%${name}%`)
    .eq('status', 'PROSPECT')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!prospect) {
    return NextResponse.json({ prospect: null });
  }

  // Récupérer les infos du template si présent
  let template = null;
  if (prospect.template_id) {
    const { data: templateData } = await supabase
      .from('templates')
      .select('id, title, price_fcfa, preview_url, image_url')
      .eq('id', prospect.template_id)
      .single();
    template = templateData;
  }

  return NextResponse.json({ prospect, template });
}
