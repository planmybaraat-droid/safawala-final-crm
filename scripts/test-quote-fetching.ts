import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function testQuoteFetching() {
  console.log("🔍 Testing Supabase connection and quote fetching...")

  try {
    // Test basic connection
    console.log("📡 Testing Supabase connection...")
    const { data: connectionTest, error: connectionError } = await supabase.from("quotes").select("count(*)").single()

    if (connectionError) {
      console.error("❌ Connection error:", connectionError)
      return
    }

    console.log("✅ Supabase connection successful")

    // Test quote fetching
    console.log("📊 Fetching quotes...")
    const { data: quotes, error: quotesError } = await supabase
      .from("quotes")
      .select(`
        *,
        quote_items (*)
      `)
      .order("created_at", { ascending: false })

    if (quotesError) {
      console.error("❌ Error fetching quotes:", quotesError)
      return
    }

    console.log(`✅ Successfully fetched ${quotes?.length || 0} quotes`)

    if (quotes && quotes.length > 0) {
      console.log("📋 Sample quote data:")
      quotes.forEach((quote, index) => {
        console.log(`${index + 1}. ${quote.quote_number} - ${quote.customer_name} - ${quote.status}`)
      })
    } else {
      console.log("⚠️ No quotes found in database")
    }

    // Test stats calculation
    console.log("📈 Testing stats calculation...")
    const stats = {
      total: quotes?.length || 0,
      generated: quotes?.filter((q) => q.status === "generated").length || 0,
      sent: quotes?.filter((q) => q.status === "sent").length || 0,
      accepted: quotes?.filter((q) => q.status === "accepted").length || 0,
      converted: quotes?.filter((q) => q.status === "converted").length || 0,
      expired: quotes?.filter((q) => q.status === "expired").length || 0,
    }

    console.log("📊 Quote statistics:", stats)
  } catch (error) {
    console.error("💥 Unexpected error:", error)
  }
}

testQuoteFetching()
