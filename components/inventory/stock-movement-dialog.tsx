"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Plus, 
  Minus, 
  AlertTriangle, 
  Wrench, 
  Package, 
  ArrowUp, 
  ArrowDown,
  Calendar,
  User,
  FileText
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ToastService } from "@/lib/toast-service"
import { format } from "date-fns"

interface Product {
  id: string
  product_code?: string
  barcode?: string
  name: string
  stock_total: number
  stock_available: number
  stock_booked: number
  stock_damaged: number
  stock_in_laundry: number
}

interface InventoryTransaction {
  id: string
  transaction_type: "in" | "out" | "adjustment" | "damage" | "repair"
  quantity: number
  unit_price?: number
  total_value?: number
  reference_type?: string
  reference_id?: string
  notes?: string
  created_at: string
  created_by?: string
  products?: {
    id: string
    name: string
    product_code: string
  }
}

interface StockMovementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
  onMovementCreated?: () => void
}

export function StockMovementDialog({ 
  open, 
  onOpenChange, 
  product, 
  onMovementCreated 
}: StockMovementDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [formData, setFormData] = useState({
    transaction_type: "",
    quantity: "",
    unit_price: "",
    reference_type: "",
    reference_id: "",
    notes: ""
  })

  useEffect(() => {
    if (open && product) {
      fetchTransactions()
    }
  }, [open, product])

  const fetchTransactions = async () => {
    if (!product) return

    setLoadingTransactions(true)
    try {
      const response = await fetch(`/api/inventory/transactions?product_id=${product.id}`)
      const data = await response.json()
      
      if (data.success) {
        setTransactions(data.data || [])
      } else {
      }
    } catch (error) {
    } finally {
      setLoadingTransactions(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!product) {
      ToastService.error('Product information is missing')
      return
    }
    
    if (!formData.transaction_type) {
      ToastService.error('Please select a transaction type')
      return
    }
    
    if (!formData.quantity) {
      ToastService.error('Please enter quantity')
      return
    }

    const quantity = parseInt(formData.quantity)
    if (isNaN(quantity) || quantity <= 0) {
      ToastService.error('Please enter a valid positive quantity')
      return
    }

    // Check if sufficient stock is available for "out" transactions
    if (formData.transaction_type === 'out' && quantity > product.stock_available) {
      ToastService.error(`Insufficient stock. Available: ${product.stock_available}, Requested: ${quantity}`)
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/inventory/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          product_id: product.id,
          transaction_type: formData.transaction_type,
          quantity: quantity,
          unit_price: formData.unit_price ? parseFloat(formData.unit_price) : null,
          reference_type: formData.reference_type || null,
          reference_id: formData.reference_id || null,
          notes: formData.notes || null
        })
      })

      if (response.ok) {
        const data = await response.json()
        ToastService.operations.inventoryUpdated()
        
        // Reset form
        setFormData({
          transaction_type: "",
          quantity: "",
          unit_price: "",
          reference_type: "",
          reference_id: "",
          notes: ""
        })
        fetchTransactions()
        onMovementCreated?.()
      } else {
        await ToastService.handleApiError(response, 'record stock movement')
      }
    } catch (error: any) {
      ToastService.operations.inventoryUpdateFailed('Unable to connect to server. Please check your internet connection.')
    } finally {
      setLoading(false)
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "in": return <ArrowUp className="h-4 w-4 text-green-600" />
      case "out": return <ArrowDown className="h-4 w-4 text-blue-600" />
      case "damage": return <AlertTriangle className="h-4 w-4 text-red-600" />
      case "repair": return <Wrench className="h-4 w-4 text-orange-600" />
      case "adjustment": return <Package className="h-4 w-4 text-purple-600" />
      default: return <Package className="h-4 w-4" />
    }
  }

  const getTransactionBadge = (type: string) => {
    const config = {
      in: { label: "Stock In", variant: "default" as const },
      out: { label: "Stock Out", variant: "secondary" as const },
      damage: { label: "Damage", variant: "destructive" as const },
      repair: { label: "Repair", variant: "outline" as const },
      adjustment: { label: "Adjustment", variant: "outline" as const }
    }
    const conf = config[type as keyof typeof config] || config.adjustment
    return <Badge variant={conf.variant}>{conf.label}</Badge>
  }

  if (!product) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Stock Movement - {product.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Stock Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Current Stock Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{product.stock_total}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{product.stock_available}</div>
                  <div className="text-xs text-muted-foreground">Available</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{product.stock_booked}</div>
                  <div className="text-xs text-muted-foreground">Booked</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{product.stock_damaged}</div>
                  <div className="text-xs text-muted-foreground">Damaged</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">{product.stock_in_laundry}</div>
                  <div className="text-xs text-muted-foreground">In Laundry</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="new-movement" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="new-movement">New Movement</TabsTrigger>
              <TabsTrigger value="history">Movement History</TabsTrigger>
            </TabsList>

            <TabsContent value="new-movement" className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="transaction_type">Transaction Type *</Label>
                    <Select 
                      value={formData.transaction_type} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, transaction_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select transaction type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in">Stock In</SelectItem>
                        <SelectItem value="out">Stock Out</SelectItem>
                        <SelectItem value="damage">Mark as Damaged</SelectItem>
                        <SelectItem value="repair">Repair/Return</SelectItem>
                        <SelectItem value="adjustment">Stock Adjustment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                      placeholder="Enter quantity"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="unit_price">Unit Price</Label>
                    <Input
                      id="unit_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.unit_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit_price: e.target.value }))}
                      placeholder="Enter unit price"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reference_type">Reference Type</Label>
                    <Select 
                      value={formData.reference_type} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, reference_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select reference type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="purchase">Purchase</SelectItem>
                        <SelectItem value="booking">Booking</SelectItem>
                        <SelectItem value="return">Return</SelectItem>
                        <SelectItem value="adjustment">Adjustment</SelectItem>
                        <SelectItem value="damage">Damage Report</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference_id">Reference ID</Label>
                  <Input
                    id="reference_id"
                    value={formData.reference_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, reference_id: e.target.value }))}
                    placeholder="Enter reference ID (booking number, etc.)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Enter additional notes..."
                    rows={3}
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Recording..." : "Record Movement"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <div className="max-h-96 overflow-y-auto">
                {loadingTransactions ? (
                  <div className="text-center py-8">Loading transactions...</div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No stock movements recorded yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {format(new Date(transaction.created_at), "MMM dd, yyyy HH:mm")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getTransactionIcon(transaction.transaction_type)}
                              {getTransactionBadge(transaction.transaction_type)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`font-medium ${
                              transaction.transaction_type === "in" ? "text-green-600" : 
                              transaction.transaction_type === "out" ? "text-blue-600" :
                              transaction.transaction_type === "damage" ? "text-red-600" :
                              "text-orange-600"
                            }`}>
                              {transaction.transaction_type === "in" ? "+" : "-"}{transaction.quantity}
                            </span>
                          </TableCell>
                          <TableCell>
                            {transaction.total_value ? (
                              <span className="text-sm">₹{transaction.total_value.toLocaleString()}</span>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {transaction.reference_type && transaction.reference_id ? (
                              <div className="text-sm">
                                <div className="font-medium">{transaction.reference_type}</div>
                                <div className="text-muted-foreground">{transaction.reference_id}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {transaction.notes ? (
                              <div className="flex items-start space-x-2">
                                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <span className="text-sm">{transaction.notes}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
