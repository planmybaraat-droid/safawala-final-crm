"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { PortalPageHeader, PortalSectionLabel, PortalInfoRow, PortalSkeleton, PortalStatusBadge } from "@/components/portal/portal-shared"

const COLOR = "#14b8a6"

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "dispatched", label: "Dispatched" },
  { value: "delivered", label: "Delivered" },
  { value: "failed", label: "Failed" },
]

export default function DeliveryDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [delivery, setDelivery] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [awb, setAwb] = useState("")
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => { if (id) load() }, [id])
  useEffect(() => { if (toast) setTimeout(() => setToast(null), 3000) }, [toast])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/deliveries/${id}`)
      const data = await res.json()
      const d = data.data ?? data
      if (d?.id) { setDelivery(d); setAwb(d.awb_number ?? "") }
    } catch {}
    setLoading(false)
  }

  async function updateStatus(newStatus: string) {
    if (!delivery || updating) return
    setUpdating(true)
    const updates: any = { status: newStatus }
    if (awb.trim()) updates.awb_number = awb.trim()
    if (newStatus === "dispatched") updates.dispatched_at = new Date().toISOString()
    if (newStatus === "delivered") updates.delivered_at = new Date().toISOString()
    try {
      const res = await fetch(`/api/deliveries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (res.ok) { setDelivery({ ...delivery, ...updates }); setToast(`Marked as ${newStatus}`) }
    } catch {}
    setUpdating(false)
  }

  async function saveAwb() {
    if (!delivery || updating || !awb.trim()) return
    setUpdating(true)
    try {
      await fetch(`/api/deliveries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ awb_number: awb.trim() }),
      })
      setToast("AWB saved")
    } catch {}
    setUpdating(false)
  }

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"
  const customer = delivery?.customer ?? delivery?.booking?.customer

  if (loading) return (
    <div>
      <PortalPageHeader title="Delivery" color={COLOR} backHref="/portal/delivery/deliveries" />
      <div className="mx-4 mt-4"><PortalSkeleton rows={7} /></div>
    </div>
  )

  if (!delivery) return (
    <div>
      <PortalPageHeader title="Not Found" color={COLOR} backHref="/portal/delivery/deliveries" />
      <div className="mx-4 mt-8 text-center"><p className="text-[14px]" style={{ color: "rgba(80,55,30,0.5)" }}>Delivery not found</p></div>
    </div>
  )

  return (
    <div className="pb-6">
      <PortalPageHeader
        title={delivery.awb_number ? `AWB: ${delivery.awb_number}` : `Delivery #${delivery.id?.slice(0, 6).toUpperCase()}`}
        subtitle={customer?.name ?? delivery.booking?.booking_number ?? ""}
        color={COLOR}
        backHref="/portal/delivery/deliveries"
      />

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-white text-[12px] font-bold shadow-lg" style={{ background: COLOR }}>
          {toast}
        </div>
      )}

      <div className="flex gap-2 px-4 mt-4">
        <PortalStatusBadge status={delivery.status ?? "pending"} />
        {delivery.courier && (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.95)", color: "rgba(80,55,30,0.5)" }}>
            {delivery.courier}
          </span>
        )}
      </div>

      {/* Status Actions */}
      <PortalSectionLabel label="Update Status" />
      <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
        <div className="p-3 flex gap-2 flex-wrap">
          {STATUSES.map(s => (
            <button key={s.value} onClick={() => updateStatus(s.value)} disabled={updating || delivery.status === s.value}
              className="px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap"
              style={{ background: delivery.status === s.value ? COLOR : "rgba(245,235,224,0.6)", color: delivery.status === s.value ? "white" : "rgba(80,55,30,0.6)", border: `1px solid ${delivery.status === s.value ? COLOR : "rgba(245,235,224,0.9)"}`, opacity: updating ? 0.6 : 1 }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* AWB Entry */}
      <PortalSectionLabel label="AWB / Tracking Number" />
      <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
        <div className="px-4 pt-3 pb-1">
          <input
            value={awb}
            onChange={e => setAwb(e.target.value)}
            placeholder="Enter AWB or tracking number..."
            className="w-full bg-transparent outline-none text-[14px] font-medium"
            style={{ color: "#1e1208" }}
          />
        </div>
        <div className="px-4 pb-3">
          <button onClick={saveAwb} disabled={updating || !awb.trim()} className="w-full py-2.5 rounded-xl text-[12px] font-bold text-white mt-2" style={{ background: COLOR, opacity: (!awb.trim() || updating) ? 0.5 : 1 }}>
            Save AWB
          </button>
        </div>
      </div>

      {/* Delivery Info */}
      <PortalSectionLabel label="Delivery Details" />
      <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
        <PortalInfoRow label="Booking #" value={delivery.booking?.booking_number ?? "—"} />
        <PortalInfoRow label="Courier" value={delivery.courier ?? "—"} />
        <PortalInfoRow label="AWB" value={delivery.awb_number ?? "—"} />
        <PortalInfoRow label="Dispatched" value={fmtDate(delivery.dispatched_at)} />
        <PortalInfoRow label="Delivered" value={fmtDate(delivery.delivered_at)} />
        <PortalInfoRow label="Event Date" value={fmtDate(delivery.booking?.event_date)} />
      </div>

      {/* Customer Info */}
      {customer && (
        <>
          <PortalSectionLabel label="Customer" />
          <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
            <PortalInfoRow label="Name" value={customer.name ?? "—"} />
            <PortalInfoRow label="Phone" value={customer.phone ?? "—"} />
            {customer.city && <PortalInfoRow label="City" value={customer.city} />}
            {customer.address && <PortalInfoRow label="Address" value={customer.address} />}
            {customer.phone && (
              <div className="p-3 border-t border-[rgba(245,235,224,0.8)] flex gap-2">
                <a href={`tel:${customer.phone}`} className="flex-1 py-2 rounded-xl text-center text-[12px] font-bold text-white" style={{ background: "#3b82f6" }}>Call</a>
                <a href={`https://wa.me/${(customer.whatsapp || customer.phone).replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex-1 py-2 rounded-xl text-center text-[12px] font-bold text-white" style={{ background: "#25d366" }}>WhatsApp</a>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
