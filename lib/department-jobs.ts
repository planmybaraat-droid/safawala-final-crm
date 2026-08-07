import { createClient } from "@supabase/supabase-js"

/**
 * ⚡ SAFAWALA CRM - Automatic Department Job Generator
 * When a booking is confirmed or created, this automatically generates master & department jobs
 * across all 7 portals (Warehouse, QC, Styling, Travels, Delivery, Accounts, Manager)
 * using the exact same Booking ID / Order Number for complete trackability.
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
    console.warn("[DepartmentJobs] Supabase service role key missing, skipping direct job creation.")
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // 1. Check if work_orders row already exists for this booking
    const { data: existingWo } = await supabase
      .from("work_orders")
      .select("id, work_order_number")
      .eq("booking_id", orderId)
      .maybeSingle()

    let woId = existingWo?.id

    const formattedJobNumber = orderNumber.startsWith("JOB")
      ? orderNumber
      : `JOB #${orderNumber}`

    // 2. If no master work_order exists, create it
    if (!woId) {
      const { data: newWo, error: woErr } = await supabase
        .from("work_orders")
        .insert([
          {
            work_order_number: formattedJobNumber,
            booking_id: orderId,
            booking_source: "product_orders",
            franchise_id: franchiseId || null,
            status: "confirmed",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single()

      if (woErr) {
        console.warn("[DepartmentJobs] Error inserting master work order:", woErr.message)
        return
      }
      woId = newWo.id
    }

    // 3. Build item instructions list
    const instructions = items.length > 0
      ? items.map(i => `${i.quantity || 1} x ${i.product_name || "Item"}`).join("\n")
      : `Booking #${orderNumber} for ${customerName || "Customer"}`

    // 4. Department Tasks Definitions for all 7 Portals
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

    // 5. Upsert tasks non-fatally
    for (const task of departmentTasks) {
      const { data: existingTask } = await supabase
        .from("work_order_tasks")
        .select("id")
        .eq("work_order_id", woId)
        .eq("department", task.department)
        .maybeSingle()

      if (!existingTask) {
        await supabase.from("work_order_tasks").insert([task])
      }
    }

    console.log(`[DepartmentJobs] Successfully initialized all 7 department jobs for ${formattedJobNumber}`)
  } catch (err: any) {
    console.warn("[DepartmentJobs] Error in department job generation (non-fatal):", err.message || err)
  }
}
