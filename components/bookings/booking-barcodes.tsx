"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Package, 
  CheckCircle, 
  Truck, 
  RotateCcw, 
  AlertCircle,
  Barcode as BarcodeIcon,
  RefreshCw,
  Plus,
  Edit
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ManualBarcodeAssignmentDialog } from "./manual-barcode-assignment-dialog"

interface BookingBarcodesProps {
  bookingId: string
  bookingType: 'package' | 'product'
  franchiseId?: string
  userId?: string
}

interface BarcodeAssignment {
  id: string
  barcode_id: string
  barcode_number: string
  product_id: string
  product_name: string
  product_code: string
  product_category: string
  status: 'assigned' | 'delivered' | 'with_customer' | 'returned' | 'completed'
  assigned_at: string
  delivered_at?: string
  returned_at?: string
  completed_at?: string
  assigned_by_name?: string
}

interface BarcodeStats {
  total_assigned: number
  total_delivered: number
  total_with_customer: number
  total_returned: number
  total_completed: number
  total_pending: number
}

export function BookingBarcodes({ bookingId, bookingType, franchiseId, userId }: BookingBarcodesProps) {
  const { toast } = useToast()
  const [barcodes, setBarcodes] = useState<BarcodeAssignment[]>([])
  const [stats, setStats] = useState<BarcodeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showManualAssignment, setShowManualAssignment] = useState(false)

  const fetchBarcodes = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/bookings/${bookingId}/barcodes?type=${bookingType}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch barcodes')
      }
      
      const data = await response.json()
      
      if (data.success) {
        setBarcodes(data.barcodes || [])
        setStats(data.stats || null)
      } else {
        throw new Error(data.error || 'Failed to fetch barcodes')
      }
    } catch (err: any) {
      console.error('[Booking Barcodes] Error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (bookingId) {
      fetchBarcodes()
    }
  }, [bookingId, bookingType])

  const getStatusBadge = (status: string, returned_at?: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string; color: string }> = {
      assigned: { variant: 'secondary', icon: CheckCircle, label: 'Assigned', color: 'bg-gray-100 text-gray-700' },
      delivered: { variant: 'default', icon: Truck, label: 'Delivered', color: 'bg-blue-100 text-blue-700' },
      with_customer: { variant: 'default', icon: Package, label: 'With Customer', color: 'bg-purple-100 text-purple-700' },
      returned: { variant: 'default', icon: RotateCcw, label: 'Rental Completed', color: 'bg-green-100 text-green-700' },
      completed: { variant: 'outline', icon: CheckCircle, label: 'Completed', color: 'bg-gray-100 text-gray-500' },
    }
    
    const config = variants[status] || { variant: 'secondary', icon: AlertCircle, label: status, color: 'bg-gray-100 text-gray-700' }
    const Icon = config.icon
    
    // Show 'Rental Completed' badge for returned/completed status
    if (status === 'returned' || status === 'completed') {
      return (
        <div className="flex items-center gap-2">
          <Badge className="bg-green-500 text-white text-[10px] px-2 py-0.5 h-5">
            <RotateCcw className="h-3 w-3 mr-1" />
            Rental Completed
          </Badge>
          {returned_at && (
            <span className="text-[10px] text-gray-500">
              {new Date(returned_at).toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true 
              })}
            </span>
          )}
        </div>
      )
    }
    
    // Show 'In Progress' badge for other statuses
    return (
      <Badge className="bg-orange-500 text-white text-[10px] px-2 py-0.5 h-5">
        <Icon className="h-3 w-3 mr-1" />
        In Progress
      </Badge>
    )
  }

  const handleRefresh = () => {
    fetchBarcodes()
    toast({ title: 'Refreshed', description: 'Barcode data updated' })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="bg-amber-50 dark:bg-amber-950">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarcodeIcon className="h-5 w-5" />
            📊 Assigned Barcodes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="bg-amber-50 dark:bg-amber-950">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarcodeIcon className="h-5 w-5" />
            📊 Assigned Barcodes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!barcodes || barcodes.length === 0) {
    return (
      <Card>
        <CardHeader className="bg-amber-50 dark:bg-amber-950">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarcodeIcon className="h-5 w-5" />
            📊 Assigned Barcodes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-center py-6 text-muted-foreground">
            <BarcodeIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No barcodes assigned to this booking yet</p>
            <p className="text-xs mt-1">Barcodes will be auto-assigned when products are added</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Group barcodes by product
  const groupedBarcodes = barcodes.reduce((acc, barcode) => {
    const key = barcode.product_id || 'unknown'
    if (!acc[key]) {
      acc[key] = {
        product_name: barcode.product_name,
        product_code: barcode.product_code,
        product_category: barcode.product_category,
        barcodes: []
      }
    }
    acc[key].barcodes.push(barcode)
    return acc
  }, {} as Record<string, { product_name: string; product_code: string; product_category: string; barcodes: BarcodeAssignment[] }>)
  return (
    <>
      <Card>
        <CardHeader className="bg-amber-50 dark:bg-amber-950">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarcodeIcon className="h-5 w-5" />
              📊 Assigned Barcodes
            </CardTitle>
            <div className="flex items-center gap-2">
              {franchiseId && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowManualAssignment(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Manage
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Stats Overview */}
          {stats && (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total_assigned}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.total_delivered}</div>
                <div className="text-xs text-muted-foreground">Delivered</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.total_with_customer}</div>
                <div className="text-xs text-muted-foreground">With Customer</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.total_returned}</div>
                <div className="text-xs text-muted-foreground">Rental Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{stats.total_completed}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.total_pending}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
            </div>
          )}

          {/* Grouped Barcodes by Product */}
          <div className="space-y-4">
            {Object.entries(groupedBarcodes).map(([productId, group]) => (
              <div key={productId} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold">{group.product_name}</h4>
                    <p className="text-xs text-muted-foreground">{group.product_code}</p>
                  </div>
                  <Badge variant="secondary">{group.barcodes.length} items</Badge>
                </div>
                
                <div className="grid gap-2">
                  {group.barcodes.map((barcode) => (
                    <div 
                      key={barcode.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm border border-gray-200 dark:border-gray-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 font-mono text-base font-semibold">
                          <BarcodeIcon className="h-4 w-4 text-gray-500" />
                          {barcode.barcode_number}
                        </div>
                      </div>
                      <div>
                        {getStatusBadge(barcode.status, barcode.returned_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Manual Assignment Dialog */}
      {franchiseId && (
        <ManualBarcodeAssignmentDialog
          open={showManualAssignment}
          onOpenChange={setShowManualAssignment}
          bookingId={bookingId}
          bookingType={bookingType}
          franchiseId={franchiseId}
          userId={userId}
          onSuccess={fetchBarcodes}
        />
      )}
    </>
  )
}
