import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server-simple"
import { authenticateRequest } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'super_admin' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode })
    }

    console.log("Adding city and state columns to company_settings table...")
    
    // First, try to add city column
    try {
      const { error: cityError } = await supabaseServer
        .from('company_settings')
        .select('city')
        .limit(1)
      
      if (cityError && cityError.message.includes('column "city" does not exist')) {
        // Column doesn't exist, need to add it via raw SQL
        const { error: addCityError } = await supabaseServer.rpc('exec_sql', {
          sql: 'ALTER TABLE company_settings ADD COLUMN city TEXT;'
        })
        
        if (addCityError) {
          console.error("Error adding city column:", addCityError)
        } else {
          console.log("City column added successfully")
        }
      } else {
        console.log("City column already exists")
      }
    } catch (e) {
      console.log("City column doesn't exist, but we can't add it via RPC")
    }

    // Try to add state column
    try {
      const { error: stateError } = await supabaseServer
        .from('company_settings')
        .select('state')
        .limit(1)
      
      if (stateError && stateError.message.includes('column "state" does not exist')) {
        // Column doesn't exist, need to add it via raw SQL
        const { error: addStateError } = await supabaseServer.rpc('exec_sql', {
          sql: 'ALTER TABLE company_settings ADD COLUMN state TEXT;'
        })
        
        if (addStateError) {
          console.error("Error adding state column:", addStateError)
        } else {
          console.log("State column added successfully")
        }
      } else {
        console.log("State column already exists")
      }
    } catch (e) {
      console.log("State column doesn't exist, but we can't add it via RPC")
    }

    return NextResponse.json({ 
      success: true, 
      message: "Schema update completed. Please add city and state columns manually in Supabase dashboard if they don't exist." 
    })
    
  } catch (error) {
    console.error("Error updating database schema:", error)
    return NextResponse.json({ 
      error: "Database schema update failed",
      message: "Please add city and state columns manually in Supabase dashboard"
    }, { status: 500 })
  }
}