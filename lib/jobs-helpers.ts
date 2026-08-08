export const DEPT_ORDER = ["booking", "warehouse", "qc", "delivery", "travels", "styling", "accounts"]

/** Enrich jobs with booking_number/customer info, mirroring /api/work-orders. */
export async function enrichJobs(supabase: any, jobs: any[]) {
  const productOrderIds = jobs.filter((j) => j.booking_source === "product_orders" && j.booking_id).map((j) => j.booking_id)
  const packageBookingIds = jobs.filter((j) => j.booking_source === "package_bookings" && j.booking_id).map((j) => j.booking_id)
  const directSalesIds = jobs.filter((j) => j.booking_source === "direct_sales_orders" && j.booking_id).map((j) => j.booking_id)

  const [productOrdersRes, packageBookingsRes, directSalesRes] = await Promise.all([
    productOrderIds.length > 0
      ? supabase.from("product_orders").select("id, order_number, event_date, customer:customers(name, phone)").in("id", productOrderIds)
      : Promise.resolve({ data: [] as any }),
    packageBookingIds.length > 0
      ? supabase.from("package_bookings").select("id, package_number, event_date, customer:customers(name, phone)").in("id", packageBookingIds)
      : Promise.resolve({ data: [] as any }),
    directSalesIds.length > 0
      ? supabase.from("direct_sales_orders").select("id, sale_number, sale_date, customer:customers(name, phone)").in("id", directSalesIds)
      : Promise.resolve({ data: [] as any }),
  ])

  const productOrdersMap = new Map(productOrdersRes.data?.filter((o: any) => o?.id).map((o: any) => [o.id, o]) || [])
  const packageBookingsMap = new Map(packageBookingsRes.data?.filter((o: any) => o?.id).map((o: any) => [o.id, o]) || [])
  const directSalesMap = new Map(directSalesRes.data?.filter((o: any) => o?.id).map((o: any) => [o.id, o]) || [])

  const assigneeIds = Array.from(
    new Set(jobs.flatMap((j) => j.job_tasks || []).map((t: any) => t?.assigned_to).filter(Boolean))
  )
  const assigneeMap = new Map<string, { name: string; phone: string | null }>()
  if (assigneeIds.length > 0) {
    const { data: assignees } = await supabase.from("users").select("id, name, phone").in("id", assigneeIds)
    for (const a of assignees || []) assigneeMap.set(a.id, { name: a.name, phone: a.phone || null })
  }

  return jobs.map((job) => {
    let bookingDetails: any = null
    let bookingNumber = ""
    let eventDate = ""
    let customerName = ""
    let customerPhone = ""

    if (job.booking_source === "product_orders") {
      bookingDetails = productOrdersMap.get(job.booking_id)
      if (bookingDetails) {
        bookingNumber = bookingDetails.order_number
        eventDate = bookingDetails.event_date
        customerName = bookingDetails.customer?.name
        customerPhone = bookingDetails.customer?.phone
      }
    } else if (job.booking_source === "package_bookings") {
      bookingDetails = packageBookingsMap.get(job.booking_id)
      if (bookingDetails) {
        bookingNumber = bookingDetails.package_number
        eventDate = bookingDetails.event_date
        customerName = bookingDetails.customer?.name
        customerPhone = bookingDetails.customer?.phone
      }
    } else if (job.booking_source === "direct_sales_orders") {
      bookingDetails = directSalesMap.get(job.booking_id)
      if (bookingDetails) {
        bookingNumber = bookingDetails.sale_number
        eventDate = bookingDetails.sale_date
        customerName = bookingDetails.customer?.name
        customerPhone = bookingDetails.customer?.phone
      }
    }

    return {
      ...job,
      booking_number: bookingNumber || (job.job_number || "").replace("JOB-", "BKG-"),
      event_date: eventDate || null,
      customer_name: customerName || "N/A",
      customer_phone: customerPhone || "N/A",
      job_tasks: (job.job_tasks || [])
        .map((t: any) => {
          const assignee = t?.assigned_to ? assigneeMap.get(t.assigned_to) : null
          return { ...t, assignee_name: assignee?.name || null, assignee_phone: assignee?.phone || null }
        })
        .sort((a: any, b: any) => DEPT_ORDER.indexOf(a.department) - DEPT_ORDER.indexOf(b.department)),
    }
  })
}
