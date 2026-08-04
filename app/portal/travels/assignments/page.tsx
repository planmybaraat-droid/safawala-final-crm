"use client"
import { useEffect, useState, useCallback } from "react"
import { PortalPageHeader } from "@/components/portal/portal-shared"
import { TravelsBottomNav } from "@/components/portal/travels-bottom-nav"

const COLOR = "#0891b2"

const STATUS_STEPS = [
  { key: "pending",       label: "Pending",       color: "#f59e0b" },
  { key: "ticket_booked", label: "Ticket Booked", color: "#3b82f6" },
  { key: "hotel_booked",  label: "Hotel Booked",  color: "#8b5cf6" },
  { key: "fully_booked",  label: "Fully Ready",   color: "#22c55e" },
  { key: "departed",      label: "Departed",      color: "#14b8a6" },
  { key: "returned",      label: "Returned",      color: "#6b7280" },
  { key: "cancelled",     label: "Cancelled",     color: "#ef4444" },
]

interface Stylist { id: string; name: string; phone?: string; department?: string }

interface EventRow {
  id: string
  order_number: string
  event_date: string
  event_type?: string
  venue?: string
  customer_name: string
  assigned_stylist?: Stylist | null
  travel: {
    id?: string; status?: string; stylist_id?: string;
    stylist?: Stylist; travel_mode?: string; ticket_ref?: string; pnr?: string; hotel_name?: string;
  } | null
}

export default function TravelsAssignmentsPage() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [stylists, setStylists] = useState<Stylist[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState("all")
  const [sheet, setSheet] = useState<{ event: EventRow; stylistId: string; status: string } | null>(null)

  const load = useCallback(async () => {
    const [evRes, stRes] = await Promise.all([
      fetch("/api/travel-bookings").then(r => r.json()).catch(() => ({ data: [] })),
      fetch("/api/users?role=stylist&limit=100").then(r => r.json()).catch(() => ({ data: [] })),
    ])
    setEvents(evRes.data ?? [])
    setStylists(stRes.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openSheet = (ev: EventRow) => {
    setSheet({ event: ev, stylistId: ev.travel?.stylist_id ?? ev.assigned_stylist?.id ?? "", status: ev.travel?.status ?? "pending" })
  }

  const saveAssignment = async () => {
    if (!sheet) return
    setSaving(sheet.event.id)
    try {
      const body: any = {
        booking_id: sheet.event.id, order_number: sheet.event.order_number,
        event_date: sheet.event.event_date, customer_name: sheet.event.customer_name,
        venue: sheet.event.venue, stylist_id: sheet.stylistId || null,
      }
      if (sheet.event.travel?.id) {
        await fetch("/api/travel-bookings", {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: sheet.event.travel.id, stylist_id: sheet.stylistId || null, status: sheet.status }),
        })
      } else {
        await fetch("/api/travel-bookings", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, status: sheet.status }),
        })
      }
      await load()
      setSheet(null)
    } catch { alert("Failed to save assignment") }
    finally { setSaving(null) }
  }

  const filtered = filterStatus === "all" ? events : events.filter(e => (e.travel?.status ?? "pending") === filterStatus)
  const statusInfo = (s: string) => STATUS_STEPS.find(x => x.key === s) ?? { label: s, color: "#6b7280" }

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", minHeight: "100vh", background: "#f5ebe0" }}>
      <PortalPageHeader title="Event Assignments" subtitle="Assign stylists · track travel status" color={COLOR} backHref="/portal/travels" />

      <div style={{ padding: "16px 16px 100px" }}>
        {/* Filter pills */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12, marginBottom: 12 }}>
          {[{ key: "all", label: "All" }, ...STATUS_STEPS].map(s => (
            <button key={s.key} onClick={() => setFilterStatus(s.key)} style={{
              padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", whiteSpace: "nowrap",
              fontSize: 12, fontWeight: 600, flexShrink: 0,
              background: filterStatus === s.key ? COLOR : "rgba(0,0,0,0.06)",
              color: filterStatus === s.key ? "white" : "rgba(30,18,8,0.6)",
            }}>
              {s.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 50, color: "rgba(30,18,8,0.4)", fontSize: 14 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: "white", borderRadius: 16, padding: "40px 20px", textAlign: "center", border: "1px solid rgba(0,0,0,0.06)", color: "rgba(30,18,8,0.4)", fontSize: 13 }}>
            No events found
          </div>
        ) : filtered.map((ev) => {
          const st = ev.travel?.status ?? "pending"
          const si = statusInfo(st)
          const stylist = ev.travel?.stylist ?? ev.assigned_stylist
          return (
            <div key={ev.id} onClick={() => openSheet(ev)} style={{
              background: "white", borderRadius: 16, padding: "15px 16px", marginBottom: 12,
              boxShadow: "0 1px 8px rgba(0,0,0,0.07)", border: "1px solid rgba(0,0,0,0.06)", cursor: "pointer",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#1e1208" }}>{ev.customer_name}</div>
                  <div style={{ fontSize: 11, color: "rgba(30,18,8,0.45)", marginTop: 2 }}>#{ev.order_number} · {ev.event_date}</div>
                  {ev.venue && <div style={{ fontSize: 11, color: "rgba(30,18,8,0.5)", marginTop: 1 }}>{ev.venue}</div>}
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "white", background: si.color, borderRadius: 20, padding: "3px 10px" }}>
                      {si.label}
                    </div>
                    {stylist ? (
                      <div style={{ fontSize: 11, color: COLOR, fontWeight: 600 }}>{stylist.name}</div>
                    ) : (
                      <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}>No stylist assigned</div>
                    )}
                  </div>
                  {ev.travel?.pnr && (
                    <div style={{ fontSize: 11, color: "rgba(30,18,8,0.4)", marginTop: 4 }}>PNR: {ev.travel.pnr}</div>
                  )}
                </div>
                <div style={{ color: COLOR, fontSize: 18, marginLeft: 10 }}>›</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Assignment Bottom Sheet */}
      {sheet && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
          zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center",
        }} onClick={e => { if (e.target === e.currentTarget) setSheet(null) }}>
          <div style={{
            background: "white", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 520,
            padding: "0 0 40px", maxHeight: "85vh", overflowY: "auto",
          }}>
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 6px" }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(0,0,0,0.15)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 20px 16px" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#1e1208" }}>Assign Stylist</div>
                <div style={{ fontSize: 11, color: "rgba(30,18,8,0.45)", marginTop: 2 }}>
                  {sheet.event.customer_name} · {sheet.event.event_date}
                </div>
              </div>
              <button onClick={() => setSheet(null)} style={{
                width: 32, height: 32, borderRadius: "50%", border: "none", cursor: "pointer",
                background: "rgba(0,0,0,0.08)", fontSize: 18, color: "#1e1208",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>×</button>
            </div>
            <div style={{ padding: "0 20px" }}>
              {/* Stylist picker */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 0.6, color: "rgba(80,55,30,0.5)", display: "block", marginBottom: 6 }}>
                  Assigned Stylist
                </label>
                <select
                  value={sheet.stylistId}
                  onChange={e => setSheet(s => s ? { ...s, stylistId: e.target.value } : null)}
                  style={{ width: "100%", height: 44, borderRadius: 12, border: "1.5px solid #e2e8f0", padding: "0 12px", fontSize: 13, outline: "none", background: "white", color: "#1e1208" }}
                >
                  <option value="">— No stylist —</option>
                  {stylists.map(s => (
                    <option key={s.id} value={s.id}>{s.name}{s.phone ? ` (${s.phone})` : ""}</option>
                  ))}
                </select>
              </div>

              {/* Status picker */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 0.6, color: "rgba(80,55,30,0.5)", display: "block", marginBottom: 8 }}>
                  Travel Status
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {STATUS_STEPS.map(s => (
                    <button key={s.key} onClick={() => setSheet(prev => prev ? { ...prev, status: s.key } : null)} style={{
                      padding: "10px 12px", borderRadius: 12,
                      border: `2px solid ${sheet.status === s.key ? s.color : "transparent"}`,
                      cursor: "pointer", fontSize: 12, fontWeight: 700, textAlign: "center",
                      background: sheet.status === s.key ? `${s.color}18` : "rgba(0,0,0,0.04)",
                      color: sheet.status === s.key ? s.color : "rgba(30,18,8,0.5)",
                    }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={saveAssignment} disabled={!!saving} style={{
                width: "100%", height: 50, borderRadius: 14, border: "none", cursor: "pointer",
                background: saving ? "rgba(0,0,0,0.1)" : COLOR, color: "white", fontSize: 15, fontWeight: 700,
              }}>
                {saving ? "Saving…" : "Save Assignment"}
              </button>

              <a href={`/portal/travels/tickets?id=${sheet.event.id}`} style={{
                display: "block", marginTop: 10, textAlign: "center", fontSize: 13,
                color: COLOR, fontWeight: 600, padding: 10, textDecoration: "none",
              }}>
                Book Tickets / Hotel →
              </a>
            </div>
          </div>
        </div>
      )}

      <TravelsBottomNav />
    </div>
  )
}
