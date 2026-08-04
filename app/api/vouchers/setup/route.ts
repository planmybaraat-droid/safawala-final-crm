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
    
    // Check if vouchers table already exists
    const { error: checkError } = await supabase
      .from('vouchers')
      .select('id')
      .limit(1)

    if (!checkError || checkError.code !== 'PGRST116') {
      // If code is not "table not found" or no error, check if it works
      if (!checkError) {
        return NextResponse.json({
          success: true,
          message: 'Vouchers table already exists in the database.'
        })
      }
    }

    // SQL code to create vouchers table
    const sql = `
      CREATE TABLE IF NOT EXISTS vouchers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          voucher_number VARCHAR(100) UNIQUE NOT NULL,
          voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
          voucher_type VARCHAR(50) NOT NULL CHECK (voucher_type IN ('expense', 'customer_payment')),
          account_name VARCHAR(255) NOT NULL,
          amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
          payment_mode VARCHAR(100) NOT NULL DEFAULT 'Cash',
          particulars TEXT,
          narration TEXT,
          amount_in_words VARCHAR(255),
          receiver_name VARCHAR(255),
          prepared_by VARCHAR(255),
          booking_id UUID,
          booking_number VARCHAR(100),
          franchise_id UUID REFERENCES franchises(id) ON DELETE SET NULL,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_vouchers_franchise_id ON vouchers(franchise_id);
      CREATE INDEX IF NOT EXISTS idx_vouchers_voucher_number ON vouchers(voucher_number);
      CREATE INDEX IF NOT EXISTS idx_vouchers_voucher_date ON vouchers(voucher_date);
      CREATE INDEX IF NOT EXISTS idx_vouchers_voucher_type ON vouchers(voucher_type);

      ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Enable all for authenticated users" ON vouchers;
      CREATE POLICY "Enable all for authenticated users" ON vouchers FOR ALL USING (true) WITH CHECK (true);
    `

    console.log('[Vouchers Setup] Executing SQL via execute_sql RPC...')
    const { error: rpcError } = await supabase.rpc('execute_sql', { sql_query: sql })

    if (rpcError) {
      console.error('[Vouchers Setup] RPC execution failed:', rpcError)
      return NextResponse.json({
        success: false,
        error: rpcError.message,
        details: 'Failed to create table via RPC. Please execute the SQL code in your Supabase SQL Editor.'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Vouchers table created successfully!'
    })
  } catch (error: any) {
    console.error('[Vouchers Setup] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}
