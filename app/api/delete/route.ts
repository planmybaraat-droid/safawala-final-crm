import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest } from "@/lib/auth-middleware"

// Force dynamic rendering and Node runtime
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type SupportedEntity =
  | "vendor" | "vendors"
  | "customer" | "customers"
  | "booking" | "bookings"
  | "expense" | "expenses"

const ENTITY_TABLE_MAP: Record<SupportedEntity, string> = {
  vendor: "vendors",
  vendors: "vendors",
  customer: "customers",
  customers: "customers",
  booking: "bookings",
  bookings: "bookings",
  expense: "expenses",
  expenses: "expenses",
}

function normalizeEntity(entity: string): SupportedEntity | null {
  const key = entity?.toLowerCase() as SupportedEntity
  return ENTITY_TABLE_MAP[key] ? key : null
}

// Map entity to required permission for delete operations
const ENTITY_PERMISSION: Record<SupportedEntity, keyof import("@/lib/types").UserPermissions> = {
  vendor: "vendors",
  vendors: "vendors",
  customer: "customers",
  customers: "customers",
  booking: "bookings",
  bookings: "bookings",
  expense: "expenses",
  expenses: "expenses",
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { entity, id, hard } = body || {}

    const normalized = normalizeEntity(entity)
    if (!normalized) {
      return NextResponse.json({ error: "Unsupported entity type" }, { status: 400 })
    }

    // Authenticate using unified auth with permission per entity
    const auth = await authenticateRequest(request, {
      minRole: hard ? 'franchise_admin' : 'staff',
      requirePermission: ENTITY_PERMISSION[normalized],
    })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }
    const franchiseId = auth.user!.franchise_id
    const isSuperAdmin = auth.user!.role === 'super_admin'
    const role = auth.user!.role

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Valid id is required" }, { status: 400 })
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: "Invalid id format" }, { status: 400 })
    }

  const table = ENTITY_TABLE_MAP[normalized]
    const supabase = createClient()

    // 1) Fetch existing record first
    const { data: record, error: fetchError } = await supabase
      .from(table)
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError) {
      if ((fetchError as any).code === "PGRST116") {
        return NextResponse.json({ error: `${table.slice(0, -1)} not found` }, { status: 404 })
      }
      throw fetchError
    }

    // 2) Franchise authorization if column exists
    if (!isSuperAdmin && Object.prototype.hasOwnProperty.call(record, "franchise_id")) {
      if (record.franchise_id && record.franchise_id !== franchiseId) {
        return NextResponse.json({ error: "Access denied for this franchise" }, { status: 403 })
      }
    }

    // 3) Optional sanity checks by entity
    if (table === "vendors") {
      // Prevent deletion if active purchases exist
      const { data: activePurchases } = await supabase
        .from("purchases")
        .select("id")
        .eq("vendor_id", id)
        .in("status", ["pending", "partial"])
        .limit(1)
      if (activePurchases && activePurchases.length > 0) {
        return NextResponse.json(
          { error: "Cannot delete vendor with active purchases. Complete or cancel purchases first." },
          { status: 409 }
        )
      }
    }
    if (table === "bookings") {
      // Prevent deletion if payments exist for this booking
      const { data: paymentsRef } = await supabase
        .from("payments")
        .select("id")
        .eq("booking_id", id)
        .limit(1)
      if (paymentsRef && paymentsRef.length > 0) {
        return NextResponse.json(
          { error: "Cannot delete booking with existing payments. Refund/remove payments first or mark booking cancelled." },
          { status: 409 }
        )
      }
    }

    // 4) Perform deletion
    const doHardDelete = Boolean(hard)

    // Handle customers with related returns
    if (table === "customers") {
      const { data: relatedReturns } = await supabase
        .from("returns")
        .select("id")
        .eq("customer_id", id)

      if (relatedReturns && relatedReturns.length > 0) {
        if (doHardDelete) {
          // Hard delete: cascade delete returns first
          const { error: delReturnsError } = await supabase
            .from("returns")
            .delete()
            .eq("customer_id", id)
          if (delReturnsError) throw delReturnsError
        } else {
          // Soft delete: mark returns as inactive
          const { error: updateReturnsError } = await supabase
            .from("returns")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq("customer_id", id)
          if (updateReturnsError) {
            // Fallback to hard delete returns if soft delete not supported
            const { error: delReturnsError } = await supabase
              .from("returns")
              .delete()
              .eq("customer_id", id)
            if (delReturnsError) throw delReturnsError
          }
        }
      }
    }

    if (doHardDelete) {
      const { error: delError } = await supabase.from(table).delete().eq("id", id)
      if (delError) throw delError
      return NextResponse.json({ message: `${table.slice(0, -1)} deleted successfully`, hard: true })
    }

    // Entity-specific preferred soft delete behavior
    if (table === "bookings") {
      // Prefer to mark as cancelled (and inactive if available)
      const now = new Date().toISOString()
      // Try enhanced cancellation first
      const enhanced = { is_active: false as any, status: "cancelled", cancelled_at: now, updated_at: now }
      try {
        const { data: updated, error: updError } = await supabase
          .from(table)
          .update(enhanced as any)
          .eq("id", id)
          .select()
          .single()

        if (updError) {
          const msg = String((updError as any).message || "")
          if (/column|does not exist/i.test(msg)) {
            // Retry without is_active
            const { data: updated2, error: updError2 } = await supabase
              .from(table)
              .update({ status: "cancelled", cancelled_at: now, updated_at: now } as any)
              .eq("id", id)
              .select()
              .single()
            if (updError2) {
              const msg2 = String((updError2 as any).message || "")
              if (/column|does not exist/i.test(msg2)) {
                // Retry with only is_active
                const { data: updated3, error: updError3 } = await supabase
                  .from(table)
                  .update({ is_active: false, updated_at: now } as any)
                  .eq("id", id)
                  .select()
                  .single()
                if (updError3) throw updError3
                return NextResponse.json({ message: "Booking cancelled (inactive)", record: updated3 })
              }
              throw updError2
            }
            return NextResponse.json({ message: "Booking cancelled", record: updated2 })
          }
          throw updError
        }
        return NextResponse.json({ message: "Booking cancelled", record: updated })
      } catch (err) {
        // Final fallback: hard delete (safe since we checked payments above)
        const { error: delError } = await supabase.from(table).delete().eq("id", id)
        if (delError) throw delError
        return NextResponse.json({ message: "Booking deleted successfully" })
      }
    }

    // Generic soft delete preferred if is_active exists
    try {
      const { data: updated, error: updError } = await supabase
        .from(table)
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single()

      if (updError) {
        const msg = String((updError as any).message || "")
        if (/is_active|column .* does not exist/i.test(msg)) {
          // Fallback to hard delete
          const { error: delError } = await supabase.from(table).delete().eq("id", id)
          if (delError) throw delError
          return NextResponse.json({
            message: `${table.slice(0, -1)} deleted successfully (hard delete)`,
            warning: "Soft delete not available; consider running migration to add is_active.",
          })
        }
        throw updError
      }

      return NextResponse.json({ message: `${table.slice(0, -1)} deleted successfully`, record: updated })
    } catch (error) {
      // Last resort hard delete
      const { error: delError } = await supabase.from(table).delete().eq("id", id)
      if (delError) throw delError
      return NextResponse.json({ message: `${table.slice(0, -1)} deleted successfully` })
    }
  } catch (error: any) {
    console.error("[Delete API] Error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to delete" },
      { status: error?.statusCode || (error?.message === "Authentication required" ? 401 : 500) }
    )
  }
}
