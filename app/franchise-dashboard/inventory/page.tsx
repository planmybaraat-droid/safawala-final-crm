'use client'
import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useSafeData, useDebounce } from '@/lib/franchise/hooks'
import { PageHeader } from '@/components/franchise/shared/page-header'
import { ErrorCard } from '@/components/franchise/shared/error-card'
import { EmptyState } from '@/components/franchise/shared/empty-state'
import { RowSkeleton } from '@/components/franchise/shared/skeleton'
import { Package, Search, AlertTriangle, ChevronRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const STOCK_FILTERS = ['all', 'available', 'low_stock', 'booked', 'in_laundry']

function StockBadge({ qty, booked }: { qty: number; booked?: number }) {
  const available = (qty || 0) - (booked || 0)
  if (available <= 0) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border bg-red-50 text-red-700 border-red-200">Out of stock</span>
  if (available <= 3) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border bg-orange-50 text-orange-700 border-orange-200">Low ({available})</span>
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border bg-green-50 text-green-700 border-green-200">In stock ({available})</span>
}

export default function FranchiseInventoryPage() {
  const [searchRaw, setSearchRaw] = useState('')
  const [filter, setFilter] = useState('all')
  const [filtersLoaded, setFiltersLoaded] = useState(false)
  const search = useDebounce(searchRaw, 350)

  // Search persists across refreshes until cleared
  useEffect(() => {
    try {
      const saved = localStorage.getItem('franchise-inventory-search')
      if (saved) setSearchRaw(saved)
    } catch {}
    setFiltersLoaded(true)
  }, [])

  useEffect(() => {
    if (!filtersLoaded) return
    try { localStorage.setItem('franchise-inventory-search', searchRaw) } catch {}
  }, [filtersLoaded, searchRaw])

  const url = search.trim()
    ? `/api/products?search=${encodeURIComponent(search)}`
    : '/api/products'

  const { data, loading, error, refetch } = useSafeData<any[]>(url)
  const products = data || []

  const lowStockCount = products.filter((p: any) => { // any: product API shape varies
    const avail = (p.total_quantity || p.quantity || 0) - (p.booked_count || 0)
    return avail > 0 && avail <= 3
  }).length

  return (
    <div className="p-5 lg:p-7 max-w-7xl mx-auto">
      <PageHeader
        title="Inventory"
        subtitle={`${products.length} products · ${lowStockCount > 0 ? `⚠ ${lowStockCount} low stock` : 'Stock looks good'}`}
        icon={Package}
        breadcrumbs={[{ label: 'Dashboard', href: '/franchise-dashboard' }, { label: 'Inventory' }]}
        action={
          <Link href="/inventory/add"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#d4a017] hover:bg-[#b8891a] text-white text-sm font-semibold rounded-xl transition-colors">
            <Plus className="h-4 w-4" /> Add Product
          </Link>
        }
      />

      {lowStockCount > 0 && (
        <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl mb-5 text-sm text-orange-700">
          <AlertTriangle className="h-5 w-5 shrink-0 text-orange-500" />
          <span><strong>{lowStockCount} product{lowStockCount > 1 ? 's' : ''}</strong> running low on stock — consider restocking soon.</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex items-center gap-2 bg-white border border-[#e4e7ef] rounded-xl px-3 py-2.5 flex-1 max-w-sm">
          <Search className="h-4 w-4 text-[#9ca3af] shrink-0" />
          <input type="text" placeholder="Search products, barcodes, categories…"
            value={searchRaw} onChange={e => setSearchRaw(e.target.value)}
            className="flex-1 bg-transparent text-sm text-[#0f1117] placeholder:text-[#9ca3af] outline-none" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e4e7ef] overflow-hidden">
        <div className="hidden sm:grid grid-cols-[2.5fr_1.5fr_1fr_1fr_1fr_40px] gap-4 px-4 py-2.5 bg-[#f8f9fc] border-b border-[#e4e7ef] text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">
          <span>Product</span><span>Category</span><span>Total Qty</span><span>Booked</span><span>Stock</span><span />
        </div>

        {loading && <RowSkeleton count={8} />}
        {!loading && error && <div className="p-6"><ErrorCard message={error} onRetry={refetch} /></div>}
        {!loading && !error && products.length === 0 && (
          <EmptyState icon={Package} title="No products found"
            description="Add products to your inventory to track stock and availability"
            action={{ label: '+ Add Product', onClick: () => window.location.href = '/inventory/add' }} />
        )}

        {!loading && !error && products.map((p: any) => ( // any: product API response shape
          <Link key={p.id} href={`/inventory/edit/${p.id}`}
            className="grid grid-cols-[2.5fr_1.5fr_1fr_1fr_1fr_40px] gap-4 items-center px-4 py-3.5 border-b border-[#f1f3f7] last:border-0 hover:bg-[#f8f9fc] transition-colors group">
            <div className="flex items-center gap-3 min-w-0">
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="w-9 h-9 rounded-lg object-cover shrink-0 border border-[#e4e7ef]" />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-[#f1f3f7] flex items-center justify-center shrink-0">
                  <Package className="h-4 w-4 text-[#9ca3af]" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#0f1117] truncate">{p.name}</p>
                {p.barcode && <p className="text-[10px] text-[#9ca3af] font-mono truncate">{p.barcode}</p>}
              </div>
            </div>
            <p className="text-sm text-[#4b5563] truncate">{p.category || p.categories?.name || '—'}</p>
            <p className="text-sm text-[#4b5563]">{p.total_quantity ?? p.quantity ?? 0}</p>
            <p className="text-sm text-[#4b5563]">{p.booked_count ?? 0}</p>
            <StockBadge qty={p.total_quantity ?? p.quantity ?? 0} booked={p.booked_count ?? 0} />
            <ChevronRight className="h-4 w-4 text-[#d1d5e0] group-hover:text-[#9ca3af] justify-self-end" />
          </Link>
        ))}
      </div>
    </div>
  )
}
