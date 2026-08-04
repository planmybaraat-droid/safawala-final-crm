"use client"

import { useRouter } from "next/navigation"
import { PortalIcon } from "./portal-icons"

// ─── Page Header (back button + title) ───────────────────────────────────────
export function PortalPageHeader({
  title,
  subtitle,
  color,
  backHref,
  action,
}: {
  title: string
  subtitle?: string
  color: string
  backHref?: string
  action?: { label: string; onClick: () => void }
}) {
  const router = useRouter()
  return (
    <div
      className="px-4 pt-5 pb-4 flex items-center gap-3"
      style={{ background: `linear-gradient(135deg, ${color}, ${adjustColor(color, -25)})` }}
    >
      {backHref && (
        <button
          onClick={() => router.push(backHref)}
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.15)", color: "white" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-[17px] font-black text-white leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-[11px] text-white/60 mt-0.5">{subtitle}</p>}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="px-3 py-1.5 rounded-xl text-[11px] font-bold flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.2)", color: "white" }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

// ─── Search Bar ───────────────────────────────────────────────────────────────
export function PortalSearchBar({
  value,
  onChange,
  placeholder = "Search...",
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="px-4 py-3">
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
        style={{ background: "#f4f4f5", border: "1px solid #e4e4e7" }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-[13px] outline-none"
          style={{ color: "#18181b" }}
        />
        {value && (
          <button onClick={() => onChange("")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  confirmed:         { bg: "#dcfce7", text: "#16a34a" },
  pending:           { bg: "#fef9c3", text: "#ca8a04" },
  pending_selection: { bg: "#fef9c3", text: "#ca8a04" },
  delivered:         { bg: "#dbeafe", text: "#1d4ed8" },
  returned:          { bg: "#f3e8ff", text: "#7c3aed" },
  order_complete:    { bg: "#dcfce7", text: "#15803d" },
  cancelled:         { bg: "#fee2e2", text: "#dc2626" },
  paid:              { bg: "#dcfce7", text: "#16a34a" },
  partial:           { bg: "#fef9c3", text: "#ca8a04" },
  unpaid:            { bg: "#fee2e2", text: "#dc2626" },
  active:            { bg: "#dcfce7", text: "#16a34a" },
  inactive:          { bg: "#f4f4f5", text: "#71717a" },
  lead:              { bg: "#fef9c3", text: "#ca8a04" },
  pass:              { bg: "#dcfce7", text: "#16a34a" },
  fail:              { bg: "#fee2e2", text: "#dc2626" },
  in_progress:       { bg: "#dbeafe", text: "#1d4ed8" },
  new:               { bg: "#e0f2fe", text: "#0284c7" },
  generated:         { bg: "#fef9c3", text: "#ca8a04" },
  sent:              { bg: "#dbeafe", text: "#1d4ed8" },
  accepted:          { bg: "#dcfce7", text: "#16a34a" },
  converted:         { bg: "#f3e8ff", text: "#7c3aed" },
}

export function PortalStatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status?.toLowerCase()] ?? { bg: "#f4f4f5", text: "#71717a" }
  const label = status?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? "—"
  return (
    <span
      className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
      style={{ background: s.bg, color: s.text }}
    >
      {label}
    </span>
  )
}

// ─── List Card (generic tappable row) ────────────────────────────────────────
export function PortalListCard({
  title,
  subtitle,
  meta,
  badge,
  color,
  onClick,
  icon,
}: {
  title: string
  subtitle?: string
  meta?: string
  badge?: string
  color: string
  onClick?: () => void
  icon?: string
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5 active:opacity-70 cursor-pointer"
      style={{
        background: "#ffffff",
        borderBottom: "1px solid #f4f4f5",
      }}
      onClick={onClick}
    >
      {icon && (
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}15`, color }}
        >
          <PortalIcon name={icon} size={18} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold truncate" style={{ color: "#18181b" }}>{title}</p>
        {subtitle && <p className="text-[11px] truncate mt-0.5" style={{ color: "#a1a1aa" }}>{subtitle}</p>}
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {badge && <PortalStatusBadge status={badge} />}
        {meta && <span className="text-[10px] font-semibold" style={{ color: "#71717a" }}>{meta}</span>}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d4d4d8" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="9,18 15,12 9,6"/>
        </svg>
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function PortalEmptyState({ icon, title, subtitle, color }: {
  icon: string; title: string; subtitle?: string; color: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: `${color}12`, color }}
      >
        <PortalIcon name={icon} size={28} />
      </div>
      <p className="text-[14px] font-bold" style={{ color: "#18181b" }}>{title}</p>
      {subtitle && <p className="text-[12px] mt-1" style={{ color: "#a1a1aa" }}>{subtitle}</p>}
    </div>
  )
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
export function PortalSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-100">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-zinc-100 rounded-full animate-pulse w-3/4" />
            <div className="h-2 bg-zinc-100 rounded-full animate-pulse w-1/2" />
          </div>
          <div className="h-4 bg-zinc-100 rounded-full animate-pulse w-12" />
        </div>
      ))}
    </div>
  )
}

// ─── Section Label ────────────────────────────────────────────────────────────
export function PortalSectionLabel({ label }: { label: string }) {
  return (
    <p
      className="px-4 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest"
      style={{ color: "#71717a" }}
    >
      {label}
    </p>
  )
}

// ─── Info Row (detail page) ───────────────────────────────────────────────────
export function PortalInfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex justify-between items-start py-3 border-b" style={{ borderColor: "#f4f4f5" }}>
      <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#a1a1aa" }}>{label}</span>
      <span className="text-[13px] font-semibold text-right ml-4" style={{ color: "#18181b", maxWidth: "60%" }}>{value}</span>
    </div>
  )
}

// ─── Amount Display ───────────────────────────────────────────────────────────
export function PortalAmount({ amount, size = "md" }: { amount: number; size?: "sm" | "md" | "lg" }) {
  const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
  const sizes = { sm: "text-[12px]", md: "text-[15px]", lg: "text-[22px]" }
  return <span className={`font-black ${sizes[size]}`} style={{ color: "#18181b" }}>{fmt.format(amount)}</span>
}

// ─── Float Action Button ──────────────────────────────────────────────────────
export function PortalFAB({ label, color, onClick, icon = "plus-circle" }: {
  label: string; color: string; onClick: () => void; icon?: string
}) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 right-4 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg active:scale-95 transition-transform"
      style={{
        background: color,
        color: "white",
        boxShadow: `0 8px 24px ${color}55`,
        bottom: "calc(72px + env(safe-area-inset-bottom, 0px) + 12px)",
      }}
    >
      <PortalIcon name={icon} size={18} />
      <span className="text-[13px] font-bold">{label}</span>
    </button>
  )
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16)
  const r = Math.max(0, Math.min(255, (num >> 16) + amount))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amount))
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amount))
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}
