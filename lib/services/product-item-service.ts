import { supabase } from "@/lib/supabase"

export interface ProductItem {
  id: string
  product_id: string
  item_code: string
  barcode: string
  qr_code?: string
  serial_number?: string
  status: "available" | "booked" | "damaged" | "in_laundry" | "sold"
  condition: "new" | "good" | "fair" | "poor" | "damaged"
  location?: string
  notes?: string
  purchase_date?: string
  last_used_date?: string
  usage_count: number
  franchise_id: string
  created_at: string
  updated_at: string
  product?: {
    name: string
    product_code: string
    category: string
  }
}

export interface BulkGenerateRequest {
  product_id: string
  quantity: number
  condition?: string
  location?: string
  notes?: string
}

export class ProductItemService {
  static async generateBulkItems(request: BulkGenerateRequest): Promise<ProductItem[]> {
    try {
      // First get the product details
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("product_code, franchise_id, name")
        .eq("id", request.product_id)
        .single()

      if (productError) throw productError

      // Handle missing product_code for custom products
      let productCode = product.product_code
      if (!productCode) {
        // Generate a product code if missing (for legacy custom products)
        productCode = `CUST-${Date.now().toString(36).toUpperCase()}`
        
        // Update the product with the generated code
        const { error: updateError } = await supabase
          .from("products")
          .update({ product_code: productCode })
          .eq("id", request.product_id)
        
        if (updateError) {
          console.error("Failed to update product_code:", updateError)
          // Continue anyway with the generated code
        }
      }

      // Get the current highest item number for this product
      const { data: existingItems, error: existingError } = await supabase
        .from("product_items")
        .select("item_code")
        .eq("product_id", request.product_id)
        .like("item_code", `${productCode}-%`)
        .order("item_code", { ascending: false })
        .limit(1)

      if (existingError) throw existingError

      // Calculate starting number
      let startNumber = 1
      if (existingItems && existingItems.length > 0) {
        const lastItemCode = existingItems[0].item_code
        const match = lastItemCode.match(/-(\d+)$/)
        if (match) {
          startNumber = Number.parseInt(match[1]) + 1
        }
      }

      // Generate items in batch
      const items: Partial<ProductItem>[] = []

      for (let i = 0; i < request.quantity; i++) {
        const itemNumber = startNumber + i
        const itemCode = `${productCode}-${itemNumber.toString().padStart(4, "0")}`
        const barcode = `${Date.now()}${itemNumber.toString().padStart(6, "0")}`

        items.push({
          product_id: request.product_id,
          item_code: itemCode,
          barcode: barcode,
          qr_code: `QR-${itemCode}`,
          condition: (request.condition || "new") as "new" | "good" | "fair" | "poor" | "damaged",
          location: request.location,
          notes: request.notes,
          franchise_id: product.franchise_id,
          status: "available",
          usage_count: 0,
        })
      }

      // Insert all items
      const { data, error } = await supabase
        .from("product_items")
        .insert(items)
        .select("*")

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error generating bulk items:", error)
      throw error
    }
  }

  static async getProductItems(productId: string, franchiseId?: string): Promise<ProductItem[]> {
    try {
      let query = supabase
        .from("product_items")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false })

      if (franchiseId) {
        query = query.eq("franchise_id", franchiseId)
      }

      if (!franchiseId) {
        const { data: product } = await supabase.from("products").select("franchise_id").eq("id", productId).single()
        if (product?.franchise_id) {
          query = query.eq("franchise_id", product.franchise_id)
        }
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("Error fetching product items:", error)
      throw error
    }
  }

  static async updateItemStatus(itemId: string, status: ProductItem["status"]): Promise<void> {
    try {
      const { error } = await supabase
        .from("product_items")
        .update({
          status,
          updated_at: new Date().toISOString(),
          ...(status === "booked" && { last_used_date: new Date().toISOString() }),
        })
        .eq("id", itemId)

      if (error) throw error
    } catch (error) {
      console.error("Error updating item status:", error)
      throw error
    }
  }

  static async deleteItem(itemId: string): Promise<void> {
    try {
      const { error } = await supabase.from("product_items").delete().eq("id", itemId)

      if (error) throw error
    } catch (error) {
      console.error("Error deleting item:", error)
      throw error
    }
  }

  static async searchByBarcode(barcode: string, franchiseId?: string): Promise<ProductItem | null> {
    try {
      let query = supabase.from("product_items").select("*").eq("barcode", barcode)
      if (franchiseId) {
        query = query.eq("franchise_id", franchiseId)
      }
      const { data, error } = await query.single()

      if (error && error.code !== "PGRST116") throw error
      return data || null
    } catch (error) {
      console.error("Error searching by barcode:", error)
      throw error
    }
  }
}
