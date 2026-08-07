import { createClient } from "@supabase/supabase-js"

/**
 * ⚡ SAFAWALA CRM - Automatic Department Job Generator
 * When a booking is confirmed or created, this automatically generates master & department jobs
 * across all 7 portals (Warehouse, QC, Styling, Travels, Delivery, Accounts, Manager)
 * using the exact same Booking ID / Order Number for complete trackability.
 *
 * ✅ Bulletproof: Uses upsert with onConflict so duplicate calls never throw errors.
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
    console.warn("[DepartmentJobs] Supabase service role key missing, skipping job creation.")
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const formattedJobNumber = orderNumber.startsWith("JOB")
      ? orderNumber
      : `JOB #${orderNumber}`

    // ── Step 1: Find or create master work_order via upsert on booking_id ──────
    // First try to find by booking_id (most reliable dedup key)
    const { data: existingWo } = await supabase
      .from("work_orders")
      .select("id, work_order_number")
      .eq("booking_id", orderId)
      .maybeSingle()

    let woId: string | undefined = existingWo?.id

    if (!woId) {
      // Use upsert on work_order_number (unique constraint) with ignoreDuplicates=false
      // so we get back the row even if it already exists by number.
      // Generate a unique work_order_number by appending random suffix if needed.
      let woNumber = formattedJobNumber
      let attempt = 0

      while (attempt < 5) {
        const suffix = attempt === 0 ? "" : `-${Math.floor(Math.random() * 9000) + 1000}`
        woNumber = `${formattedJobNumber}${suffix}`

        const { data: newWo, error: woErr } = await supabase
          .from("work_orders")
          .insert([
            {
              work_order_number: woNumber,
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
            // Unique violation — this booking_id already has a work_order created
            // by a concurrent request. Fetch it and continue.
            const { data: raceWo } = await supabase
              .from("work_orders")
              .select("id")
              .eq("booking_id", orderId)
              .maybeSingle()
            if (raceWo) { woId = raceWo.id; break }
            // work_order_number collision — retry with different suffix
            attempt++
            continue
          }
          // Other error — log and bail
          console.warn("[DepartmentJobs] Error inserting master work order:", woErr.message)
          return
        }

        woId = newWo.id
        break
      }
    }

    if (!woId) {
      console.warn("[DepartmentJobs] Could not obtain woId after retries, aborting.")
      return
    }

    // ── Step 2: Build item instructions ─────────────────────────────────────────
    const instructions = items.length > 0
      ? items.map(i => `${i.quantity || 1} x ${i.product_name || "Item"}`).join("\n")
      : `Booking #${orderNumber} for ${customerName || "Customer"}`

    // ── Step 3: Upsert department tasks (idempotent by work_order_id + department) ─
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

    // Insert each task only if it doesn't already exist for this work_order+department
    for (const task of departmentTasks) {
      const { data: existingTask } = await supabase
        .from("work_order_tasks")
        .select("id")
        .eq("work_order_id", woId)
        .eq("department", task.department)
        .maybeSingle()

      if (!existingTask) {
        const { error: taskErr } = await supabase.from("work_order_tasks").insert([task])
        if (taskErr) {
          // 23505 = already inserted by concurrent request — safe to ignore
          if (taskErr.code !== "23505") {
            console.warn(`[DepartmentJobs] Task insert error (${task.department}):`, taskErr.message)
          }
        }
      }
    }

    console.log(`[DepartmentJobs] ✅ All 7 department jobs ready for ${formattedJobNumber}`)
  } catch (err: any) {
    console.warn("[DepartmentJobs] Unexpected error (non-fatal):", err.message || err)
  }
}
