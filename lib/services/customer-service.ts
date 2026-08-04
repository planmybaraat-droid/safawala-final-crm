import { supabase } from "@/lib/supabase"
import type { Customer } from "@/lib/types"

export interface CreateCustomerData {
  name: string
  phone: string
  whatsapp?: string
  email?: string
  address?: string
  city?: string
  pincode?: string
  state?: string
  franchise_id?: string
}

export interface UpdateCustomerData extends Partial<CreateCustomerData> {
  id: string
}

class CustomerService {
  async getAll(franchiseId?: string): Promise<Customer[]> {
    try {
      if (!franchiseId) {
        console.warn("CustomerService.getAll called without a franchiseId; returning empty list")
        return []
      }

      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("franchise_id", franchiseId)
        .order("created_at", { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error fetching customers:", error)
      throw error
    }
  }

  async getById(id: string, franchiseId?: string): Promise<Customer | null> {
    try {
      if (!franchiseId) {
        console.warn("CustomerService.getById called without a franchiseId; returning null")
        return null
      }

      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .eq("franchise_id", franchiseId)
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error("Error fetching customer:", error)
      throw error
    }
  }

  async create(customerData: CreateCustomerData): Promise<Customer> {
    try {
      // Generate customer code
      const { data: codeData, error: codeError } = await supabase.rpc("generate_customer_code")

      if (codeError) throw codeError

      const customerCode = codeData as string

      const { data, error } = await supabase
        .from("customers")
        .insert({
          customer_code: customerCode,
          name: customerData.name,
          phone: customerData.phone,
          whatsapp: customerData.whatsapp,
          email: customerData.email,
          address: customerData.address,
          city: customerData.city,
          pincode: customerData.pincode,
          state: customerData.state,
          franchise_id: customerData.franchise_id || "",
        })
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error("Error creating customer:", error)
      throw error
    }
  }

  async update(customerData: UpdateCustomerData): Promise<Customer> {
    try {
      const { id, ...updateData } = customerData

      const { data, error } = await supabase.from("customers").update(updateData).eq("id", id).select().single()

      if (error) throw error

      return data
    } catch (error) {
      console.error("Error updating customer:", error)
      throw error
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase.from("customers").delete().eq("id", id)

      if (error) throw error
    } catch (error) {
      console.error("Error deleting customer:", error)
      throw error
    }
  }

  async search(query: string, franchiseId?: string): Promise<Customer[]> {
    try {
      if (!franchiseId) {
        console.warn("CustomerService.search called without a franchiseId; returning empty list")
        return []
      }

      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .or(`name.ilike.%${query}%,phone.ilike.%${query}%,customer_code.ilike.%${query}%`)
        .eq("franchise_id", franchiseId)
        .order("created_at", { ascending: false })
        .limit(20)

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error searching customers:", error)
      throw error
    }
  }
}

export const customerService = new CustomerService()
