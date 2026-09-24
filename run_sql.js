import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runQuery(sql) {
  console.log(`\nQuery: ${sql}`);
  // Try to use a common RPC name for SQL execution if it exists
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    // If rpc fails, try another way or just report error
    console.error(`Error: ${error.message}`);
  } else {
    console.log('Result:', JSON.stringify(data, null, 2));
  }
}

async function start() {
  await runQuery(`SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'agent_skills' ORDER BY ordinal_position;`);
  await runQuery(`SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'agents' ORDER BY ordinal_position;`);
  await runQuery(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`);
}

start();
