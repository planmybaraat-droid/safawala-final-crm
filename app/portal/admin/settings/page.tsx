"use client"

import { useRouter } from "next/navigation"
import { PortalPageHeader, PortalSectionLabel } from "@/components/portal/portal-shared"

const COLOR = "#f97316"

const SETTING_GROUPS = [
  {
    label: "Business Settings",
    items: [
      { icon: "building", title: "Company Profile", subtitle: "Name, logo, address, GSTIN", href: "/dashboard" },
      { icon: "rupee", title: "Pricing & GST", subtitle: "Tax rates, pricing rules", href: "/dashboard" },
      { icon: "globe", title: "WhatsApp / WATI", subtitle: "Message templates & triggers", href: "/dashboard" },
    ]
  },
  {
    label: "User Management",
    items: [
      { icon: "users", title: "Staff Accounts", subtitle: "Create, edit, deactivate users", href: "/portal/admin/staff" },
      { icon: "crown", title: "Roles & Permissions", subtitle: "Role-based access control", href: "/dashboard" },
    ]
  },
  {
    label: "Advanced",
    items: [
      { icon: "monitor", title: "Full CRM Dashboard", subtitle: "Switch to desktop view", href: "/dashboard" },
      { icon: "document", title: "Audit Logs", subtitle: "Activity history & changes", href: "/dashboard" },
    ]
  }
]

export default function SettingsPage() {
  const router = useRouter()

  return (
    <div>
      <PortalPageHeader title="Settings" subtitle="Platform configuration" color={COLOR} backHref="/portal/admin" />

      {SETTING_GROUPS.map(group => (
        <div key={group.label}>
          <PortalSectionLabel label={group.label} />
          <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
            {group.items.map((item, i) => (
              <button
                key={item.title}
                onClick={() => router.push(item.href)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/40 active:bg-white/60"
                style={{ borderBottom: i < group.items.length - 1 ? "1px solid rgba(245,235,224,0.8)" : "none" }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${COLOR}18` }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLOR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {item.icon === "building" && <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>}
                    {item.icon === "rupee" && <><path d="M6 3h12M6 8h12M6 13h8"/><path d="M14 13l4 9"/><path d="M6 13c0 3.31 2.69 6 6 6"/></>}
                    {item.icon === "globe" && <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></>}
                    {item.icon === "users" && <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></>}
                    {item.icon === "crown" && <><path d="M12 2L9 9H2l5.5 4-2 7L12 16l6.5 4-2-7L22 9h-7L12 2z"/></>}
                    {item.icon === "monitor" && <><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>}
                    {item.icon === "document" && <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>}
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold" style={{ color: "#1e1208" }}>{item.title}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "rgba(80,55,30,0.5)" }}>{item.subtitle}</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(80,55,30,0.3)" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="h-6" />
    </div>
  )
}
