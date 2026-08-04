"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { PortalIcon } from "@/components/portal/portal-icons"

const COLOR = "#0891b2"

interface Stats {
  total: number
  pending: number
  ticket_booked: number
  hotel_booked: number
  fully_booked: number
  departed: number
  returned: number
}

export default function TravelsHomePage() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<Stats>({
    total: 0, pending: 0, ticket_booked: 0, hotel_booked: 0,
    fully_booked: 0, departed: 0, returned: 0,
  })
  const [upcoming, setUpcoming] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const raw = localStorage.getItem("safawala_user")
    if (raw) try { setUser(JSON.parse(raw)) } catch {}
  }, [])

  useEffect(() => {
    fetch("/api/travel-bookings")
      .then(r => r.json())
      .then(({ data = [] }) => {
        const s: Stats = {
          total: data.length, pending: 0, ticket_booked: 0, hotel_booked: 0,
          fully_booked: 0, departed: 0, returned: 0,
        }
        for (const row of data) {
          const st = row.travel?.status ?? "pending"
          if (st in s) (s as any)[st]++
          else s.pending++
        }
        setStats(s)
        setUpcoming(data.filter((r: any) => {
          const d = r.event_date ? new Date(r.event_date) : null
          return d && d >= new Date()
        }).slice(0, 5))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const statCards = [
    { label: "Total", value: stats.total, color: "#6366f1" },
    { label: "Pending", value: stats.pending, color: "#f59e0b" },
    { label: "Ticket", value: stats.ticket_booked, color: "#3b82f6" },
    { label: "Hotel", value: stats.hotel_booked, color: "#8b5cf6" },
    { label: "Ready", value: stats.fully_booked, color: "#22c55e" },
    { label: "Departed", value: stats.departed, color: "#14b8a6" },
  ]

  const greeting = (() => {
    const h = new Date().getHours()
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
  })()

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", minHeight: "100vh", background: "#f5ebe0" }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, #0c4a6e, ${COLOR})`, padding: "24px 20px 20px", color: "white" }}>
        <p style={{ margin: "0 0 4px", fontSize: 12, opacity: 0.75 }}>{greeting}</p>
        <h1 style={{ margin: "0 0 2px", fontSize: 22, fontWeight: 900 }}>
          {user?.name?.split(" ")[0] ?? "Travel Coordinator"}
        </h1>
        <p style={{ margin: 0, fontSize: 11, opacity: 0.65 }}>
          Travel Portal · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
        </p>
      </div>

      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", background: "white", borderBottom: "1px solid #f1f5f9" }}>
        {statCards.map(sc => (
          <div key={sc.label} style={{ padding: "12px 6px", textAlign: "center", borderRight: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: sc.color }}>{loading ? "—" : sc.value}</div>
            <div style={{ fontSize: 9, color: "rgba(80,55,30,0.45)", fontWeight: 700, letterSpacing: 0.3, marginTop: 2 }}>
              {sc.label.toUpperCase()}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: "20px 16px 100px" }}>
        {/* Modules grid */}
        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(30,18,8,0.4)", marginBottom: 12, letterSpacing: 0.6 }}>
          MODULES
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          {[
            { href: "/portal/travels/assignments", icon: "calendar", label: "Assignments",   sub: "Assign stylists to events",    color: "#0891b2" },
            { href: "/portal/travels/tickets",     icon: "map-pin",  label: "Tickets",       sub: "Train & hotel booking",        color: "#0284c7" },
            { href: "/portal/travels/stylists",    icon: "team",     label: "Stylists",      sub: "Stylist travel overview",      color: "#06b6d4" },
            { href: "/portal/travels/profile",     icon: "user",     label: "My Profile",    sub: "Account settings",             color: "#0e7490" },
          ].map(m => (
            <Link key={m.href} href={m.href} style={{ textDecoration: "none" }}>
              <div style={{
                background: "white", borderRadius: 18, padding: "18px 16px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.07)", border: "1px solid rgba(0,0,0,0.06)",
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, background: `${m.color}18`,
                  display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
                }}>
                  <PortalIcon name={m.icon} size={20} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#1e1208" }}>{m.label}</div>
                <div style={{ fontSize: 11, color: "rgba(30,18,8,0.45)", marginTop: 3 }}>{m.sub}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Upcoming events */}
        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(30,18,8,0.4)", marginBottom: 12, letterSpacing: 0.6 }}>
          UPCOMING EVENTS
        </div>
        {loading ? (
          <div style={{ textAlign: "center", padding: 30, color: "rgba(30,18,8,0.4)", fontSize: 13 }}>Loading...</div>
        ) : upcoming.length === 0 ? (
          <div style={{
            background: "white", borderRadius: 14, padding: "24px 20px", textAlign: "center",
            border: "1px solid rgba(0,0,0,0.06)", color: "rgba(30,18,8,0.4)", fontSize: 13,
          }}>
            No upcoming events
          </div>
        ) : upcoming.map((ev: any) => {
          const travel = ev.travel
          const status = travel?.status ?? "pending"
          const statusColor: Record<string, string> = {
            pending: "#f59e0b", ticket_booked: "#3b82f6", hotel_booked: "#8b5cf6",
            fully_booked: "#22c55e", departed: "#14b8a6", returned: "#6b7280", cancelled: "#ef4444",
          }
          const statusLabel: Record<string, string> = {
            pending: "Pending", ticket_booked: "Ticket Booked", hotel_booked: "Hotel Booked",
            fully_booked: "Fully Ready", departed: "Departed", returned: "Returned", cancelled: "Cancelled",
          }
          return (
            <Link key={ev.id} href={`/portal/travels/assignments`} style={{ textDecoration: "none" }}>
              <div style={{
                background: "white", borderRadius: 14, padding: "14px 16px", marginBottom: 10,
                boxShadow: "0 1px 6px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)",
                display: "flex", justifyContent: "space-between", alignItems: "flex-start",
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1e1208" }}>{ev.customer_name}</div>
                  <div style={{ fontSize: 11, color: "rgba(30,18,8,0.5)", marginTop: 2 }}>
                    {ev.event_date} · {ev.venue ?? "Venue TBD"}
                  </div>
                  {travel?.stylist?.name && (
                    <div style={{ fontSize: 11, color: COLOR, marginTop: 3, fontWeight: 600 }}>
                      Stylist: {travel.stylist.name}
                    </div>
                  )}
                </div>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: statusColor[status] ?? "#f59e0b",
                  background: `${statusColor[status] ?? "#f59e0b"}18`, borderRadius: 20,
                  padding: "3px 10px", whiteSpace: "nowrap", marginLeft: 10,
                }}>
                  {statusLabel[status] ?? status}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Bottom nav */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480,
        background: "white", borderTop: "1px solid rgba(0,0,0,0.08)",
        display: "flex", paddingBottom: "env(safe-area-inset-bottom, 0px)",
        zIndex: 40,
      }}>
        {[
          { href: "/portal/travels",             icon: "home",    label: "Home" },
          { href: "/portal/travels/assignments", icon: "calendar",label: "Events" },
          { href: "/portal/travels/tickets",     icon: "map-pin", label: "Tickets" },
          { href: "/portal/travels/stylists",    icon: "team",    label: "Stylists" },
          { href: "/portal/travels/profile",     icon: "user",    label: "Me" },
        ].map(tab => {
          const isActive = typeof window !== "undefined" && window.location.pathname === tab.href
          return (
            <Link key={tab.href} href={tab.href} style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              padding: "10px 4px 8px", textDecoration: "none", gap: 3,
              color: isActive ? COLOR : "rgba(30,18,8,0.35)",
            }}>
              <PortalIcon name={tab.icon} size={22} />
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.3 }}>{tab.label.toUpperCase()}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
