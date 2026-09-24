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
  const { data: template } = await supabase
    .from('templates')
    .select('id, title, price_fcfa, preview_url, image_url')
    .eq('id', params.id)
    .single();

  return NextResponse.json({ template });
}
