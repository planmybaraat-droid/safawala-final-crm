"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { PortalPageHeader, PortalSectionLabel, PortalListCard, PortalEmptyState, PortalSkeleton } from "@/components/portal/portal-shared"
import { PortalIcon } from "@/components/portal/portal-icons"
import { JobTrackerModal } from "@/components/portal/job-tracker-modal"

// ─── pdf.js loaded from CDN (no bundler/npm dependency) ─────────────────────
// We render the pick slip onto a <canvas> instead of relying on the browser's
// native PDF plugin in an <iframe> — some browsers are set to auto-download
// PDFs instead of displaying them, which makes an iframe preview render blank.
// Canvas rendering works the same everywhere regardless of that setting.
const PDFJS_VERSION = "3.11.174"
let pdfjsLoadPromise: Promise<any> | null = null
function loadPdfJs(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"))
  if ((window as any).pdfjsLib) return Promise.resolve((window as any).pdfjsLib)
  if (pdfjsLoadPromise) return pdfjsLoadPromise
  pdfjsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`
    script.onload = () => {
      const lib = (window as any).pdfjsLib
      lib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`
      resolve(lib)
    }
    script.onerror = () => reject(new Error("Failed to load PDF renderer"))
    document.head.appendChild(script)
  })
  return pdfjsLoadPromise
}

const COLOR = "#6f3f7b"

// ─── Date grouping for job lists (grouped by Job Created Date, newest first) ─
function dayKey(iso?: string) {
  if (!iso) return "unknown"
  return new Date(iso).toDateString()
}

function dayHeaderLabel(iso?: string) {
  if (!iso) return "Date unknown"
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const dateStr = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined })
  if (d.toDateString() === today.toDateString()) return `Today · ${dateStr}`
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday · ${dateStr}`
  return dateStr
}

function rowDateLabel(iso?: string) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

function groupTasksByDay<T extends { task: { created_at?: string } }>(items: T[]) {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const key = dayKey(item.task.created_at)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return Array.from(map.entries())
    .sort(([, a], [, b]) => {
      const aTime = a[0]?.task.created_at ? new Date(a[0].task.created_at).getTime() : 0
      const bTime = b[0]?.task.created_at ? new Date(b[0].task.created_at).getTime() : 0
      return bTime - aTime
    })
    .map(([key, tasks]) => ({ key, label: dayHeaderLabel(tasks[0]?.task.created_at), tasks }))
}

interface CompanyInfo {
  company_name?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  state?: string
  gst_number?: string
  logo_url?: string | null
  website?: string | null
}

// Fetch a remote image and convert to a base64 data URL so jsPDF can embed it
// (jsPDF can't load cross-origin URLs directly at render time).
async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// ─── PICK SLIP PDF (real PDF, generated client-side, shown in-app) ──────────
// Renders 2 half-page copies (office + warehouse) on one A4 sheet with a
// dashed cut line — company-branded with the logo/contact info from Settings
// and full customer & booking details, as an actual PDF (no print popup).
async function buildPickingSlipPDF(wo: any, checklist: Array<{ text: string; checked: boolean }> | undefined, company: CompanyInfo | null): Promise<Blob> {
  const { default: jsPDF } = await import("jspdf")
  const { default: autoTable } = await import("jspdf-autotable")

  const whTask = wo?.work_order_tasks?.find((t: any) => t.department === "warehouse")
  const instructions = whTask?.instructions || wo?.instructions || "No picking instructions."
  const isRental = wo?.booking_source !== "direct_sales_orders"
  // Warehouse-only document palette. Keep this local to the warehouse pick
  // slip generator so packing slips and documents from other portals retain
  // their existing branding.
  const accent: [number, number, number] = [111, 63, 123]
  const accentStrong: [number, number, number] = [75, 36, 88]
  const accentSoft: [number, number, number] = [243, 237, 245]
  const accentGold: [number, number, number] = [200, 169, 107]
  const typeLabel = isRental ? "Rental — Return Required" : "Direct Sale — One Way"

  const lines: Array<{ text: string; checked: boolean }> = (checklist && checklist.length > 0)
    ? checklist.map(c => ({ text: c.text, checked: c.checked }))
    : instructions.split("\n").filter((l: string) => l.trim()).map((line: string) => ({ text: line.replace(/^[•·-]\s*/, "").trim(), checked: false }))

  const pickedCount = lines.filter(l => l.checked).length
  const progressLabel = lines.length > 0 ? `${pickedCount} of ${lines.length} picked` : ""

  const logoDataUrl = company?.logo_url ? await toDataUrl(company.logo_url) : null
  const companyName = company?.company_name || "SAFAWALA"
  const contactLine = [company?.phone && `Ph: ${company.phone}`, company?.email, company?.gst_number && `GST: ${company.gst_number}`]
    .filter(Boolean).join("   •   ")
  const addressLine = [company?.address, company?.city, company?.state].filter(Boolean).join(", ")

  const booking = wo?.booking || {}
  const customer = wo?.customer || {}
  const eventDate = wo?.event_date ? new Date(wo.event_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"

  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const pageWidth = 210

  const fitText = (value: unknown, maxWidth: number) => {
    const source = String(value || "—")
    if (doc.getTextWidth(source) <= maxWidth) return source
    let fitted = source
    while (fitted.length > 1 && doc.getTextWidth(`${fitted}…`) > maxWidth) fitted = fitted.slice(0, -1)
    return `${fitted.trimEnd()}…`
  }

  const wrappedText = (value: unknown, maxWidth: number, maxLines = 2): string[] => {
    const source = String(value || "—")
    const split = doc.splitTextToSize(source, maxWidth) as string[]
    if (split.length <= maxLines) return split
    const visible = split.slice(0, maxLines)
    visible[maxLines - 1] = fitText(`${visible[maxLines - 1]}…`, maxWidth)
    return visible
  }

  const drawHalf = (yTop: number, copyLabel: string) => {
    const left = 12
    const right = pageWidth - 12

    // Header band
    doc.setFillColor(...accentStrong)
    doc.rect(0, yTop, pageWidth, 1.6, "F")
    doc.setFillColor(...accentGold)
    doc.rect(0, yTop + 1.6, pageWidth, 0.45, "F")

    let y = yTop + 10.5

    if (logoDataUrl) {
      try {
        const props = doc.getImageProperties(logoDataUrl)
        const h = 9, w = (props.width / props.height) * h
        doc.addImage(logoDataUrl, props.fileType, left, y - 7.5, w, h)
        doc.setFontSize(13)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(...accentStrong)
        doc.text(fitText(companyName.toUpperCase(), right - (left + w + 4) - 35), left + w + 4, y - 1.5)
        doc.setFontSize(7.5)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(120, 120, 120)
        doc.text("Warehouse Picking Slip", left + w + 4, y + 3)
      } catch {
        drawLogoChip()
      }
    } else {
      drawLogoChip()
    }

    function drawLogoChip() {
      doc.setFillColor(...accentStrong)
      doc.roundedRect(left, y - 6, 9, 9, 1.5, 1.5, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.text(companyName.charAt(0).toUpperCase(), left + 4.5, y, { align: "center" })
      doc.setTextColor(...accentStrong)
      doc.setFontSize(13)
      doc.setFont("helvetica", "bold")
      doc.text(fitText(companyName.toUpperCase(), right - (left + 13) - 35), left + 13, y - 1.5)
      doc.setTextColor(120, 120, 120)
      doc.setFontSize(7.5)
      doc.setFont("helvetica", "normal")
      doc.text("Warehouse Picking Slip", left + 13, y + 3)
    }

    doc.setTextColor(...accentStrong)
    doc.setFontSize(6.5)
    doc.setFont("helvetica", "bold")
    doc.text(typeLabel.toUpperCase(), left, y + 7.5)

    doc.setTextColor(140, 140, 140)
    doc.setFontSize(7.5)
    doc.setFont("helvetica", "bold")
    doc.text(copyLabel, right, y - 4, { align: "right" })
    doc.setTextColor(...accentStrong)
    doc.setFontSize(11)
    doc.text(wo?.work_order_number || "—", right, y + 1.5, { align: "right" })

    y += 12
    doc.setDrawColor(221, 225, 230)
    doc.line(left, y, right, y)
    y += 5.5

    doc.setFontSize(8.5)
    const infoRow = (label1: string, val1: string, label2: string, val2: string) => {
      const leftValueX = left + 22
      const rightLabelX = left + 98
      const rightValueX = left + 120
      const leftLines = wrappedText(val1, rightLabelX - leftValueX - 4)
      const rightLines = wrappedText(val2, right - rightValueX)
      const rowLines = Math.max(leftLines.length, rightLines.length)

      doc.setFont("helvetica", "bold")
      doc.setTextColor(120, 120, 120)
      doc.text(label1, left, y)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(30, 30, 30)
      doc.text(leftLines, leftValueX, y, { lineHeightFactor: 1.05 })
      doc.setFont("helvetica", "bold")
      doc.setTextColor(120, 120, 120)
      doc.text(label2, rightLabelX, y)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(30, 30, 30)
      doc.text(rightLines, rightValueX, y, { lineHeightFactor: 1.05 })
      y += Math.max(4.4, rowLines * 3.35 + 1.05)
    }
    infoRow("Booking Ref", wo?.booking_number, "Event Date", eventDate)
    infoRow("Customer", customer?.name || wo?.customer_name, "Phone", customer?.phone || wo?.customer_phone)
    if (booking?.groom_name || booking?.bride_name) {
      infoRow("Groom", booking?.groom_name || "—", "Bride", booking?.bride_name || "—")
    }
    if (wo?.venue_address || customer?.address) {
      infoRow("Venue", wo?.venue_address || "—", "Delivery", booking?.delivery_date ? new Date(booking.delivery_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—")
    }

    doc.setTextColor(170, 170, 170)
    doc.setFontSize(6.8)
    doc.setFont("helvetica", "normal")
    doc.text(`Printed ${new Date().toLocaleString("en-IN")}`, left, y)
    y += 4

    doc.setTextColor(60, 60, 60)
    doc.setFontSize(8.5)
    doc.setFont("helvetica", "bold")
    doc.text(`ITEMS TO PICK${progressLabel ? `  —  ${progressLabel}` : ""}`, left, y + 2.5)
    y += 4.5

    autoTable(doc, {
      startY: y,
      margin: { left, right: 12 },
      head: [["#", "", "Item Description"]],
      body: lines.map((l, i) => [String(i + 1), "", l.text]),
      theme: "grid",
      styles: { fontSize: 8.5, cellPadding: 1.5, valign: "middle" },
      headStyles: { fillColor: accentSoft, textColor: accentStrong, fontStyle: "bold", fontSize: 7.5 },
      alternateRowStyles: { fillColor: [250, 249, 251] },
      tableLineColor: [221, 225, 230],
      columnStyles: { 0: { cellWidth: 8, halign: "center" }, 1: { cellWidth: 8, halign: "center" } },
      didDrawCell: (data) => {
        // Draw a real checkbox glyph in column 1 (skip header row)
        if (data.column.index === 1 && data.row.section === "body") {
          const item = lines[data.row.index]
          const cx = data.cell.x + data.cell.width / 2 - 1.5
          const cy = data.cell.y + data.cell.height / 2 - 1.5
          doc.setDrawColor(120, 120, 120)
          if (item?.checked) {
            doc.setFillColor(...accentStrong)
            doc.rect(cx, cy, 3, 3, "FD")
            doc.setDrawColor(255, 255, 255)
            doc.setLineWidth(0.4)
            doc.line(cx + 0.5, cy + 1.6, cx + 1.3, cy + 2.4)
            doc.line(cx + 1.3, cy + 2.4, cx + 2.6, cy + 0.6)
          } else {
            doc.rect(cx, cy, 3, 3, "D")
          }
        }
      },
    })

    const tableEndY = (doc as any).lastAutoTable?.finalY || y + 20
    const sigY = Math.min(Math.max(tableEndY + 8, yTop + 118), yTop + 132)
    doc.setDrawColor(80, 80, 80)
    doc.setFontSize(7.5)
    doc.setTextColor(90, 90, 90)
    const sigWidth = (right - left - 10) / 3
    ;[["Picked by", left], ["Verified by", left + sigWidth + 5], ["Date & Time", left + (sigWidth + 5) * 2]].forEach(([label, x]) => {
      doc.line(x as number, sigY, (x as number) + sigWidth, sigY)
      doc.text(label as string, x as number, sigY + 3.5)
    })

    // Compact contact footer
    if (contactLine || addressLine) {
      const footY = yTop + 141
      doc.setDrawColor(235, 235, 235)
      doc.line(left, footY - 3.5, right, footY - 3.5)
      doc.setFontSize(6.3)
      doc.setTextColor(150, 150, 150)
      doc.setFont("helvetica", "normal")
      if (addressLine) doc.text(fitText(addressLine, right - left), pageWidth / 2, footY, { align: "center" })
      if (contactLine) doc.text(fitText(contactLine, right - left), pageWidth / 2, footY + 3, { align: "center" })
    }
  }

  drawHalf(0, "OFFICE COPY")

  // Cut line between the two halves
  const cutY = 148.5
  doc.setDrawColor(120, 120, 120)
  doc.setLineDashPattern([1.5, 1.5], 0)
  doc.line(0, cutY, pageWidth, cutY)
  doc.setLineDashPattern([], 0)
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text("✂  CUT HERE  —  CUT HERE  —  CUT HERE  ✂", pageWidth / 2, cutY - 1.5, { align: "center" })

  drawHalf(cutY, "WAREHOUSE COPY")

  return doc.output("blob")
}


interface Task {
  id: string
  department: 'warehouse' | 'packing' | 'dispatch' | 'event_team' | 'returns' | 'return_receiving' | 'accounts'
  task_number: string
  title: string
  status: 'pending' | 'active' | 'picked' | 'shortage' | 'completed' | 'cancelled'
  instructions: string
  checklist: Array<{ text: string; checked: boolean }>
  photos?: string[]
  created_at?: string
  metadata?: { rework_reason?: string; rework_items?: Array<{ name: string; note: string }>; rework_at?: string } | null
}

interface WorkOrder {
  id: string
  work_order_number: string
  booking_number: string
  event_date: string | null
  customer_name: string
  customer_phone: string
  venue_address?: string | null
  status: 'new' | 'in_progress' | 'completed' | 'cancelled'
  work_order_tasks: Task[]
  items?: Array<{ quantity: number; product?: { name?: string; color?: string; size?: string; category?: string } }>
  customer?: { name?: string; phone?: string }
}

export default function TasksPage() {
  const router = useRouter()
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [jobsView, setJobsView] = useState<'open' | 'closed'>('open')
  const [showTracker, setShowTracker] = useState(false)

  // Selected task detail view modal
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null)
  const [checklist, setChecklist] = useState<Array<{ text: string; checked: boolean }>>([])
  const [updating, setUpdating] = useState(false)

  const [errorState, setErrorState] = useState<string | null>(null)

  // In-app toast — replaces the browser's native alert() popups
  const [toast, setToast] = useState<{ message: string; kind: "success" | "error" } | null>(null)
  function showToast(message: string, kind: "success" | "error" = "success") {
    setToast({ message, kind })
    setTimeout(() => setToast(null), 2800)
  }

  // Company branding/contact info for the pick slip PDF header + footer
  const [company, setCompany] = useState<CompanyInfo | null>(null)

  // In-app Pick Slip PDF preview — rendered onto a canvas via pdf.js so it
  // always shows regardless of the browser's native-PDF-viewer settings.
  const [slipUrl, setSlipUrl] = useState<string | null>(null)
  const [slipBlob, setSlipBlob] = useState<Blob | null>(null)
  const [generatingSlip, setGeneratingSlip] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => { fetchWorkOrders() }, [])

  useEffect(() => {
    if (!slipBlob) return
    let cancelled = false
    setPreviewError(null)
    ;(async () => {
      try {
        const pdfjsLib = await loadPdfJs()
        const buf = await slipBlob.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise
        const page = await pdf.getPage(1)
        const canvas = previewCanvasRef.current
        const container = previewContainerRef.current
        if (cancelled || !canvas || !container) return

        const containerWidth = Math.min(container.clientWidth - 24, 900)
        const baseViewport = page.getViewport({ scale: 1 })
        const scale = (containerWidth / baseViewport.width) * (window.devicePixelRatio || 1)
        const viewport = page.getViewport({ scale })

        canvas.width = viewport.width
        canvas.height = viewport.height
        canvas.style.width = `${containerWidth}px`
        canvas.style.height = `${(containerWidth * viewport.height) / viewport.width}px`

        const ctx = canvas.getContext("2d")
        if (!ctx) return
        await page.render({ canvasContext: ctx, viewport }).promise
      } catch (err) {
        console.error("Failed to render PDF preview:", err)
        if (!cancelled) setPreviewError("Couldn't render the preview — use Download or Open in Tab below.")
      }
    })()
    return () => { cancelled = true }
  }, [slipBlob])

  useEffect(() => {
    fetch("/api/company-settings-simple")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setCompany(d.data || d) })
      .catch(() => {})
  }, [])

  async function openPickSlip() {
    if (!selectedWO || generatingSlip) return
    setGeneratingSlip(true)
    try {
      const blob = await buildPickingSlipPDF(selectedWO, checklist, company)
      const url = URL.createObjectURL(blob)
      setSlipBlob(blob)
      setSlipUrl(url)
    } catch (err) {
      console.error("Failed to generate pick slip PDF:", err)
      showToast("Failed to generate the pick slip. Please try again.", "error")
    } finally {
      setGeneratingSlip(false)
    }
  }

  function closeSlipPreview() {
    if (slipUrl) URL.revokeObjectURL(slipUrl)
    setSlipUrl(null)
    setSlipBlob(null)
  }

  function downloadSlip() {
    if (!slipBlob || !selectedWO) return
    const url = URL.createObjectURL(slipBlob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Picking-Slip-${selectedWO.work_order_number || "slip"}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function printSlip() {
    if (!slipUrl) return
    const win = window.open(slipUrl, "_blank")
    win?.addEventListener("load", () => win.print())
  }

  async function shareSlipOnWhatsApp() {
    if (!slipBlob || !selectedWO) return
    const filename = `Picking-Slip-${selectedWO.work_order_number || "slip"}.pdf`
    const file = new File([slipBlob], filename, { type: "application/pdf" })
    try {
      if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
        await (navigator as any).share({
          files: [file],
          title: filename,
          text: `Picking Slip — ${selectedWO.work_order_number}`,
        })
        return
      }
    } catch {
      // fall through to the download + WhatsApp Web fallback below
    }
    // Desktop / unsupported browsers can't attach a file via a URL scheme —
    // download it and open WhatsApp Web so the user can attach it manually.
    downloadSlip()
    window.open("https://web.whatsapp.com/", "_blank")
  }

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

  // Warehouse handles picking before dispatch and receiving/storage after a
  // rental return. Both use the same existing job-card and modal design.
  const warehouseTasks = workOrders.flatMap(wo => {
    return (wo.work_order_tasks ?? [])
      .filter(t => t.department === 'warehouse' || t.department === 'return_receiving')
      .map(t => ({ workOrder: wo, task: t }))
  })
  const openTasks = warehouseTasks.filter(({ task }) => task.status === 'active' || task.status === 'pending')
  const closedTasks = warehouseTasks.filter(({ task }) => task.status === 'picked' || task.status === 'completed' || task.status === 'cancelled')
  const visibleTasks = jobsView === 'open' ? openTasks : closedTasks

  // Group by the day the job was created, newest day first.
  const groupedTasks = groupTasksByDay(visibleTasks)

  async function handleOpenTask(wo: WorkOrder, t: Task) {
    setSelectedWO(wo)
    setSelectedTask(t)
    setChecklist(t.checklist ? [...t.checklist] : [])

    try {
      const res = await fetch(`/api/work-orders/${wo.id}`)
      const data = await res.json()
      if (data.success && data.data) {
        setSelectedWO(data.data)
        // Warehouse tasks start with an empty checklist — build one tick per
        // item so staff can mark each product as picked individually. Prefer
        // the actual line items; fall back to the auto-generated instructions
        // text (older/edge-case orders where the items join comes back empty).
        if (!t.checklist || t.checklist.length === 0) {
          if (data.data.items?.length > 0) {
            setChecklist(data.data.items.map((item: any) => ({
              text: `${item.quantity}x ${item.product?.name || "Item"}${[item.product?.color, item.product?.size].filter(Boolean).length ? ` (${[item.product?.color, item.product?.size].filter(Boolean).join(", ")})` : ""}`,
              checked: false,
            })))
          } else if (t.instructions) {
            setChecklist(
              t.instructions
                .split("\n")
                .filter((line: string) => line.trim())
                .map((line: string) => ({ text: line.replace(/^[•·-]\s*/, "").trim(), checked: false }))
            )
          }
        }
      }
    } catch (err) {
      console.error("Failed to load detailed work order for printing:", err)
    }
  }

  function handleCloseTask() {
    setSelectedTask(null)
    setSelectedWO(null)
    setChecklist([])
    closeSlipPreview()
  }

  function toggleChecklistItem(index: number) {
    if (selectedTask && selectedTask.status !== 'active') return
    setChecklist(prev => prev.map((item, i) => i === index ? { ...item, checked: !item.checked } : item))
  }

  async function updateTaskStatus(targetStatus: 'picked' | 'completed') {
    if (!selectedTask || !selectedWO || updating) return

    setUpdating(true)
    try {
      const res = await fetch(`/api/work-orders/tasks/${selectedTask.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          checklist: checklist,
        })
      })
      const data = await res.json()
      if (res.ok) {
        showToast(selectedTask.department === 'return_receiving'
          ? "Returned items stored. Job completed successfully!"
          : "Task marked as Picked successfully!")
        handleCloseTask()
        fetchWorkOrders()
      } else {
        showToast(data.error || "Failed to update task status.", "error")
      }
    } catch {
      showToast("Error updating task.", "error")
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="pb-6 warehouse-tasks-page">
      {/* In-app toast — replaces the browser's native alert() popups */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-white text-[12px] font-bold max-w-[92vw]"
          style={{ background: toast.kind === "success" ? "#16a34a" : "#dc2626" }}
        >
          <PortalIcon name={toast.kind === "success" ? "check-circle" : "alert-triangle"} size={16} />
          <span>{toast.message}</span>
        </div>
      )}

      <PortalPageHeader title="Picking & Returns" subtitle="Process warehouse picking and returned-item receiving jobs" color={COLOR} backHref="/portal/warehouse" />

      {errorState && (
        <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex flex-col gap-1.5 shadow-sm">
          <p className="text-[12px] font-extrabold text-red-800 flex items-center gap-1.5">
            <PortalIcon name="alert-triangle" size={13} /> Error
          </p>
          <p className="text-[11px] font-medium text-red-700 leading-relaxed">
            {errorState}
          </p>
        </div>
      )}

      <div className="flex gap-2 px-4 pt-4">
        {(['open', 'closed'] as const).map(v => (
          <button
            key={v}
            onClick={() => setJobsView(v)}
            className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-center transition-colors"
            style={{
              background: jobsView === v ? COLOR : "#fff",
              color: jobsView === v ? "#fff" : "rgba(80,55,30,0.6)",
              border: `1px solid ${jobsView === v ? COLOR : "rgba(0,0,0,0.08)"}`,
            }}
          >
            {v === 'open' ? `Open Jobs (${openTasks.length})` : `Closed Jobs (${closedTasks.length})`}
          </button>
        ))}
      </div>

      <PortalSectionLabel label={jobsView === 'open' ? "Warehouse Jobs" : "Warehouse History"} />

      {loading ? (
        <div className="mx-4 rounded-2xl overflow-hidden shadow-sm" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
          <PortalSkeleton rows={6} />
        </div>
      ) : visibleTasks.length === 0 ? (
        <div className="mx-4 rounded-2xl overflow-hidden shadow-sm" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
          <PortalEmptyState
            icon="clipboard"
            title="No jobs found"
            subtitle={jobsView === 'open' ? "No active warehouse jobs right now." : "No completed warehouse jobs yet."}
            color={COLOR}
          />
        </div>
      ) : (
        groupedTasks.map(group => (
          <div key={group.key} className="mb-3">
            <div className="flex items-baseline gap-2 px-4 pb-1.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: "#7c3aed" }}>{group.label}</span>
              <span className="text-[10px]" style={{ color: "rgba(80,55,30,0.35)" }}>{group.tasks.length} job{group.tasks.length !== 1 ? "s" : ""}</span>
              <span className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.06)" }} />
            </div>
            <div className="mx-4 rounded-2xl overflow-hidden shadow-sm" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
              {group.tasks.map(({ workOrder, task }) => (
                <PortalListCard
                  key={task.id}
                  title={`${workOrder.customer_name}${workOrder.event_date ? ` · Event ${rowDateLabel(workOrder.event_date)}` : ""} (${workOrder.booking_number})`}
                  subtitle={task.title}
                  meta={rowDateLabel(task.created_at)}
                  badge={task.status}
                  color={COLOR}
                  icon="package"
                  onClick={() => handleOpenTask(workOrder, task)}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {/* TASK DETAIL MODAL */}
      {selectedTask && selectedWO && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-[28px] sm:rounded-3xl w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 warehouse-task-modal">
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
              <button onClick={handleCloseTask} className="text-slate-400 hover:text-slate-600 p-2"><PortalIcon name="x" size={18} /></button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Customer & Delivery */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Customer & Delivery</p>
                <div className="flex justify-between text-[12px]">
                  <span className="text-slate-500 font-semibold">Customer</span>
                  <span className="text-slate-800 font-bold">{selectedWO.customer?.name || selectedWO.customer_name}</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-slate-500 font-semibold">Phone</span>
                  <span className="text-slate-800 font-bold">{selectedWO.customer?.phone || selectedWO.customer_phone}</span>
                </div>
                {selectedWO.event_date && (
                  <div className="flex justify-between text-[12px]">
                    <span className="text-slate-500 font-semibold">Event Date</span>
                    <span className="text-slate-800 font-bold">
                      {new Date(selectedWO.event_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </div>
                )}
                {selectedWO.venue_address && (
                  <div className="flex justify-between gap-3 text-[12px]">
                    <span className="text-slate-500 font-semibold flex-shrink-0">Venue</span>
                    <span className="text-slate-800 font-bold text-right">{selectedWO.venue_address}</span>
                  </div>
                )}
              </div>

              {/* QC sent this back — show exactly what needs fixing */}
              {selectedTask.metadata?.rework_reason && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 animate-in fade-in slide-in-from-top-1 duration-300">
                  <p className="text-[12px] font-bold text-red-700 flex items-center gap-1.5 mb-2">
                    <PortalIcon name="alert-triangle" size={14} /> Sent back by QC — needs rework
                  </p>
                  {selectedTask.metadata.rework_items && selectedTask.metadata.rework_items.length > 0 ? (
                    <div className="space-y-1.5">
                      {selectedTask.metadata.rework_items.map((item, i) => (
                        <div key={i} className="text-[12px] text-red-600">
                          <span className="font-bold">{item.name}</span> — {item.note}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12px] text-red-600">{selectedTask.metadata.rework_reason}</p>
                  )}
                </div>
              )}

              {/* Items to Pick — tick each one off as it's picked */}
              {checklist.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {selectedTask.department === 'return_receiving' ? "Return Receiving Checklist" : "Items to Pick"} ({checklist.filter(c => c.checked).length} of {checklist.length} checked)
                  </p>
                  <div className="space-y-2">
                    {checklist.map((item, i) => (
                      <div
                        key={i}
                        onClick={() => toggleChecklistItem(i)}
                        className="flex items-center gap-3 p-3.5 rounded-xl border bg-slate-50/50 hover:bg-slate-50 border-slate-100 cursor-pointer transition-colors"
                      >
                        <div className="w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors flex-shrink-0"
                          style={{
                            background: item.checked ? COLOR : "white",
                            borderColor: item.checked ? COLOR : "rgba(0,0,0,0.15)"
                          }}
                        >
                          {item.checked && (
                            <PortalIcon name="check" size={12} className="text-white" />
                          )}
                        </div>
                        <span className="text-[13px] font-bold text-slate-700" style={{ textDecoration: item.checked ? 'line-through' : 'none', opacity: item.checked ? 0.6 : 1 }}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedTask.instructions && (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Instructions</p>
                  <p className="text-[13px] text-slate-700 font-semibold leading-relaxed whitespace-pre-line">
                    {selectedTask.instructions}
                  </p>
                </div>
              )}

              {/* Track this Job */}
              <button
                onClick={() => setShowTracker(true)}
                className="w-full py-2.5 rounded-xl text-[12px] font-bold border flex items-center justify-center gap-2"
                style={{ borderColor: `${COLOR}40`, color: COLOR, background: `${COLOR}0d` }}
              >
                <PortalIcon name="map-pin" size={14} /> Track this Job
              </button>

              {/* Print Documents */}
              {selectedTask.department === 'warehouse' && <div className="pt-3 pb-2 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Print Documents</p>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={openPickSlip}
                    disabled={generatingSlip}
                    className="py-2.5 rounded-xl text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors flex flex-col items-center justify-center gap-1 disabled:opacity-60"
                  >
                    <PortalIcon name="clipboard" size={16} />
                    <span>{generatingSlip ? "Generating…" : "Pick Slip"}</span>
                  </button>
                </div>
              </div>}

              {/* Action Buttons */}
              <div className="pt-2">
                {selectedTask.status === 'picked' || selectedTask.status === 'completed' ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-center flex items-center justify-center gap-2">
                    <PortalIcon name="check-circle" size={16} className="text-emerald-600" />
                    <p className="text-[12px] font-bold text-emerald-700">
                      {selectedTask.department === 'return_receiving' ? "Return received and stored" : "Picking already completed"}
                    </p>
                  </div>
                ) : selectedTask.status === 'cancelled' ? (
                  <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl text-center">
                    <p className="text-[12px] font-semibold text-slate-500">This job was cancelled.</p>
                  </div>
                ) : selectedTask.status === 'pending' ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-2xl text-center">
                    <p className="text-[12px] font-semibold text-yellow-800">
                      Waiting for predecessor task to be picked/completed.
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => updateTaskStatus(selectedTask.department === 'return_receiving' ? 'completed' : 'picked')}
                    disabled={updating}
                    className="w-full py-3.5 rounded-xl text-[13px] font-bold text-white transition-opacity flex items-center justify-center gap-2"
                    style={{ background: COLOR, opacity: updating ? 0.7 : 1 }}
                  >
                    {updating ? "Updating..." : (<><PortalIcon name="check" size={16} /> {selectedTask.department === 'return_receiving' ? "Confirm Stored & Complete Job" : "Complete Picking & Send to QC/Packing"}</>)}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pick Slip PDF preview — rendered onto a canvas via pdf.js, in-app */}
      {slipUrl && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex flex-col">
          <div className="bg-white border-b px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
            <p className="text-[13px] font-bold text-slate-800 truncate">
              Picking Slip — {selectedWO?.work_order_number}
            </p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={shareSlipOnWhatsApp}
                className="px-3 py-2 rounded-xl text-[11px] font-bold text-white flex items-center gap-1.5"
                style={{ background: "#25D366" }}
              >
                <PortalIcon name="whatsapp" size={14} /> WhatsApp
              </button>
              <button
                onClick={downloadSlip}
                className="px-3 py-2 rounded-xl text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center gap-1.5"
              >
                <PortalIcon name="arrow-down" size={14} /> Download
              </button>
              <button
                onClick={printSlip}
                className="px-3 py-2 rounded-xl text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center gap-1.5"
              >
                <PortalIcon name="printer" size={14} /> Print
              </button>
              <button
                onClick={closeSlipPreview}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-500"
              >
                <PortalIcon name="x" size={16} />
              </button>
            </div>
          </div>
          <div ref={previewContainerRef} className="flex-1 bg-slate-200 overflow-auto flex flex-col items-center py-4">
            {previewError ? (
              <div className="m-auto text-center px-6">
                <p className="text-[12px] text-slate-500 font-semibold mb-3">{previewError}</p>
                <button
                  onClick={() => window.open(slipUrl, "_blank")}
                  className="px-4 py-2 rounded-xl text-[11px] font-bold text-slate-700 bg-white border border-slate-200 flex items-center gap-1.5"
                >
                  <PortalIcon name="arrow-up" size={13} /> Open in Tab
                </button>
              </div>
            ) : (
              <canvas ref={previewCanvasRef} className="shadow-lg rounded-sm bg-white" />
            )}
          </div>
        </div>
      )}

      {showTracker && selectedWO && (
        <JobTrackerModal workOrderId={selectedWO.id} onClose={() => setShowTracker(false)} />
      )}
    </div>
  )
}
