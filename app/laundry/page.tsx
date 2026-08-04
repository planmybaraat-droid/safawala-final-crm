"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import {
  Plus,
  Search,
  Eye,
  Package,
  Truck,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  ArrowLeft,
  Trash2,
  X,
  RefreshCw,
  CalendarRange,
  Edit,
  FileText,
  ChevronsUpDown,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Vendor {
  id: string
  name: string
  contact_person: string
  phone: string
  email: string
  service_type: string
  pricing_per_item?: number
  notes: string
  is_active: boolean
}

interface LaundryBatch {
  id: string
  batch_number: string
  vendor_name: string
  status: string
  total_items: number
  total_cost: number
  sent_date: string
  expected_return_date: string
  actual_return_date: string | null
  notes: string
  categories: string
  item_types_count: number
}

interface BatchItem {
  id: string
  product_name: string
  product_category: string
  quantity: number
  condition_before: string
  condition_after: string | null
  unit_cost: number
  total_cost: number
  notes: string
}

interface Product {
  id: string
  name: string
  category: string
  price?: number
}

interface NewBatchItem {
  product_id: string | null
  product_name: string
  product_category: string
  quantity: number
  unit_cost: number
  total_cost: number
  condition_before: string
  notes: string
}

export default function LaundryPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [batches, setBatches] = useState<LaundryBatch[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [usingMockData, setUsingMockData] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState<{
    from: string
    to: string
  } | null>(null)
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [selectedBatch, setSelectedBatch] = useState<LaundryBatch | null>(null)
  const [batchItems, setBatchItems] = useState<BatchItem[]>([])
  const [showCreateBatch, setShowCreateBatch] = useState(false)
  const [showBatchDetails, setShowBatchDetails] = useState(false)
  const [creating, setCreating] = useState(false)
  const [isAddingVendor, setIsAddingVendor] = useState(false)
  const [showAddVendorDialog, setShowAddVendorDialog] = useState(false)

  const [editingBatch, setEditingBatch] = useState<LaundryBatch | null>(null)
  const [showEditBatch, setShowEditBatch] = useState(false)
  const [editBatchItems, setEditBatchItems] = useState<BatchItem[]>([])
  const [editSelectedProduct, setEditSelectedProduct] = useState("")
  const [editProductSearchOpen, setEditProductSearchOpen] = useState(false)
  const [editProductSearchTerm, setEditProductSearchTerm] = useState("")
  const [editItemQuantity, setEditItemQuantity] = useState(1)
  const [editItemCondition, setEditItemCondition] = useState("dirty")
  const [editItemNotes, setEditItemNotes] = useState("")
  const [editItemCost, setEditItemCost] = useState("")

  // New batch form state
  const [newBatch, setNewBatch] = useState({
    vendor_id: "",
    sent_date: new Date().toISOString().split("T")[0],
    expected_return_date: "",
    notes: "",
    special_instructions: "",
  })

  const [newBatchItems, setNewBatchItems] = useState<NewBatchItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState("")
  const [productSearchOpen, setProductSearchOpen] = useState(false)
  const [productSearchTerm, setProductSearchTerm] = useState("")
  const [itemQuantity, setItemQuantity] = useState(1)
  const [itemCondition, setItemCondition] = useState("dirty")
  const [itemNotes, setItemNotes] = useState("")
  const [itemCost, setItemCost] = useState("")

  const [newVendor, setNewVendor] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    service_type: "laundry",
    notes: "",
  })

  const [customProductName, setCustomProductName] = useState("")
  const [showCustomProduct, setShowCustomProduct] = useState(false)
  const [batchNote, setBatchNote] = useState("")
  const [addingNote, setAddingNote] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      let vendorsData: Vendor[] = []
      let batchesData: LaundryBatch[] = []
      let productsData: Product[] = []
      let hasErrors = false

      // Fetch vendors from API (handles RLS and authentication)
      try {
        const vendorsResponse = await fetch("/api/vendors?status=active", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        })

        if (vendorsResponse.ok) {
          const vendorsResult = await vendorsResponse.json()
          vendorsData = vendorsResult.vendors || []
          console.log("Vendors loaded via API:", vendorsData.length)
        } else {
          console.error("Vendors API error:", vendorsResponse.status)
          hasErrors = true
        }
      } catch (error) {
        console.error("Vendors fetch failed:", error)
        hasErrors = true
      }

      // Try to fetch batches via API
      try {
        const batchesResponse = await fetch("/api/laundry", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        })

        if (batchesResponse.ok) {
          batchesData = await batchesResponse.json()
          console.log("Batches loaded via API:", batchesData.length)
        } else {
          console.error("Batches API error:", batchesResponse.status)
          hasErrors = true
        }
      } catch (error) {
        console.error("Batches fetch failed:", error)
        hasErrors = true
      }

      // Try to fetch products
      try {
        const { data: productsResult, error: productsError } = await supabase
          .from("products")
          .select("id, name, category, price")

        if (productsError) {
          console.error("Products error:", productsError)
          hasErrors = true
        } else {
          productsData = productsResult || []
        }
      } catch (error) {
        console.error("Products fetch failed:", error)
        hasErrors = true
      }

      if (hasErrors) {
        console.warn("Some data failed to load, using available data")
        setUsingMockData(true)
      }

      setVendors(vendorsData)
      setBatches(batchesData)
      setProducts(productsData)
      setUsingMockData(hasErrors)

      if (!hasErrors) {
        toast({
          title: "Data loaded successfully",
          description: `Loaded ${batchesData.length} batches, ${vendorsData.length} vendors.`,
        })
      }
    } catch (error: any) {
      console.error("Database error:", error)

      // Set empty arrays instead of mock data
      setVendors([])
      setBatches([])
      setProducts([])
      setUsingMockData(true)

      toast({
        title: "Database Error",
        description: "Failed to load data. Please check database configuration.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchBatchItems = async (batchId: string) => {
    try {
      const response = await fetch(`/api/laundry/items?batch_id=${batchId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch batch items")
      }

      const data = await response.json()
      setBatchItems(data || [])
    } catch (error) {
      console.error("Error fetching batch items:", error)
      setBatchItems([])
      toast({
        title: "Error",
        description: "Failed to load batch items.",
        variant: "destructive",
      })
    }
  }

  const handleViewBatch = async (batch: LaundryBatch) => {
    setSelectedBatch(batch)
    await fetchBatchItems(batch.id)
    setShowBatchDetails(true)
  }

  const handleEditBatch = async (batch: LaundryBatch) => {
    setEditingBatch(batch)
    await fetchBatchItems(batch.id)
    setEditBatchItems(batchItems)
    setShowEditBatch(true)
  }

  const addEditItemToBatch = () => {
    if (!editSelectedProduct && !showCustomProduct) {
      toast({
        title: "Error",
        description: "Please select a product",
        variant: "destructive",
      })
      return
    }

    if (showCustomProduct && !customProductName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a custom product name",
        variant: "destructive",
      })
      return
    }

    if (!editItemCost || Number.parseFloat(editItemCost) <= 0) {
      toast({
        title: "Error",
        description: "Please enter the laundry charge",
        variant: "destructive",
      })
      return
    }

    let productData
    if (showCustomProduct) {
      productData = {
        id: null,
        name: customProductName.trim(),
        category: "Custom",
      }
    } else {
      const product = products.find((p) => p.id === editSelectedProduct)
      if (!product) return
      productData = product
    }

    if (!editingBatch) return
    const totalCost = Number.parseFloat(editItemCost) || 0

    const newItem: BatchItem = {
      id: `temp-${Date.now()}`,
      product_name: productData.name,
      product_category: productData.category,
      quantity: editItemQuantity,
      unit_cost: totalCost,
      total_cost: totalCost,
      condition_before: editItemCondition,
      condition_after: null,
      notes: editItemNotes,
    }

    setEditBatchItems([...editBatchItems, newItem])

    // Reset form
    setEditSelectedProduct("")
    setEditProductSearchTerm("")
    setEditProductSearchOpen(false)
    setCustomProductName("")
    setShowCustomProduct(false)
    setEditItemQuantity(1)
    setEditItemCondition("dirty")
    setEditItemNotes("")
    setEditItemCost("")
  }

  const removeEditItemFromBatch = (index: number) => {
    setEditBatchItems(editBatchItems.filter((_, i) => i !== index))
  }

  const handleSaveBatchEdit = async () => {
    if (!editingBatch) return

    try {
      setCreating(true)

      // Calculate totals
      const totalItems = editBatchItems.reduce((sum, item) => sum + item.quantity, 0)
      const totalCost = editBatchItems.reduce((sum, item) => sum + item.total_cost, 0)

      // Prepare items for API
      const itemsToSave = editBatchItems.map((item) => ({
        product_id: item.id.startsWith("temp-") ? null : item.id,
        product_name: item.product_name,
        product_category: item.product_category,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total_cost: item.total_cost,
        condition_before: item.condition_before,
        notes: item.notes,
      }))

      // Update via API
      const response = await fetch("/api/laundry/items", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          batch_id: editingBatch.id,
          items: itemsToSave,
          total_items: totalItems,
          total_cost: totalCost,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update batch")
      }

      toast({
        title: "Batch updated",
        description: `Batch ${editingBatch.batch_number} has been updated successfully.`,
      })

      setShowEditBatch(false)
      setEditingBatch(null)
      setEditBatchItems([])
      fetchData()
    } catch (error: any) {
      console.error("Error updating batch:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update batch. Please try again.",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const generateBatchNumber = () => {
    const prefix = "LB"
    const timestamp = Date.now().toString().slice(-6)
    return `${prefix}${timestamp}`
  }

  const addItemToBatch = () => {
    if (!selectedProduct && !showCustomProduct) {
      toast({
        title: "Error",
        description: "Please select a product or enter a custom product name",
        variant: "destructive",
      })
      return
    }

    if (showCustomProduct && !customProductName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a custom product name",
        variant: "destructive",
      })
      return
    }

    if (!itemCost.trim()) {
      toast({
        title: "Error",
        description: "Please enter laundry charge",
        variant: "destructive",
      })
      return
    }

    let productData
    if (showCustomProduct) {
      productData = {
        id: null,
        name: customProductName.trim(),
        category: "Custom",
      }
    } else {
      const product = products.find((p) => p.id === selectedProduct)
      if (!product) return
      productData = product
    }

    const totalCost = Number.parseFloat(itemCost) || 0

    const newItem: NewBatchItem = {
      product_id: productData.id,
      product_name: productData.name,
      product_category: productData.category,
      quantity: itemQuantity,
      unit_cost: totalCost,
      total_cost: totalCost,
      condition_before: itemCondition,
      notes: itemNotes,
    }

    setNewBatchItems([...newBatchItems, newItem])

    // Reset form
    setSelectedProduct("")
    setProductSearchOpen(false)
    setProductSearchTerm("")
    setCustomProductName("")
    setShowCustomProduct(false)
    setItemQuantity(1)
    setItemCondition("dirty")
    setItemNotes("")
    setItemCost("")
  }

  const removeItemFromBatch = (index: number) => {
    setNewBatchItems(newBatchItems.filter((_, i) => i !== index))
  }

  const getTotalBatchCost = () => {
    return newBatchItems.reduce((sum, item) => sum + item.total_cost, 0)
  }

  const getTotalBatchItems = () => {
    return newBatchItems.reduce((sum, item) => sum + item.quantity, 0)
  }

  const resetBatchForm = () => {
    setNewBatch({
      vendor_id: "",
      sent_date: new Date().toISOString().split("T")[0],
      expected_return_date: "",
      notes: "",
      special_instructions: "",
    })
    setNewBatchItems([])
    setSelectedProduct("")
    setCustomProductName("")
    setShowCustomProduct(false)
    setItemQuantity(1)
    setItemCondition("dirty")
    setItemNotes("")
    setItemCost("")
  }

  const handleCreateBatch = async () => {
    if (newBatchItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to the batch",
        variant: "destructive",
      })
      return
    }

    if (!newBatch.vendor_id) {
      toast({
        title: "Error",
        description: "Please select a vendor",
        variant: "destructive",
      })
      return
    }

    try {
      setCreating(true)

      const selectedVendor = vendors.find((v) => v.id === newBatch.vendor_id)
      const batchNumber = generateBatchNumber()

      // Create batch via API to avoid RLS issues
      const batchPayload = {
        batch: {
          batch_number: batchNumber,
          vendor_id: newBatch.vendor_id,
          vendor_name: selectedVendor?.name || "",
          status: "in_progress",
          sent_date: newBatch.sent_date,
          expected_return_date: newBatch.expected_return_date,
          notes: newBatch.notes,
          special_instructions: newBatch.special_instructions,
          total_items: getTotalBatchItems(),
          total_cost: getTotalBatchCost(),
        },
        items: newBatchItems.map((item) => ({
          product_id: item.product_id === null ? null : item.product_id,
          product_name: item.product_name,
          product_category: item.product_category,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          total_cost: item.total_cost,
          condition_before: item.condition_before,
          notes: item.notes,
        })),
      }

      const response = await fetch("/api/laundry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(batchPayload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create batch")
      }

      toast({
        title: "Batch created successfully",
        description: `Batch ${batchNumber} has been created with ${getTotalBatchItems()} items and is now in progress.`,
      })

      setShowCreateBatch(false)
      resetBatchForm()
      fetchData()
    } catch (error: any) {
      console.error("Error creating batch:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create batch. Please try again.",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const handleStatusUpdate = async (batch: LaundryBatch, newStatus: string) => {
    try {
      setCreating(true)

      const updateData = {
        id: batch.id,
        status: newStatus,
        ...(newStatus === "cancelled" && { total_cost: 0 }),
      }

      const response = await fetch("/api/laundry", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update status")
      }

      if (newStatus === "returned") {
        toast({
          title: "Batch returned",
          description: `Batch ${batch.batch_number} has been returned successfully.`,
        })
      } else if (newStatus === "cancelled") {
        toast({
          title: "Batch cancelled",
          description: `Batch ${batch.batch_number} has been cancelled and total cost reset to ₹0.`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Status updated",
          description: `Batch ${batch.batch_number} status changed to ${newStatus.replace("_", " ")}.`,
        })
      }

      fetchData()
    } catch (error: any) {
      console.error("Error updating status:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update status. Please try again.",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const handleAddNote = async () => {
    if (!selectedBatch || !batchNote.trim()) {
      toast({
        title: "Error",
        description: "Please enter a note",
        variant: "destructive",
      })
      return
    }

    try {
      setAddingNote(true)

      // Append to existing notes with timestamp
      const timestamp = new Date().toLocaleString()
      const updatedNotes = selectedBatch.notes
        ? `${selectedBatch.notes}\n\n[${timestamp}] ${batchNote.trim()}`
        : `[${timestamp}] ${batchNote.trim()}`

      const { error } = await supabase
        .from("laundry_batches")
        .update({ notes: updatedNotes })
        .eq("id", selectedBatch.id)

      if (error) throw error

      toast({
        title: "Note added",
        description: "Your note has been added to the batch.",
      })

      setBatchNote("")
      
      // Refresh the batch data
      const updatedBatch = { ...selectedBatch, notes: updatedNotes }
      setSelectedBatch(updatedBatch)
      fetchData()
    } catch (error: any) {
      console.error("Error adding note:", error)
      toast({
        title: "Error",
        description: "Failed to add note. Please try again.",
        variant: "destructive",
      })
    } finally {
      setAddingNote(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />
      case "in_progress":
        return <Truck className="h-4 w-4" />
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      case "returned":
        return <Package className="h-4 w-4" />
      case "cancelled":
        return <X className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "in_progress":
        return "bg-blue-100 text-blue-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "returned":
        return "bg-purple-100 text-purple-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredBatches = batches.filter((batch) => {
    const matchesSearch =
      batch.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.vendor_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || batch.status === statusFilter
    
    // Date filter logic
    let matchesDate = true
    if (dateFilter?.from || dateFilter?.to) {
      const batchDate = new Date(batch.sent_date)
      if (dateFilter.from) {
        const fromDate = new Date(dateFilter.from)
        matchesDate = matchesDate && batchDate >= fromDate
      }
      if (dateFilter.to) {
        const toDate = new Date(dateFilter.to)
        matchesDate = matchesDate && batchDate <= toDate
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate
  })

  const paginatedBatches = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredBatches.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredBatches, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredBatches.length / itemsPerPage)

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-lg">Loading laundry management...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (window.location.href = "/dashboard")}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Laundry Management</h1>
            <p className="text-muted-foreground">Manage laundry batches and vendor relationships</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="flex items-center">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={showCreateBatch} onOpenChange={setShowCreateBatch}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Batch
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Laundry Batch</DialogTitle>
                <DialogDescription>Create a new batch to send items to a laundry vendor</DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Batch Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="vendor">Vendor</Label>
                    <Select
                      value={newBatch.vendor_id}
                      onValueChange={(value) => setNewBatch({ ...newBatch, vendor_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{vendor.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {vendor.contact_person} • {vendor.phone} • {vendor.service_type}
                                {vendor.pricing_per_item && ` • ₹${vendor.pricing_per_item}/item`}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {newBatch.vendor_id && (() => {
                      const selectedVendor = vendors.find((v) => v.id === newBatch.vendor_id)
                      return selectedVendor ? (
                        <div className="mt-2 p-3 bg-muted rounded-lg text-sm space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{selectedVendor.name}</span>
                            <Badge variant="outline">{selectedVendor.service_type}</Badge>
                          </div>
                          <div className="text-muted-foreground">
                            <div>Contact: {selectedVendor.contact_person}</div>
                            <div>Phone: {selectedVendor.phone}</div>
                            <div>Email: {selectedVendor.email}</div>
                            {selectedVendor.pricing_per_item && (
                              <div className="font-medium text-foreground mt-1">
                                Pricing: ₹{selectedVendor.pricing_per_item} per item
                              </div>
                            )}
                            {selectedVendor.notes && (
                              <div className="mt-1 text-xs italic">{selectedVendor.notes}</div>
                            )}
                          </div>
                        </div>
                      ) : null
                    })()}
                  </div>
                  <div>
                    <Label htmlFor="sent_date">Sent Date</Label>
                    <Input
                      type="date"
                      value={newBatch.sent_date}
                      onChange={(e) => setNewBatch({ ...newBatch, sent_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expected_return_date">Expected Return Date</Label>
                    <Input
                      type="date"
                      value={newBatch.expected_return_date}
                      onChange={(e) => setNewBatch({ ...newBatch, expected_return_date: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    placeholder="General notes about this batch..."
                    value={newBatch.notes}
                    onChange={(e) => setNewBatch({ ...newBatch, notes: e.target.value })}
                  />
                </div>

                {/* Add Items Section */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Add Items to Batch</h3>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label htmlFor="product">Product</Label>
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          id="custom-product"
                          checked={showCustomProduct}
                          onChange={(e) => {
                            setShowCustomProduct(e.target.checked)
                            if (e.target.checked) {
                              setSelectedProduct("")
                            } else {
                              setCustomProductName("")
                            }
                          }}
                          className="rounded"
                        />
                        <Label htmlFor="custom-product" className="text-sm">
                          Other Product
                        </Label>
                      </div>

                      {showCustomProduct ? (
                        <Input
                          value={customProductName}
                          onChange={(e) => setCustomProductName(e.target.value)}
                          placeholder="Enter product name"
                          className="w-full"
                        />
                      ) : (
                        <div className="relative">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              value={productSearchTerm}
                              onChange={(e) => {
                                setProductSearchTerm(e.target.value)
                                setProductSearchOpen(true)
                              }}
                              onFocus={() => setProductSearchOpen(true)}
                              placeholder={selectedProduct ? products.find(p => p.id === selectedProduct)?.name || "Search products..." : "Search products..."}
                              className="pl-9"
                            />
                            {selectedProduct && !productSearchTerm && (
                              <div className="absolute inset-0 flex items-center pl-9 pointer-events-none">
                                <span className="text-sm">{products.find(p => p.id === selectedProduct)?.name}</span>
                              </div>
                            )}
                          </div>
                          {productSearchOpen && (
                            <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-64 overflow-auto">
                              {products
                                .filter(p => 
                                  !productSearchTerm || 
                                  p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                                  (p.category && p.category.toLowerCase().includes(productSearchTerm.toLowerCase()))
                                )
                                .map((product) => (
                                  <div
                                    key={product.id}
                                    className={cn(
                                      "flex items-center px-3 py-2 cursor-pointer hover:bg-accent",
                                      selectedProduct === product.id && "bg-accent"
                                    )}
                                    onClick={() => {
                                      setSelectedProduct(product.id)
                                      setProductSearchTerm("")
                                      setProductSearchOpen(false)
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedProduct === product.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span>{product.name}</span>
                                    {product.category && (
                                      <span className="ml-2 text-muted-foreground text-sm">- {product.category}</span>
                                    )}
                                  </div>
                                ))}
                              {products.filter(p => 
                                !productSearchTerm || 
                                p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                                (p.category && p.category.toLowerCase().includes(productSearchTerm.toLowerCase()))
                              ).length === 0 && (
                                <div className="px-3 py-2 text-sm text-muted-foreground">No products found</div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={itemQuantity}
                        onChange={(e) => setItemQuantity(Number.parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <Label htmlFor="condition">Condition Before</Label>
                      <Select value={itemCondition} onValueChange={setItemCondition}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dirty">Dirty</SelectItem>
                          <SelectItem value="stained">Stained</SelectItem>
                          <SelectItem value="damaged">Damaged</SelectItem>
                          <SelectItem value="clean">Clean</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="laundry_charge">Laundry Charge (₹) - Total</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={itemCost}
                        className="placeholder:text-muted-foreground/30"
                        onChange={(e) => setItemCost(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="item_notes">Item Notes</Label>
                      <Input
                        placeholder="Notes about this item..."
                        value={itemNotes}
                        onChange={(e) => setItemNotes(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button onClick={addItemToBatch} className="mb-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>

                  {/* Items List */}
                  {newBatchItems.length > 0 && (
                    <div className="border rounded-lg">
                      <div className="p-4 border-b bg-muted/50">
                        <h4 className="font-semibold">
                          Batch Items ({getTotalBatchItems()} items, ₹{getTotalBatchCost().toFixed(2)} total)
                        </h4>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Condition</TableHead>
                            <TableHead>Charge (₹)</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {newBatchItems.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{item.product_name}</TableCell>
                              <TableCell>{item.product_category}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{item.condition_before}</Badge>
                              </TableCell>
                              <TableCell className="font-medium">₹{item.total_cost.toFixed(2)}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" onClick={() => removeItemFromBatch(index)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateBatch(false)
                    resetBatchForm()
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateBatch} disabled={creating}>
                  {creating ? "Creating..." : "Create Batch"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Database Status Alert */}
      {usingMockData && batches.length === 0 && vendors.length === 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Database Error:</strong> Unable to load laundry data. Please check database configuration or run the laundry management schema script.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batches.length}</div>
            <p className="text-xs text-muted-foreground">Active laundry batches</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batches.filter((b) => b.status === "in_progress").length}</div>
            <p className="text-xs text-muted-foreground">Currently being processed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batches.reduce((sum, batch) => sum + batch.total_items, 0)}</div>
            <p className="text-xs text-muted-foreground">Items in all batches</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{batches.reduce((sum, batch) => sum + batch.total_cost, 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Total laundry costs</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Batches Table */}
      <Card>
        <CardHeader>
          <CardTitle>Laundry Batches</CardTitle>
          <CardDescription>Track and manage all laundry batches sent to vendors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search batches..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={showDateFilter} onOpenChange={setShowDateFilter}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <CalendarRange className="h-4 w-4 mr-2" />
                  {dateFilter?.from || dateFilter?.to ? "Date Filtered" : "Date Filter"}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Filter by Date</DialogTitle>
                  <DialogDescription>Filter batches by sent date range</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="from_date">From Date</Label>
                    <Input
                      id="from_date"
                      type="date"
                      value={dateFilter?.from || ""}
                      onChange={(e) =>
                        setDateFilter((prev) => ({
                          from: e.target.value,
                          to: prev?.to || "",
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="to_date">To Date</Label>
                    <Input
                      id="to_date"
                      type="date"
                      value={dateFilter?.to || ""}
                      onChange={(e) =>
                        setDateFilter((prev) => ({
                          from: prev?.from || "",
                          to: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setDateFilter(null)
                        setShowDateFilter(false)
                      }}
                    >
                      Clear Filter
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => setShowDateFilter(false)}
                    >
                      Apply Filter
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Batches Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Batch Number</TableHead>
                  <TableHead className="min-w-[150px]">Vendor</TableHead>
                  <TableHead className="min-w-[120px]">Status</TableHead>
                  <TableHead className="min-w-[100px]">Items</TableHead>
                  <TableHead className="min-w-[100px]">Cost</TableHead>
                  <TableHead className="min-w-[120px]">Sent Date</TableHead>
                  <TableHead className="min-w-[140px]">Expected Return</TableHead>
                  <TableHead className="min-w-[200px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBatches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Package className="h-12 w-12 mb-2 opacity-50" />
                        <p className="text-lg font-medium">No batches found</p>
                        <p className="text-sm">
                          {searchTerm || statusFilter !== "all" || dateFilter
                            ? "Try adjusting your filters"
                            : "Create your first laundry batch to get started"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedBatches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="font-medium">{batch.batch_number}</TableCell>
                      <TableCell>{batch.vendor_name}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(batch.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(batch.status)}
                            {batch.status.replace("_", " ")}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{batch.total_items} items</div>
                          <div className="text-muted-foreground">{batch.item_types_count} types</div>
                        </div>
                      </TableCell>
                      <TableCell>₹{batch.total_cost.toFixed(2)}</TableCell>
                      <TableCell>{new Date(batch.sent_date).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(batch.expected_return_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button variant="outline" size="sm" onClick={() => handleViewBatch(batch)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {batch.status === "in_progress" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditBatch(batch)}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleStatusUpdate(batch, "returned")}
                                disabled={creating}
                                className="bg-purple-600 hover:bg-purple-700"
                              >
                                <Package className="h-3 w-3 mr-1" />
                                Mark Returned
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleStatusUpdate(batch, "cancelled")}
                                disabled={creating}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Cancel
                              </Button>
                            </>
                          )}
                          {batch.status === "returned" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleStatusUpdate(batch, "cancelled")}
                              disabled={creating}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        
        {/* Pagination Controls */}
        {filteredBatches.length > 0 && (
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, filteredBatches.length)} of{" "}
                  {filteredBatches.length} batches
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Items per page:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value))
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="text-sm font-medium">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Batch Details Dialog */}
      <Dialog open={showBatchDetails} onOpenChange={setShowBatchDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Batch Details - {selectedBatch?.batch_number}</DialogTitle>
            <DialogDescription>Detailed information about this laundry batch</DialogDescription>
          </DialogHeader>
          {selectedBatch && (
            <div className="space-y-6">
              {/* Vendor Info Card */}
              {(() => {
                const vendor = vendors.find((v) => v.name === selectedBatch.vendor_name)
                return vendor ? (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Vendor Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-xs text-muted-foreground">Vendor Name</Label>
                          <p className="font-medium">{vendor.name}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Service Type</Label>
                          <Badge variant="outline" className="mt-1">
                            {vendor.service_type}
                          </Badge>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Contact Person</Label>
                          <p>{vendor.contact_person}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Phone</Label>
                          <p>{vendor.phone}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Email</Label>
                          <p>{vendor.email}</p>
                        </div>
                        {vendor.pricing_per_item && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Price per Item</Label>
                            <p className="font-medium">₹{vendor.pricing_per_item}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : null
              })()}

              {/* Batch Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(selectedBatch.status)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(selectedBatch.status)}
                        {selectedBatch.status.replace("_", " ")}
                      </div>
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Batch Number</Label>
                  <p className="text-sm font-medium mt-1">{selectedBatch.batch_number}</p>
                </div>
                <div>
                  <Label>Sent Date</Label>
                  <p className="text-sm mt-1">{new Date(selectedBatch.sent_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label>Expected Return</Label>
                  <p className="text-sm mt-1">{new Date(selectedBatch.expected_return_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label>Total Items</Label>
                  <p className="text-sm font-medium mt-1">
                    {selectedBatch.total_items} items ({selectedBatch.item_types_count} types)
                  </p>
                </div>
                <div>
                  <Label>Total Cost</Label>
                  <p className="text-sm font-medium mt-1">₹{selectedBatch.total_cost.toFixed(2)}</p>
                </div>
              </div>

              {selectedBatch.notes && (
                <div>
                  <Label>Batch Notes</Label>
                  <div className="mt-1 p-3 bg-muted rounded-lg text-sm">
                    {selectedBatch.notes}
                  </div>
                </div>
              )}

              {/* Batch Items */}
              <div>
                <Label className="text-base font-semibold">Batch Items</Label>
                <div className="mt-2 rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Condition Before</TableHead>
                        <TableHead>Condition After</TableHead>
                        <TableHead>Unit Cost</TableHead>
                        <TableHead>Total Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batchItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.product_name}</TableCell>
                          <TableCell>{item.product_category}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.condition_before}</Badge>
                          </TableCell>
                          <TableCell>
                            {item.condition_after ? (
                              <Badge variant="outline">{item.condition_after}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>₹{item.unit_cost.toFixed(2)}</TableCell>
                          <TableCell>₹{item.total_cost.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Add Note Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Add Note
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Add a note or update about this batch..."
                      value={batchNote}
                      onChange={(e) => setBatchNote(e.target.value)}
                      rows={3}
                    />
                    <Button
                      size="sm"
                      onClick={handleAddNote}
                      disabled={addingNote || !batchNote.trim()}
                    >
                      {addingNote ? "Adding..." : "Add Note"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowBatchDetails(false)
              setBatchNote("")
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Batch Dialog */}
      <Dialog open={showEditBatch} onOpenChange={setShowEditBatch}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Batch - {editingBatch?.batch_number}</DialogTitle>
            <DialogDescription>Modify batch items and update details</DialogDescription>
          </DialogHeader>
          {editingBatch && (
            <div className="space-y-6">
              {/* Batch Info (Read-only) */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">Vendor</Label>
                  <p className="font-medium">{editingBatch.vendor_name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Sent Date</Label>
                  <p>{new Date(editingBatch.sent_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge className={getStatusColor(editingBatch.status)}>
                    {editingBatch.status.replace("_", " ")}
                  </Badge>
                </div>
              </div>

              {/* Current Items */}
              <div>
                <Label className="text-base font-semibold mb-2 block">Current Items</Label>
                {editBatchItems.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Condition</TableHead>
                          <TableHead>Unit Cost</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editBatchItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.product_name}</TableCell>
                            <TableCell>{item.product_category}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.condition_before}</Badge>
                            </TableCell>
                            <TableCell>₹{item.unit_cost.toFixed(2)}</TableCell>
                            <TableCell>₹{item.total_cost.toFixed(2)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeEditItemFromBatch(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-medium">
                          <TableCell colSpan={2}>Total</TableCell>
                          <TableCell>{editBatchItems.reduce((sum, item) => sum + item.quantity, 0)}</TableCell>
                          <TableCell colSpan={2}></TableCell>
                          <TableCell>
                            ₹{editBatchItems.reduce((sum, item) => sum + item.total_cost, 0).toFixed(2)}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No items in this batch</p>
                  </div>
                )}
              </div>

              {/* Add More Items */}
              <div className="border-t pt-4">
                <Label className="text-base font-semibold mb-4 block">Add More Items</Label>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label>Product</Label>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        id="edit-custom-product"
                        checked={showCustomProduct}
                        onChange={(e) => {
                          setShowCustomProduct(e.target.checked)
                          if (e.target.checked) {
                            setEditSelectedProduct("")
                          } else {
                            setCustomProductName("")
                          }
                        }}
                        className="rounded"
                      />
                      <Label htmlFor="edit-custom-product" className="text-sm">
                        Other Product
                      </Label>
                    </div>
                    {showCustomProduct ? (
                      <Input
                        value={customProductName}
                        onChange={(e) => setCustomProductName(e.target.value)}
                        placeholder="Enter product name"
                      />
                    ) : (
                      <div className="relative">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            value={editProductSearchTerm}
                            onChange={(e) => {
                              setEditProductSearchTerm(e.target.value)
                              setEditProductSearchOpen(true)
                            }}
                            onFocus={() => setEditProductSearchOpen(true)}
                            placeholder={editSelectedProduct ? products.find(p => p.id === editSelectedProduct)?.name || "Search products..." : "Search products..."}
                            className="pl-9"
                          />
                          {editSelectedProduct && !editProductSearchTerm && (
                            <div className="absolute inset-0 flex items-center pl-9 pointer-events-none">
                              <span className="text-sm">{products.find(p => p.id === editSelectedProduct)?.name}</span>
                            </div>
                          )}
                        </div>
                        {editProductSearchOpen && (
                          <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-64 overflow-auto">
                            {products
                              .filter(p => 
                                !editProductSearchTerm || 
                                p.name.toLowerCase().includes(editProductSearchTerm.toLowerCase()) ||
                                (p.category && p.category.toLowerCase().includes(editProductSearchTerm.toLowerCase()))
                              )
                              .map((product) => (
                                <div
                                  key={product.id}
                                  className={cn(
                                    "flex items-center px-3 py-2 cursor-pointer hover:bg-accent",
                                    editSelectedProduct === product.id && "bg-accent"
                                  )}
                                  onClick={() => {
                                    setEditSelectedProduct(product.id)
                                    setEditProductSearchTerm("")
                                    setEditProductSearchOpen(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      editSelectedProduct === product.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <span>{product.name}</span>
                                  {product.category && (
                                    <span className="ml-2 text-muted-foreground text-sm">- {product.category}</span>
                                  )}
                                </div>
                              ))}
                            {products.filter(p => 
                              !editProductSearchTerm || 
                              p.name.toLowerCase().includes(editProductSearchTerm.toLowerCase()) ||
                              (p.category && p.category.toLowerCase().includes(editProductSearchTerm.toLowerCase()))
                            ).length === 0 && (
                              <div className="px-3 py-2 text-sm text-muted-foreground">No products found</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={editItemQuantity}
                      onChange={(e) => setEditItemQuantity(Number.parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <Label>Condition Before</Label>
                    <Select value={editItemCondition} onValueChange={setEditItemCondition}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dirty">Dirty</SelectItem>
                        <SelectItem value="stained">Stained</SelectItem>
                        <SelectItem value="damaged">Damaged</SelectItem>
                        <SelectItem value="clean">Clean</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Laundry Charge (₹) - Total</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={editItemCost}
                      onChange={(e) => setEditItemCost(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Item Notes</Label>
                    <Input
                      placeholder="Notes about this item..."
                      value={editItemNotes}
                      onChange={(e) => setEditItemNotes(e.target.value)}
                    />
                  </div>
                </div>

                <Button onClick={addEditItemToBatch}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditBatch(false)
                setEditingBatch(null)
                setEditBatchItems([])
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveBatchEdit} disabled={creating || editBatchItems.length === 0}>
              {creating ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
