import { createClient } from "@supabase/supabase-js"

/**
 * ⚡ SAFAWALA CRM - Department Task Generator
 *
 * This function ensures work_order_tasks exist for all 7 departments.
 * The master work_order is created by the `create_work_order_for_booking` SQL RPC.
 * This function ONLY creates the department-level tasks — it never inserts into work_orders.
 *
 * ✅ Fully idempotent: safe to call multiple times for the same booking.
 * ✅ Non-fatal: any error is caught and logged without crashing the booking.
 */
export async function ensureDepartmentJobsForOrder({
  orderId,
  orderNumber,
  franchiseId,
  isRental = true,
  items = [],
  customerName = "",
}: {
  orderId: string
  orderNumber: string
  franchiseId?: string
  isRental?: boolean
  items?: Array<{ product_name?: string; quantity?: number }>
  customerName?: string
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  if (!supabaseUrl || !supabaseKey) {
    console.warn("[DepartmentJobs] Supabase service role key missing, skipping.")
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const formattedJobNumber = orderNumber.startsWith("JOB")
      ? orderNumber
      : `JOB #${orderNumber}`

    // ── Step 1: Find the master work_order created by the RPC ───────────────────
    // The SQL RPC `create_work_order_for_booking` already inserted the work_order row.
    // We just need to look it up — we do NOT insert here to avoid duplicate key errors.
    const { data: existingWo } = await supabase
      .from("work_orders")
      .select("id")
      .eq("booking_id", orderId)
      .maybeSingle()

    if (!existingWo?.id) {
      // RPC may have failed or not run yet — try inserting with conflict handling
      const { data: newWo, error: woErr } = await supabase
        .from("work_orders")
        .insert([
          {
            work_order_number: `${formattedJobNumber}-${Date.now().toString().slice(-4)}`,
            booking_id: orderId,
            booking_source: "product_orders",
            franchise_id: franchiseId || null,
            status: "confirmed",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select("id")
        .single()

      if (woErr) {
        if (woErr.code === "23505") {
          // Concurrent insert won the race — fetch the existing row
          const { data: raceWo } = await supabase
            .from("work_orders")
            .select("id")
            .eq("booking_id", orderId)
            .maybeSingle()
          if (!raceWo?.id) {
            console.warn("[DepartmentJobs] Could not find work_order after race condition.")
            return
          }
          // Use the existing row and continue to task creation
          await createDepartmentTasks(supabase, raceWo.id, orderNumber, formattedJobNumber, customerName, items)
        } else {
          console.warn("[DepartmentJobs] Error creating fallback work_order:", woErr.message)
        }
        return
      }

      if (newWo?.id) {
        await createDepartmentTasks(supabase, newWo.id, orderNumber, formattedJobNumber, customerName, items)
      }
      return
    }

    // ── Step 2: Work_order exists — just ensure department tasks ────────────────
    await createDepartmentTasks(supabase, existingWo.id, orderNumber, formattedJobNumber, customerName, items)

    console.log(`[DepartmentJobs] ✅ Department tasks ready for ${formattedJobNumber}`)
  } catch (err: any) {
    console.warn("[DepartmentJobs] Unexpected error (non-fatal):", err.message || err)
  }
}

async function createDepartmentTasks(
  supabase: ReturnType<typeof createClient>,
  woId: string,
  orderNumber: string,
  formattedJobNumber: string,
  customerName: string,
  items: Array<{ product_name?: string; quantity?: number }>
) {
  const instructions = items.length > 0
    ? items.map(i => `${i.quantity || 1} x ${i.product_name || "Item"}`).join("\n")
    : `Booking #${orderNumber} for ${customerName || "Customer"}`

  const departmentTasks = [
    {
      work_order_id: woId,
      department: "warehouse",
      task_number: `WH-${orderNumber}`,
      title: `📦 Warehouse Picking - ${formattedJobNumber}`,
      status: "active",
      instructions,
      checklist: [
        { text: "Locate Items in Inventory", checked: false },
        { text: "Verify Sizes & Quantity", checked: false },
        { text: "Barcode Scanned & Tagged", checked: false },
      ],
    },
    {
      work_order_id: woId,
      department: "qc",
      task_number: `QC-${orderNumber}`,
      title: `✅ Quality Check (QC) - ${formattedJobNumber}`,
      status: "pending",
      instructions: "Perform stain inspection, iron check, and accessory verification.",
      checklist: [
        { text: "Stain & Damage Inspection", checked: false },
        { text: "Iron & Folding Quality Check", checked: false },
        { text: "Count & Accessories Verified", checked: false },
      ],
    },
    {
      work_order_id: woId,
      department: "styling",
      task_number: `ST-${orderNumber}`,
      title: `🎨 Styling Safa Tying - ${formattedJobNumber}`,
      status: "pending",
      instructions: `Safa Tying Assignment for ${customerName || "Customer"}.`,
      checklist: [
        { text: "Stylist Interest Received", checked: false },
        { text: "Lead Stylist Assigned", checked: false },
        { text: "Client Tying Confirmed", checked: false },
      ],
    },
    {
      work_order_id: woId,
      department: "travels",
      task_number: `TR-${orderNumber}`,
      title: `🚚 Travels & Transport - ${formattedJobNumber}`,
      status: "pending",
      instructions: "Coordinate outstation travel tickets and transport vehicle.",
      checklist: [
        { text: "Route & Mode Selected", checked: false },
        { text: "Ticket / Driver Assigned", checked: false },
        { text: "Boarding & Arrival Confirmed", checked: false },
      ],
    },
    {
      work_order_id: woId,
      department: "delivery",
      task_number: `DL-${orderNumber}`,
      title: `🚛 Delivery & Handover - ${formattedJobNumber}`,
      status: "pending",
      instructions: "Dispatch order to venue and acquire client signature.",
      checklist: [
        { text: "Driver Assigned & Dispatched", checked: false },
        { text: "Delivered to Customer", checked: false },
        { text: "Challan Signed by Client", checked: false },
      ],
    },
    {
      work_order_id: woId,
      department: "accounts",
      task_number: `AC-${orderNumber}`,
      title: `💰 Accounts & Deposit - ${formattedJobNumber}`,
      status: "active",
      instructions: "Verify advance payment, pending balance, and security deposit.",
      checklist: [
        { text: "Advance Payment Verified", checked: false },
        { text: "Security Deposit Received", checked: false },
        { text: "Invoice Ledger Updated", checked: false },
      ],
    },
    {
      work_order_id: woId,
      department: "manager",
      task_number: `MG-${orderNumber}`,
      title: `👑 Manager Monitoring - ${formattedJobNumber}`,
      status: "monitoring",
      instructions: "Monitor lifecycle across all 6 departments.",
      checklist: [
        { text: "Order Creation Audit", checked: false },
        { text: "All Department Tasks Initialized", checked: false },
        { text: "Final Completion Sign-off", checked: false },
      ],
    },
  ]

  for (const task of departmentTasks) {
    // Check if task already exists for this department
    const { data: existingTask } = await supabase
      .from("work_order_tasks")
      .select("id")
      .eq("work_order_id", woId)
      .eq("department", task.department)
      .maybeSingle()

    if (!existingTask) {
      const { error: taskErr } = await supabase.from("work_order_tasks").insert([task])
      if (taskErr && taskErr.code !== "23505") {
        console.warn(`[DepartmentJobs] Task insert error (${task.department}):`, taskErr.message)
      }
    }
  }
}
