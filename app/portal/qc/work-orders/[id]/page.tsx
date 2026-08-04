"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { PortalPageHeader, PortalSectionLabel, PortalInfoRow, PortalSkeleton, PortalStatusBadge } from "@/components/portal/portal-shared"

const COLOR = "#eab308"

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

export default function WorkOrderDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [wo, setWo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [notes, setNotes] = useState("")
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => { if (id) load() }, [id])
  useEffect(() => { if (toast) setTimeout(() => setToast(null), 3000) }, [toast])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/work-orders/${id}`)
      const data = await res.json()
      const w = data.data ?? data
      if (w?.id) { setWo(w); setNotes(w.notes ?? "") }
    } catch {}
    setLoading(false)
  }

  async function updateStatus(newStatus: string) {
    if (!wo || updating) return
    setUpdating(true)
    try {
      await fetch(`/api/work-orders/tasks/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, notes }),
      })
      setWo({ ...wo, status: newStatus }); setToast("Status updated")
    } catch {}
    setUpdating(false)
  }

  async function saveNotes() {
    if (!wo || updating) return
    setUpdating(true)
    try {
      await fetch(`/api/work-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      })
      setToast("Notes saved")
    } catch {}
    setUpdating(false)
  }

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"

  if (loading) return (
    <div>
      <PortalPageHeader title="Work Order" color={COLOR} backHref="/portal/qc/work-orders" />
      <div className="mx-4 mt-4"><PortalSkeleton rows={7} /></div>
    </div>
  )

  if (!wo) return (
    <div>
      <PortalPageHeader title="Not Found" color={COLOR} backHref="/portal/qc/work-orders" />
      <div className="mx-4 mt-8 text-center"><p className="text-[14px]" style={{ color: "rgba(80,55,30,0.5)" }}>Work order not found</p></div>
    </div>
  )

  const staffName = wo.assigned_to ? [wo.assigned_to.first_name, wo.assigned_to.last_name].filter(Boolean).join(" ") || wo.assigned_to.email : "—"

  return (
    <div className="pb-6">
      <PortalPageHeader title={`WO-${wo.id?.slice(0, 6).toUpperCase()}`} subtitle={wo.work_type ?? "Work Order"} color={COLOR} backHref="/portal/qc/work-orders" />

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-white text-[12px] font-bold shadow-lg" style={{ background: COLOR }}>
          {toast}
        </div>
      )}

      <div className="flex gap-2 px-4 mt-4">
        <PortalStatusBadge status={wo.status ?? "pending"} />
        {wo.priority && (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold capitalize" style={{ background: wo.priority === "high" ? "#fef2f2" : "rgba(255,255,255,0.7)", color: wo.priority === "high" ? "#dc2626" : "rgba(80,55,30,0.5)", border: `1px solid ${wo.priority === "high" ? "#fecaca" : "rgba(255,255,255,0.95)"}` }}>
            {wo.priority} priority
          </span>
        )}
      </div>

      {/* Change Status */}
      <PortalSectionLabel label="Update Status" />
      <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
        <div className="p-3 flex gap-2 flex-wrap">
          {STATUSES.map(s => (
            <button key={s.value} onClick={() => updateStatus(s.value)} disabled={updating || wo.status === s.value}
              className="px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all"
              style={{ background: wo.status === s.value ? COLOR : "rgba(245,235,224,0.6)", color: wo.status === s.value ? "white" : "rgba(80,55,30,0.6)", border: `1px solid ${wo.status === s.value ? COLOR : "rgba(245,235,224,0.9)"}`, opacity: updating ? 0.6 : 1 }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Work Order Info */}
      <PortalSectionLabel label="Details" />
      <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
        <PortalInfoRow label="Type" value={wo.work_type ?? "—"} />
        <PortalInfoRow label="Product" value={wo.product?.name ?? "—"} />
        {wo.product?.category && <PortalInfoRow label="Category" value={wo.product.category} />}
        {wo.product?.barcode && <PortalInfoRow label="Barcode" value={wo.product.barcode} />}
        <PortalInfoRow label="Assigned To" value={staffName} />
        <PortalInfoRow label="Due Date" value={fmtDate(wo.due_date)} />
        <PortalInfoRow label="Created" value={fmtDate(wo.created_at)} />
      </div>

      {/* Notes */}
      <PortalSectionLabel label="Notes" />
      <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add inspection notes here..."
          rows={4}
          className="w-full p-4 bg-transparent outline-none text-[13px] resize-none"
          style={{ color: "#1e1208" }}
        />
        <div className="px-4 pb-3">
          <button onClick={saveNotes} disabled={updating} className="w-full py-2.5 rounded-xl text-[12px] font-bold text-white" style={{ background: COLOR, opacity: updating ? 0.7 : 1 }}>
            Save Notes
          </button>
        </div>
      </div>
    </div>
  )
}
