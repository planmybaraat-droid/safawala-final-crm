import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authenticateRequest } from "@/lib/auth-middleware"

/**
 * POST /api/setup/add-gst-percentage
 * Adds gst_percentage column to company_settings if it doesn't exist
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'super_admin' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode })
    }

    const supabase = createClient()

    console.log('🚀 Checking gst_percentage column in company_settings...')

    // First, check if the column exists by trying to select it
    const { data: checkData, error: checkError } = await supabase
      .from('company_settings')
      .select('id, gst_percentage')
      .limit(1)

    if (checkError && checkError.message?.includes('does not exist')) {
      console.log('Column does not exist, attempting to add via information_schema query')
      
      // Try to add the column through raw SQL query
      // Since we can't execute raw SQL directly, we'll return a message asking user to run the migration
      return NextResponse.json({
        success: false,
        message: 'gst_percentage column not found. Please run this SQL in Supabase console:',
        sql: `
          ALTER TABLE company_settings 
          ADD COLUMN IF NOT EXISTS gst_percentage DECIMAL(5,2) DEFAULT 5.00;
          
          ALTER TABLE company_settings 
          ADD CONSTRAINT company_settings_gst_percentage_check 
          CHECK (gst_percentage >= 0 AND gst_percentage <= 100);
        `,
        action: 'Run the SQL migration and refresh the page'
      }, { status: 202 })
    }

    if (checkError && !checkError.message?.includes('does not exist')) {
      console.error('Error checking column:', checkError)
      return NextResponse.json(
        { error: 'Failed to check gst_percentage column', details: checkError.message },
        { status: 500 }
      )
    }

    console.log('✅ gst_percentage column exists')
    return NextResponse.json({ 
      success: true, 
      message: 'gst_percentage column already exists in company_settings' 
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to check gst_percentage', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * GET /api/setup/add-gst-percentage
 * Check if gst_percentage column exists
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'super_admin' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode })
    }

    const supabase = createClient()

    // Check if column exists
    const { data, error } = await supabase
      .from('company_settings')
      .select('gst_percentage')
      .limit(1)

    if (error) {
      console.log('Column check error:', error.message)
      if (error.message?.includes('does not exist')) {
        return NextResponse.json({ 
          exists: false, 
          message: 'gst_percentage column does not exist',
          sql: `ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS gst_percentage DECIMAL(5,2) DEFAULT 5.00;`
        })
      }
    }

    return NextResponse.json({ 
      exists: true, 
      message: 'gst_percentage column exists' 
    })

  } catch (error) {
    console.error('Error checking column:', error)
    return NextResponse.json(
      { error: 'Failed to check gst_percentage column', details: String(error) },
      { status: 500 }
    )
  }
}
