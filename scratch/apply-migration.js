const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xplnyaxkusvuajtmorss.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY is required.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sqlPath = path.join(__dirname, '../supabase/migrations/1767658469_create_work_orders_schema.sql');
  console.log(`Reading SQL from: ${sqlPath}`);
  
  if (!fs.existsSync(sqlPath)) {
    console.error('SQL migration file not found!');
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  // Because of complex trigger functions and sequences, we shouldn't just do a simple split by ';'.
  // We can try to send the entire SQL file at once via exec_sql!
  console.log('Applying migration via exec_sql RPC...');
  
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sqlContent });

  if (error) {
    console.error('Migration failed via exec_sql:', error);
    
    // If it failed, let's try to run individual statements split by semicolon (cautiously, ignoring trigger blocks)
    console.log('Attempting backup: splitting statements...');
    
    // Simple statement splitter (ignores semicolons in trigger bodies if dollar-quoted)
    // We can write a basic splitter for standard SQL commands, but triggers are tricky.
    // Let's try sending it statement by statement.
    const statements = [];
    let currentStmt = '';
    let inDollar = false;
    const lines = sqlContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      currentStmt += line + '\n';
      
      if (trimmed.includes('$$')) {
        inDollar = !inDollar;
      }
      
      if (!inDollar && trimmed.endsWith(';')) {
        statements.push(currentStmt);
        currentStmt = '';
      }
    }
    if (currentStmt.trim()) {
      statements.push(currentStmt);
    }

    console.log(`Split migration into ${statements.length} SQL blocks. Executing sequentially...`);
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (!stmt) continue;
      
      console.log(`Executing block ${i+1}/${statements.length}...`);
      const { data: bData, error: bError } = await supabase.rpc('exec_sql', { sql_query: stmt });
      if (bError) {
        console.error(`Block ${i+1} failed:`, bError);
        console.log('Failed SQL block contents:\n', stmt);
      } else {
        console.log(`Block ${i+1} succeeded.`);
      }
    }
  } else {
    console.log('Migration applied successfully!', data);
  }
}

run();
