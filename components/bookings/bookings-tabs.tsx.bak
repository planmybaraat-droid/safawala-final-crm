"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Eye, Edit, Archive, Plus, Package, RotateCcw, ChevronDown, ChevronUp, FileText, Calendar } from "lucide-react"
import Link from "next/link"
import type { Booking } from "@/lib/types"
import { TableSkeleton } from "@/components/ui/skeleton-loader"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface BookingsTabsProps {
  bookings: Booking[]
  loading: boolean
  paginatedBookings?: Booking[]
  totalItems?: number
  currentPage?: number
  itemsPerPage?: number
  startIndex?: number
  endIndex?: number
  totalPages?: number
  getStatusBadge?: (status: string, booking: Booking) => React.ReactNode
  bookingItems?: Record<string, any[]>
  bookingsWithItems?: Set<string>
  itemsLoading?: Record<string, boolean>
  getPageNumbers?: () => (number | string)[]
  goToPage?: (page: number) => void
  setItemsPerPage?: (value: number) => void
  setCurrentPage?: (page: number) => void
  handleOpenCompactDisplay?: (booking: Booking) => void
  setProductDialogBooking?: (booking: Booking) => void
  setProductDialogType?: (type: "pending" | "items") => void
  setShowProductDialog?: (show: boolean) => void
  setCurrentBookingForItems?: (booking: Booking | null) => void
  setSelectedItems?: (items: any[]) => void
  setShowItemsSelection?: (show: boolean) => void
  setSelectedBooking?: (booking: Booking | null) => void
  setShowViewDialog?: (show: boolean) => void
  handleEditBooking?: (id: string, source: string) => void
  handleArchiveBooking?: (id: string, source: string) => void
  archivedBookings?: Booking[]
  showArchivedSection?: boolean
  setShowArchivedSection?: (show: boolean) => void
  handleRestoreBooking?: (id: string, source: string) => void
  onTabChange?: (tab: string) => void
}

export function BookingsTabs({ 
  bookings, 
  loading,
  getStatusBadge,
  bookingItems = {},
  bookingsWithItems = new Set(),
  setSelectedBooking,
  setShowViewDialog,
  handleEditBooking,
  handleArchiveBooking,
  handleOpenCompactDisplay,
  setProductDialogBooking,
  setProductDialogType,
  setShowProductDialog,
  setCurrentBookingForItems,
  setSelectedItems,
  setShowItemsSelection,
  archivedBookings = [],
  handleRestoreBooking,
  onTabChange,
  itemsLoading = {} 
}: BookingsTabsProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("all")
  const [showArchived, setShowArchived] = useState(false)

  // Handler to open invoice for a booking - open create-invoice page in edit mode with auto-print
  const handleViewInvoice = (booking: Booking) => {
    // Open in a new tab with print=true query param
    window.open(`/create-invoice?mode=edit&id=${booking.id}&print=true`, '_blank')
  }

  // Filter bookings by type
  const allBookings = bookings
  const productRentals = useMemo(() => 
    bookings.filter(b => (b as any).source === 'product_orders' && (b as any).type === 'rental'),
    [bookings]
  )
  const directSales = useMemo(() => 
    bookings.filter(b => (b as any).source === 'direct_sales' || ((b as any).source === 'product_orders' && (b as any).type === 'sale')),
    [bookings]
  )
  const packageBookings = useMemo(() => 
    bookings.filter(b => (b as any).source === 'package_bookings'),
    [bookings]
  )

  // Get bookings for current tab
  const getTabBookings = () => {
    switch(activeTab) {
      case 'product-rental': return productRentals
      case 'direct-sale': return directSales
      case 'package': return packageBookings
      default: return allBookings
    }
  }

  const tabBookings = getTabBookings()

  const getInitials = (name?: string) => {
    if (!name) return "?"
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const getAvatarColor = (name?: string) => {
    if (!name) return "from-amber-500/20 to-amber-700/20 text-amber-900 border-amber-500/30"
    const charCodeSum = name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)
    const colors = [
      "from-amber-500/20 to-amber-700/20 text-amber-900 border-amber-500/30",
      "from-emerald-500/20 to-emerald-700/20 text-emerald-900 border-emerald-500/30",
      "from-blue-500/20 to-blue-700/20 text-blue-900 border-blue-500/30",
      "from-purple-500/20 to-purple-700/20 text-purple-900 border-purple-500/30",
      "from-rose-500/20 to-rose-700/20 text-rose-900 border-rose-500/30",
    ]
    return colors[charCodeSum % colors.length]
  }

  const BookingsTableContent = ({ bookingsList }: { bookingsList: Booking[] }) => (
    <>
      {loading ? (
        <TableSkeleton rows={10} />
      ) : bookingsList.length === 0 ? (
        <div className="text-center py-12">
          <Package className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No bookings found</h3>
          <p className="text-muted-foreground mb-6">Create your first booking to get started</p>
          <Link href="/create-invoice">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Booking
            </Button>
          </Link>
        </div>
      ) : (
        <div className="w-full overflow-hidden rounded-xl border border-amber-900/10 bg-white/50 backdrop-blur-md shadow-inner">
          {/* Header Row */}
          <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-4 bg-heritage-cream-medium/70 border-b border-amber-900/10 text-xs font-semibold text-heritage-accent/80 tracking-wider uppercase font-serif">
            <div className="col-span-2">Booking #</div>
            <div className="col-span-2">Customer</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Products</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1 text-right">Amount</div>
            <div className="col-span-1 text-center">Event Date</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
          
          {/* Body Rows */}
          <div className="divide-y divide-amber-900/5">
            {bookingsList.map((booking) => (
              <div 
                key={booking.id}
                className="grid grid-cols-1 lg:grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-amber-50/20 transition-all duration-300 relative group hover:shadow-sm"
              >
                {/* Mobile labels shown only on small screens */}
                <div className="col-span-2 flex items-center justify-between lg:block">
                  <span className="lg:hidden text-xs font-semibold text-muted-foreground uppercase">Booking #</span>
                  <span className="font-mono text-sm tracking-wider font-semibold text-heritage-accent bg-amber-50 px-2.5 py-1 rounded border border-amber-200/50">
                    {booking.booking_number}
                  </span>
                </div>

                <div className="col-span-2 flex items-center justify-between lg:block">
                  <span className="lg:hidden text-xs font-semibold text-muted-foreground uppercase">Customer</span>
                  <div className="flex items-center gap-3 text-left">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(booking.customer?.name)} flex items-center justify-center text-xs font-bold font-serif border shadow-sm`}>
                      {getInitials(booking.customer?.name)}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{booking.customer?.name}</div>
                      <div className="text-xs text-muted-foreground">{booking.customer?.phone}</div>
                    </div>
                  </div>
                </div>

                <div className="col-span-2 flex items-center justify-between lg:block">
                  <span className="lg:hidden text-xs font-semibold text-muted-foreground uppercase">Type</span>
                  <div className="text-left w-full lg:w-auto">
                    {(() => {
                      const b: any = booking
                      if (b.type === 'package') {
                        const totalSafas = (b.total_safas || 0)
                        const packageDetails = b.package_details
                        const variantName = b.variant_name
                        return (
                          <div className="flex flex-col gap-1 items-start">
                            <Badge className="bg-amber-100 text-amber-900 border-amber-200 text-[10px] uppercase font-bold py-0.5 px-2">
                              Package
                            </Badge>
                            {packageDetails?.name && (
                              <span className="text-xs font-semibold text-gray-800" title={packageDetails.description || ''}>
                                {packageDetails.name}
                              </span>
                            )}
                            {variantName && (
                              <span className="text-[10px] text-muted-foreground bg-gray-100 border px-1.5 py-0.25 rounded font-medium">
                                Variant: {variantName}
                              </span>
                            )}
                            <span className="text-xs text-gray-600 font-medium bg-amber-50/50 px-1.5 py-0.5 rounded border border-amber-100 mt-0.5">
                              👑 {totalSafas} Safas
                            </span>
                          </div>
                        )
                      }
                      if (b.type === 'sale') return <Badge className="bg-emerald-100 text-emerald-900 border-emerald-200 text-[10px] uppercase font-bold py-0.5 px-2">Sale</Badge>
                      if (b.type === 'rental') return <Badge className="bg-blue-100 text-blue-900 border-blue-200 text-[10px] uppercase font-bold py-0.5 px-2">Rental</Badge>
                      return <Badge variant="outline" className="text-[10px] uppercase font-bold">Unknown</Badge>
                    })()}
                  </div>
                </div>

                <div className="col-span-2 flex items-center justify-between lg:block">
                  <span className="lg:hidden text-xs font-semibold text-muted-foreground uppercase">Products</span>
                  <div className="text-left">
                    {(() => {
                      const items = bookingItems[booking.id] || []
                      const hasItems = (booking as any).has_items || bookingsWithItems.has(booking.id) || items.length > 0
                      const bookingType = (booking as any).type
                      
                      if (bookingType === 'sale') {
                        return <span className="text-muted-foreground text-sm font-medium">—</span>
                      }
                      
                      // If items are still loading, don't show Selection Pending yet
                      if (!hasItems && itemsLoading[booking.id]) {
                        return (
                          <span className="text-xs text-muted-foreground font-medium animate-pulse">Loading...</span>
                        )
                      }

                      if (!hasItems) {
                        return (
                          <Badge 
                            variant="outline" 
                            className="text-orange-600 border-orange-200 bg-orange-50/50 text-xs font-semibold py-0.5 px-2 cursor-pointer hover:bg-orange-50 hover:border-orange-300 transition-colors"
                            onClick={() => {
                              setProductDialogBooking?.(booking)
                              setProductDialogType?.('pending')
                              setShowProductDialog?.(true)
                            }}
                            title="Click to assign products"
                          >
                            ⏳ Selection Pending
                          </Badge>
                        )
                      }
                      
                      return (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Badge 
                              variant="default"
                              className="bg-green-600 hover:bg-green-700 border-green-700 text-xs font-semibold py-0.5 px-2 cursor-pointer shadow-sm hover:shadow transition-all flex items-center gap-1 w-fit"
                            >
                              ✓ Items Selected ({items.length || (booking as any).total_safas || 0})
                              <ChevronDown className="h-3 w-3 opacity-70" />
                            </Badge>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-3 bg-white/95 backdrop-blur-md border border-gray-200 shadow-xl rounded-xl z-50">
                            <div className="space-y-2">
                              <h4 className="font-serif font-bold text-xs text-heritage-accent border-b pb-1.5 flex justify-between items-center">
                                <span>Selected Products</span>
                                <Badge className="bg-green-100 text-green-900 border-green-200 text-[10px] font-semibold py-0 px-1.5">
                                  {items.length || 0} items
                                </Badge>
                              </h4>
                              {items.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic text-center py-2">No items listed. Open details/edit to modify.</p>
                              ) : (
                                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-gray-200">
                                  {items.map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-start text-xs py-1 border-b border-gray-50 last:border-0">
                                      <div className="flex flex-col flex-1 pr-2">
                                        <span className="font-medium text-gray-800 line-clamp-2">
                                          {item.product_name || item.name || item.product?.name || "Unknown Product"}
                                        </span>
                                        {item.variant_name && (
                                          <span className="text-[10px] text-muted-foreground font-medium">
                                            {item.variant_name}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-xs font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded ml-auto self-start">
                                        x{item.quantity || 1}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )
                    })()}
                  </div>
                </div>

                <div className="col-span-1 flex items-center justify-between lg:block">
                  <span className="lg:hidden text-xs font-semibold text-muted-foreground uppercase">Status</span>
                  <div>
                    {getStatusBadge?.(booking.status, booking)}
                  </div>
                </div>

                <div className="col-span-1 flex items-center justify-between lg:block text-right">
                  <span className="lg:hidden text-xs font-semibold text-muted-foreground uppercase">Amount</span>
                  <div className="flex flex-col items-end w-full">
                    <span className="font-bold text-gray-900">₹{booking.total_amount?.toLocaleString() || 0}</span>
                    {typeof (booking as any).security_deposit === 'number' && (booking as any).security_deposit > 0 && (
                      <span className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.25 rounded border mt-0.5 font-medium">
                        Deposit: ₹{((booking as any).security_deposit).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="col-span-1 flex items-center justify-between lg:block text-center">
                  <span className="lg:hidden text-xs font-semibold text-muted-foreground uppercase">Event Date</span>
                  <div className="flex items-center justify-end lg:justify-center gap-1 text-xs text-gray-800 font-medium">
                    <Calendar className="h-3.5 w-3.5 text-heritage-accent/60 hidden lg:inline" />
                    <span>{new Date(booking.event_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                  </div>
                </div>

                <div className="col-span-1 flex items-center justify-between lg:block text-right">
                  <span className="lg:hidden text-xs font-semibold text-muted-foreground uppercase">Actions</span>
                  <div className="flex items-center justify-end gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:bg-green-50 hover:text-green-900 border border-transparent hover:border-green-200/50 transition-all rounded-lg"
                      onClick={() => handleViewInvoice(booking)}
                      title="View Invoice"
                    >
                      <FileText className="h-4 w-4 text-green-600"/>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:bg-amber-50 hover:text-amber-900 border border-transparent hover:border-amber-200/50 transition-all rounded-lg"
                      onClick={() => handleEditBooking?.(booking.id, (booking as any).source)}
                      title="Edit Booking"
                    >
                      <Edit className="h-4 w-4 text-gray-700"/>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 border border-transparent hover:border-amber-200/50 transition-all rounded-lg"
                      onClick={() => handleArchiveBooking?.(booking.id, (booking as any).source)}
                      title="Archive Booking"
                    >
                      <Archive className="h-4 w-4"/>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )

  return (
    <>
    <Tabs value={activeTab} onValueChange={(val) => {
      setActiveTab(val)
      onTabChange?.(val)
    }} className="w-full">
      <TabsList className="grid w-full grid-cols-3 bg-heritage-cream-medium/70 border border-amber-900/10 p-1.5 rounded-xl h-auto">
        <TabsTrigger 
          value="all" 
          className="data-[state=active]:bg-heritage-accent data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg font-medium text-heritage-accent py-2 transition-all duration-200"
        >
          All ({allBookings.length})
        </TabsTrigger>
        <TabsTrigger 
          value="product-rental"
          className="data-[state=active]:bg-heritage-accent data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg font-medium text-heritage-accent py-2 transition-all duration-200"
        >
          Rentals ({productRentals.length})
        </TabsTrigger>
        <TabsTrigger 
          value="direct-sale"
          className="data-[state=active]:bg-heritage-accent data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg font-medium text-heritage-accent py-2 transition-all duration-200"
        >
          Direct Sales ({directSales.length})
        </TabsTrigger>
      </TabsList>

      {/* All Bookings Tab */}
      <TabsContent value="all" className="mt-4">
        <Card className="border border-amber-900/10 bg-white/70 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-amber-900/20">
          <CardHeader className="border-b border-amber-900/5 bg-heritage-cream-light/40 px-6 py-4">
            <CardTitle className="font-serif text-lg font-bold text-heritage-accent tracking-wide">All Bookings ({allBookings.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <BookingsTableContent bookingsList={allBookings} />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Product Rentals Tab */}
      <TabsContent value="product-rental" className="mt-4">
        <Card className="border border-amber-900/10 bg-white/70 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-amber-900/20">
          <CardHeader className="border-b border-amber-900/5 bg-heritage-cream-light/40 px-6 py-4">
            <CardTitle className="font-serif text-lg font-bold text-heritage-accent tracking-wide">Product Rentals ({productRentals.length})</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Shows Quote Status & Invoice</p>
          </CardHeader>
          <CardContent className="p-6">
            <BookingsTableContent bookingsList={productRentals} />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Direct Sales Tab */}
      <TabsContent value="direct-sale" className="mt-4">
        <Card className="border border-amber-900/10 bg-white/70 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-amber-900/20">
          <CardHeader className="border-b border-amber-900/5 bg-heritage-cream-light/40 px-6 py-4">
            <CardTitle className="font-serif text-lg font-bold text-heritage-accent tracking-wide">Direct Sales ({directSales.length})</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Shows Invoice only (no quotes)</p>
          </CardHeader>
          <CardContent className="p-6">
            <BookingsTableContent bookingsList={directSales} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    {/* Archived Bookings Section */}
    <div className="mt-6">
      <Button
        variant="ghost"
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border"
        onClick={() => setShowArchived(!showArchived)}
      >
        <div className="flex items-center gap-2">
          <Archive className="h-4 w-4 text-amber-600" />
          <span className="font-medium">Archived Bookings ({archivedBookings.length})</span>
        </div>
        {showArchived ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      {showArchived && archivedBookings.length > 0 && (
        <Card className="mt-2 border-amber-200 bg-amber-50/30">
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Event Date</TableHead>
                  <TableHead>Archived At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archivedBookings.map((booking: any) => (
                  <TableRow key={booking.id} className="bg-amber-50/50">
                    <TableCell className="font-mono text-sm">
                      {booking.booking_number || booking.order_number || booking.package_number || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{booking.customer?.name || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">{booking.customer?.phone || ''}</p>
                      </div>
                    </TableCell>
                    <TableCell>₹{(booking.total_amount || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      {booking.event_date 
                        ? new Date(booking.event_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {booking.created_at 
                        ? new Date(booking.created_at).toLocaleDateString('en-IN')
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleRestoreBooking?.(booking.id, booking.source)}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Restore
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {showArchived && archivedBookings.length === 0 && (
        <Card className="mt-2 border-gray-200">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Archive className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No archived bookings</p>
          </CardContent>
        </Card>
      )}
    </div>
    </>
  )
}
