import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log('\n--- Action 2: Testing INSERT (Trial and Error) ---');
  
  // Try common variants
  const variants = [
    { name: 'test', agent_id: 'ID', content: 'test' },
    { name: 'test', agent_id: 'ID', description: 'test' },
    { name: 'test', agent_id: 'ID', is_active: true },
    { name: 'test', enterprise_id: '00000000-0000-0000-0000-000000000001' }
  ];

  for (const variant of variants) {
    console.log(`Trying variant: ${JSON.stringify(variant)}`);
    const { data, error } = await supabase.from('agent_skills').insert(variant).select();
    if (error) {
      console.log('Error:', error.message);
    } else {
      console.log('Success!', JSON.stringify(data));
      break;
    }
  }
}

async function checkRLS() {
  console.log('\n--- Action 3: Checking RLS (via raw selectivity test) ---');
  // Since we can't run raw SQL on pg_policies easily without exec_sql, 
  // we try to see if we can read the table with the service role (which usually bypasses RLS)
  // vs trying to guess policy existence.
  const { data, error } = await supabase.from('agent_skills').select('*').limit(1);
  if (error) {
    if (error.code === '42P01') {
      console.log('Table agent_skills does NOT exist.');
    } else {
      console.log('Table exists, but fetch error:', error.message);
    }
  } else {
    console.log('Table exists and is accessible. Num rows:', data.length);
  }
}

async function run() {
  await testInsert();
  await checkRLS();
}

run();
