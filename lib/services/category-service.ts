import { supabase } from "@/lib/supabase"
import type { Category } from "@/lib/types"

export interface CreateCategoryData {
  name: string
  description?: string
  parent_id?: string
  franchise_id?: string
}

export interface UpdateCategoryData extends Partial<CreateCategoryData> {
  id: string
}

class CategoryService {
  async getAll(franchiseId?: string): Promise<Category[]> {
    try {
      if (!franchiseId) {
        console.warn("CategoryService.getAll called without a franchiseId; returning empty list")
        return []
      }

      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .eq("is_active", true)
        .eq("franchise_id", franchiseId)
        .order("name", { ascending: true })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error fetching categories:", error)
      throw error
    }
  }

  async getById(id: string, franchiseId?: string): Promise<Category | null> {
    try {
      if (!franchiseId) {
        console.warn("CategoryService.getById called without a franchiseId; returning null")
        return null
      }

      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .eq("id", id)
        .eq("franchise_id", franchiseId)
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error("Error fetching category:", error)
      throw error
    }
  }

  async create(categoryData: CreateCategoryData): Promise<Category> {
    try {
      const { data, error } = await supabase
        .from("product_categories")
        .insert({
          name: categoryData.name,
          description: categoryData.description,
          parent_id: categoryData.parent_id,
          franchise_id: categoryData.franchise_id || "",
          is_active: true,
        })
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error("Error creating category:", error)
      throw error
    }
  }

  async update(categoryData: UpdateCategoryData): Promise<Category> {
    try {
      const { id, ...updateData } = categoryData

      const { data, error } = await supabase
        .from("product_categories")
        .update(updateData)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error("Error updating category:", error)
      throw error
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase.from("product_categories").update({ is_active: false }).eq("id", id)

      if (error) throw error
    } catch (error) {
      console.error("Error deleting category:", error)
      throw error
    }
  }

  async getWithProductCount(): Promise<(Category & { product_count: number })[]> {
    try {
      const { data, error } = await supabase
        .from("product_categories")
        .select(`
          *,
          products(count)
        `)
        .eq("is_active", true)
        .order("name", { ascending: true })

      if (error) throw error

      return (data || []).map((category: any) => ({
        ...category,
        product_count: category.products?.[0]?.count || 0,
      }))
    } catch (error) {
      console.error("Error fetching categories with product count:", error)
      throw error
    }
  }
}

export const categoryService = new CategoryService()
