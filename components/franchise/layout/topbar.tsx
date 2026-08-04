'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Bell, Search, Plus, X, Calendar, Users, Package } from 'lucide-react'
import { useDebounce } from '@/lib/franchise/hooks'

const ROUTE_LABELS: Record<string, string> = {
  '/franchise-dashboard':            'Dashboard',
  '/franchise-dashboard/bookings':   'Bookings',
  '/franchise-dashboard/customers':  'Customers',
  '/franchise-dashboard/deliveries': 'Deliveries',
  '/franchise-dashboard/inventory':  'Inventory',
  '/franchise-dashboard/quotes':     'Quotes',
  '/franchise-dashboard/expenses':   'Expenses',
  '/franchise-dashboard/laundry':    'Laundry',
  '/franchise-dashboard/leads':      'Leads',
  '/franchise-dashboard/tasks':      'Tasks',
  '/franchise-dashboard/reports':    'Reports',
  '/franchise-dashboard/staff':      'Staff',
  '/franchise-dashboard/settings':   'Settings',
}

export function FranchiseTopbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const debouncedSearch = useDebounce(search, 400)
  const searchRef = useRef<HTMLDivElement>(null)

  const pageLabel = ROUTE_LABELS[pathname] ||
    Object.entries(ROUTE_LABELS).find(([k]) => pathname.startsWith(k + '/'))?.[1] || 'Dashboard'

  // Global search
  useEffect(() => {
    if (!debouncedSearch.trim() || debouncedSearch.length < 2) {
      setSearchResults([])
      return
    }
    setSearchLoading(true)
    const controller = new AbortController()
    // Raw fetch is intentional here — parallel global search with shared AbortController
    // useSafeData does not support multi-endpoint parallel fetching with shared abort signal
    Promise.all([
      fetch(`/api/customers?search=${encodeURIComponent(debouncedSearch)}&basic=1`, {
        signal: controller.signal, credentials: 'include' // credentials: include required
      }).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })),
      fetch(`/api/bookings?search=${encodeURIComponent(debouncedSearch)}&limit=5`, {
        signal: controller.signal, credentials: 'include' // credentials: include required
      }).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })),
    ]).then(([customers, bookings]) => {
      const results = [
        ...(customers?.data || []).slice(0, 3).map((c: any) => ({ // any: API response shape varies
          type: 'customer', icon: 'user', label: c.name, sub: c.phone,
          href: `/franchise-dashboard/customers/${c.id}`
        })),
        ...(bookings?.data || []).slice(0, 3).map((b: any) => ({ // any: API response shape varies
          type: 'booking', icon: 'calendar', label: b.booking_number || `Booking #${b.id?.slice(0,6)}`,
          sub: b.customer_name || b.customers?.name,
          href: `/franchise-dashboard/bookings/${b.id}`
        })),
      ]
      setSearchResults(results)
    }).catch(() => {}).finally(() => setSearchLoading(false))
    return () => controller.abort()
  }, [debouncedSearch])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="h-14 bg-white border-b border-[#e4e7ef] flex items-center justify-between px-5 shrink-0 z-10">
      {/* Left: Page label */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-[#0f1117]">{pageLabel}</h2>
      </div>

      {/* Center: Global search */}
      <div ref={searchRef} className="relative flex-1 max-w-sm mx-6">
        <div className="flex items-center gap-2 bg-[#f8f9fc] border border-[#e4e7ef] rounded-lg px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-[#9ca3af] shrink-0" />
          <input
            type="text"
            placeholder="Search customers, bookings..."
            value={search}
            onChange={e => { setSearch(e.target.value); setShowSearch(true) }}
            onFocus={() => setShowSearch(true)}
            className="flex-1 bg-transparent text-xs text-[#0f1117] placeholder:text-[#9ca3af] outline-none"
          />
          {search && (
            <button onClick={() => { setSearch(''); setSearchResults([]) }}>
              <X className="h-3 w-3 text-[#9ca3af]" />
            </button>
          )}
        </div>

        {/* Dropdown results */}
        {showSearch && (search.length >= 2) && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-[#e4e7ef] rounded-xl shadow-lg z-50 overflow-hidden">
            {searchLoading ? (
              <div className="px-4 py-3 text-xs text-[#9ca3af]">Searching…</div>
            ) : searchResults.length === 0 ? (
              <div className="px-4 py-3 text-xs text-[#9ca3af]">No results for "{search}"</div>
            ) : (
              searchResults.map((r, i) => (
                <Link
                  key={i}
                  href={r.href}
                  onClick={() => { setShowSearch(false); setSearch('') }}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#f8f9fc] transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#f1f3f7] flex items-center justify-center shrink-0">
                    {r.type === 'customer'
                      ? <Users className="h-3.5 w-3.5 text-[#9ca3af]" />
                      : <Calendar className="h-3.5 w-3.5 text-[#9ca3af]" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#0f1117] truncate">{r.label}</p>
                    {r.sub && <p className="text-[10px] text-[#9ca3af] truncate">{r.sub}</p>}
                  </div>
                  <span className="text-[10px] text-[#9ca3af] capitalize shrink-0">{r.type}</span>
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Link
          href="/create-invoice"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#d4a017] hover:bg-[#b8891a] text-white text-xs font-semibold rounded-lg transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New Booking</span>
        </Link>
      </div>
    </header>
  )
}
