'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/auth'
import {
  Home, Calendar, FileText, Users, Package, Crown, Layers, Store,
  FileCheck, UserPlus, Stethoscope, Plane, Lock, Sparkles,
  Shirt, Receipt, Truck, ClipboardList, Archive, DollarSign, Clock,
  BarChart3, Building2, UserCheck, Zap, Settings, LogOut,
  ChevronLeft, ChevronRight, ChevronDown, Plus
} from 'lucide-react'

// ─── All Navigation Groups — mirrors original AppSidebar exactly ─────────────
const NAV_GROUPS = [
  {
    label: 'Main',
    items: [
      { label: 'Dashboard',        href: '/franchise-dashboard',                   icon: Home,          permission: 'dashboard' },
      { label: 'Bookings',         href: '/franchise-dashboard/bookings',          icon: Calendar,      permission: 'bookings' },
      { label: 'Quotes',           href: '/franchise-dashboard/quotes',            icon: FileText,      permission: 'bookings' },
      { label: 'Customers',        href: '/franchise-dashboard/customers',         icon: Users,         permission: 'customers' },
      { label: 'Inventory',        href: '/franchise-dashboard/inventory',         icon: Package,       permission: 'inventory' },
      { label: 'Retail Catalog',   href: '/franchise-dashboard/retail-catalog',    icon: Crown,         permission: 'inventory' },
      { label: 'Packages',         href: '/franchise-dashboard/packages',          icon: Layers,        permission: 'packages' },
      { label: 'Vendors',          href: '/franchise-dashboard/vendors',           icon: Store,         permission: 'vendors' },
      { label: 'Tasks & Tickets',  href: '/franchise-dashboard/tasks',             icon: FileCheck,     permission: 'dashboard' },
      { label: 'Leads',            href: '/franchise-dashboard/leads',             icon: UserPlus,      permission: 'customers' },
      { label: 'HR',               href: '/franchise-dashboard/hr',                icon: Stethoscope,   permission: 'staff' },
      { label: 'Travels & Hotels', href: '/franchise-dashboard/travels',           icon: Plane,         permission: 'bookings' },
      { label: 'Lock Dates',       href: '/leads',                                 icon: Lock,          permission: 'bookings' },
    ],
  },
  {
    label: 'Business',
    items: [
      { label: 'New Booking',      href: '/create-invoice',                        icon: Plus,          permission: 'bookings' },
      { label: 'Challans',         href: '/franchise-dashboard/challans',          icon: FileText,      permission: 'bookings' },
      { label: 'Vouchers',         href: '/franchise-dashboard/vouchers',          icon: Receipt,       permission: 'bookings' },
      { label: 'Laundry',          href: '/franchise-dashboard/laundry',           icon: Shirt,         permission: 'laundry' },
      { label: 'Expenses',         href: '/franchise-dashboard/expenses',          icon: Receipt,       permission: 'expenses' },
      { label: 'Deliveries & Returns', href: '/franchise-dashboard/deliveries',   icon: Truck,         permission: 'deliveries' },
      { label: 'Work Orders',      href: '/franchise-dashboard/work-orders',       icon: ClipboardList, permission: 'bookings' },
      { label: 'Product Archive',  href: '/franchise-dashboard/product-archive',   icon: Archive,       permission: 'productArchive' },
      { label: 'Payroll',          href: '/franchise-dashboard/payroll',           icon: DollarSign,    permission: 'payroll' },
      { label: 'Attendance',       href: '/franchise-dashboard/attendance',        icon: Clock,         permission: 'attendance' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { label: 'Reports',          href: '/franchise-dashboard/reports',           icon: BarChart3,     permission: 'reports' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Staff',            href: '/franchise-dashboard/staff',             icon: UserCheck,     permission: 'staff' },
      { label: 'Integrations',     href: '/franchise-dashboard/integrations',      icon: Zap,           permission: 'integrations' },
      { label: 'Settings',         href: '/franchise-dashboard/settings',          icon: Settings,      permission: 'settings' },
    ],
  },
]

function getInitials(name: string) {
  const parts = (name || 'U').trim().split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].substring(0, 2).toUpperCase()
}

interface NavGroup {
  label: string
  items: typeof NAV_GROUPS[0]['items']
}

export function FranchiseSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [user, setUser] = useState<any>(null) // any: localStorage user shape
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Main: true, Business: true, Reports: true, Admin: true
  })

  useEffect(() => {
    try {
      const raw = localStorage.getItem('safawala_user')
      if (raw) setUser(JSON.parse(raw))
    } catch {
      // non-critical — sidebar user display only
    }
  }, [])

  const isActive = (href: string) =>
    href === '/franchise-dashboard'
      ? pathname === href
      : pathname === href || pathname.startsWith(href + '/')

  const toggleGroup = (label: string) => {
    if (collapsed) return
    setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }))
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-white border-r border-[#e4e7ef] transition-all duration-200 shrink-0',
        collapsed ? 'w-[60px]' : 'w-[220px]'
      )}
    >
      {/* ── Logo / Brand ── */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-[#e4e7ef] h-14 shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#d4a017] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#0f1117] truncate leading-tight">Safawala</p>
              <p className="text-[10px] text-[#9ca3af] truncate leading-tight">Franchise CRM</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-7 h-7 rounded-lg bg-[#d4a017] flex items-center justify-center mx-auto">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        )}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded-md text-[#9ca3af] hover:text-[#0f1117] hover:bg-[#f1f3f7] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Expand button when collapsed ── */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center justify-center py-2 text-[#9ca3af] hover:text-[#0f1117] hover:bg-[#f1f3f7] transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 scrollbar-thin">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-1">
            {/* Group header */}
            {!collapsed && (
              <button
                onClick={() => toggleGroup(group.label)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider hover:text-[#4b5563] transition-colors"
              >
                <span>{group.label}</span>
                <ChevronDown className={cn(
                  'h-3 w-3 transition-transform',
                  expandedGroups[group.label] ? 'rotate-0' : '-rotate-90'
                )} />
              </button>
            )}

            {/* Items */}
            {(collapsed || expandedGroups[group.label]) && group.items.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[13px] font-medium transition-colors mb-0.5',
                    active
                      ? 'bg-[#fef9ee] text-[#d4a017] border border-[#f5e0a0]'
                      : 'text-[#4b5563] hover:bg-[#f8f9fc] hover:text-[#0f1117]'
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      active ? 'text-[#d4a017]' : 'text-[#9ca3af]'
                    )}
                  />
                  {!collapsed && (
                    <span className="truncate leading-tight">{item.label}</span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* ── User footer ── */}
      <div className="border-t border-[#e4e7ef] p-2.5 shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#d4a017] flex items-center justify-center text-white text-[11px] font-bold shrink-0">
              {getInitials(user?.name || 'U')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#0f1117] truncate leading-tight">
                {user?.name || 'User'}
              </p>
              <p className="text-[10px] text-[#9ca3af] truncate capitalize leading-tight">
                {(user?.role || 'franchise_admin').replace(/_/g, ' ')}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="p-1 text-[#9ca3af] hover:text-red-500 transition-colors shrink-0"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#d4a017] flex items-center justify-center text-white text-[10px] font-bold">
              {getInitials(user?.name || 'U')}
            </div>
            <button
              onClick={handleSignOut}
              className="text-[#9ca3af] hover:text-red-500 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
