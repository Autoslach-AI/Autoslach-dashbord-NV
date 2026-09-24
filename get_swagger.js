const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getSwagger() {
  const url = `${supabaseUrl}/rest/v1/`;
  const response = await fetch(url, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  const data = await response.json();
  console.log('API Response structure:', Object.keys(data), response.status);
  if (data.error || data.message) console.log('Error/Msg:', data.error, data.message);
  
  if (data.definitions) {
    ['skills_library', 'hq_agent_skills'].forEach(tableName => {
      console.log(`\n--- Definition for ${tableName} ---`);
      if (data.definitions[tableName]) {
        console.log(JSON.stringify(data.definitions[tableName], null, 2));
      } else {
        console.log(`Table ${tableName} not found in definitions.`);
      }
    });

    console.log('\n--- All Tables ---');
    console.log(Object.keys(data.definitions).join(', '));
  } else {
    console.log('No definitions found in Swagger spec.');
  }
}

getSwagger();
