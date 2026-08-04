import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRole) {
  console.error('Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRole)

async function applyMigration() {
  try {
    console.log('Reading migration file...')
    const migrationSql = fs.readFileSync(
      './FIX_PRODUCT_ORDER_ITEMS_DENORMALIZATION.sql',
      'utf-8'
    )

    console.log('Executing migration...')
    console.log('SQL:', migrationSql.slice(0, 100) + '...')

    // Use rpc to execute raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSql,
    })

    if (error) {
      console.error('Migration failed:', error)
      process.exit(1)
    }

    console.log('Migration applied successfully!')
    console.log('Result:', data)
  } catch (err) {
    console.error('Error applying migration:', err)
    process.exit(1)
  }
}

applyMigration()
