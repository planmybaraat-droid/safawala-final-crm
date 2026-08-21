"use client"

import { useState, useEffect, useRef } from "react"
import { PortalPageHeader, PortalSectionLabel, PortalListCard, PortalEmptyState, PortalSkeleton } from "@/components/portal/portal-shared"
import { PortalIcon } from "@/components/portal/portal-icons"
import { JobTrackerModal } from "@/components/portal/job-tracker-modal"

const COLOR = "#eab308"

// ─── pdf.js loaded from CDN, same pattern as the warehouse Pick Slip ────────
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

interface CompanyInfo {
  company_name?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  state?: string
  gst_number?: string
  logo_url?: string | null
}

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

// ─── Packing Slip PDF — customer/delivery address, packed items, QC stamp ──
async function buildPackingSlipPDF(wo: any, checklist: Array<{ text: string; checked: boolean }> | undefined, company: CompanyInfo | null, qcPassedAt?: string | null): Promise<Blob> {
  const { default: jsPDF } = await import("jspdf")
  const { default: autoTable } = await import("jspdf-autotable")

  const isRental = wo?.booking_source !== "direct_sales_orders"
  const accent: [number, number, number] = isRental ? [168, 85, 247] : [5, 150, 105]
  const typeLabel = isRental ? "Rental — Return Required" : "Direct Sale — One Way"

  const items: any[] = wo?.items || []
  const customer = wo?.customer || {}
  const addressLine = [customer?.address, customer?.city, customer?.state, customer?.pincode].filter(Boolean).join(", ")
  const eventDate = wo?.event_date ? new Date(wo.event_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"

  const logoDataUrl = company?.logo_url ? await toDataUrl(company.logo_url) : null
  const companyName = company?.company_name || "SAFAWALA"
  const contactLine = [company?.phone && `Ph: ${company.phone}`, company?.email, company?.gst_number && `GST: ${company.gst_number}`].filter(Boolean).join("   •   ")

  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const pageWidth = 210

  const drawHalf = (yTop: number, copyLabel: string) => {
    const left = 12
    const right = pageWidth - 12
    let y = yTop + 10.5

    doc.setFillColor(accent[0], accent[1], accent[2])
    doc.rect(0, yTop, pageWidth, 1.6, "F")

    if (logoDataUrl) {
      try {
        const props = doc.getImageProperties(logoDataUrl)
        const h = 9, w = (props.width / props.height) * h
        doc.addImage(logoDataUrl, props.fileType, left, y - 7.5, w, h)
        doc.setFontSize(13); doc.setFont("helvetica", "bold"); doc.setTextColor(...accent)
        doc.text(companyName.toUpperCase(), left + w + 4, y - 1.5)
        doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); doc.setTextColor(120, 120, 120)
        doc.text("Packing Slip", left + w + 4, y + 3)
      } catch { drawLogoChip() }
    } else {
      drawLogoChip()
    }
    function drawLogoChip() {
      doc.setFillColor(accent[0], accent[1], accent[2])
      doc.roundedRect(left, y - 6, 9, 9, 1.5, 1.5, "F")
      doc.setTextColor(255, 255, 255); doc.setFontSize(11); doc.setFont("helvetica", "bold")
      doc.text(companyName.charAt(0).toUpperCase(), left + 4.5, y, { align: "center" })
      doc.setTextColor(...accent); doc.setFontSize(13); doc.setFont("helvetica", "bold")
      doc.text(companyName.toUpperCase(), left + 13, y - 1.5)
      doc.setTextColor(120, 120, 120); doc.setFontSize(7.5); doc.setFont("helvetica", "normal")
      doc.text("Packing Slip", left + 13, y + 3)
    }

    doc.setTextColor(...accent); doc.setFontSize(6.5); doc.setFont("helvetica", "bold")
    doc.text(typeLabel.toUpperCase(), left, y + 7.5)

    doc.setTextColor(140, 140, 140); doc.setFontSize(7.5); doc.setFont("helvetica", "bold")
    doc.text(copyLabel, right, y - 4, { align: "right" })
    doc.setTextColor(...accent); doc.setFontSize(11)
    doc.text(wo?.work_order_number || "—", right, y + 1.5, { align: "right" })
    if (qcPassedAt) {
      doc.setTextColor(22, 163, 74); doc.setFontSize(7); doc.setFont("helvetica", "bold")
      doc.text(`QC PASSED ${new Date(qcPassedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`, right, y + 5.5, { align: "right" })
    }

    y += 12
    doc.setDrawColor(225, 225, 225); doc.line(left, y, right, y)
    y += 5.5

    doc.setFontSize(8.5)
    const row = (l1: string, v1: string, l2: string, v2: string) => {
      doc.setFont("helvetica", "bold"); doc.setTextColor(120, 120, 120); doc.text(l1, left, y)
      doc.setFont("helvetica", "normal"); doc.setTextColor(30, 30, 30); doc.text(v1 || "—", left + 24, y)
      doc.setFont("helvetica", "bold"); doc.setTextColor(120, 120, 120); doc.text(l2, left + 95, y)
      doc.setFont("helvetica", "normal"); doc.setTextColor(30, 30, 30); doc.text(v2 || "—", left + 117, y)
      y += 4.4
    }
    row("Booking Ref", wo?.booking_number, "Event Date", eventDate)
    row("Customer", customer?.name || wo?.customer_name, "Phone", customer?.phone || wo?.customer_phone)
    if (wo?.venue_address) row("Venue", wo.venue_address, "", "")

    doc.setFont("helvetica", "bold"); doc.setTextColor(120, 120, 120); doc.setFontSize(8.5)
    doc.text("Delivery Address", left, y)
    doc.setFont("helvetica", "normal"); doc.setTextColor(30, 30, 30)
    const addrLines = doc.splitTextToSize(addressLine || "—", right - left - 30)
    doc.text(addrLines, left + 30, y)
    y += 4.4 * Math.max(addrLines.length, 1)

    doc.setTextColor(170, 170, 170); doc.setFontSize(6.8); doc.setFont("helvetica", "normal")
    doc.text(`Printed ${new Date().toLocaleString("en-IN")}`, left, y)
    y += 4

    doc.setTextColor(60, 60, 60); doc.setFontSize(8.5); doc.setFont("helvetica", "bold")
    doc.text("ITEMS PACKED", left, y + 2.5)
    y += 4.5

    const rows = items.length > 0
      ? items.map((it: any, i: number) => [String(i + 1), "", `${it.product?.name || "Item"}${[it.product?.color, it.product?.size].filter(Boolean).length ? ` (${[it.product?.color, it.product?.size].filter(Boolean).join(", ")})` : ""}`, String(it.quantity || 1)])
      : (checklist || []).map((c, i) => [String(i + 1), "", c.text, ""])

    autoTable(doc, {
      startY: y,
      margin: { left, right: 12 },
      head: [["#", "", "Item Description", "Qty"]],
      body: rows,
      theme: "grid",
      styles: { fontSize: 8.5, cellPadding: 1.5, valign: "middle" },
      headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: "bold", fontSize: 7.5 },
      columnStyles: { 0: { cellWidth: 8, halign: "center" }, 1: { cellWidth: 8, halign: "center" }, 3: { cellWidth: 14, halign: "center" } },
      didDrawCell: (data) => {
        if (data.column.index === 1 && data.row.section === "body") {
          const cx = data.cell.x + data.cell.width / 2 - 1.5
          const cy = data.cell.y + data.cell.height / 2 - 1.5
          doc.setFillColor(...accent); doc.rect(cx, cy, 3, 3, "FD")
          doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.4)
          doc.line(cx + 0.5, cy + 1.6, cx + 1.3, cy + 2.4)
          doc.line(cx + 1.3, cy + 2.4, cx + 2.6, cy + 0.6)
        }
      },
    })

    const tableEndY = (doc as any).lastAutoTable?.finalY || y + 20
    const sigY = Math.min(Math.max(tableEndY + 8, yTop + 118), yTop + 132)
    doc.setDrawColor(80, 80, 80); doc.setFontSize(7.5); doc.setTextColor(90, 90, 90)
    const sigWidth = (right - left - 10) / 3
    ;[["Packed by", left], ["QC by", left + sigWidth + 5], ["Dispatch received", left + (sigWidth + 5) * 2]].forEach(([label, x]) => {
      doc.line(x as number, sigY, (x as number) + sigWidth, sigY)
      doc.text(label as string, x as number, sigY + 3.5)
    })

    if (contactLine) {
      const footY = yTop + 141
      doc.setDrawColor(235, 235, 235); doc.line(left, footY - 3.5, right, footY - 3.5)
      doc.setFontSize(6.3); doc.setTextColor(150, 150, 150); doc.setFont("helvetica", "normal")
      doc.text(contactLine, pageWidth / 2, footY, { align: "center" })
    }
  }

  drawHalf(0, "OFFICE COPY")
  const cutY = 148.5
  doc.setDrawColor(120, 120, 120); doc.setLineDashPattern([1.5, 1.5], 0)
  doc.line(0, cutY, pageWidth, cutY); doc.setLineDashPattern([], 0)
  doc.setFontSize(7); doc.setTextColor(150, 150, 150)
  doc.text("✂  CUT HERE  —  CUT HERE  —  CUT HERE  ✂", pageWidth / 2, cutY - 1.5, { align: "center" })
  drawHalf(cutY, "DISPATCH COPY")

  return doc.output("blob")
}

interface Task {
  id: string
  department: string
  task_number: string
  title: string
  status: 'pending' | 'active' | 'shortage' | 'completed' | 'cancelled'
  instructions: string
  checklist: Array<{ text: string; checked: boolean }>
  photos?: string[]
  metadata?: { qc_status?: string; qc_checklist?: QcItemResult[] | null; qc_notes?: string | null; qc_passed_at?: string }
}

interface WorkOrder {
  id: string
  work_order_number: string
  booking_number: string
  customer_name: string
  customer_phone: string
  work_order_tasks: Task[]
}

interface QcItemResult {
  key: string
  name: string
  qty: number
  status: "pending" | "pass" | "fail"
  note: string
}

// Build one QC row per line item on the order — lets QC call out exactly
// which product failed instead of passing/failing the whole job blind.
function buildQcItems(items: any[]): QcItemResult[] {
  if (!items || items.length === 0) return []
  return items.map((it: any, i: number) => ({
    key: it.id || String(i),
    name: `${it.product?.name || it.product_name || "Item"}${[it.product?.color, it.product?.size].filter(Boolean).length ? ` (${[it.product?.color, it.product?.size].filter(Boolean).join(", ")})` : ""}`,
    qty: it.quantity || 1,
    status: "pending",
    note: "",
  }))
}

export default function QcPackingPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [errorState, setErrorState] = useState<string | null>(null)
  const [jobsView, setJobsView] = useState<'open' | 'closed'>('open')
  const [showTracker, setShowTracker] = useState(false)

  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null)
  const [checklist, setChecklist] = useState<Array<{ text: string; checked: boolean }>>([])
  const [photos, setPhotos] = useState<string[]>([])
  const [updating, setUpdating] = useState(false)

  // Step 1: Quality Check state — one pass/fail per line item
  const [step, setStep] = useState<'qc' | 'packing'>('qc')
  const [qcItems, setQcItems] = useState<QcItemResult[]>([])

  const [toast, setToast] = useState<{ message: string; kind: "success" | "error" } | null>(null)
  function showToast(message: string, kind: "success" | "error" = "success") {
    setToast({ message, kind })
    setTimeout(() => setToast(null), 2800)
  }

  // Company info + packing slip preview (same pattern as warehouse Pick Slip)
  const [company, setCompany] = useState<CompanyInfo | null>(null)
  const [slipUrl, setSlipUrl] = useState<string | null>(null)
  const [slipBlob, setSlipBlob] = useState<Blob | null>(null)
  const [generatingSlip, setGeneratingSlip] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => { fetchWorkOrders() }, [])

  useEffect(() => {
    fetch("/api/company-settings-simple")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setCompany(d.data || d) })
      .catch(() => {})
  }, [])

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
        console.error("Failed to render packing slip preview:", err)
        if (!cancelled) setPreviewError("Couldn't render the preview — use Download or Open in Tab below.")
      }
    })()
    return () => { cancelled = true }
  }, [slipBlob])

  async function fetchWorkOrders() {
    setLoading(true)
    setErrorState(null)
    try {
      const res = await fetch("/api/work-orders")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch packing jobs")
      const list = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : [])
      setWorkOrders(list)
    } catch (err: any) {
      setErrorState(err.message || "Failed to fetch packing jobs")
      setWorkOrders([])
    } finally {
      setLoading(false)
    }
  }

  const qcTasks = workOrders.flatMap(wo =>
    (wo.work_order_tasks ?? [])
      .filter(t => t.department === "packing" || t.department === "return_qc")
      .map(t => ({ workOrder: wo, task: t }))
  )
  const openTasks = qcTasks.filter(({ task }) => task.status === "active" || task.status === "pending" || task.status === "shortage")
  const closedTasks = qcTasks.filter(({ task }) => task.status === "completed" || task.status === "cancelled")
  const visibleTasks = jobsView === "open" ? openTasks : closedTasks

  async function handleOpenTask(wo: WorkOrder, t: Task) {
    setSelectedWO(wo)
    setSelectedTask(t)
    setChecklist(t.checklist ? [...t.checklist] : [])
    setPhotos(t.photos ? [...t.photos] : [])
    const qcStatus = t.metadata?.qc_status || "pending"
    setStep(t.department === "return_qc" ? "qc" : qcStatus === "passed" ? "packing" : "qc")
    // Seed from any saved per-item results while the item list itself loads.
    setQcItems((t.metadata?.qc_checklist as any) || [])

    // Fetch full detail (customer address + items) — needed for the packing
    // slip AND to build one QC row per line item.
    try {
      const res = await fetch(`/api/work-orders/${wo.id}`)
      const data = await res.json()
      if (data.success && data.data) {
        setSelectedWO(data.data)
        const saved = t.metadata?.qc_checklist as QcItemResult[] | undefined
        const fresh = buildQcItems(data.data.items || [])
        // Carry over any already-recorded pass/fail (e.g. reopening after a
        // partial review), matched by item key; new items default to pending.
        setQcItems(fresh.map(item => {
          const prior = saved?.find(s => s.key === item.key)
          return prior ? { ...item, status: prior.status, note: prior.note } : item
        }))
      }
    } catch (err) {
      console.error("Failed to load detailed work order:", err)
    }
  }

  function handleCloseTask() {
    setSelectedTask(null)
    setSelectedWO(null)
    setChecklist([])
    setPhotos([])
    setQcItems([])
    closeSlipPreview()
  }

  function toggleChecklistItem(index: number) {
    if (selectedTask && selectedTask.status !== "active") return
    setChecklist(prev => prev.map((item, i) => i === index ? { ...item, checked: !item.checked } : item))
  }

  function setQcItemStatus(key: string, status: "pass" | "fail") {
    if (selectedTask && selectedTask.status !== "active") return
    setQcItems(prev => prev.map(item => item.key === key ? { ...item, status, note: status === "pass" ? "" : item.note } : item))
  }

  // The common case is "everything's fine" — one tap instead of one per item.
  function markAllPass() {
    if (selectedTask && selectedTask.status !== "active") return
    setQcItems(prev => prev.map(item => item.status === "fail" ? item : { ...item, status: "pass" }))
  }

  function setQcItemNote(key: string, note: string) {
    setQcItems(prev => prev.map(item => item.key === key ? { ...item, note } : item))
  }

  function handleAddMockPhoto() {
    if (selectedTask && selectedTask.status !== "active") return
    const mockPhoto = `https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&q=80&mock=${Math.random()}`
    setPhotos(prev => [...prev, mockPhoto])
  }

  // One decision per item, then one submit — the whole job still moves as a
  // unit (this business ships one wedding set per order), but the fail path
  // now names the exact item(s) instead of a blanket note.
  async function submitQC() {
    if (!selectedTask || updating || qcItems.length === 0) return
    const undecided = qcItems.find(i => i.status === "pending")
    if (undecided) {
      showToast(`Mark "${undecided.name}" as Pass or Fail first.`, "error")
      return
    }
    const failed = qcItems.filter(i => i.status === "fail")
    const missingNote = failed.find(i => !i.note.trim())
    if (missingNote) {
      showToast(`Add a reason for "${missingNote.name}" before submitting.`, "error")
      return
    }

    if (failed.length > 0) {
      const isReturnQc = selectedTask.department === "return_qc"
      if (!isReturnQc && !window.confirm(`${failed.length} item${failed.length > 1 ? "s" : ""} failed. Send back to Warehouse for rework?`)) return
      setUpdating(true)
      try {
        const res = await fetch(`/api/work-orders/tasks/${selectedTask.id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(isReturnQc ? {} : { status: "shortage" }),
            metadata: {
              qc_status: "failed",
              qc_checklist: qcItems,
              qc_notes: failed.map(i => `${i.name}: ${i.note}`).join(" | "),
            },
          }),
        })
        const data = await res.json()
        if (res.ok) {
          if (isReturnQc) {
            showToast(`Return remains in QC — resolve: ${failed.map(i => i.name).join(", ")}.`, "error")
            setSelectedTask(prev => prev ? { ...prev, metadata: { ...prev.metadata, qc_status: "failed", qc_checklist: qcItems } } : prev)
          } else {
            showToast(`Sent back to Warehouse — ${failed.map(i => i.name).join(", ")} failed QC.`)
            handleCloseTask()
            fetchWorkOrders()
          }
        } else {
          showToast(data.error || "Failed to send back for rework.", "error")
        }
      } catch {
        showToast("Network error updating job.", "error")
      } finally {
        setUpdating(false)
      }
      return
    }

    const isReturnQc = selectedTask.department === "return_qc"
    setUpdating(true)
    try {
      const res = await fetch(`/api/work-orders/tasks/${selectedTask.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isReturnQc ? { status: "completed" } : {}),
          metadata: { qc_status: "passed", qc_checklist: qcItems, qc_passed_at: new Date().toISOString() },
        }),
      })
      const data = await res.json()
      if (res.ok) {
        if (isReturnQc) {
          showToast("Return QC passed — sent to Warehouse Storage!")
          handleCloseTask()
          fetchWorkOrders()
        } else {
          showToast("All items passed Quality Check — packing unlocked!")
          setStep("packing")
          setSelectedTask(prev => prev ? { ...prev, metadata: { ...prev.metadata, qc_status: "passed" } } : prev)
        }
      } else {
        showToast(data.error || "Failed to save Quality Check.", "error")
      }
    } catch {
      showToast("Network error saving Quality Check.", "error")
    } finally {
      setUpdating(false)
    }
  }

  async function completePacking() {
    if (!selectedTask || updating) return
    if (photos.length === 0) {
      showToast("Packing requires at least 1 proof photo to be uploaded.", "error")
      return
    }
    setUpdating(true)
    try {
      const res = await fetch(`/api/work-orders/tasks/${selectedTask.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed", checklist, photos }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast("Packing completed and sent to dispatch!")
        handleCloseTask()
        fetchWorkOrders()
      } else {
        showToast(data.error || "Failed to update packing job.", "error")
      }
    } catch {
      showToast("Network error updating packing job.", "error")
    } finally {
      setUpdating(false)
    }
  }

  async function openPackingSlip() {
    if (!selectedWO || generatingSlip) return
    setGeneratingSlip(true)
    try {
      const blob = await buildPackingSlipPDF(selectedWO, checklist, company, selectedTask?.metadata?.qc_passed_at)
      const url = URL.createObjectURL(blob)
      setSlipBlob(blob)
      setSlipUrl(url)
    } catch (err) {
      console.error("Failed to generate packing slip PDF:", err)
      showToast("Failed to generate the packing slip. Please try again.", "error")
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
    a.download = `Packing-Slip-${selectedWO.work_order_number || "slip"}.pdf`
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
    const filename = `Packing-Slip-${selectedWO.work_order_number || "slip"}.pdf`
    const file = new File([slipBlob], filename, { type: "application/pdf" })
    try {
      if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
        await (navigator as any).share({ files: [file], title: filename, text: `Packing Slip — ${selectedWO.work_order_number}` })
        return
      }
    } catch {
      // fall through to download + WhatsApp Web
    }
    downloadSlip()
    window.open("https://web.whatsapp.com/", "_blank")
  }

  const isClosed = selectedTask?.status === "completed" || selectedTask?.status === "cancelled"
  const isShortage = selectedTask?.status === "shortage"

  return (
    <div className="pb-6">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-white text-[12px] font-bold max-w-[92vw] animate-in fade-in slide-in-from-top-3 duration-300"
          style={{ background: toast.kind === "success" ? "#16a34a" : "#dc2626" }}
        >
          <PortalIcon name={toast.kind === "success" ? "check-circle" : "alert-triangle"} size={16} />
          <span>{toast.message}</span>
        </div>
      )}

      <PortalPageHeader title="QC & Packing Queue" subtitle="Quality check outbound and returned items" color={COLOR} backHref="/portal/qc" />

      {errorState && (
        <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex flex-col gap-1.5 shadow-sm">
          <p className="text-[12px] font-extrabold text-red-800 flex items-center gap-1.5">
            <PortalIcon name="alert-triangle" size={13} /> Error
          </p>
          <p className="text-[11px] font-medium text-red-700 leading-relaxed">{errorState}</p>
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

      <PortalSectionLabel label={jobsView === 'open' ? "QC Jobs" : "QC History"} />

      <div className="mx-4 rounded-2xl overflow-hidden shadow-sm" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
        {loading ? (
          <PortalSkeleton rows={6} />
        ) : visibleTasks.length === 0 ? (
          <PortalEmptyState
            icon="laundry"
            title="No jobs found"
            subtitle={jobsView === 'open' ? "No items waiting for QC right now." : "No completed QC jobs yet."}
            color={COLOR}
          />
        ) : (
          visibleTasks.map(({ workOrder, task }) => (
            <PortalListCard
              key={task.id}
              title={`${workOrder.customer_name} (${workOrder.booking_number})`}
              subtitle={task.status === "shortage" ? "Needs Rework — waiting on Warehouse" : task.title}
              meta={jobsView === 'open' ? (task.status === "active" ? (task.department === "return_qc" ? "Return QC" : task.metadata?.qc_status === "passed" ? "Packing" : "QC Needed") : task.status === "shortage" ? undefined : "Waiting") : undefined}
              badge={task.status}
              color={COLOR}
              icon="laundry"
              onClick={() => handleOpenTask(workOrder, task)}
            />
          ))
        )}
      </div>

      {selectedTask && selectedWO && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-[28px] sm:rounded-3xl w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 sticky top-0 z-10">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: COLOR }}>
                  {selectedTask.task_number} · {selectedWO.work_order_number}
                </span>
                <h3 className="font-extrabold text-[15px] mt-0.5" style={{ color: "#1e1208" }}>
                  {selectedWO.customer_name}
                </h3>
              </div>
              <button onClick={handleCloseTask} className="text-slate-400 hover:text-slate-600 p-2"><PortalIcon name="x" size={18} /></button>
            </div>

            <div className="p-6 space-y-5">
              {/* Step indicator */}
              {!isClosed && !isShortage && (
                <div className="flex items-center gap-2">
                  {(selectedTask.department === "return_qc" ? [
                    { key: "qc", label: "Return Quality Check" },
                  ] : [
                    { key: "qc", label: "① Quality Check" },
                    { key: "packing", label: "② Packing" },
                  ]).map((s) => {
                    const active = step === s.key
                    const done = s.key === "qc" && step === "packing"
                    return (
                      <div key={s.key} className="flex-1 flex items-center gap-2">
                        <div
                          className="flex-1 py-2 rounded-xl text-center text-[11px] font-bold transition-all duration-300"
                          style={{
                            background: active ? COLOR : done ? "#dcfce7" : "#f1f5f9",
                            color: active ? "white" : done ? "#16a34a" : "#94a3b8",
                            transform: active ? "scale(1.02)" : "scale(1)",
                          }}
                        >
                          {done ? "✓ QC Passed" : s.label}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {isShortage && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                  <p className="text-[12px] font-bold text-red-700 flex items-center gap-1.5 mb-2">
                    <PortalIcon name="alert-triangle" size={14} /> Sent back to Warehouse for rework
                  </p>
                  {(selectedTask.metadata?.qc_checklist || []).filter(i => i.status === "fail").length > 0 ? (
                    <div className="space-y-1.5">
                      {(selectedTask.metadata!.qc_checklist as QcItemResult[]).filter(i => i.status === "fail").map(i => (
                        <div key={i.key} className="text-[11px] text-red-600">
                          <span className="font-bold">{i.name}</span> — {i.note}
                        </div>
                      ))}
                    </div>
                  ) : selectedTask.metadata?.qc_notes ? (
                    <p className="text-[11px] text-red-600">{selectedTask.metadata.qc_notes}</p>
                  ) : null}
                </div>
              )}

              {selectedTask.instructions && (
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
                className="w-full py-2.5 rounded-xl text-[12px] font-bold border flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                style={{ borderColor: `${COLOR}40`, color: COLOR, background: `${COLOR}0d` }}
              >
                <PortalIcon name="map-pin" size={14} /> Track this Job
              </button>

              {/* STEP 1: Quality Check — pass/fail per item */}
              {step === "qc" && !isClosed && !isShortage && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {qcItems.filter(i => i.status !== "pending").length}/{qcItems.length} reviewed
                      </p>
                      {qcItems.some(i => i.status === "pending") && (
                        <button
                          onClick={markAllPass}
                          className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg active:scale-95 transition-transform"
                        >
                          ✓ Mark all Pass
                        </button>
                      )}
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300 ease-out"
                        style={{
                          width: `${qcItems.length ? (qcItems.filter(i => i.status !== "pending").length / qcItems.length) * 100 : 0}%`,
                          background: qcItems.some(i => i.status === "fail") ? "#dc2626" : COLOR,
                        }}
                      />
                    </div>

                    {qcItems.length === 0 ? (
                      <p className="text-[12px] text-slate-400 p-3">No line items found on this order.</p>
                    ) : (
                      <div className="space-y-2 pt-1">
                        {qcItems.map((item) => (
                          <div
                            key={item.key}
                            className="rounded-xl border p-3.5 transition-colors duration-200"
                            style={{
                              borderColor: item.status === "fail" ? "#fecaca" : item.status === "pass" ? "#bbf7d0" : "rgb(241 245 249)",
                              background: item.status === "fail" ? "#fef2f2" : item.status === "pass" ? "#f0fdf4" : "rgba(248,250,252,0.5)",
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-[13px] font-bold text-slate-700 truncate">{item.name}</p>
                                <p className="text-[10px] text-slate-400">Qty {item.qty}</p>
                              </div>
                              <div className="flex gap-1.5 flex-shrink-0">
                                <button
                                  onClick={() => setQcItemStatus(item.key, "fail")}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90"
                                  style={{ background: item.status === "fail" ? "#dc2626" : "#fff", border: `1.5px solid ${item.status === "fail" ? "#dc2626" : "rgba(0,0,0,0.1)"}`, color: item.status === "fail" ? "#fff" : "#dc2626" }}
                                >
                                  <PortalIcon name="x" size={14} />
                                </button>
                                <button
                                  onClick={() => setQcItemStatus(item.key, "pass")}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90"
                                  style={{ background: item.status === "pass" ? "#16a34a" : "#fff", border: `1.5px solid ${item.status === "pass" ? "#16a34a" : "rgba(0,0,0,0.1)"}`, color: item.status === "pass" ? "#fff" : "#16a34a" }}
                                >
                                  <PortalIcon name="check" size={14} />
                                </button>
                              </div>
                            </div>
                            {item.status === "fail" && (
                              <input
                                key={`${item.key}-note`}
                                autoFocus
                                value={item.note}
                                onChange={(e) => setQcItemNote(item.key, e.target.value)}
                                placeholder="What's wrong? (required)"
                                className="w-full mt-2.5 px-3 py-2 rounded-lg border border-red-200 bg-white text-[12px] outline-none animate-in fade-in slide-in-from-top-1 duration-200"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={submitQC}
                    disabled={updating || qcItems.length === 0}
                    className="w-full py-3.5 rounded-xl text-[13px] font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-transform"
                    style={{ background: qcItems.some(i => i.status === "fail") ? "#dc2626" : COLOR }}
                  >
                    {updating ? "Submitting…" : (
                      <>
                        <PortalIcon name="check" size={15} />
                        {qcItems.some(i => i.status === "fail")
                          ? selectedTask.department === "return_qc" ? "Record QC Issues" : "Submit — Send Back for Rework"
                          : selectedTask.department === "return_qc" ? "Pass Return QC & Send to Storage" : "Submit Quality Check"}
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* STEP 2: Packing */}
              {selectedTask.department === "packing" && (step === "packing" || isClosed) && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-300">
                  {checklist.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Packing Checklist</p>
                      <div className="space-y-2">
                        {checklist.map((item, i) => (
                          <div
                            key={i}
                            onClick={() => toggleChecklistItem(i)}
                            className="flex items-center gap-3 p-3.5 rounded-xl border bg-slate-50/50 hover:bg-slate-50 border-slate-100 cursor-pointer transition-colors active:scale-[0.99]"
                          >
                            <div className="w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0"
                              style={{ background: item.checked ? COLOR : "white", borderColor: item.checked ? COLOR : "rgba(0,0,0,0.15)", transform: item.checked ? "scale(1.05)" : "scale(1)" }}
                            >
                              {item.checked && <PortalIcon name="check" size={12} className="text-white" />}
                            </div>
                            <span className="text-[13px] font-bold text-slate-700 transition-opacity" style={{ textDecoration: item.checked ? "line-through" : "none", opacity: item.checked ? 0.6 : 1 }}>
                              {item.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Packing Slip */}
                  <button
                    onClick={openPackingSlip}
                    disabled={generatingSlip}
                    className="w-full py-2.5 rounded-xl text-[12px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-transform"
                  >
                    <PortalIcon name="clipboard" size={16} />
                    <span>{generatingSlip ? "Generating…" : "Packing Slip"}</span>
                  </button>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Proof Photos (Required)</p>
                      {!isClosed && (
                        <button
                          onClick={handleAddMockPhoto}
                          className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 active:scale-95 transition-transform"
                        >
                          <PortalIcon name="camera" size={13} /> Add Mock Photo
                        </button>
                      )}
                    </div>

                    {photos.length === 0 ? (
                      <div className="border border-dashed border-slate-200 rounded-2xl p-6 text-center">
                        <p className="text-[11px] text-slate-400">No proof photos uploaded yet. Required for packing completion.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {photos.map((src, i) => (
                          <div key={i} className="aspect-square rounded-xl overflow-hidden border border-slate-100 relative group animate-in fade-in zoom-in-95 duration-200">
                            <img src={src} className="w-full h-full object-cover" alt="Proof" />
                            {!isClosed && (
                              <button
                                onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-md opacity-90 hover:opacity-100 active:scale-90 transition-transform"
                              >
                                <PortalIcon name="x" size={11} className="text-white" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    {selectedTask.status === "completed" ? (
                      <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-center flex items-center justify-center gap-2">
                        <PortalIcon name="check-circle" size={16} className="text-emerald-600" />
                        <p className="text-[12px] font-bold text-emerald-700">Packing already completed</p>
                      </div>
                    ) : selectedTask.status === "cancelled" ? (
                      <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl text-center">
                        <p className="text-[12px] font-semibold text-slate-500">This job was cancelled.</p>
                      </div>
                    ) : (
                      <button
                        onClick={completePacking}
                        disabled={updating}
                        className="w-full py-3.5 rounded-xl text-[13px] font-bold text-white transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                        style={{ background: "#22c55e", opacity: updating ? 0.7 : 1 }}
                      >
                        {updating ? "Completing…" : (<><PortalIcon name="check" size={16} /> Verify & Complete Packing</>)}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {selectedTask.department === "return_qc" && selectedTask.status === "completed" && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-center flex items-center justify-center gap-2">
                  <PortalIcon name="check-circle" size={16} className="text-emerald-600" />
                  <p className="text-[12px] font-bold text-emerald-700">Return QC passed and sent to Warehouse Storage</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Packing Slip PDF preview */}
      {slipUrl && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex flex-col">
          <div className="bg-white border-b px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
            <p className="text-[13px] font-bold text-slate-800 truncate">
              Packing Slip — {selectedWO?.work_order_number}
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
