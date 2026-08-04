import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    console.log("Testing Supabase connection...")

    // Test basic connection
    const { data: testData, error: testError } = await supabase.from("quotes").select("count(*)").single()

    if (testError) {
      console.error("Connection test failed:", testError)
      return
    }

    console.log("✅ Connection successful!")

    // Check if quotes exist
    const { data: quotes, error: quotesError } = await supabase.from("quotes").select("*").limit(5)

    if (quotesError) {
      console.error("Error fetching quotes:", quotesError)
      return
    }

    console.log(`📊 Found ${quotes?.length || 0} quotes in database`)

    if (quotes && quotes.length > 0) {
      console.log("Sample quote:", quotes[0])
    } else {
      console.log("❌ No quotes found - demo data may not be inserted")
    }

    // Test quote_items table
    const { data: items, error: itemsError } = await supabase.from("quote_items").select("*").limit(5)

    if (itemsError) {
      console.error("Error fetching quote items:", itemsError)
    } else {
      console.log(`📦 Found ${items?.length || 0} quote items in database`)
    }
  } catch (error) {
    console.error("Test failed:", error)
  }
}

testConnection()
