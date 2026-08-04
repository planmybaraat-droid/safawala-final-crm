"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { PackagesClient } from "./sets-client"
import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/client"

export default function PackagesPage() {
  const [user, setUser] = useState(null)
  const [categories, setCategories] = useState([])
  const [franchises, setFranchises] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push("/")
          return
        }

        console.log("[v0] Sets page - User authenticated:", currentUser.name, currentUser.role)
        setUser(currentUser)

        const supabase = createClient()

        try {
          // Fetch categories first with franchise filtering
          let categoriesQuery = supabase
            .from("packages_categories")
            .select("*")
            .eq("is_active", true)
          
          // Categories are global — no franchise filter
          const { data: categoriesData, error: categoriesError } = await categoriesQuery
            .order("display_order", { ascending: true })

          if (categoriesError) {
            console.log("[v0] Error fetching categories:", categoriesError)
            setCategories([])
          } else {
            console.log("[v0] Categories fetched successfully:", categoriesData?.length || 0)

            // Fetch variants directly for each category (no packages layer)
            const categoriesWithVariants = await Promise.all(
              (categoriesData || []).map(async (category) => {
                // Build query with franchise filtering
                let variantQuery = supabase
                  .from("package_variants")
                  .select("*")
                  .eq("category_id", category.id)
                  .eq("is_active", true)
                
                // Only filter by franchise for non-super-admins
                if (currentUser.role !== "super_admin" && currentUser.franchise_id) {
                  variantQuery = variantQuery.eq("franchise_id", currentUser.franchise_id)
                }
                
                const { data: variantsData } = await variantQuery.order("display_order", { ascending: true })

                return {
                  ...category,
                  package_variants: variantsData || [],
                }
              }),
            )

            setCategories(categoriesWithVariants)
          }
        } catch (dbError) {
          console.log("[v0] Database error:", dbError.message)
          setCategories([])
        }

        try {
          const { data: franchisesData, error: franchisesError } = await supabase
            .from("franchises")
            .select("id, name")
            .eq("is_active", true)
            .order("name", { ascending: true })

          if (franchisesError) {
            console.error("[v0] Error fetching franchises:", franchisesError)
          } else {
            setFranchises(franchisesData || [])
          }
        } catch (franchiseError) {
          console.log("[v0] Franchises table accessible, using existing data")
          setFranchises([])
        }
      } catch (error) {
        console.error("[v0] Sets page error:", error)
        setCategories([])
        setFranchises([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading packages...</p>
        </div>
      </div>
    )
  }

  return <PackagesClient initialCategories={categories} distanceTiers={[]} franchises={franchises} user={user} />
}
