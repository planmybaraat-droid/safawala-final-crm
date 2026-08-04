import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// Hidden/test categories to exclude from public page
const HIDDEN_KEYWORDS = ["demo", "test", "sample", "temp", "now safa", "new safa"]

function isHidden(name: string) {
  const lower = name.toLowerCase()
  return HIDDEN_KEYWORDS.some(k => lower.includes(k))
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // 1. Find the Vadodara franchise by env var or name lookup
    const franchiseId = process.env.PUBLIC_PACKAGES_FRANCHISE_ID

    let targetFranchiseId: string | null = franchiseId || null

    if (!targetFranchiseId) {
      // Look up by name
      const franchiseName = process.env.PUBLIC_PACKAGES_FRANCHISE_NAME || "Vadodara"
      const { data: franchise } = await supabase
        .from("franchises")
        .select("id, name")
        .ilike("name", `%${franchiseName}%`)
        .limit(1)
        .single()

      if (franchise) {
        targetFranchiseId = franchise.id
      }
    }

    // 2. Fetch package variants — try with franchise filter, fallback to all
    const fetchVariants = async (franchiseId: string | null, activeOnly: boolean) => {
      let q = supabase
        .from("package_variants")
        .select("id, name, base_price, category_id, inclusions, display_order, franchise_id, is_active")
        .order("display_order", { ascending: true })
      if (activeOnly) q = q.eq("is_active", true)
      if (franchiseId) q = q.eq("franchise_id", franchiseId)
      return q
    }

    let { data: variants, error: varError } = await fetchVariants(targetFranchiseId, true)
    if (varError) console.error("[Public Packages] Variants error:", varError)

    // Fallback 1: franchise filter returned nothing → try all franchises
    if (targetFranchiseId && (!variants || variants.length === 0)) {
      const { data: all } = await fetchVariants(null, true)
      variants = all
    }

    // Fallback 2: is_active filter excluded everything → fetch without it
    if (!variants || variants.length === 0) {
      const { data: all } = await fetchVariants(targetFranchiseId, false)
      variants = all
    }

    const activeVariants = variants || []

    // 3. Get unique category IDs that actually have variants
    const activeCategoryIds = [...new Set(activeVariants.map(v => v.category_id).filter(Boolean))]

    if (activeCategoryIds.length === 0) {
      return NextResponse.json({ success: true, categories: [], variants: [] })
    }

    // 4. Fetch only those categories (no description — column may not exist)
    const { data: categories, error: catError } = await supabase
      .from("packages_categories")
      .select("id, name, display_order")
      .in("id", activeCategoryIds)
      .order("display_order", { ascending: true })

    if (catError) {
      console.error("[Public Packages] Categories error:", catError)
    }

    // 5. Filter out hidden/demo categories
    const publicCategories = (categories || []).filter(c => !isHidden(c.name))

    // 6. Only return variants for public categories
    const publicCatIds = new Set(publicCategories.map(c => c.id))
    const publicVariants = activeVariants.filter(v => publicCatIds.has(v.category_id))

    return NextResponse.json({
      success: true,
      categories: publicCategories,
      variants: publicVariants,
      franchise_id: targetFranchiseId,
    })
  } catch (err) {
    console.error("[Public Packages] Error:", err)
    return NextResponse.json({ error: "Failed to load packages" }, { status: 500 })
  }
}
