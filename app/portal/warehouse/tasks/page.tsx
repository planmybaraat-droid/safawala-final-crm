"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PortalPageHeader, PortalSectionLabel, PortalListCard, PortalEmptyState, PortalSkeleton } from "@/components/portal/portal-shared"

const COLOR = "#a855f7"

// ─── PRINT STYLE CSS ────────────────────────────────────────
const A4_CSS = `
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',Arial,sans-serif; width:210mm; background:#fff; color:#111; }
  .half {
    width:210mm; height:148.5mm; padding:10mm 12mm; overflow:hidden;
    page-break-inside:avoid;
  }
  .half.office { background:#fff; }
  .half.customer { background:#fffde7; }
  .cut-line {
    width:100%; height:10mm; display:flex; align-items:center; justify-content:center;
    gap:8px; border-top:2px dashed #555; border-bottom:2px dashed #555;
    font-size:10px; font-weight:700; letter-spacing:0.1em; color:#555;
    background:repeating-linear-gradient(90deg,#f5f5f5 0,#f5f5f5 6mm,#e0e0e0 6mm,#e0e0e0 12mm);
    page-break-after:avoid;
  }
  .copy-label {
    font-size:9px; font-weight:800; letter-spacing:0.12em;
    text-transform:uppercase; color:#888; text-align:right;
  }
  .brand { display:flex; align-items:center; gap:10px; }
  .logo-box { width:34px; height:34px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:900; color:#fff; }
  .brand-name { font-size:20px; font-weight:900; line-height:1; }
  .brand-sub { font-size:11px; color:#666; margin-top:1px; }
  .header-row { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:7px; border-bottom:1px solid #e5e7eb; margin-bottom:8px; }
  .doc-num { font-size:13px; font-weight:900; text-align:right; margin-top:3px; }
  .badge-pill { display:inline-block; font-size:8.5px; font-weight:800; padding:2px 7px; border-radius:20px; margin-top:4px; }
  table { width:100%; border-collapse:collapse; margin-bottom:7px; }
  th { font-size:9px; text-transform:uppercase; font-weight:800; padding:4px 5px; background:#f3f4f6; border:1px solid #d1d5db; letter-spacing:0.05em; }
  td { font-size:10px; padding:3.5px 5px; border:1px solid #d1d5db; vertical-align:top; }
  td.label { font-weight:700; color:#374151; background:#f9fafb; width:27%; }
  .section-title { font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:0.09em; color:#374151; margin:7px 0 4px; }
  .sig-row { display:flex; gap:12px; margin-top:7px; }
  .sig-box { flex:1; border-top:1px solid #374151; padding-top:3px; font-size:8.5px; color:#555; font-weight:600; }
  .legal { font-size:7.5px; color:#9ca3af; font-style:italic; margin-top:5px; }
  .total-row td { font-weight:800; background:#f9fafb; }
  .pay-row td { font-size:10px; }
  @media print { body{width:210mm;} @page{size:A4;margin:0;} }
`

function printPickingSlip(wo: any) {
  const whTask = wo?.work_order_tasks?.find((t: any) => t.department === "warehouse")
  const instructions = whTask?.instructions || wo?.instructions || "No picking instructions."
  const isRental = wo?.booking_source !== "direct_sales_orders"
  const accentColor = isRental ? "#4f46e5" : "#059669"
  const type = isRental ? "🔄 Rental — Return Required" : "📦 Direct Sale — One Way"
  const docTitle = `Picking Slip — ${wo?.work_order_number}`

  const itemRows = instructions.split("\n")
    .filter((l: string) => l.trim())
    .map((line: string, i: number) => `
      <tr>
        <td style="text-align:center;width:22px">${i + 1}</td>
        <td>☐ &nbsp;${line.replace(/^[•·-]\s*/, "").trim()}</td>
      </tr>`)
    .join("")

  const half = (copyLabel: string, bg: string) => `
    <div class="half ${bg}">
      <div class="header-row">
        <div class="brand">
          <div class="logo-box" style="background:${accentColor}">S</div>
          <div>
            <div class="brand-name" style="color:${accentColor}">SAFAWALA</div>
            <div class="brand-sub">Warehouse Picking Slip</div>
            <span class="badge-pill" style="background:${accentColor}10;border:1px solid ${accentColor}40;color:${accentColor}">${type}</span>
          </div>
        </div>
        <div style="text-align:right">
          <div class="copy-label">${copyLabel}</div>
          <div class="doc-num" style="color:${accentColor}">${wo?.work_order_number}</div>
        </div>
      </div>

      <table>
        <tr>
          <td class="label">Work Order No</td><td>${wo?.work_order_number || "—"}</td>
          <td class="label">Booking Ref</td><td>${wo?.booking_number || "—"}</td>
        </tr>
        <tr>
          <td class="label">Customer</td><td>${wo?.customer_name || "—"}</td>
          <td class="label">Event Date</td><td>${wo?.event_date ? new Date(wo.event_date).toLocaleDateString("en-IN", {day:"2-digit",month:"short",year:"numeric"}) : "—"}</td>
        </tr>
        <tr>
          <td class="label">Phone</td><td>${wo?.customer_phone || "—"}</td>
          <td class="label">Printed</td><td>${new Date().toLocaleString("en-IN")}</td>
        </tr>
      </table>

      <div class="section-title">Items to Pick</div>
      <table>
        <thead><tr><th style="width:22px">#</th><th style="text-align:left">Item Description</th></tr></thead>
        <tbody>${itemRows || "<tr><td colspan='2'>No items found</td></tr>"}</tbody>
      </table>

      <div class="sig-row" style="margin-top:auto">
        <div class="sig-box">Picked by</div>
        <div class="sig-box">Verified by</div>
        <div class="sig-box">Date &amp; Time</div>
      </div>
    </div>`

  const win = window.open("", "_blank", "width=900,height=700")
  if (!win) { alert("Allow popups to print"); return }
  win.document.write(`<!DOCTYPE html><html><head><title>${docTitle}</title><style>${A4_CSS}</style></head><body>
    ${half("OFFICE COPY", "office")}
    <div class="cut-line">✂ &nbsp; CUT HERE &nbsp;—&nbsp; CUT HERE &nbsp;—&nbsp; CUT HERE &nbsp; ✂</div>
    ${half("WAREHOUSE COPY", "customer")}
    <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script>
  </body></html>`)
  win.document.close()
}

function printPackingSlip(wo: any) {
  const items = wo?.items || []
  const isRental = wo?.booking_source !== "direct_sales_orders"
  const accentColor = "#a855f7" // Purple theme for packing
  const type = isRental ? "🔄 Rental — Return Required" : "📦 Direct Sale — One Way"
  const docTitle = `Packing Slip — ${wo?.work_order_number}`

  const itemRows = items.map((item: any, i: number) => `
    <tr>
      <td style="text-align:center;width:22px">${i + 1}</td>
      <td>☐ &nbsp;${item.product?.name || "Item"} (${item.product?.color || ""}, ${item.product?.size || ""})</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:center">Packed</td>
    </tr>`).join("")

  const half = (copyLabel: string, bg: string) => `
    <div class="half ${bg}">
      <div class="header-row">
        <div class="brand">
          <div class="logo-box" style="background:${accentColor}">S</div>
          <div>
            <div class="brand-name" style="color:${accentColor}">SAFAWALA</div>
            <div class="brand-sub">Warehouse Packing Slip</div>
            <span class="badge-pill" style="background:${accentColor}10;border:1px solid ${accentColor}40;color:${accentColor}">${type}</span>
          </div>
        </div>
        <div style="text-align:right">
          <div class="copy-label">${copyLabel}</div>
          <div class="doc-num" style="color:${accentColor}">${wo?.work_order_number}</div>
        </div>
      </div>

      <table>
        <tr>
          <td class="label">Work Order No</td><td>${wo?.work_order_number || "—"}</td>
          <td class="label">Booking Ref</td><td>${wo?.booking_number || "—"}</td>
        </tr>
        <tr>
          <td class="label">Customer</td><td>${wo?.customer_name || "—"}</td>
          <td class="label">Event Date</td><td>${wo?.event_date ? new Date(wo.event_date).toLocaleDateString("en-IN", {day:"2-digit",month:"short",year:"numeric"}) : "—"}</td>
        </tr>
        <tr>
          <td class="label">Phone</td><td>${wo?.customer_phone || "—"}</td>
          <td class="label">Printed</td><td>${new Date().toLocaleString("en-IN")}</td>
        </tr>
      </table>

      <div class="section-title">Items to Pack</div>
      <table>
        <thead><tr><th style="width:22px">#</th><th style="text-align:left">Item Description</th><th style="width:50px">Qty</th><th style="width:70px">Status</th></tr></thead>
        <tbody>${itemRows || "<tr><td colspan='4'>No items found</td></tr>"}</tbody>
      </table>

      <div class="sig-row" style="margin-top:auto">
        <div class="sig-box">Packed by</div>
        <div class="sig-box">Verified by</div>
        <div class="sig-box">Date &amp; Time</div>
      </div>
    </div>`

  const win = window.open("", "_blank", "width=900,height=700")
  if (!win) { alert("Allow popups to print"); return }
  win.document.write(`<!DOCTYPE html><html><head><title>${docTitle}</title><style>${A4_CSS}</style></head><body>
    ${half("OFFICE COPY", "office")}
    <div class="cut-line">✂ &nbsp; CUT HERE &nbsp;—&nbsp; CUT HERE &nbsp;—&nbsp; CUT HERE &nbsp; ✂</div>
    ${half("CUSTOMER COPY", "customer")}
    <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script>
  </body></html>`)
  win.document.close()
}

function printRentalChallan(wo: any, meta: any) {
  const accentColor = "#4f46e5"
  const mode = meta?.transit_mode || "self_drive"
  const modeLabel: Record<string, string> = { bus:"🚌 Bus", train:"🚂 Train", self_drive:"🚗 Self Drive", aeroplane:"✈️ Aeroplane" }
  const items = wo?.items || []

  const modeRow = (["bus","train","self_drive","aeroplane"]).map(m =>
    `<div class="mode-btn ${m===mode?"active-indigo":""}" style="flex:1; padding:4px 0; border:1px solid ${m===mode?accentColor:"#d1d5db"}; border-radius:5px; text-align:center; font-size:9px; font-weight:700; color:${m===mode?accentColor:"#555"}; background:${m===mode?"#eef2ff":"#fff"};">${modeLabel[m]}</div>`).join("")

  const transitFields: Record<string, [string,string][]> = {
    bus: [
      ["Transport Co.", meta?.transport_company||""], ["Bus No/Route", meta?.route_number||""],
      ["Departure Point", meta?.departure_point||""], ["Departure Date/Time", meta?.departure_datetime||""],
      ["Arrival City", meta?.arrival_city||""], ["Ticket No.", meta?.ticket_pnr||""]
    ],
    train: [
      ["Train Name/No.", meta?.train_name||""], ["PNR No.", meta?.ticket_pnr||""],
      ["Departure Station", meta?.departure_point||""], ["Departure Date/Time", meta?.departure_datetime||""],
      ["Arrival Station", meta?.arrival_city||""], ["Coach/Seat", meta?.seat_info||""]
    ],
    self_drive: [
      ["Driver Name", meta?.driver_name||""], ["Vehicle No.", meta?.vehicle_number||""],
      ["Driver Phone", meta?.driver_phone||""], ["Departure Time", meta?.departure_datetime||""],
      ["From City", meta?.departure_point||""], ["To City", meta?.arrival_city||""]
    ],
    aeroplane: [
      ["Airline", meta?.transport_company||""], ["Flight No.", meta?.route_number||""],
      ["Departure Airport", meta?.departure_point||""], ["Departure Date/Time", meta?.departure_datetime||""],
      ["Arrival Airport", meta?.arrival_city||""], ["Booking Ref", meta?.ticket_pnr||""]
    ]
  }

  const transitRows = (transitFields[mode] || []).map(([label, val]) =>
    `<tr><td class="label">${label}</td><td>${val || "—"}</td></tr>`).join("")

  const itemRows = items.map((item: any, i: number) => `
    <tr>
      <td style="text-align:center">${i+1}</td>
      <td>${item.product?.name || "Item"} (${item.product?.color||""}, ${item.product?.size||""})</td>
      <td style="text-align:center">${item.quantity}</td>
      <td>Good</td>
    </tr>`).join("") || `<tr><td colspan="4" style="text-align:center;color:#888">No items listed</td></tr>`

  const half = (copyLabel: string, bg: string) => `
    <div class="half ${bg}">
      <div class="header-row">
        <div class="brand">
          <div class="logo-box" style="background:${accentColor}">S</div>
          <div>
            <div class="brand-name" style="color:${accentColor}">SAFAWALA</div>
            <div class="brand-sub">Rental Delivery Challan</div>
            <span class="badge-pill" style="background:#eef2ff;border:1px solid #a5b4fc;color:${accentColor}">🔄 Rental — Return Required</span>
          </div>
        </div>
        <div style="text-align:right">
          <div class="copy-label">${copyLabel}</div>
          <div class="doc-num" style="color:${accentColor}">${wo?.work_order_number}</div>
        </div>
      </div>

      <div class="section-title">Order Details</div>
      <table>
        <tr>
          <td class="label">Work Order No</td><td>${wo?.work_order_number || "—"}</td>
          <td class="label">Event Date</td><td>${wo?.event_date ? new Date(wo.event_date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "—"}</td>
        </tr>
        <tr>
          <td class="label">Customer</td><td>${wo?.customer_name || "—"}</td>
          <td class="label">Phone</td><td>${wo?.customer_phone || "—"}</td>
        </tr>
      </table>

      <div class="section-title">Transit Details</div>
      <div style="display:flex; gap:6px; margin-bottom:6px;">${modeRow}</div>
      <table><tbody>${transitRows}</tbody></table>

      <div class="section-title">Items Dispatched</div>
      <table>
        <thead><tr><th>#</th><th style="text-align:left">Item Description</th><th>Qty</th><th>Condition</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:7px;">
        <div class="sig-row" style="flex:1;">
          <div class="sig-box">Transit Staff Signature</div>
          <div class="sig-box">Receiver Signature</div>
          <div class="sig-box">Gate Out Checked</div>
        </div>
        <div style="margin-left:20px; text-align:center;">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(wo?.work_order_number || "")}" style="width:60px;height:60px;" alt="Gatepass QR" />
          <div style="font-size:6px; font-weight:700; color:#555; margin-top:2px;">SECURITY GATEPASS</div>
        </div>
      </div>
    </div>`

  const win = window.open("", "_blank", "width=900,height=700")
  if (!win) { alert("Allow popups to print"); return }
  win.document.write(`<!DOCTYPE html><html><head><title>Rental Challan — ${wo?.work_order_number}</title><style>${A4_CSS}</style></head><body>
    ${half("OFFICE COPY", "office")}
    <div class="cut-line">✂ &nbsp; CUT HERE &nbsp;—&nbsp; CUT HERE &nbsp;—&nbsp; CUT HERE &nbsp; ✂</div>
    ${half("TRANSIT STAFF COPY", "customer")}
    <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script>
  </body></html>`)
  win.document.close()
}

function printSalesChallan(wo: any, meta: any) {
  const accentColor = "#059669"
  const items = wo?.items || []
  const grandTotal = items.reduce((sum: number, i: any) => sum + (i.total_price || 0), 0)

  const itemRows = items.map((item: any, i: number) => `
    <tr>
      <td style="text-align:center">${i+1}</td>
      <td>${item.product?.name || "Item"} (${item.product?.color||""}, ${item.product?.size||""})</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">₹${(item.unit_price||0).toLocaleString("en-IN")}</td>
      <td style="text-align:right">₹${(item.total_price||0).toLocaleString("en-IN")}</td>
    </tr>`).join("") || `<tr><td colspan="5" style="text-align:center;color:#888">No items listed</td></tr>`

  const half = (copyLabel: string, bg: string) => `
    <div class="half ${bg}">
      <div class="header-row">
        <div class="brand">
          <div class="logo-box" style="background:${accentColor}">S</div>
          <div>
            <div class="brand-name" style="color:${accentColor}">SAFAWALA</div>
            <div class="brand-sub">Sales Delivery Note</div>
            <span class="badge-pill" style="background:#ecfdf5;border:1px solid #6ee7b7;color:${accentColor}">📦 Direct Sale — No Return Required</span>
          </div>
        </div>
        <div style="text-align:right">
          <div class="copy-label">${copyLabel}</div>
          <div class="doc-num" style="color:${accentColor}">${wo?.work_order_number}</div>
        </div>
      </div>

      <div class="section-title">Sale &amp; Customer Details</div>
      <table>
        <tr>
          <td class="label">Invoice No</td><td>${wo?.booking_number||"—"}</td>
          <td class="label">Sale Date</td><td>${wo?.event_date ? new Date(wo.event_date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : new Date().toLocaleDateString("en-IN")}</td>
        </tr>
        <tr>
          <td class="label">Customer</td><td>${wo?.customer_name || "—"}</td>
          <td class="label">Phone</td><td>${wo?.customer_phone||"—"}</td>
        </tr>
      </table>

      <div class="section-title">Items Sold</div>
      <table>
        <thead><tr><th>#</th><th style="text-align:left">Item Description</th><th>Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>
          ${itemRows}
          <tr class="total-row">
            <td colspan="4" style="text-align:right;font-weight:800">GRAND TOTAL</td>
            <td style="text-align:right;font-weight:900;color:${accentColor}">₹${grandTotal.toLocaleString("en-IN")}</td>
          </tr>
        </tbody>
      </table>

      <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:7px;">
        <div class="sig-row" style="flex:1;">
          <div class="sig-box">Customer Signature</div>
          <div class="sig-box">Delivery Checked By</div>
          <div class="sig-box">Gate Out Checked</div>
        </div>
        <div style="margin-left:20px; text-align:center;">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(wo?.work_order_number || "")}" style="width:60px;height:60px;" alt="Gatepass QR" />
          <div style="font-size:6px; font-weight:700; color:#555; margin-top:2px;">SECURITY GATEPASS</div>
        </div>
      </div>
    </div>`

  const win = window.open("", "_blank", "width=900,height=700")
  if (!win) { alert("Allow popups to print"); return }
  win.document.write(`<!DOCTYPE html><html><head><title>Sales Delivery Note — ${wo?.work_order_number}</title><style>${A4_CSS}</style></head><body>
    ${half("OFFICE COPY", "office")}
    <div class="cut-line">✂ &nbsp; CUT HERE &nbsp;—&nbsp; CUT HERE &nbsp;—&nbsp; CUT HERE &nbsp; ✂</div>
    ${half("CUSTOMER COPY", "customer")}
    <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script>
  </body></html>`)
  win.document.close()
}

function printDeliveryChallan(wo: any) {
  if (!wo) return
  const isRental = wo.booking_source !== "direct_sales_orders"
  const dispatchTask = wo.work_order_tasks?.find((t: any) => t.department === "dispatch")
  const meta = dispatchTask?.metadata || {}
  if (isRental) {
    printRentalChallan(wo, meta)
  } else {
    printSalesChallan(wo, meta)
  }
}

interface Task {
  id: string
  department: 'warehouse' | 'packing' | 'dispatch' | 'event_team' | 'returns' | 'accounts'
  task_number: string
  title: string
  status: 'pending' | 'active' | 'picked' | 'shortage' | 'completed' | 'cancelled'
  instructions: string
  checklist: Array<{ text: string; checked: boolean }>
  photos?: string[]
}

interface WorkOrder {
  id: string
  work_order_number: string
  booking_number: string
  event_date: string | null
  customer_name: string
  customer_phone: string
  status: 'new' | 'in_progress' | 'completed' | 'cancelled'
  work_order_tasks: Task[]
}

export default function TasksPage() {
  const router = useRouter()
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSubTab, setActiveSubTab] = useState<'picking' | 'packing'>('picking')

  // Selected task detail view modal
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null)
  const [checklist, setChecklist] = useState<Array<{ text: string; checked: boolean }>>([])
  const [photos, setPhotos] = useState<string[]>([])
  const [updating, setUpdating] = useState(false)

  const [errorState, setErrorState] = useState<string | null>(null)

  useEffect(() => { fetchWorkOrders() }, [])

  async function fetchWorkOrders() {
    setLoading(true)
    setErrorState(null)
    try {
      const res = await fetch("/api/work-orders")
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch work orders")
      }
      const list = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : [])
      setWorkOrders(list)
    } catch (err: any) {
      console.error("Failed to fetch work orders:", err)
      setErrorState(err.message || "Failed to fetch work orders")
      setWorkOrders([])
    } finally {
      setLoading(false)
    }
  }

  // Filter tasks based on department mapping to sub-tabs
  const activeTasks = workOrders.flatMap(wo => {
    return (wo.work_order_tasks ?? [])
      .filter(t => {
        const matchesDept = activeSubTab === 'picking' ? t.department === 'warehouse' : t.department === 'packing'
        // Show pending or active tasks
        return matchesDept && (t.status === 'active' || t.status === 'pending')
      })
      .map(t => ({ workOrder: wo, task: t }))
  })

  async function handleOpenTask(wo: WorkOrder, t: Task) {
    setSelectedWO(wo)
    setSelectedTask(t)
    setChecklist(t.checklist ? [...t.checklist] : [])
    setPhotos(t.photos ? [...t.photos] : [])

    try {
      const res = await fetch(`/api/work-orders/${wo.id}`)
      const data = await res.json()
      if (data.success && data.data) {
        setSelectedWO(data.data)
      }
    } catch (err) {
      console.error("Failed to load detailed work order for printing:", err)
    }
  }

  function handleCloseTask() {
    setSelectedTask(null)
    setSelectedWO(null)
    setChecklist([])
    setPhotos([])
  }

  function toggleChecklistItem(index: number) {
    setChecklist(prev => prev.map((item, i) => i === index ? { ...item, checked: !item.checked } : item))
  }

  function handleAddMockPhoto() {
    const mockPhoto = `https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&q=80&mock=${Math.random()}`
    setPhotos(prev => [...prev, mockPhoto])
  }

  async function updateTaskStatus(targetStatus: 'picked' | 'completed') {
    if (!selectedTask || !selectedWO || updating) return

    // Packing requires at least 1 photo check
    if (targetStatus === 'completed' && selectedTask.department === 'packing' && photos.length === 0) {
      alert("Packing requires at least 1 proof photo to be uploaded.")
      return
    }

    setUpdating(true)
    try {
      const res = await fetch(`/api/work-orders/tasks/${selectedTask.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          checklist: checklist,
          photos: photos
        })
      })
      const data = await res.json()
      if (res.ok) {
        alert(targetStatus === 'picked' ? "Task marked as Picked successfully!" : "Packing completed successfully!")
        handleCloseTask()
        fetchWorkOrders()
      } else {
        alert(data.error || "Failed to update task status.")
      }
    } catch {
      alert("Error updating task.")
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="pb-6">
      <PortalPageHeader title="Pick & Pack" subtitle="Process order tasks" color={COLOR} backHref="/portal/warehouse" />

      {errorState && (
        <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex flex-col gap-1.5 shadow-sm">
          <p className="text-[12px] font-extrabold text-red-800 flex items-center gap-1.5">
            ⚠️ Error
          </p>
          <p className="text-[11px] font-medium text-red-700 leading-relaxed">
            {errorState}
          </p>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-2 px-4 py-3 bg-slate-50 border-b">
        {(['picking', 'packing'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-center capitalize transition-colors"
            style={{
              background: activeSubTab === tab ? COLOR : "#fff",
              color: activeSubTab === tab ? "#fff" : "rgba(80,55,30,0.6)",
              border: `1px solid ${activeSubTab === tab ? COLOR : "rgba(0,0,0,0.08)"}`
            }}
          >
            {tab === 'picking' ? "📦 Picking (Warehouse)" : "🏷 Packing Queue"}
          </button>
        ))}
      </div>

      <PortalSectionLabel label={`${activeSubTab === 'picking' ? 'Picking' : 'Packing'} Tasks (${activeTasks.length})`} />

      <div className="mx-4 rounded-2xl overflow-hidden shadow-sm" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
        {loading ? (
          <PortalSkeleton rows={6} />
        ) : activeTasks.length === 0 ? (
          <PortalEmptyState icon="clipboard" title="No tasks found" subtitle="No active tasks in this queue." color={COLOR} />
        ) : (
          activeTasks.map(({ workOrder, task }) => (
            <PortalListCard
              key={task.id}
              title={`${workOrder.customer_name} (${workOrder.booking_number})`}
              subtitle={task.title}
              meta={task.status === 'active' ? "🟢 Active" : "🟡 Waiting"}
              badge={task.status}
              color={COLOR}
              icon={activeSubTab === 'picking' ? "package" : "laundry"}
              onClick={() => handleOpenTask(workOrder, task)}
            />
          ))
        )}
      </div>

      {/* TASK DETAIL MODAL */}
      {selectedTask && selectedWO && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-[28px] sm:rounded-3xl w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 sticky top-0 z-10">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">
                  {selectedTask.task_number} · {selectedWO.work_order_number}
                </span>
                <h3 className="font-extrabold text-[15px] mt-0.5" style={{ color: "#1e1208" }}>
                  {selectedWO.customer_name}
                </h3>
              </div>
              <button onClick={handleCloseTask} className="text-slate-400 hover:text-slate-600 text-lg font-black p-2">✕</button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Instructions */}
              {selectedTask.instructions && (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Instructions</p>
                  <p className="text-[13px] text-slate-700 font-semibold leading-relaxed whitespace-pre-line">
                    {selectedTask.instructions}
                  </p>
                </div>
              )}

              {/* Checklist */}
              {checklist.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Checklist Items</p>
                  <div className="space-y-2">
                    {checklist.map((item, i) => (
                      <div 
                        key={i}
                        onClick={() => toggleChecklistItem(i)}
                        className="flex items-center gap-3 p-3.5 rounded-xl border bg-slate-50/50 hover:bg-slate-50 border-slate-100 cursor-pointer transition-colors"
                      >
                        <div className="w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors"
                          style={{
                            background: item.checked ? COLOR : "#white",
                            borderColor: item.checked ? COLOR : "rgba(0,0,0,0.15)"
                          }}
                        >
                          {item.checked && (
                            <span className="text-white text-[11px] font-bold">✓</span>
                          )}
                        </div>
                        <span className="text-[13px] font-bold text-slate-700" style={{ textDecoration: item.checked ? 'line-through' : 'none', opacity: item.checked ? 0.6 : 1 }}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Photos for Packing */}
              {selectedTask.department === 'packing' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Proof Photos (Required)</p>
                    <button 
                      onClick={handleAddMockPhoto}
                      className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg"
                    >
                      📷 Add Mock Photo
                    </button>
                  </div>

                  {photos.length === 0 ? (
                    <div className="border border-dashed border-slate-200 rounded-2xl p-6 text-center">
                      <p className="text-[11px] text-slate-400">No proof photos uploaded yet. Required for packing completion.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {photos.map((src, i) => (
                        <div key={i} className="aspect-square rounded-xl overflow-hidden border border-slate-100 relative group">
                          <img src={src} className="w-full h-full object-cover" alt="Proof" />
                          <button 
                            onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black shadow-md opacity-90 hover:opacity-100"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Print Documents */}
              <div className="pt-3 pb-2 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Print Documents</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => printPickingSlip(selectedWO)}
                    className="py-2.5 rounded-xl text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors flex flex-col items-center justify-center gap-1"
                  >
                    <span className="text-[14px]">📋</span>
                    <span>Pick Slip</span>
                  </button>
                  <button
                    onClick={() => printPackingSlip(selectedWO)}
                    className="py-2.5 rounded-xl text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors flex flex-col items-center justify-center gap-1"
                  >
                    <span className="text-[14px]">📦</span>
                    <span>Pack Slip</span>
                  </button>
                  <button
                    onClick={() => printDeliveryChallan(selectedWO)}
                    className="py-2.5 rounded-xl text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors flex flex-col items-center justify-center gap-1"
                  >
                    <span className="text-[14px]">🖨️</span>
                    <span>Challan</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                {selectedTask.status === 'pending' ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-2xl text-center">
                    <p className="text-[12px] font-semibold text-yellow-800">
                      Waiting for predecessor task to be picked/completed.
                    </p>
                  </div>
                ) : activeSubTab === 'picking' ? (
                  <button
                    onClick={() => updateTaskStatus('picked')}
                    disabled={updating}
                    className="w-full py-3.5 rounded-xl text-[13px] font-bold text-white transition-opacity"
                    style={{ background: COLOR, opacity: updating ? 0.7 : 1 }}
                  >
                    {updating ? "Updating..." : "✓ Complete Picking & Send to Packing"}
                  </button>
                ) : (
                  <button
                    onClick={() => updateTaskStatus('completed')}
                    disabled={updating}
                    className="w-full py-3.5 rounded-xl text-[13px] font-bold text-white transition-opacity"
                    style={{ background: "#22c55e", opacity: updating ? 0.7 : 1 }}
                  >
                    {updating ? "Completing..." : "✓ Verify & Complete Packing"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
