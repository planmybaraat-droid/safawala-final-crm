"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Barcode as BarcodeIcon, 
  Search, 
  Plus, 
  Trash2, 
  Package, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Scan
} from "lucide-react"
import { toast } from "sonner"
import { checkBarcodeAvailability } from "@/lib/barcode-assignment-utils"
import { BarcodeScannerDialog } from "@/components/barcode-scanner-dialog"

interface ManualBarcodeAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
  bookingType: 'package' | 'product'
  franchiseId: string
  userId?: string
  onSuccess?: () => void
}

interface AvailableBarcode {
  id: string
  barcode_number: string
  product_id: string
  product_name: string
  product_code: string
  sequence_number: number
}

interface AssignedBarcode {
  id: string
  barcode_number: string
  product_name: string
  assignment_id: string
}

export function ManualBarcodeAssignmentDialog({
  open,
  onOpenChange,
  bookingId,
  bookingType,
  franchiseId,
  userId,
  onSuccess
}: ManualBarcodeAssignmentDialogProps) {
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [availableBarcodes, setAvailableBarcodes] = useState<AvailableBarcode[]>([])
  const [assignedBarcodes, setAssignedBarcodes] = useState<AssignedBarcode[]>([])
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([])
  const [selectedToRemove, setSelectedToRemove] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'add' | 'remove'>('add')
  const [showScanner, setShowScanner] = useState(false)

  useEffect(() => {
    if (open) {
      fetchAvailableBarcodes()
      fetchAssignedBarcodes()
    } else {
      // Reset state when closed
      setSearchTerm("")
      setSelectedToAdd([])
      setSelectedToRemove([])
      setActiveTab('add')
      setShowScanner(false)
    }
  }, [open, bookingId])

  const fetchAvailableBarcodes = async () => {
    try {
      setLoading(true)
      
      // Fetch all available barcodes for this franchise
      const response = await fetch(`/api/barcodes/available?franchise_id=${franchiseId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch available barcodes')
      }
      
      const data = await response.json()
      setAvailableBarcodes(data.barcodes || [])
    } catch (error: any) {
      console.error('[Manual Assignment] Error fetching available barcodes:', error)
      toast.error(error.message || 'Failed to load available barcodes')
    } finally {
      setLoading(false)
    }
  }

  const fetchAssignedBarcodes = async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/barcodes?type=${bookingType}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch assigned barcodes')
      }
      
      const data = await response.json()
      
      if (data.success && data.barcodes) {
        setAssignedBarcodes(data.barcodes.map((b: any) => ({
          id: b.barcode_id,
          barcode_number: b.barcode_number,
          product_name: b.product_name,
          assignment_id: b.id
        })))
      }
    } catch (error: any) {
      console.error('[Manual Assignment] Error fetching assigned barcodes:', error)
    }
  }

  const handleAddBarcodes = async () => {
    if (selectedToAdd.length === 0) {
      toast.error('Please select at least one barcode to add')
      return
    }

    try {
      setLoading(true)
      
      const barcodesToAdd = availableBarcodes.filter(b => selectedToAdd.includes(b.id))
      const barcodeNumbers = barcodesToAdd.map(b => b.barcode_number)
      const productId = barcodesToAdd[0]?.product_id // Assuming same product for simplicity
      
      const response = await fetch(`/api/bookings/${bookingId}/barcodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcodes: barcodeNumbers,
          product_id: productId,
          booking_type: bookingType,
          user_id: userId,
          franchise_id: franchiseId
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to assign barcodes')
      }
      
      toast.success(`Successfully assigned ${selectedToAdd.length} barcode(s)`)
      setSelectedToAdd([])
      await fetchAvailableBarcodes()
      await fetchAssignedBarcodes()
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error('[Manual Assignment] Error adding barcodes:', error)
      toast.error(error.message || 'Failed to assign barcodes')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveBarcodes = async () => {
    if (selectedToRemove.length === 0) {
      toast.error('Please select at least one barcode to remove')
      return
    }

    try {
      setLoading(true)
      
      const assignmentIds = assignedBarcodes
        .filter(b => selectedToRemove.includes(b.id))
        .map(b => b.assignment_id)
      
      const response = await fetch(`/api/bookings/${bookingId}/barcodes`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment_ids: assignmentIds })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove barcodes')
      }
      
      toast.success(`Successfully removed ${selectedToRemove.length} barcode(s)`)
      setSelectedToRemove([])
      await fetchAvailableBarcodes()
      await fetchAssignedBarcodes()
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error('[Manual Assignment] Error removing barcodes:', error)
      toast.error(error.message || 'Failed to remove barcodes')
    } finally {
      setLoading(false)
    }
  }

  const filteredAvailable = availableBarcodes.filter(b =>
    b.barcode_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredAssigned = assignedBarcodes.filter(b =>
    b.barcode_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleBarcodeScanned = async (barcodeNumber: string) => {
    // Find the barcode in available list
    const barcode = availableBarcodes.find(b => b.barcode_number === barcodeNumber)
    
    if (!barcode) {
      toast.error(`Barcode ${barcodeNumber} not found or not available`)
      return
    }

    // Check if already selected
    if (selectedToAdd.includes(barcode.id)) {
      toast.info(`Barcode ${barcodeNumber} already selected`)
      return
    }

    // Add to selection
    setSelectedToAdd(prev => [...prev, barcode.id])
    toast.success(`Added ${barcodeNumber} to selection`)
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarcodeIcon className="h-5 w-5" />
            Manage Barcodes
          </DialogTitle>
          <DialogDescription>
            Manually add or remove specific barcodes from this booking
          </DialogDescription>
        </DialogHeader>

        {/* Tab Switcher */}
        <div className="flex gap-2 border-b">
          <Button
            variant={activeTab === 'add' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('add')}
            className="flex-1"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Barcodes
          </Button>
          <Button
            variant={activeTab === 'remove' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('remove')}
            className="flex-1"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove Barcodes
          </Button>
        </div>

        {/* Scanner Button */}
        {activeTab === 'add' && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowScanner(true)}
            >
              <Scan className="h-4 w-4 mr-2" />
              Scan Barcode
            </Button>
          </div>
        )}

        {/* Search Bar */}
        <div className="space-y-2">
          <Label>Search Barcodes</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by barcode number or product name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 pr-4">
          {activeTab === 'add' ? (
            <div className="space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredAvailable.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No available barcodes found</p>
                </div>
              ) : (
                filteredAvailable.map((barcode) => (
                  <div
                    key={barcode.id}
                    className={`flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer ${
                      selectedToAdd.includes(barcode.id) ? 'bg-accent' : ''
                    }`}
                    onClick={() => {
                      setSelectedToAdd(prev =>
                        prev.includes(barcode.id)
                          ? prev.filter(id => id !== barcode.id)
                          : [...prev, barcode.id]
                      )
                    }}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Checkbox
                        checked={selectedToAdd.includes(barcode.id)}
                        onCheckedChange={() => {}}
                      />
                      <div>
                        <div className="font-mono text-sm font-semibold">{barcode.barcode_number}</div>
                        <div className="text-xs text-muted-foreground">{barcode.product_name}</div>
                      </div>
                    </div>
                    <Badge variant="secondary">Available</Badge>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAssigned.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No barcodes assigned to this booking</p>
                </div>
              ) : (
                filteredAssigned.map((barcode) => (
                  <div
                    key={barcode.id}
                    className={`flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer ${
                      selectedToRemove.includes(barcode.id) ? 'bg-accent' : ''
                    }`}
                    onClick={() => {
                      setSelectedToRemove(prev =>
                        prev.includes(barcode.id)
                          ? prev.filter(id => id !== barcode.id)
                          : [...prev, barcode.id]
                      )
                    }}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Checkbox
                        checked={selectedToRemove.includes(barcode.id)}
                        onCheckedChange={() => {}}
                      />
                      <div>
                        <div className="font-mono text-sm font-semibold">{barcode.barcode_number}</div>
                        <div className="text-xs text-muted-foreground">{barcode.product_name}</div>
                      </div>
                    </div>
                    <Badge variant="default">Assigned</Badge>
                  </div>
                ))
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="flex-row gap-2 justify-between">
          <div className="text-sm text-muted-foreground">
            {activeTab === 'add' ? (
              <span>{selectedToAdd.length} selected to add</span>
            ) : (
              <span>{selectedToRemove.length} selected to remove</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {activeTab === 'add' ? (
              <Button 
                onClick={handleAddBarcodes} 
                disabled={loading || selectedToAdd.length === 0}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add {selectedToAdd.length > 0 && `(${selectedToAdd.length})`}
              </Button>
            ) : (
              <Button 
                variant="destructive"
                onClick={handleRemoveBarcodes} 
                disabled={loading || selectedToRemove.length === 0}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Remove {selectedToRemove.length > 0 && `(${selectedToRemove.length})`}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Barcode Scanner Dialog */}
    <BarcodeScannerDialog
      open={showScanner}
      onOpenChange={setShowScanner}
      onScan={handleBarcodeScanned}
      title="Scan Barcode to Add"
      description="Scan or enter barcode numbers to add to this booking"
    />
    </>
  )
}
