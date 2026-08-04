"use client"

import { useRouter } from "next/navigation"

const DEPARTMENTS = [
  { dept: "booking",   label: "Booking",        subtitle: "Sales & Bookings",       icon: "📋", color: "#22c55e", bg: "linear-gradient(135deg, #22c55e, #16a34a)" },
  { dept: "warehouse", label: "Warehouse",       subtitle: "Inventory & Stock",      icon: "📦", color: "#a855f7", bg: "linear-gradient(135deg, #a855f7, #9333ea)" },
  { dept: "qc",        label: "Quality Control", subtitle: "QC & Inspections",       icon: "🔍", color: "#eab308", bg: "linear-gradient(135deg, #eab308, #ca8a04)" },
  { dept: "delivery",  label: "Delivery",        subtitle: "Dispatch & Returns",     icon: "🚚", color: "#14b8a6", bg: "linear-gradient(135deg, #14b8a6, #0d9488)" },
  { dept: "styling",   label: "Styling",         subtitle: "Safa Stylists",          icon: "✂️", color: "#ec4899", bg: "linear-gradient(135deg, #ec4899, #db2777)" },
  { dept: "accounts",  label: "Accounts",        subtitle: "Finance & Payments",     icon: "💰", color: "#ef4444", bg: "linear-gradient(135deg, #ef4444, #dc2626)" },
  { dept: "hr",        label: "HR Department",   subtitle: "Human Resources & Payroll", icon: "👥", color: "#6366f1", bg: "linear-gradient(135deg, #6366f1, #4f46e5)" },
  { dept: "travels",   label: "Travels",         subtitle: "Travels & Ticket Booking", icon: "✈️", color: "#0891b2", bg: "linear-gradient(135deg, #0891b2, #0e7490)" },
  { dept: "manager",   label: "Manager",         subtitle: "Branch Management",      icon: "🏢", color: "#3b82f6", bg: "linear-gradient(135deg, #3b82f6, #2563eb)" },
  { dept: "franchise", label: "Franchise",       subtitle: "Franchise Operations",   icon: "🌐", color: "#8b5cf6", bg: "linear-gradient(135deg, #8b5cf6, #7c3aed)" },
  { dept: "admin",     label: "Admin",           subtitle: "Super Administration",   icon: "👑", color: "#f97316", bg: "linear-gradient(135deg, #f97316, #ea580c)" },
]

export default function PortalSelectorPage() {
  const router = useRouter()

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #fdf6ec 0%, #f0e6d3 100%)",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        paddingBottom: "40px",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e1208, #3d2310)",
          padding: "32px 20px 36px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 50% 0%, rgba(249,115,22,0.15) 0%, transparent 70%)",
        }} />
        <div style={{
          position: "absolute", top: -50, right: -50, width: 180, height: 180,
          borderRadius: "50%", background: "rgba(255,255,255,0.04)",
        }} />
        <div style={{
          position: "absolute", bottom: -40, left: -30, width: 140, height: 140,
          borderRadius: "50%", background: "rgba(255,255,255,0.03)",
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px", fontSize: 28,
            backdropFilter: "blur(10px)",
          }}>
            🏪
          </div>
          <h1 style={{
            color: "white", fontSize: 24, fontWeight: 900,
            margin: "0 0 6px", letterSpacing: "-0.5px",
          }}>
            Safawala CRM
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, margin: "0 0 20px", fontWeight: 500 }}>
            Select your department to sign in
          </p>

          {/* Password hint */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 20, padding: "8px 16px",
          }}>
            <span style={{ fontSize: 14 }}>🔑</span>
            <div style={{ textAlign: "left" }}>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontSize: 9, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" }}>
                Demo Password
              </p>
              <p style={{ margin: 0, color: "#fbbf24", fontSize: 13, fontWeight: 700, fontFamily: "monospace", letterSpacing: 1 }}>
                Warehouse@5678
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Department Cards */}
      <div style={{ padding: "20px 16px 0" }}>
        <p style={{
          color: "rgba(80,55,30,0.45)", fontSize: 10, fontWeight: 700,
          letterSpacing: 1.5, textTransform: "uppercase",
          margin: "0 0 12px 4px",
        }}>
          Choose Department ({DEPARTMENTS.length} portals)
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {DEPARTMENTS.map((dept) => (
            <button
              key={dept.dept}
              onClick={() => router.push(`/login/${dept.dept}`)}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 18px",
                background: "rgba(255,255,255,0.8)",
                border: "1px solid rgba(255,255,255,0.95)",
                borderRadius: 18, cursor: "pointer",
                backdropFilter: "blur(10px)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                textAlign: "left", width: "100%",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 24px ${dept.color}25`
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"
              }}
            >
              {/* Icon */}
              <div style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                background: dept.bg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20,
                boxShadow: `0 4px 12px ${dept.color}40`,
              }}>
                {dept.icon}
              </div>

              {/* Text */}
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: "#1e1208" }}>
                  {dept.label}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(80,55,30,0.45)", fontWeight: 500 }}>
                  {dept.subtitle}
                </p>
              </div>

              {/* Arrow */}
              <div style={{
                width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                background: `${dept.color}15`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: dept.color, fontSize: 14, fontWeight: 700,
              }}>
                →
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", marginTop: 32, padding: "0 20px" }}>
        <p style={{ color: "rgba(80,55,30,0.3)", fontSize: 11, margin: 0 }}>
          Safawala CRM • All Department Portals
        </p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
      `}</style>
    </div>
  )
}
