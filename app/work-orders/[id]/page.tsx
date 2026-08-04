"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { DashboardErrorBoundary } from "@/components/error-boundary"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { getCurrentUser } from "@/lib/auth"
import type { User } from "@/lib/types"
import {
  ArrowLeft, CheckCircle2, Clock, AlertTriangle,
  Warehouse, Package, Truck, MapPin, RotateCcw, DollarSign,
  Upload, Sparkles, UserCheck, Eye, Trash2,
  Printer, RotateCw, AlertCircle, ShieldAlert, PackageCheck,
  Calendar, RefreshCw, ArrowRightLeft, TrendingDown, CheckCheck,
  Bus, Train, Car, Plane
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChecklistItem { text: string; checked: boolean }

interface DamageItem {
  product_name: string
  quantity_sent: number
  quantity_returned: number
  quantity_missing: number
  condition: "clean" | "damaged" | "lost"
  damage_charge: number
  notes: string
}

interface LateChargeItem {
  product_name: string
  quantity: number
  selected: boolean
  late_days: number
  rate_per_day: number
  total_late_charge: number
}

type TransitMode = "bus" | "train" | "self_drive" | "aeroplane"

interface Task {
  id: string
  work_order_id: string
  department: "warehouse" | "packing" | "dispatch" | "event_team" | "returns" | "accounts"
  task_number: string
  title: string
  status: "pending" | "active" | "picked" | "shortage" | "completed" | "cancelled"
  instructions: string
  checklist: ChecklistItem[]
  photos: string[]
  metadata: Record<string, any>
  assigned_to: string | null
  due_date: string | null
  completed_at: string | null
  created_at: string
}

interface WorkOrder {
  id: string
  work_order_number: string
  booking_id: string
  booking_source: string
  booking_number: string
  event_date: string | null
  customer_name: string
  customer_phone: string
  status: "new" | "in_progress" | "completed" | "cancelled"
  created_at: string
  work_order_tasks: Task[]
  customer?: { name: string; phone: string; email: string; address: string }
  items?: Array<{
    id: string
    quantity: number
    unit_price: number
    total_price: number
    product?: { name: string; product_code: string; color: string; size: string; image_url: string | null }
  }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isRentalSource = (src: string) =>
  src === "product_orders" || src === "package_bookings"

const getDeptIcon = (dept: string) => {
  switch (dept) {
    case "warehouse": return <Warehouse className="h-5 w-5" />
    case "packing":   return <Package className="h-5 w-5" />
    case "dispatch":  return <Truck className="h-5 w-5" />
    case "event_team": return <MapPin className="h-5 w-5" />
    case "returns":   return <RotateCcw className="h-5 w-5" />
    case "accounts":  return <DollarSign className="h-5 w-5" />
    default: return <CheckCircle2 className="h-5 w-5" />
  }
}

const getDeptCode = (dept: string) =>
  ({ warehouse:"WH", packing:"PK", dispatch:"DP", event_team:"EV", returns:"RT", accounts:"AC" }[dept] ?? "??")

const getStatusColor = (s: string) =>
  s === "completed" || s === "picked" ? "bg-green-100 text-green-800 border-green-200"
    : s === "active"   ? "bg-blue-100 text-blue-800 border-blue-200"
    : s === "shortage" ? "bg-red-100 text-red-800 border-red-200"
    : "bg-slate-100 text-slate-500 border-slate-200"

// ─── PRINT: shared CSS for 2×A5 on A4 ────────────────────────────────────────

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
  .mode-row { display:flex; gap:6px; margin-bottom:6px; }
  .mode-btn { flex:1; padding:4px 0; border:1px solid #d1d5db; border-radius:5px; text-align:center; font-size:9px; font-weight:700; color:#555; }
  .mode-btn.active-indigo { border-color:#4f46e5; background:#eef2ff; color:#4f46e5; }
  .mode-btn.active-emerald { border-color:#059669; background:#ecfdf5; color:#059669; }
  @media print { body{width:210mm;} @page{size:A4;margin:0;} }
`

// ─── PRINT: Picking Slip (both rental & sales) ────────────────────────────────

function printPickingSlip(wo: WorkOrder) {
  const whTask = wo.work_order_tasks?.find(t => t.department === "warehouse")
  const instructions = whTask?.instructions || "No picking instructions."
  const isRental = isRentalSource(wo.booking_source)
  const accentColor = isRental ? "#4f46e5" : "#059669"
  const type = isRental ? "🔄 Rental — Return Required" : "📦 Direct Sale — One Way"
  const docTitle = `Picking Slip — ${wo.work_order_number}`

  const itemRows = instructions.split("\n")
    .filter(l => l.trim())
    .map((line, i) => `
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
          <div class="doc-num" style="color:${accentColor}">${wo.work_order_number}</div>
        </div>
      </div>

      <table>
        <tr>
          <td class="label">Work Order No</td><td>${wo.work_order_number}</td>
          <td class="label">Booking Ref</td><td>${wo.booking_number || "—"}</td>
        </tr>
        <tr>
          <td class="label">Customer</td><td>${wo.customer_name || "—"}</td>
          <td class="label">Event Date</td><td>${wo.event_date ? new Date(wo.event_date).toLocaleDateString("en-IN", {day:"2-digit",month:"short",year:"numeric"}) : "—"}</td>
        </tr>
        <tr>
          <td class="label">Phone</td><td>${wo.customer_phone || "—"}</td>
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
  if (!win) { toast.error("Allow popups to print"); return }
  win.document.write(`<!DOCTYPE html><html><head><title>${docTitle}</title><style>${A4_CSS}</style></head><body>
    ${half("OFFICE COPY", "office")}
    <div class="cut-line">✂ &nbsp; CUT HERE &nbsp;—&nbsp; CUT HERE &nbsp;—&nbsp; CUT HERE &nbsp; ✂</div>
    ${half("WAREHOUSE COPY", "customer")}
    <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script>
  </body></html>`)
  win.document.close()
}

// ─── PRINT: Rental Delivery Challan ──────────────────────────────────────────

function printRentalChallan(wo: WorkOrder, meta: Record<string, any>) {
  const accentColor = "#4f46e5"
  const mode: TransitMode = meta.transit_mode || "self_drive"
  const modeLabel = { bus:"🚌 Bus", train:"🚂 Train", self_drive:"🚗 Self Drive", aeroplane:"✈️ Aeroplane" }
  const items = wo.items || []

  const modeRow = (["bus","train","self_drive","aeroplane"] as TransitMode[]).map(m =>
    `<div class="mode-btn ${m===mode?"active-indigo":""}">${modeLabel[m]}</div>`).join("")

  const transitFields: Record<TransitMode, [string,string][]> = {
    bus: [
      ["Transport Co.", meta.transport_company||""], ["Bus No/Route", meta.route_number||""],
      ["Departure Point", meta.departure_point||""], ["Departure Date/Time", meta.departure_datetime||""],
      ["Arrival City", meta.arrival_city||""], ["Ticket No.", meta.ticket_pnr||""]
    ],
    train: [
      ["Train Name/No.", meta.train_name||""], ["PNR No.", meta.ticket_pnr||""],
      ["Departure Station", meta.departure_point||""], ["Departure Date/Time", meta.departure_datetime||""],
      ["Arrival Station", meta.arrival_city||""], ["Coach/Seat", meta.seat_info||""]
    ],
    self_drive: [
      ["Driver Name", meta.driver_name||""], ["Vehicle No.", meta.vehicle_number||""],
      ["Driver Phone", meta.driver_phone||""], ["Departure Time", meta.departure_datetime||""],
      ["From City", meta.departure_point||""], ["To City", meta.arrival_city||""]
    ],
    aeroplane: [
      ["Airline", meta.transport_company||""], ["Flight No.", meta.route_number||""],
      ["Departure Airport", meta.departure_point||""], ["Departure Date/Time", meta.departure_datetime||""],
      ["Arrival Airport", meta.arrival_city||""], ["Booking Ref", meta.ticket_pnr||""]
    ]
  }

  const transitRows = transitFields[mode].map(([label, val]) =>
    `<tr><td class="label">${label}</td><td>${val || "—"}</td></tr>`).join("")

  const itemRows = items.map((item, i) => `
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
          <div class="doc-num" style="color:${accentColor}">${wo.work_order_number}</div>
        </div>
      </div>

      <div class="section-title">Order Details</div>
      <table>
        <tr>
          <td class="label">Work Order No</td><td>${wo.work_order_number}</td>
          <td class="label">Event Date</td><td>${wo.event_date ? new Date(wo.event_date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "—"}</td>
        </tr>
        <tr>
          <td class="label">Customer</td><td>${wo.customer_name}</td>
          <td class="label">Phone</td><td>${wo.customer_phone || "—"}</td>
        </tr>
        <tr>
          <td class="label">From City</td><td>${meta.departure_point||"—"}</td>
          <td class="label">To City</td><td>${meta.arrival_city||"—"}</td>
        </tr>
      </table>

      <div class="section-title">Transit / Dispatch Mode</div>
      <div class="mode-row">${modeRow}</div>
      <table><tbody>${transitRows}</tbody></table>

      <div class="section-title">Transit Staff</div>
      <table>
        <tr>
          <td class="label">Staff Name</td><td>${meta.transit_staff_name||"—"}</td>
          <td class="label">Phone</td><td>${meta.transit_staff_phone||"—"}</td>
        </tr>
      </table>

      <div class="section-title">Items Dispatched</div>
      <table>
        <thead><tr><th>#</th><th style="text-align:left">Item Description</th><th>Qty</th><th>Condition</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div class="section-title">Handover Confirmed</div>
      <div class="sig-row">
        <div class="sig-box">Transit Staff Signature</div>
        <div class="sig-box">Receiver Signature</div>
        <div class="sig-box">Date &amp; Time</div>
      </div>
      <p class="legal">This challan is a legally binding handover document. Rental items must be returned after the event. Please retain for records.</p>
    </div>`

  const win = window.open("", "_blank", "width=900,height=700")
  if (!win) { toast.error("Allow popups to print"); return }
  win.document.write(`<!DOCTYPE html><html><head><title>Rental Challan — ${wo.work_order_number}</title><style>${A4_CSS}</style></head><body>
    ${half("OFFICE COPY", "office")}
    <div class="cut-line">✂ &nbsp; CUT HERE &nbsp;—&nbsp; CUT HERE &nbsp;—&nbsp; CUT HERE &nbsp; ✂</div>
    ${half("TRANSIT STAFF COPY", "customer")}
    <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script>
  </body></html>`)
  win.document.close()
}

// ─── PRINT: Sales Delivery Note ───────────────────────────────────────────────

function printSalesChallan(wo: WorkOrder, meta: Record<string, any>) {
  const accentColor = "#059669"
  const items = wo.items || []
  const grandTotal = items.reduce((sum, i) => sum + (i.total_price || 0), 0)

  const itemRows = items.map((item, i) => `
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
          <div class="doc-num" style="color:${accentColor}">${wo.work_order_number}</div>
        </div>
      </div>

      <div class="section-title">Sale &amp; Customer Details</div>
      <table>
        <tr>
          <td class="label">Invoice No</td><td>${wo.booking_number||"—"}</td>
          <td class="label">Sale Date</td><td>${wo.event_date ? new Date(wo.event_date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : new Date().toLocaleDateString("en-IN")}</td>
        </tr>
        <tr>
          <td class="label">Customer</td><td>${wo.customer_name}</td>
          <td class="label">Phone</td><td>${wo.customer_phone||"—"}</td>
        </tr>
        <tr>
          <td class="label">Delivery Address</td><td colspan="3">${meta.delivery_address||"—"}</td>
        </tr>
      </table>

      <div class="section-title">Delivery Info</div>
      <table>
        <tr>
          <td class="label">Delivery Staff</td><td>${meta.driver_name||"—"}</td>
          <td class="label">Phone</td><td>${meta.driver_phone||"—"}</td>
        </tr>
        <tr>
          <td class="label">Vehicle No</td><td>${meta.vehicle_number||"—"}</td>
          <td class="label">Delivery Date/Time</td><td>${meta.departure_datetime||"—"}</td>
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

      <div class="section-title">Payment Summary</div>
      <table class="pay-row">
        <tr>
          <td class="label">Amount Paid</td>
          <td style="color:${accentColor};font-weight:700">₹${grandTotal.toLocaleString("en-IN")} ✅</td>
          <td class="label">Balance Due</td>
          <td style="color:${accentColor};font-weight:700">₹0 ✅</td>
        </tr>
      </table>

      <div class="section-title">Delivery Confirmed — Items Received in Good Condition</div>
      <div class="sig-row">
        <div class="sig-box">Customer Signature</div>
        <div class="sig-box">Date &amp; Time</div>
      </div>
      <p class="legal">This is a permanent sale. Items once sold cannot be returned unless defective. Thank you for shopping with Safawala.</p>
    </div>`

  const win = window.open("", "_blank", "width=900,height=700")
  if (!win) { toast.error("Allow popups to print"); return }
  win.document.write(`<!DOCTYPE html><html><head><title>Sales Delivery Note — ${wo.work_order_number}</title><style>${A4_CSS}</style></head><body>
    ${half("OFFICE COPY", "office")}
    <div class="cut-line">✂ &nbsp; CUT HERE &nbsp;—&nbsp; CUT HERE &nbsp;—&nbsp; CUT HERE &nbsp; ✂</div>
    ${half("CUSTOMER COPY", "customer")}
    <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script>
  </body></html>`)
  win.document.close()
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function WorkOrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const id = params.id

  const [user, setUser]           = useState<User | null>(null)
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null)
  const [loading, setLoading]     = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [activeTask, setActiveTask]       = useState<Task | null>(null)
  const [taskChecklist, setTaskChecklist] = useState<ChecklistItem[]>([])
  const [taskPhotos, setTaskPhotos]       = useState<string[]>([])

  // ── Rental transit fields
  const [transitMode, setTransitMode]             = useState<TransitMode>("self_drive")
  const [transportCompany, setTransportCompany]   = useState("")
  const [routeNumber, setRouteNumber]             = useState("")
  const [departurePoint, setDeparturePoint]       = useState("")
  const [departureDateTime, setDepartureDateTime] = useState("")
  const [arrivalCity, setArrivalCity]             = useState("")
  const [ticketPNR, setTicketPNR]                 = useState("")
  const [seatInfo, setSeatInfo]                   = useState("")
  const [transitStaffName, setTransitStaffName]   = useState("")
  const [transitStaffPhone, setTransitStaffPhone] = useState("")

  // ── Sales dispatch fields
  const [driverName, setDriverName]       = useState("")
  const [driverPhone, setDriverPhone]     = useState("")
  const [vehicleNumber, setVehicleNumber] = useState("")
  const [deliveryAddress, setDeliveryAddress] = useState("")
  const [deliveryDateTime, setDeliveryDateTime] = useState("")

  // ── Signature canvas
  const canvasRef   = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  // ── Damage audit
  const [damageItems, setDamageItems]           = useState<DamageItem[]>([])
  const [showDamageAudit, setShowDamageAudit]   = useState(false)

  // ── Late return charges
  const [lateItems, setLateItems]               = useState<LateChargeItem[]>([])
  const [showLateCharges, setShowLateCharges]   = useState(false)
  const [selectAllLate, setSelectAllLate]       = useState(false)

  // ─── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    getCurrentUser().then(u => { if (!u) router.push("/"); else setUser(u) })
  }, [router])

  // ─── Fetch ─────────────────────────────────────────────────────────────────
  const fetchWorkOrderDetail = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/work-orders/${id}`)
      if (!res.ok) throw new Error("Failed to load")
      const { data: wo }: { data: WorkOrder } = await res.json()
      setWorkOrder(wo)

      const tasks = wo.work_order_tasks || []
      const activeOps  = tasks.find(t => t.status === "active" && t.department !== "accounts")
      const activeAcct = tasks.find(t => t.status === "active" && t.department === "accounts")
      const current = activeOps || activeAcct || null
      setActiveTask(current)

      if (current) {
        setTaskChecklist(current.checklist || [])
        setTaskPhotos(current.photos || [])

        if (current.department === "dispatch") {
          const m = current.metadata || {}
          const isRental = isRentalSource(wo.booking_source)
          if (isRental) {
            setTransitMode((m.transit_mode as TransitMode) || "self_drive")
            setTransportCompany(m.transport_company || "")
            setRouteNumber(m.route_number || "")
            setDeparturePoint(m.departure_point || "")
            setDepartureDateTime(m.departure_datetime || "")
            setArrivalCity(m.arrival_city || "")
            setTicketPNR(m.ticket_pnr || "")
            setSeatInfo(m.seat_info || "")
            setTransitStaffName(m.transit_staff_name || "")
            setTransitStaffPhone(m.transit_staff_phone || "")
          } else {
            setDriverName(m.driver_name || "")
            setDriverPhone(m.driver_phone || "")
            setVehicleNumber(m.vehicle_number || "")
            setDeliveryAddress(m.delivery_address || "")
            setDeliveryDateTime(m.departure_datetime || "")
          }
        }

        if (current.department === "returns" && wo.items?.length) {
          const existingDamages = current.metadata?.damages
          setDamageItems(existingDamages?.length ? existingDamages : wo.items.map(item => ({
            product_name: item.product?.name || "Unknown",
            quantity_sent: item.quantity,
            quantity_returned: item.quantity,
            quantity_missing: 0,
            condition: "clean" as const,
            damage_charge: 0,
            notes: ""
          })))

          const existingLate = current.metadata?.late_charges
          setLateItems(existingLate?.length ? existingLate : wo.items.map(item => ({
            product_name: item.product?.name || "Unknown",
            quantity: item.quantity,
            selected: false,
            late_days: 0,
            rate_per_day: 0,
            total_late_charge: 0
          })))
        }
      }
    } catch { toast.error("Error loading work order") }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { if (user && id) fetchWorkOrderDetail() }, [user, id, fetchWorkOrderDetail])

  // ─── Checklist ─────────────────────────────────────────────────────────────
  const handleChecklistChange = (i: number, checked: boolean) =>
    setTaskChecklist(prev => prev.map((item, idx) => idx === i ? { ...item, checked } : item))

  // ─── Photo upload ──────────────────────────────────────────────────────────
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length || !activeTask) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", files[0])
      fd.append("delivery_id", activeTask.id)
      const res = await fetch("/api/deliveries/upload-photo", { method: "POST", body: fd })
      if (!res.ok) throw new Error()
      const { url } = await res.json()
      setTaskPhotos(prev => [...prev, url])
      setTaskChecklist(prev => prev.map(item =>
        item.text.toLowerCase().includes("photo") ? { ...item, checked: true } : item))
      toast.success("Photo uploaded")
    } catch { toast.error("Upload failed") }
    finally { setUploading(false) }
  }

  // ─── Signature ─────────────────────────────────────────────────────────────
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext("2d"); if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath(); ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
    setIsDrawing(true)
  }
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext("2d"); if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.strokeStyle = "#1e1b4b"
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top); ctx.stroke()
  }
  const clearSignature = () => {
    const canvas = canvasRef.current; if (!canvas) return
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height)
  }

  // ─── Damage audit ──────────────────────────────────────────────────────────
  const updateDamageItem = (index: number, field: keyof DamageItem, value: any) => {
    setDamageItems(prev => {
      const updated = [...prev]
      const item = { ...updated[index], [field]: value }
      if (field === "quantity_returned") item.quantity_missing = Math.max(0, item.quantity_sent - Number(value))
      if (field === "condition") {
        if (value === "clean") item.damage_charge = 0
        if (value === "damaged" && !item.damage_charge) item.damage_charge = 200
        if (value === "lost" && !item.damage_charge) item.damage_charge = 500
      }
      updated[index] = item
      return updated
    })
  }
  const totalDamageCharges = damageItems.reduce((s, i) => s + (i.damage_charge || 0), 0)

  // ─── Late return charges ───────────────────────────────────────────────────
  const updateLateItem = (index: number, field: keyof LateChargeItem, value: any) => {
    setLateItems(prev => {
      const updated = [...prev]
      const item = { ...updated[index], [field]: value }
      // Auto-compute total when days or rate changes
      if (field === "late_days" || field === "rate_per_day") {
        const days = field === "late_days" ? Number(value) : item.late_days
        const rate = field === "rate_per_day" ? Number(value) : item.rate_per_day
        item.total_late_charge = days * rate * item.quantity
      }
      if (field === "selected" && !value) {
        item.late_days = 0; item.rate_per_day = 0; item.total_late_charge = 0
      }
      updated[index] = item
      return updated
    })
  }

  const toggleSelectAllLate = (checked: boolean) => {
    setSelectAllLate(checked)
    setLateItems(prev => prev.map(item => ({ ...item, selected: checked, ...(!checked ? { late_days: 0, rate_per_day: 0, total_late_charge: 0 } : {}) })))
  }

  const totalLateCharges = lateItems
    .filter(i => i.selected)
    .reduce((s, i) => s + (i.total_late_charge || 0), 0)

  const grandTotalCharges = totalDamageCharges + totalLateCharges

  // ─── Build dispatch metadata ────────────────────────────────────────────────
  const buildDispatchMeta = (isRental: boolean): Record<string, any> => {
    if (isRental) {
      return {
        transit_mode: transitMode,
        transport_company: transportCompany,
        route_number: routeNumber,
        departure_point: departurePoint,
        departure_datetime: departureDateTime,
        arrival_city: arrivalCity,
        ticket_pnr: ticketPNR,
        seat_info: seatInfo,
        transit_staff_name: transitStaffName,
        transit_staff_phone: transitStaffPhone,
      }
    }
    return {
      driver_name: driverName,
      driver_phone: driverPhone,
      vehicle_number: vehicleNumber,
      delivery_address: deliveryAddress,
      departure_datetime: deliveryDateTime,
    }
  }

  // ─── Task submit ───────────────────────────────────────────────────────────
  const handleTaskSubmit = async (statusOverride?: "picked" | "shortage" | "completed") => {
    if (!activeTask || !workOrder) return
    const finalStatus = statusOverride || (activeTask.department === "warehouse" ? "picked" : "completed")
    const isRental = isRentalSource(workOrder.booking_source)

    if (finalStatus === "completed" && activeTask.department !== "accounts") {
      const unchecked = taskChecklist.find(c => !c.checked)
      if (unchecked) { toast.error(`Complete checklist: "${unchecked.text}"`); return }
      if (activeTask.department === "packing" && taskPhotos.length === 0) {
        toast.error("Packing requires at least 1 proof photo."); return
      }
      if (activeTask.department === "dispatch" && isRental) {
        if (!departurePoint || !arrivalCity || !transitStaffName) {
          toast.error("Fill in Departure Point, Arrival City, and Transit Staff Name."); return
        }
      }
      if (activeTask.department === "dispatch" && !isRental) {
        if (!driverName || !vehicleNumber) {
          toast.error("Fill in Delivery Staff Name and Vehicle Number."); return
        }
      }
    }

    setSubmitting(true)
    try {
      const payload: Record<string, any> = {
        status: finalStatus,
        checklist: taskChecklist,
        photos: taskPhotos,
        metadata: { ...(activeTask.metadata || {}) }
      }
      if (activeTask.department === "dispatch") {
        payload.metadata = { ...payload.metadata, ...buildDispatchMeta(isRental) }
      }
      if (activeTask.department === "event_team" && finalStatus === "completed") {
        const canvas = canvasRef.current
        if (canvas) payload.metadata = { ...payload.metadata, client_signature_data_url: canvas.toDataURL("image/png") }
      }
      if (activeTask.department === "returns" && finalStatus === "completed") {
        payload.metadata = {
          ...payload.metadata,
          damages: damageItems,
          total_damage_charges: totalDamageCharges,
          late_charges: lateItems,
          total_late_charges: totalLateCharges,
          grand_total_charges: grandTotalCharges
        }
      }

      const res = await fetch(`/api/work-orders/tasks/${activeTask.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      toast.success(`Task ${activeTask.task_number} marked ${finalStatus}!`)
      setShowDamageAudit(false)
      await fetchWorkOrderDetail()
    } catch (err: any) {
      toast.error(err.message || "Error submitting task")
    } finally { setSubmitting(false) }
  }

  const handleManualTaskSelect = (task: Task) => {
    setActiveTask(task)
    setTaskChecklist(task.checklist || [])
    setTaskPhotos(task.photos || [])
    const m = task.metadata || {}
    if (task.department === "dispatch") {
      const isRental = workOrder ? isRentalSource(workOrder.booking_source) : false
      if (isRental) {
        setTransitMode((m.transit_mode as TransitMode) || "self_drive")
        setTransportCompany(m.transport_company || ""); setRouteNumber(m.route_number || "")
        setDeparturePoint(m.departure_point || ""); setDepartureDateTime(m.departure_datetime || "")
        setArrivalCity(m.arrival_city || ""); setTicketPNR(m.ticket_pnr || "")
        setSeatInfo(m.seat_info || ""); setTransitStaffName(m.transit_staff_name || "")
        setTransitStaffPhone(m.transit_staff_phone || "")
      } else {
        setDriverName(m.driver_name || ""); setDriverPhone(m.driver_phone || "")
        setVehicleNumber(m.vehicle_number || ""); setDeliveryAddress(m.delivery_address || "")
        setDeliveryDateTime(m.departure_datetime || "")
      }
    }
    if (task.department === "returns" && workOrder?.items?.length) {
      const existingDamages = m.damages
      setDamageItems(existingDamages?.length ? existingDamages : workOrder.items.map(item => ({
        product_name: item.product?.name || "Unknown",
        quantity_sent: item.quantity, quantity_returned: item.quantity,
        quantity_missing: 0, condition: "clean" as const, damage_charge: 0, notes: ""
      })))
      const existingLate = m.late_charges
      setLateItems(existingLate?.length ? existingLate : workOrder.items.map(item => ({
        product_name: item.product?.name || "Unknown",
        quantity: item.quantity,
        selected: false, late_days: 0, rate_per_day: 0, total_late_charge: 0
      })))
    }
  }

  // ─── Loading / Not Found ───────────────────────────────────────────────────
  if (loading && !workOrder) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-24 min-h-screen">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4" />
          <p className="text-sm font-semibold text-slate-600">Loading work order...</p>
        </div>
      </DashboardLayout>
    )
  }
  if (!workOrder) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-8 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800">Work Order Not Found</h2>
          <Button onClick={() => router.push("/work-orders")} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white">
            Return to Work Orders
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const isRental = isRentalSource(workOrder.booking_source)
  const dispatchTask = workOrder.work_order_tasks?.find(t => t.department === "dispatch")

  // Transit mode config
  const transitModes: { id: TransitMode; label: string; icon: any }[] = [
    { id: "bus",       label: "Bus",        icon: Bus },
    { id: "train",     label: "Train",      icon: Train },
    { id: "self_drive",label: "Self Drive", icon: Car },
    { id: "aeroplane", label: "Aeroplane",  icon: Plane },
  ]

  const getTransitFields = () => {
    switch (transitMode) {
      case "bus":  return [
        { label: "Transport Co.", value: transportCompany, set: setTransportCompany, placeholder: "e.g. MSRTC, VRL" },
        { label: "Bus No / Route", value: routeNumber, set: setRouteNumber, placeholder: "e.g. Route 42 / MH-Bus-123" },
        { label: "Departure Point", value: departurePoint, set: setDeparturePoint, placeholder: "e.g. Dadar Bus Stand" },
        { label: "Departure Date & Time", value: departureDateTime, set: setDepartureDateTime, placeholder: "e.g. 22 Jun 2025 08:00 AM" },
        { label: "Arrival City", value: arrivalCity, set: setArrivalCity, placeholder: "e.g. Jaipur" },
        { label: "Ticket No.", value: ticketPNR, set: setTicketPNR, placeholder: "e.g. TKT-20250622" },
      ]
      case "train": return [
        { label: "Train Name/No.", value: transportCompany, set: setTransportCompany, placeholder: "e.g. Jaipur Express 12416" },
        { label: "PNR No.", value: ticketPNR, set: setTicketPNR, placeholder: "e.g. 8732XXXX" },
        { label: "Departure Station", value: departurePoint, set: setDeparturePoint, placeholder: "e.g. Mumbai CSMT" },
        { label: "Departure Date & Time", value: departureDateTime, set: setDepartureDateTime, placeholder: "e.g. 22 Jun 2025 06:30 AM" },
        { label: "Arrival Station", value: arrivalCity, set: setArrivalCity, placeholder: "e.g. Jaipur Jn" },
        { label: "Coach / Seat", value: seatInfo, set: setSeatInfo, placeholder: "e.g. S4 / 32 LB" },
      ]
      case "self_drive": return [
        { label: "Driver Name", value: driverName, set: setDriverName, placeholder: "e.g. Ramesh Kumar" },
        { label: "Vehicle No.", value: vehicleNumber, set: setVehicleNumber, placeholder: "e.g. MH-01-AB-1234" },
        { label: "Driver Phone", value: driverPhone, set: setDriverPhone, placeholder: "e.g. +91 98765 43210" },
        { label: "Departure Time", value: departureDateTime, set: setDepartureDateTime, placeholder: "e.g. 22 Jun 2025 07:00 AM" },
        { label: "From City", value: departurePoint, set: setDeparturePoint, placeholder: "e.g. Mumbai" },
        { label: "To City", value: arrivalCity, set: setArrivalCity, placeholder: "e.g. Jaipur" },
      ]
      case "aeroplane": return [
        { label: "Airline", value: transportCompany, set: setTransportCompany, placeholder: "e.g. IndiGo, Air India" },
        { label: "Flight No.", value: routeNumber, set: setRouteNumber, placeholder: "e.g. 6E-123" },
        { label: "Departure Airport", value: departurePoint, set: setDeparturePoint, placeholder: "e.g. BOM — Mumbai" },
        { label: "Departure Date & Time", value: departureDateTime, set: setDepartureDateTime, placeholder: "e.g. 22 Jun 2025 10:30 AM" },
        { label: "Arrival Airport", value: arrivalCity, set: setArrivalCity, placeholder: "e.g. JAI — Jaipur" },
        { label: "Booking Ref / PNR", value: ticketPNR, set: setTicketPNR, placeholder: "e.g. XY4567" },
      ]
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <DashboardErrorBoundary>
      <DashboardLayout userRole={user?.role}>
        <div className="container mx-auto p-4 max-w-7xl space-y-6">

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="ghost" size="sm" onClick={() => router.push("/work-orders")} className="p-0 h-auto hover:bg-transparent text-slate-500 hover:text-slate-800 font-semibold gap-1 text-xs">
                  <ArrowLeft className="h-3 w-3" /> Work Orders Board
                </Button>
                <span className="text-slate-300 text-xs">/</span>
                <span className="text-xs font-black text-indigo-600">{workOrder.work_order_number}</span>
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">{workOrder.customer_name}</h2>
              <div className="flex items-center gap-4 text-xs text-slate-500 font-semibold mt-1 flex-wrap">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-slate-400" /> Booking: {workOrder.booking_number}</span>
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-slate-400" /> Event: {workOrder.event_date ? format(new Date(workOrder.event_date), "dd MMM yyyy") : "N/A"}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {isRental ? (
                <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-xs px-3 py-1.5 gap-1.5">
                  <ArrowRightLeft className="h-3.5 w-3.5" /> 🔄 Rental — Round-Trip
                </Badge>
              ) : (
                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs px-3 py-1.5 gap-1.5">
                  <TrendingDown className="h-3.5 w-3.5" /> 📦 Sales — One-Way
                </Badge>
              )}

              {/* Print Picking Slip */}
              <Button variant="outline" size="sm" className="gap-2 font-bold text-xs h-9 border-slate-200" onClick={() => printPickingSlip(workOrder)}>
                <Printer className="h-3.5 w-3.5" /> Picking Slip
              </Button>

              {/* Print Challan — appears when dispatch task exists */}
              {dispatchTask && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => isRental
                    ? printRentalChallan(workOrder, dispatchTask.metadata || {})
                    : printSalesChallan(workOrder, dispatchTask.metadata || {})}
                  className={`gap-2 font-bold text-xs h-9 ${isRental ? "border-indigo-200 text-indigo-700 hover:bg-indigo-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}
                >
                  <Printer className="h-3.5 w-3.5" />
                  {isRental ? "Rental Challan" : "Sales Delivery Note"}
                </Button>
              )}

              <Button variant="ghost" size="sm" className="gap-1.5 font-bold text-xs h-9 text-slate-500" onClick={fetchWorkOrderDetail} disabled={loading}>
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* ── Rental Banner ───────────────────────────────────────────── */}
          {isRental && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-3 flex items-start gap-3">
              <ArrowRightLeft className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-indigo-800">Rental — Full Round-Trip Lifecycle</p>
                <p className="text-xs text-indigo-600 mt-0.5">Includes transit dispatch, event setup, inbound return collection and damage audit. All items must be counted and condition-checked on return.</p>
              </div>
            </div>
          )}

          {/* ── Main Grid ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left: Workflow Timeline */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="bg-white border rounded-2xl shadow-sm">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-base font-extrabold text-slate-800">Workflow Timeline</CardTitle>
                  <CardDescription className="text-xs">Click any active task to execute it.</CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="relative border-l border-slate-200 pl-6 ml-3 space-y-6">
                    {workOrder.work_order_tasks?.map(t => {
                      const isActive = activeTask?.id === t.id
                      const isDone = t.status === "completed" || t.status === "picked"
                      return (
                        <div key={t.id}
                          onClick={() => {
                            if (t.status === "active" || isDone) handleManualTaskSelect(t)
                            else toast.info("Complete previous steps first.")
                          }}
                          className={`relative cursor-pointer ${isActive ? "scale-[1.02] translate-x-1" : "opacity-85"} transition-all`}
                        >
                          <div className={`absolute -left-[37px] top-1.5 h-6 w-6 rounded-full flex items-center justify-center border shadow-sm transition-colors ${
                            isDone ? "bg-green-600 border-green-700 text-white" :
                            t.status === "active" ? "bg-blue-600 border-blue-700 text-white animate-pulse" :
                            t.status === "shortage" ? "bg-red-500 border-red-600 text-white" :
                            "bg-white border-slate-300 text-slate-400"
                          }`}>
                            {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="text-[10px] font-black">{getDeptCode(t.department)}</span>}
                          </div>
                          <div className={`p-3 rounded-xl border transition-all ${isActive ? "bg-slate-50 border-indigo-500 shadow-inner" : "bg-white border-slate-100 hover:border-slate-300"}`}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-black uppercase text-slate-500 flex items-center gap-1">
                                {getDeptIcon(t.department)}
                                {t.department.replace("_", " ")}
                              </span>
                              <Badge variant="outline" className={`text-[9px] font-bold ${getStatusColor(t.status)}`}>{t.status}</Badge>
                            </div>
                            <h4 className="text-xs font-bold text-slate-700 mt-1 line-clamp-1">{t.title}</h4>
                            {t.department === "returns" && isRental && (
                              <span className="text-[9px] text-indigo-600 font-bold mt-0.5 block">Rental Return Required</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Stock Items */}
              {workOrder.items && workOrder.items.length > 0 && (
                <Card className="bg-white border rounded-2xl shadow-sm">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-extrabold text-slate-800">Assigned Stock Items</CardTitle></CardHeader>
                  <CardContent className="p-3 pt-0 max-h-60 overflow-y-auto space-y-2">
                    {workOrder.items.map(item => (
                      <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                        <div className="h-9 w-9 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0 font-black text-slate-600 overflow-hidden">
                          {item.product?.image_url ? <img src={item.product.image_url} alt="" className="h-full w-full object-cover" /> : "S"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 truncate">{item.product?.name || "Product"}</p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {item.product?.product_code} • {item.product?.size} • {item.product?.color}
                          </p>
                        </div>
                        <div className="font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-[11px]">Qty: {item.quantity}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right: Execution Console */}
            <div className="lg:col-span-2 space-y-6">
              {activeTask ? (
                <Card className="bg-white border rounded-2xl shadow-md border-indigo-100">
                  <CardHeader className="bg-slate-50/50 pb-4 border-b">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
                          {getDeptIcon(activeTask.department)}
                        </span>
                        <div>
                          <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">{activeTask.task_number}</span>
                          <CardTitle className="text-lg font-black text-slate-800">{activeTask.title}</CardTitle>
                        </div>
                      </div>
                      <Badge className={`capitalize font-black text-xs ${getStatusColor(activeTask.status)}`}>{activeTask.status}</Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 space-y-6">

                    {/* Instructions */}
                    {activeTask.instructions && (
                      <div className="bg-indigo-50/40 border border-indigo-100/50 rounded-xl p-4">
                        <h5 className="text-[11px] font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1.5 mb-2">
                          <Sparkles className="h-3.5 w-3.5" /> Instructions & Items
                        </h5>
                        <p className="text-xs text-slate-800 whitespace-pre-line font-medium leading-relaxed">{activeTask.instructions}</p>
                      </div>
                    )}

                    {/* ── Warehouse ────────────────────────────────────── */}
                    {activeTask.department === "warehouse" && activeTask.status === "active" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <Button onClick={() => handleTaskSubmit("picked")} disabled={submitting} className="bg-green-600 hover:bg-green-700 text-white font-bold h-12 gap-2">
                            <PackageCheck className="h-4 w-4" /> Mark All Picked
                          </Button>
                          <Button onClick={() => handleTaskSubmit("shortage")} disabled={submitting} variant="destructive" className="font-bold h-12 gap-2">
                            <AlertTriangle className="h-4 w-4" /> Flag Shortage
                          </Button>
                        </div>
                        {isRental && (
                          <p className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 font-semibold">
                            🔄 Rental Order — Verify quantities carefully. Items must match exactly for return audit.
                          </p>
                        )}
                      </div>
                    )}

                    {/* ── Dispatch: Rental Transit Form ─────────────────── */}
                    {activeTask.department === "dispatch" && activeTask.status === "active" && isRental && (
                      <div className="space-y-4">
                        <div className="border rounded-xl p-4 bg-slate-50/50 space-y-4">
                          <h5 className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                            <Truck className="h-3.5 w-3.5 text-indigo-600" /> Transit / Dispatch Mode
                          </h5>
                          {/* Mode selector */}
                          <div className="grid grid-cols-4 gap-2">
                            {transitModes.map(({ id, label, icon: Icon }) => (
                              <button
                                key={id}
                                onClick={() => setTransitMode(id)}
                                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 font-bold text-xs transition-all ${
                                  transitMode === id
                                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                    : "border-slate-200 bg-white text-slate-500 hover:border-indigo-200"
                                }`}
                              >
                                <Icon className="h-5 w-5" />
                                {label}
                              </button>
                            ))}
                          </div>
                          {/* Dynamic transit fields */}
                          <div className="grid grid-cols-2 gap-3">
                            {getTransitFields().map(({ label, value, set, placeholder }) => (
                              <div key={label} className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">{label}</label>
                                <Input value={value} onChange={e => set(e.target.value)} placeholder={placeholder} className="bg-white h-9 text-xs" />
                              </div>
                            ))}
                          </div>
                          {/* Transit staff */}
                          <div className="grid grid-cols-2 gap-3 pt-1 border-t">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Transit Staff Name</label>
                              <Input value={transitStaffName} onChange={e => setTransitStaffName(e.target.value)} placeholder="Staff name travelling with goods" className="bg-white h-9 text-xs" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Transit Staff Phone</label>
                              <Input value={transitStaffPhone} onChange={e => setTransitStaffPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" className="bg-white h-9 text-xs" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── Dispatch: Sales Simple Form ───────────────────── */}
                    {activeTask.department === "dispatch" && activeTask.status === "active" && !isRental && (
                      <div className="space-y-4 border rounded-xl p-4 bg-slate-50/50">
                        <h5 className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                          <Truck className="h-3.5 w-3.5 text-emerald-600" /> Delivery Details
                        </h5>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Delivery Staff Name</label>
                            <Input value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="e.g. Ramesh Kumar" className="bg-white h-9 text-xs" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Staff Phone</label>
                            <Input value={driverPhone} onChange={e => setDriverPhone(e.target.value)} placeholder="+91 98765 43210" className="bg-white h-9 text-xs" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Vehicle No.</label>
                            <Input value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} placeholder="e.g. MH-01-AB-1234" className="bg-white h-9 text-xs" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Delivery Date & Time</label>
                            <Input value={deliveryDateTime} onChange={e => setDeliveryDateTime(e.target.value)} placeholder="e.g. 22 Jun 2025 10:00 AM" className="bg-white h-9 text-xs" />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Delivery Address</label>
                            <Input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="Full delivery address..." className="bg-white h-9 text-xs" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── Checklist ─────────────────────────────────────── */}
                    {taskChecklist.length > 0 && (
                      <div className="space-y-3">
                        <h5 className="text-xs font-black text-slate-800 uppercase tracking-wide">Execution Checklist</h5>
                        <div className="grid gap-2">
                          {taskChecklist.map((item, idx) => (
                            <div key={idx} className={`flex items-center space-x-3 p-3 rounded-xl border transition-colors ${item.checked ? "bg-green-50/40 border-green-200" : "bg-white border-slate-100 hover:border-slate-200"}`}>
                              <Checkbox
                                id={`chk-${idx}`} checked={item.checked}
                                disabled={activeTask.status !== "active" || item.text.toLowerCase().includes("photo")}
                                onCheckedChange={c => handleChecklistChange(idx, c as boolean)}
                                className="rounded border-slate-300"
                              />
                              <label htmlFor={`chk-${idx}`} className={`text-xs font-semibold flex-1 cursor-pointer select-none ${item.checked ? "text-green-800 line-through" : "text-slate-700"}`}>
                                {item.text}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── Photo Evidence ────────────────────────────────── */}
                    {activeTask.status === "active" && ["packing","event_team","returns"].includes(activeTask.department) && (
                      <div className="space-y-3">
                        <h5 className="text-xs font-black text-slate-800 uppercase tracking-wide">Photo Evidence Proof</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {taskPhotos.map((photo, idx) => (
                            <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border bg-slate-100">
                              <img src={photo} alt="" className="h-full w-full object-cover" />
                              <button onClick={() => setTaskPhotos(p => p.filter((_, i) => i !== idx))}
                                className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                          <label className="border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-slate-50 rounded-xl aspect-square flex flex-col items-center justify-center cursor-pointer transition-all">
                            <Upload className={`h-6 w-6 text-slate-400 ${uploading ? "animate-bounce" : ""}`} />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-1.5">{uploading ? "Uploading..." : "Upload Photo"}</span>
                            <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} className="hidden" />
                          </label>
                        </div>
                      </div>
                    )}

                    {/* ── Signature (Event Setup) ───────────────────────── */}
                    {activeTask.department === "event_team" && activeTask.status === "active" && (
                      <div className="space-y-3">
                        <h5 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1">
                          <UserCheck className="h-4 w-4 text-indigo-600" /> Client Handover Signature
                        </h5>
                        <div className="border rounded-2xl overflow-hidden bg-slate-50">
                          <canvas ref={canvasRef} width={500} height={200}
                            onMouseDown={startDrawing} onMouseMove={draw}
                            onMouseUp={() => setIsDrawing(false)} onMouseLeave={() => setIsDrawing(false)}
                            className="w-full bg-white touch-none border-b cursor-crosshair" />
                          <div className="p-2 flex justify-end bg-slate-100/50">
                            <Button size="sm" variant="outline" onClick={clearSignature} className="text-xs px-3 h-8">Clear Pad</Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── Returns Damage Audit (Rental Only) ───────────── */}
                    {activeTask.department === "returns" && isRental && activeTask.status === "active" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                            <ShieldAlert className="h-4 w-4 text-amber-600" /> Inbound Returns & Damage Audit
                          </h5>
                          <Button size="sm" variant="outline" onClick={() => setShowDamageAudit(v => !v)} className="text-xs h-8 border-amber-200 text-amber-700 hover:bg-amber-50">
                            <Eye className="h-3.5 w-3.5 mr-1.5" />{showDamageAudit ? "Hide" : "Open"} Audit
                          </Button>
                        </div>
                        {showDamageAudit && (
                          <div className="space-y-3 border rounded-xl p-4 bg-amber-50/30 border-amber-100">
                            {damageItems.map((di, idx) => (
                              <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-bold text-slate-800">{di.product_name}</p>
                                  <span className="text-[10px] font-bold text-slate-400">Sent: {di.quantity_sent}</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Returned Qty</label>
                                    <Input type="number" min={0} max={di.quantity_sent} value={di.quantity_returned}
                                      onChange={e => updateDamageItem(idx, "quantity_returned", Number(e.target.value))}
                                      className="bg-white h-9 text-xs font-bold" />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Missing</label>
                                    <div className={`h-9 px-3 rounded-md border flex items-center font-black text-xs ${di.quantity_missing > 0 ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
                                      {di.quantity_missing}
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Condition</label>
                                    <select value={di.condition} onChange={e => updateDamageItem(idx, "condition", e.target.value)}
                                      className="w-full h-9 px-2 rounded-md border border-slate-200 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
                                      <option value="clean">✅ Clean</option>
                                      <option value="damaged">⚠️ Damaged</option>
                                      <option value="lost">❌ Lost</option>
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Charge (₹)</label>
                                    <Input type="number" min={0} value={di.damage_charge}
                                      onChange={e => updateDamageItem(idx, "damage_charge", Number(e.target.value))}
                                      disabled={di.condition === "clean"} className="bg-white h-9 text-xs font-bold" />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">Notes</label>
                                  <Input value={di.notes} onChange={e => updateDamageItem(idx, "notes", e.target.value)}
                                    placeholder="e.g. Brooch clip broken, stain on safa..." className="bg-white h-9 text-xs" />
                                </div>
                              </div>
                            ))}
                            <div className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm ${totalDamageCharges > 0 ? "bg-red-50 border border-red-200 text-red-800" : "bg-green-50 border border-green-200 text-green-800"}`}>
                              <span className="flex items-center gap-2"><CheckCheck className="h-4 w-4" /> Total Damage / Loss Charges</span>
                              <span className="font-black text-base">₹ {totalDamageCharges.toLocaleString("en-IN")}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Completed: Dispatch Summary ───────────────────── */}
                    {activeTask.status === "completed" && activeTask.department === "dispatch" && (
                      <div className="bg-slate-50 border rounded-xl p-4 text-xs space-y-2">
                        <h6 className="font-bold text-slate-700 uppercase">Dispatched Details:</h6>
                        {isRental ? (
                          <div className="grid grid-cols-2 gap-2">
                            <p><span className="text-slate-400">Mode:</span> {activeTask.metadata?.transit_mode}</p>
                            <p><span className="text-slate-400">Staff:</span> {activeTask.metadata?.transit_staff_name}</p>
                            <p><span className="text-slate-400">From:</span> {activeTask.metadata?.departure_point}</p>
                            <p><span className="text-slate-400">To:</span> {activeTask.metadata?.arrival_city}</p>
                            <p><span className="text-slate-400">Ref:</span> {activeTask.metadata?.ticket_pnr || activeTask.metadata?.route_number}</p>
                            <p><span className="text-slate-400">Departure:</span> {activeTask.metadata?.departure_datetime}</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            <p><span className="text-slate-400">Driver:</span> {activeTask.metadata?.driver_name}</p>
                            <p><span className="text-slate-400">Phone:</span> {activeTask.metadata?.driver_phone}</p>
                            <p><span className="text-slate-400">Vehicle:</span> {activeTask.metadata?.vehicle_number}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Completed: Signature ──────────────────────────── */}
                    {activeTask.status === "completed" && activeTask.department === "event_team" && activeTask.metadata?.client_signature_data_url && (
                      <div className="border rounded-xl p-4 bg-slate-50/50 max-w-xs space-y-2">
                        <h6 className="text-xs font-bold text-slate-700 uppercase">Client Sign-off:</h6>
                        <img src={activeTask.metadata.client_signature_data_url} alt="Signature" className="border bg-white rounded h-20 w-full object-contain" />
                      </div>
                    )}

                    {/* ── Completed: Damage Summary ─────────────────────── */}
                    {activeTask.status === "completed" && activeTask.department === "returns" && activeTask.metadata?.damages && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                        <h6 className="text-xs font-bold text-amber-800 uppercase flex items-center gap-1.5">
                          <ShieldAlert className="h-4 w-4" /> Damage Audit — Completed
                        </h6>
                        {activeTask.metadata.damages.map((d: DamageItem, i: number) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">{d.product_name}</span>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${d.condition === "clean" ? "text-green-700" : d.condition === "damaged" ? "text-amber-700" : "text-red-700"}`}>
                                {d.condition === "clean" ? "✅ Clean" : d.condition === "damaged" ? "⚠️ Damaged" : "❌ Lost"}
                              </span>
                              {d.damage_charge > 0 && <span className="font-black text-red-700">₹{d.damage_charge}</span>}
                            </div>
                          </div>
                        ))}
                        <div className="flex justify-between font-black text-sm pt-2 border-t border-amber-200">
                          <span>Total Charges</span>
                          <span className={activeTask.metadata.total_damage_charges > 0 ? "text-red-700" : "text-green-700"}>
                            ₹ {(activeTask.metadata.total_damage_charges || 0).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* ── Action Button ─────────────────────────────────── */}
                    {activeTask.status === "active" && activeTask.department !== "warehouse" && (
                      <Button onClick={() => handleTaskSubmit()} disabled={submitting}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 shadow-md gap-2">
                        {submitting
                          ? <><RotateCw className="h-4 w-4 animate-spin" /> Applying...</>
                          : <><CheckCheck className="h-4 w-4" /> Mark {activeTask.department.replace("_", " ")} Completed</>
                        }
                      </Button>
                    )}

                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-white border rounded-2xl p-8 text-center shadow-sm">
                  <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4 stroke-1 animate-bounce" />
                  <h3 className="text-lg font-extrabold text-slate-800">Workflow Fully Completed</h3>
                  <p className="text-sm text-slate-500 mt-1">All tasks for this Work Order have been completed successfully.</p>
                  {isRental && workOrder.work_order_tasks.some(t => t.department === "returns" && (t.metadata?.total_damage_charges || 0) > 0) && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-semibold">
                      ⚠️ Damage charges recorded. Please raise a Settlement Invoice from the bookings module.
                    </div>
                  )}
                </Card>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </DashboardErrorBoundary>
  )
}
