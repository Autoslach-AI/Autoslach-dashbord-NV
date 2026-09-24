import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTable(tableName) {
  const { data, error } = await supabase.from(tableName).select('*').limit(1);
  if (error) {
    if (error.code === '42P01') {
      return { tableName, status: 'MISSING' };
    } else {
      return { tableName, status: 'EXISTS', error: error.message };
    }
  } else {
    return { tableName, status: 'EXISTS', columns: data.length > 0 ? Object.keys(data[0]) : [] };
  }
}

async function run() {
  const tables = [
    'enterprises', 'profiles', 'agents', 'skills_library', 'agent_skills',
    'enterprise_kb', 'plan_definitions', 'client_subscriptions', 'audit_logs',
    'token_usage_logs', 'agent_metrics', 'system_health_records', 'domain_experts',
    'communication_logs', 'compliance_docs', 'api_credentials', 'enterprise_backups',
    'oracle_global_settings', 'system_logs', 'agent_config'
  ];
  
  const results = [];
  for (const table of tables) {
    results.push(await inspectTable(table));
  }
  console.log(JSON.stringify(results, null, 2));
}

run();
