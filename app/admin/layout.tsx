"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"

const GOLD = "#c9a84c"
const BROWN = "#3d1c02"
const CREAM = "#fdf6ed"
const WARM = "#f5ebe0"
const BORDER = "rgba(201,168,76,0.2)"

const SVGS = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </svg>
  ),
  franchises: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="9" x2="15" y2="15" />
    </svg>
  ),
  territories: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  enquiries: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  billing: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <circle cx="12" cy="14" r="2" />
      <path d="M12 12v2" />
    </svg>
  ),
  finance: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <line x1="12" y1="4" x2="12" y2="20" />
      <line x1="2" y1="12" x2="22" y2="12" />
    </svg>
  ),
  legals: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  ),
  staff: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  ),
  reports: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  link: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: SVGS.dashboard, exact: true },
  { href: "/admin/franchises", label: "Franchises", icon: SVGS.franchises },
  { href: "/admin/territories", label: "Territories", icon: SVGS.territories },
  { href: "/admin/enquiries", label: "Enquiries", icon: SVGS.enquiries },
  { href: "/admin/billing", label: "Franchise Billing", icon: SVGS.billing },
  { href: "/admin/finance", label: "Payments", icon: SVGS.finance },
  { href: "/admin/legals", label: "Legals", icon: SVGS.legals },
  { href: "/admin/staff", label: "Staff", icon: SVGS.staff },
  { href: "/admin/reports", label: "Reports", icon: SVGS.reports },
  { href: "/admin/system-health", label: "System Health", icon: SVGS.reports },
  { href: "/admin/cleanup", label: "Data Cleanup", icon: SVGS.settings },
  { href: "/admin/settings", label: "Settings", icon: SVGS.settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Initialize state synchronously to avoid loading spinner flashes
  const [user, setUser] = useState<any>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("safawala_user")
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed?.role === "super_admin") return parsed
        }
      } catch {}
    }
    return null
  })

  const [ready, setReady] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("safawala_user")
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed?.role === "super_admin") return true
        }
      } catch {}
    }
    return false
  })

  useEffect(() => {
    const raw = localStorage.getItem("safawala_user")
    if (!raw) {
      router.replace("/auth/login")
      return
    }
    try {
      const u = JSON.parse(raw)
      if (u.role !== "super_admin") {
        router.replace(`/portal/${u.department || "booking"}`)
        return
      }
      setUser(u)
      setReady(true)
    } catch {
      router.replace("/auth/login")
    }
  }, [router])

  // Close sidebar drawer on link changes in mobile
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const handleLogout = () => {
    localStorage.removeItem("safawala_user")
    document.cookie = "safawala_user=; path=/; max-age=0"
    router.replace("/auth/login")
  }

  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: WARM }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid rgba(201,168,76,0.2)`, borderTopColor: GOLD, animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  const sidebarContent = (
    <div style={{
      width: "100%", height: "100%", background: BROWN, display: "flex",
      flexDirection: "column",
    }}>
      {/* Logo */}
      <div style={{ padding: "22px 20px 16px", borderBottom: "1px solid rgba(201,168,76,0.15)" }}>
        <img src="/safawalalogo.svg" alt="Safawala" style={{ height: 32, objectFit: "contain", filter: "brightness(0) invert(1)" }} />
        <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(201,168,76,0.7)", letterSpacing: "0.12em", marginTop: 8, textTransform: "uppercase" }}>
          Super Admin Panel
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "8px 10px 6px" }}>
          Navigation
        </div>
        {NAV_ITEMS.map(item => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 12px", borderRadius: 9, margin: "2px 0",
              background: active ? "rgba(201,168,76,0.18)" : "transparent",
              border: active ? "1px solid rgba(201,168,76,0.25)" : "1px solid transparent",
              textDecoration: "none",
            }}>
              <span style={{ display: "flex", alignItems: "center", color: active ? GOLD : "rgba(255,255,255,0.4)" }}>
                {item.icon}
              </span>
              <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? GOLD : "rgba(255,255,255,0.6)" }}>
                {item.label}
              </span>
            </Link>
          )
        })}

        <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "16px 10px 6px" }}>
          Links
        </div>
        <a href="/franchise-enquiry" target="_blank" style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "9px 12px", borderRadius: 9, textDecoration: "none",
        }}>
          <span style={{ display: "flex", alignItems: "center", color: "rgba(255,255,255,0.4)" }}>{SVGS.link}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Enquiry Page ↗</span>
        </a>
      </nav>

      {/* User */}
      <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(201,168,76,0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
            background: `linear-gradient(135deg, ${GOLD}, #8b6914)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: "#fff",
          }}>
            {user?.name?.[0] || "S"}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name || "Super Admin"}</div>
            <div style={{ fontSize: 10, color: GOLD }}>Super Admin</div>
          </div>
        </div>
        <button onClick={handleLogout} style={{
          width: "100%", padding: "7px", borderRadius: 8, border: "1px solid rgba(201,168,76,0.2)",
          background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", fontSize: 11,
          cursor: "pointer", letterSpacing: "0.02em",
        }}>
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: WARM, fontFamily: "system-ui,-apple-system,sans-serif" }}>

      {/* Sidebar - Desktop view */}
      <div className="desktop-sidebar" style={{
        width: 220, flexShrink: 0, background: BROWN, display: "flex",
        flexDirection: "column", position: "sticky", top: 0, height: "100vh",
      }}>
        {sidebarContent}
      </div>

      {/* Mobile top bar */}
      <div className="mobile-topbar" style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 56, background: BROWN,
        borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "0 16px", zIndex: 90,
      }}>
        <button onClick={() => setSidebarOpen(true)} style={{
          background: "none", border: "none", color: GOLD, cursor: "pointer", padding: 4, display: "flex", alignItems: "center"
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <img src="/safawalalogo.svg" alt="Safawala" style={{ height: 26, objectFit: "contain", filter: "brightness(0) invert(1)" }} />
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: `linear-gradient(135deg, ${GOLD}, #8b6914)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, color: "#fff",
        }}>
          {user?.name?.[0] || "S"}
        </div>
      </div>

      {/* Sidebar Drawer - Mobile view */}
      {sidebarOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 110, display: "flex" }}>
          {/* Backdrop overlay */}
          <div onClick={() => setSidebarOpen(false)} style={{
            position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(2px)",
          }} />
          {/* Drawer content */}
          <div style={{
            position: "relative", width: 220, height: "100%", background: BROWN,
            boxShadow: "4px 0 20px rgba(0,0,0,0.3)", animation: "slideRight 0.2s ease-out",
          }}>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="main-content-layout" style={{ flex: 1, minWidth: 0 }}>
        {children}
      </div>

      {/* Device Responsive Styling Utilities */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideRight {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        
        /* Desktop styles defaults */
        .mobile-topbar {
          display: none !important;
        }
        
        /* Mobile & Tablet styles overrides */
        @media (max-width: 768px) {
          .desktop-sidebar {
            display: none !important;
          }
          .mobile-topbar {
            display: flex !important;
          }
          .main-content-layout {
            padding-top: 56px !important;
          }
        }
      `}</style>
    </div>
  )
}
