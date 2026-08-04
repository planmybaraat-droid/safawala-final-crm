"use client"
import { useEffect, useState } from "react"
import { PortalPageHeader } from "@/components/portal/portal-shared"
import { TravelsBottomNav } from "@/components/portal/travels-bottom-nav"

const COLOR = "#0891b2"

const STATUS_COLOR: Record<string, string> = {
  pending: "#f59e0b", ticket_booked: "#3b82f6", hotel_booked: "#8b5cf6",
  fully_booked: "#22c55e", departed: "#14b8a6", returned: "#6b7280", cancelled: "#ef4444",
}
const STATUS_LABEL: Record<string, string> = {
  pending: "Pending", ticket_booked: "Ticket Booked", hotel_booked: "Hotel Booked",
  fully_booked: "Fully Ready", departed: "Departed", returned: "Returned", cancelled: "Cancelled",
}

interface StylistGroup {
  id: string; name: string; phone?: string
  events: any[]
}

export default function TravelsStylistsPage() {
  const [groups, setGroups] = useState<StylistGroup[]>([])
  const [unassigned, setUnassigned] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/travel-bookings").then(r => r.json()).catch(() => ({ data: [] })),
      fetch("/api/users?role=stylist&limit=100").then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([evRes, stRes]) => {
      const events: any[] = evRes.data ?? []
      const stylists: any[] = stRes.data ?? []
      const map: Record<string, StylistGroup> = {}
      const none: any[] = []

      for (const ev of events) {
        const t = ev.travel
        const stylistId = t?.stylist_id ?? null
        const stylist = t?.stylist ?? ev.assigned_stylist
        if (!stylistId || !stylist) { none.push(ev); continue }
        if (!map[stylistId]) map[stylistId] = { id: stylistId, name: stylist.name, phone: stylist.phone, events: [] }
        map[stylistId].events.push(ev)
      }
      for (const s of stylists) {
        if (!map[s.id]) map[s.id] = { id: s.id, name: s.name, phone: s.phone, events: [] }
      }

      setGroups(Object.values(map).sort((a, b) => b.events.length - a.events.length))
      setUnassigned(none)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", minHeight: "100vh", background: "#f5ebe0" }}>
        <PortalPageHeader title="Stylists" color={COLOR} backHref="/portal/travels" />
        <div style={{ padding: 60, textAlign: "center", color: "rgba(30,18,8,0.4)", fontSize: 14 }}>Loading...</div>
        <TravelsBottomNav />
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", minHeight: "100vh", background: "#f5ebe0" }}>
      <PortalPageHeader title="Stylists" subtitle="Travel overview & upcoming events" color={COLOR} backHref="/portal/travels" />

      <div style={{ padding: "16px 16px 100px" }}>
        {/* Unassigned warning */}
        {unassigned.length > 0 && (
          <div style={{ background: "#fef3c7", borderRadius: 14, padding: "12px 16px", marginBottom: 16, border: "1.5px solid #fcd34d" }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#92400e" }}>
              {unassigned.length} Event{unassigned.length > 1 ? "s" : ""} Without Stylist
            </div>
            {unassigned.slice(0, 3).map(ev => (
              <div key={ev.id} style={{ fontSize: 11, color: "#92400e", marginTop: 4 }}>
                • {ev.customer_name} · {ev.event_date}
              </div>
            ))}
            {unassigned.length > 3 && <div style={{ fontSize: 11, color: "#92400e", marginTop: 4 }}>+ {unassigned.length - 3} more</div>}
            <a href="/portal/travels/assignments" style={{ display: "inline-block", marginTop: 8, fontSize: 12, fontWeight: 700, color: COLOR, textDecoration: "none" }}>
              Assign now →
            </a>
          </div>
        )}

        {/* Stylist cards */}
        {groups.map(group => {
          const isOpen = expanded === group.id
          const upcoming = group.events.filter(e => {
            const d = e.event_date ? new Date(e.event_date) : null
            return d && d >= new Date()
          })
          return (
            <div key={group.id} style={{ background: "white", borderRadius: 16, marginBottom: 12, boxShadow: "0 1px 8px rgba(0,0,0,0.07)", border: "1px solid rgba(0,0,0,0.06)", overflow: "hidden" }}>
              <div onClick={() => setExpanded(isOpen ? null : group.id)} style={{ padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${COLOR}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: COLOR }}>
                    {group.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#1e1208" }}>{group.name}</div>
                    {group.phone && <div style={{ fontSize: 11, color: "rgba(30,18,8,0.45)", marginTop: 1 }}>{group.phone}</div>}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: COLOR, background: `${COLOR}15`, borderRadius: 20, padding: "3px 10px" }}>
                    {upcoming.length} upcoming
                  </div>
                  <div style={{ color: "rgba(30,18,8,0.4)", fontSize: 18 }}>{isOpen ? "▾" : "›"}</div>
                </div>
              </div>

              {isOpen && (
                <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                  {group.events.length === 0 ? (
                    <div style={{ padding: "16px 20px", fontSize: 12, color: "rgba(30,18,8,0.4)" }}>No events assigned yet</div>
                  ) : group.events.map(ev => {
                    const st = ev.travel?.status ?? "pending"
                    return (
                      <div key={ev.id} style={{ padding: "12px 16px", borderBottom: "1px solid rgba(0,0,0,0.04)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#1e1208" }}>{ev.customer_name}</div>
                          <div style={{ fontSize: 11, color: "rgba(30,18,8,0.45)", marginTop: 1 }}>{ev.event_date} · {ev.venue ?? "—"}</div>
                          {ev.travel?.departure_from && (
                            <div style={{ fontSize: 11, color: "rgba(30,18,8,0.4)", marginTop: 2 }}>
                              {ev.travel.departure_from} → {ev.travel.arrival_at}
                              {ev.travel.departure_date ? ` on ${ev.travel.departure_date}` : ""}
                            </div>
                          )}
                          {ev.travel?.hotel_name && <div style={{ fontSize: 11, color: "rgba(30,18,8,0.4)", marginTop: 1 }}>Hotel: {ev.travel.hotel_name}</div>}
                        </div>
                        <div style={{
                          fontSize: 10, fontWeight: 700, color: STATUS_COLOR[st] ?? "#6b7280",
                          background: `${STATUS_COLOR[st] ?? "#6b7280"}18`, borderRadius: 20, padding: "3px 8px", whiteSpace: "nowrap", marginLeft: 8,
                        }}>
                          {STATUS_LABEL[st] ?? st}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <TravelsBottomNav />
    </div>
  )
}
