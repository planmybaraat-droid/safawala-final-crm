import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  try {
    // 🔒 SECURITY: Authenticate user (staff minimum)
    const authResult = await requireAuth(req, 'staff')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }

    const supabase = createClient()
    
    // Check if challans table already exists
    const { error: checkError } = await supabase
      .from('challans')
      .select('id')
      .limit(1)

    if (!checkError || checkError.code !== 'PGRST116') {
      // If code is not "table not found" or no error, check if it works
      if (!checkError) {
        return NextResponse.json({
          success: true,
          message: 'Challans tables already exist in the database.'
        })
      }
    }

    // SQL code to create challans and challan_items tables
    const sql = `
      CREATE TABLE IF NOT EXISTS challans (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          challan_number VARCHAR(100) UNIQUE NOT NULL,
          challan_date DATE NOT NULL DEFAULT CURRENT_DATE,
          party_name VARCHAR(255) NOT NULL,
          mobile_number VARCHAR(20),
          status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
          narration TEXT,
          prepared_by VARCHAR(255),
          total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
          franchise_id UUID REFERENCES franchises(id) ON DELETE SET NULL,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS challan_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          challan_id UUID NOT NULL REFERENCES challans(id) ON DELETE CASCADE,
          item_details TEXT NOT NULL,
          qty INTEGER NOT NULL DEFAULT 1,
          rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
          amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_challans_franchise_id ON challans(franchise_id);
      CREATE INDEX IF NOT EXISTS idx_challans_challan_number ON challans(challan_number);
      CREATE INDEX IF NOT EXISTS idx_challans_party_name ON challans(party_name);
      CREATE INDEX IF NOT EXISTS idx_challans_mobile_number ON challans(mobile_number);
      CREATE INDEX IF NOT EXISTS idx_challan_items_challan_id ON challan_items(challan_id);

      ALTER TABLE challans ENABLE ROW LEVEL SECURITY;
      ALTER TABLE challan_items ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Enable all for authenticated users" ON challans;
      CREATE POLICY "Enable all for authenticated users" ON challans FOR ALL USING (true) WITH CHECK (true);

      DROP POLICY IF EXISTS "Enable all for authenticated users" ON challan_items;
      CREATE POLICY "Enable all for authenticated users" ON challan_items FOR ALL USING (true) WITH CHECK (true);
    `

    console.log('[Challans Setup] Executing SQL via execute_sql RPC...')
    const { error: rpcError } = await supabase.rpc('execute_sql', { sql_query: sql })

    if (rpcError) {
      console.error('[Challans Setup] RPC execution failed:', rpcError)
      return NextResponse.json({
        success: false,
        error: rpcError.message,
        details: 'Failed to create tables via RPC. Please copy the SQL code from /supabase/migrations/1767658467_create_challans.sql and execute it in your Supabase SQL Editor.'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Challans tables created successfully!'
    })
  } catch (error: any) {
    console.error('[Challans Setup] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}
