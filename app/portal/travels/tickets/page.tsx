"use client"
import { useEffect, useState, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { PortalPageHeader } from "@/components/portal/portal-shared"
import { TravelsBottomNav } from "@/components/portal/travels-bottom-nav"

const COLOR = "#0891b2"

const TRAVEL_MODES = [
  { key: "train",      label: "Train" },
  { key: "flight",     label: "Flight" },
  { key: "bus",        label: "Bus" },
  { key: "cab",        label: "Cab" },
  { key: "self_drive", label: "Self Drive" },
]

const emptyForm = {
  travel_mode: "train", ticket_ref: "", pnr: "", departure_from: "", arrival_at: "",
  departure_date: "", departure_time: "", return_date: "", return_time: "",
  hotel_name: "", hotel_address: "", hotel_checkin: "", hotel_checkout: "",
  hotel_ref: "", hotel_contact: "", ticket_cost: "", hotel_cost: "",
  other_cost: "", advance_given: "", notes: "",
}

function TicketsPageInner() {
  const searchParams = useSearchParams()
  const preselectedId = searchParams.get("id")

  const [events, setEvents] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState("")
  const [form, setForm] = useState({ ...emptyForm })

  const load = useCallback(async () => {
    const res = await fetch("/api/travel-bookings").then(r => r.json()).catch(() => ({ data: [] }))
    setEvents(res.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (preselectedId && events.length > 0) {
      const ev = events.find(e => e.id === preselectedId)
      if (ev) selectEvent(ev)
    }
  }, [preselectedId, events])

  const selectEvent = (ev: any) => {
    setSelected(ev)
    const t = ev.travel ?? {}
    setForm({
      travel_mode: t.travel_mode ?? "train", ticket_ref: t.ticket_ref ?? "", pnr: t.pnr ?? "",
      departure_from: t.departure_from ?? "", arrival_at: t.arrival_at ?? "",
      departure_date: t.departure_date ?? "", departure_time: t.departure_time ?? "",
      return_date: t.return_date ?? "", return_time: t.return_time ?? "",
      hotel_name: t.hotel_name ?? "", hotel_address: t.hotel_address ?? "",
      hotel_checkin: t.hotel_checkin ?? "", hotel_checkout: t.hotel_checkout ?? "",
      hotel_ref: t.hotel_ref ?? "", hotel_contact: t.hotel_contact ?? "",
      ticket_cost: t.ticket_cost?.toString() ?? "", hotel_cost: t.hotel_cost?.toString() ?? "",
      other_cost: t.other_cost?.toString() ?? "", advance_given: t.advance_given?.toString() ?? "",
      notes: t.notes ?? "",
    })
  }

  const set = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const body: any = {
        booking_id: selected.id, order_number: selected.order_number,
        event_date: selected.event_date, customer_name: selected.customer_name,
        venue: selected.venue, stylist_id: selected.travel?.stylist_id ?? null,
        ...form,
        ticket_cost: parseFloat(form.ticket_cost) || 0,
        hotel_cost: parseFloat(form.hotel_cost) || 0,
        other_cost: parseFloat(form.other_cost) || 0,
        advance_given: parseFloat(form.advance_given) || 0,
      }
      let method = "POST"
      if (selected.travel?.id) { method = "PATCH"; body.id = selected.travel.id }
      const res = await fetch("/api/travel-bookings", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? "Save failed")
      setToast("Saved!")
      setTimeout(() => setToast(""), 3000)
      await load()
    } catch (err: any) {
      alert("Failed to save: " + err.message)
    } finally { setSaving(false) }
  }

  const lbl: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6,
    color: "rgba(80,55,30,0.5)", display: "block", marginBottom: 5,
  }
  const inp: React.CSSProperties = {
    width: "100%", height: 44, borderRadius: 12, border: "1.5px solid #e2e8f0",
    padding: "0 14px", fontSize: 13, outline: "none", background: "white",
    color: "#1e1208", fontFamily: "inherit", boxSizing: "border-box",
  }

  const totalCost = (parseFloat(form.ticket_cost) || 0) + (parseFloat(form.hotel_cost) || 0) + (parseFloat(form.other_cost) || 0)
  const balance = totalCost - (parseFloat(form.advance_given) || 0)

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", minHeight: "100vh", background: "#f5ebe0" }}>
      <PortalPageHeader title="Ticket & Hotel Booking" subtitle="Enter travel details per event" color={COLOR} backHref="/portal/travels" />

      <div style={{ padding: "16px 16px 100px" }}>
        {/* Event picker */}
        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>Select Event</label>
          {loading ? (
            <div style={{ padding: 20, textAlign: "center", color: "rgba(30,18,8,0.4)", fontSize: 13 }}>Loading...</div>
          ) : (
            <select value={selected?.id ?? ""} onChange={e => { const ev = events.find(x => x.id === e.target.value); if (ev) selectEvent(ev) }} style={{ ...inp }}>
              <option value="">— Choose an event —</option>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.event_date} · {ev.customer_name} ({ev.order_number})</option>)}
            </select>
          )}
        </div>

        {selected && (
          <>
            {/* Event info */}
            <div style={{ background: `${COLOR}12`, borderRadius: 14, padding: "14px 16px", marginBottom: 16, border: `1.5px solid ${COLOR}30` }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#1e1208" }}>{selected.customer_name}</div>
              <div style={{ fontSize: 11, color: "rgba(30,18,8,0.5)", marginTop: 2 }}>{selected.event_date} · {selected.venue ?? "Venue TBD"}</div>
              {selected.travel?.stylist?.name && <div style={{ fontSize: 11, color: COLOR, fontWeight: 600, marginTop: 3 }}>Stylist: {selected.travel.stylist.name}</div>}
            </div>

            {/* Travel mode */}
            <div style={{ fontSize: 11, fontWeight: 800, color: COLOR, marginBottom: 10, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Travel Mode</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              {TRAVEL_MODES.map(m => (
                <button key={m.key} onClick={() => setForm(f => ({ ...f, travel_mode: m.key }))} style={{
                  padding: "8px 16px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                  background: form.travel_mode === m.key ? COLOR : "rgba(0,0,0,0.06)",
                  color: form.travel_mode === m.key ? "white" : "rgba(30,18,8,0.6)",
                }}>{m.label}</button>
              ))}
            </div>

            {/* Ticket details */}
            <div style={{ fontSize: 11, fontWeight: 800, color: COLOR, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Ticket Details</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={lbl}>Ticket Ref</label><input style={inp} placeholder="Ticket number" value={form.ticket_ref} onChange={set("ticket_ref")} /></div>
              <div><label style={lbl}>PNR Number</label><input style={inp} placeholder="PNR" value={form.pnr} onChange={set("pnr")} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={lbl}>Departure From</label><input style={inp} placeholder="City / Station" value={form.departure_from} onChange={set("departure_from")} /></div>
              <div><label style={lbl}>Arrival At</label><input style={inp} placeholder="City / Station" value={form.arrival_at} onChange={set("arrival_at")} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={lbl}>Departure Date</label><input type="date" style={inp} value={form.departure_date} onChange={set("departure_date")} /></div>
              <div><label style={lbl}>Departure Time</label><input type="time" style={inp} value={form.departure_time} onChange={set("departure_time")} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div><label style={lbl}>Return Date</label><input type="date" style={inp} value={form.return_date} onChange={set("return_date")} /></div>
              <div><label style={lbl}>Return Time</label><input type="time" style={inp} value={form.return_time} onChange={set("return_time")} /></div>
            </div>

            {/* Hotel details */}
            <div style={{ fontSize: 11, fontWeight: 800, color: COLOR, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Hotel Details</div>
            <div style={{ marginBottom: 12 }}><label style={lbl}>Hotel Name</label><input style={inp} placeholder="Hotel name" value={form.hotel_name} onChange={set("hotel_name")} /></div>
            <div style={{ marginBottom: 12 }}><label style={lbl}>Hotel Address</label><input style={inp} placeholder="Full address" value={form.hotel_address} onChange={set("hotel_address")} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={lbl}>Check-in</label><input type="date" style={inp} value={form.hotel_checkin} onChange={set("hotel_checkin")} /></div>
              <div><label style={lbl}>Check-out</label><input type="date" style={inp} value={form.hotel_checkout} onChange={set("hotel_checkout")} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div><label style={lbl}>Booking Ref</label><input style={inp} placeholder="Booking ID" value={form.hotel_ref} onChange={set("hotel_ref")} /></div>
              <div><label style={lbl}>Hotel Contact</label><input style={inp} placeholder="Phone number" value={form.hotel_contact} onChange={set("hotel_contact")} /></div>
            </div>

            {/* Budget */}
            <div style={{ fontSize: 11, fontWeight: 800, color: COLOR, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Budget</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={lbl}>Ticket Cost (₹)</label><input type="number" style={inp} placeholder="0" value={form.ticket_cost} onChange={set("ticket_cost")} /></div>
              <div><label style={lbl}>Hotel Cost (₹)</label><input type="number" style={inp} placeholder="0" value={form.hotel_cost} onChange={set("hotel_cost")} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={lbl}>Other Cost (₹)</label><input type="number" style={inp} placeholder="0" value={form.other_cost} onChange={set("other_cost")} /></div>
              <div><label style={lbl}>Advance Given (₹)</label><input type="number" style={inp} placeholder="0" value={form.advance_given} onChange={set("advance_given")} /></div>
            </div>

            {/* Cost summary */}
            <div style={{ background: "rgba(0,0,0,0.04)", borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <div style={{ fontSize: 12, color: "rgba(30,18,8,0.5)" }}>Total Cost</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1e1208", textAlign: "right" }}>₹{totalCost.toFixed(2)}</div>
              <div style={{ fontSize: 12, color: "rgba(30,18,8,0.5)" }}>Advance Given</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#22c55e", textAlign: "right" }}>₹{(parseFloat(form.advance_given) || 0).toFixed(2)}</div>
              <div style={{ fontSize: 12, color: "rgba(30,18,8,0.5)" }}>Balance Due</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: balance > 0 ? "#ef4444" : "#22c55e", textAlign: "right" }}>₹{balance.toFixed(2)}</div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any special instructions..."
                style={{ ...inp, height: 72, padding: "10px 14px", resize: "vertical" } as any}
              />
            </div>

            <button onClick={save} disabled={saving} style={{
              width: "100%", height: 50, borderRadius: 14, border: "none", cursor: "pointer",
              background: saving ? "rgba(0,0,0,0.1)" : COLOR, color: "white", fontSize: 15, fontWeight: 700,
            }}>
              {saving ? "Saving…" : "Save Ticket & Hotel Details"}
            </button>
          </>
        )}
      </div>

      {toast && (
        <div style={{
          position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
          background: "#22c55e", color: "white", padding: "10px 24px", borderRadius: 24,
          fontSize: 13, fontWeight: 700, zIndex: 100, boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        }}>
          {toast}
        </div>
      )}

      <TravelsBottomNav />
    </div>
  )
}

export default function TravelsTicketsPage() {
  return <Suspense><TicketsPageInner /></Suspense>
}
