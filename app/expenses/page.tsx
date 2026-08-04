"use client"

import type React from "react"

import { useEffect, useState, useMemo } from "react"
import { format } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search, IndianRupee, Upload, Calendar, TrendingUp, Filter, FileText, Eye, Pencil, Trash2, FolderOpen, Info } from 'lucide-react'
import { UploadProgress, useUploadProgress } from '@/components/ui/upload-progress'
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { supabase } from "@/lib/supabase"
import { uploadWithProgress } from '@/lib/upload-with-progress'
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
// Checkbox removed (vendor add flow removed)
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ExpenseCategory {
  id: string
  name: string
  description?: string
  color: string
}

interface Expense {
  id: number
  description: string
  amount: number
  expense_date: string
  receipt_number?: string
  vendor_name?: string
  created_at: string
  receipt_url?: string
  expense_number: string
  created_by: string
  subcategory?: string // Category ID
  booking_id?: string
  booking_number?: string // For display
  status: "pending" | "approved" | "rejected"
  approved_by?: string
  approved_at?: string
  category?: ExpenseCategory
}

interface Vendor {
  id: string
  name: string
  contact_person?: string
  phone?: string
  email?: string
}

const defaultCategories: ExpenseCategory[] = [
  { id: "office", name: "Office Supplies", color: "bg-blue-500" },
  { id: "travel", name: "Travel & Transport", color: "bg-green-500" },
  { id: "marketing", name: "Marketing", color: "bg-purple-500" },
  { id: "utilities", name: "Utilities", color: "bg-yellow-500" },
  { id: "maintenance", name: "Maintenance", color: "bg-red-500" },
  { id: "inventory", name: "Inventory", color: "bg-indigo-500" },
  { id: "other", name: "Other", color: "bg-gray-500" },
]

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>(defaultCategories)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [billPhoto, setBillPhoto] = useState<File | null>(null) // legacy single
  const [billFiles, setBillFiles] = useState<File[]>([])
  const { progress: uploadProgress, isUploading, track: trackUpload } = useUploadProgress()
  const [formData, setFormData] = useState<{description:string; amount:string; expense_date:string; receipt_number:string; vendor_name:string; vendor_id:string; notes:string; category_id:string; status: 'pending' | 'approved' | 'rejected';} >({
    description: "",
    amount: "",
    expense_date: new Date().toISOString().split("T")[0],
    receipt_number: "",
    vendor_name: "",
    vendor_id: "",
    notes: "",
    category_id: "other",
    status: "pending" as const,
  })
  // removed newVendor & vendor creation (simplified)
  // Applied filters (used for actual filtering)
  const [filters, setFilters] = useState({
    category: "",
    dateFrom: "",
    dateTo: "",
    vendor: "", // retained in state for backward compatibility
  })
  // Pending (UI controlled) filters that only apply when user clicks Apply Filters
  const [pendingFilters, setPendingFilters] = useState({
    category: "",
    dateFrom: "",
    dateTo: "",
    vendor: "",
  })
  const applyPendingFilters = () => {
    setFilters(pendingFilters)
    toast.success('Filters applied')
  }
  const resetFilters = () => {
    setFilters({category:'',dateFrom:'',dateTo:'',vendor:''})
    setPendingFilters({category:'',dateFrom:'',dateTo:'',vendor:''})
  }
  // Booking search typeahead
  const [bookingQuery, setBookingQuery] = useState('')
  const [bookingResults, setBookingResults] = useState<{id:string; booking_number:string; customer_name?:string; event_date?:string; type?:string}[]>([])
  const [allBookings, setAllBookings] = useState<{id:string; booking_number:string; customer_name?:string; event_date?:string; type?:string}[]>([])
  const [showBookingDropdown, setShowBookingDropdown] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<{id:string; booking_number:string; customer_name?:string; type?:string}|null>(null)
  const [bookingsLoading, setBookingsLoading] = useState(false)
  
  const fetchBookings = async () => {
    if(bookingsLoading) return
    setBookingsLoading(true)
    try {
      // Fetch from the bookings API which combines product_orders, package_bookings, and direct_sales
      const res = await fetch('/api/bookings', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch bookings')
      const { data } = await res.json()
      
      // Filter out quotes and map the bookings to a common format
      const mappedBookings = (data || [])
        .filter((b: any) => b.status !== 'quote' && !b.is_quote) // Exclude quotes
        .map((b: any) => ({
          id: b.id,
          booking_number: b.booking_number || b.order_number || b.package_number || b.sale_number || 'N/A',
          customer_name: b.customer?.name || b.customer_name || '',
          event_date: b.event_date || b.delivery_date || b.sale_date || '',
          type: b.source === 'package_bookings' ? 'Package' 
              : b.source === 'direct_sales' ? 'Direct Sale' 
              : b.type === 'sale' ? 'Sale' 
              : 'Rental'
        }))
      
      console.log('Fetched bookings:', mappedBookings.length, 'Total from API:', (data || []).length)
      setAllBookings(mappedBookings)
      setBookingResults(mappedBookings.slice(0, 10))
    } catch(e) { console.error('fetch bookings', e) }
    finally { setBookingsLoading(false) }
  }
  
  // Load bookings when add dialog opens
  useEffect(() => {
    if(showAddDialog && allBookings.length === 0) {
      fetchBookings()
    }
  }, [showAddDialog])
  
  const handleBookingSearch = (val:string) => {
    setBookingQuery(val)
    setShowBookingDropdown(true)
    if(!val) {
      setBookingResults(allBookings.slice(0, 10))
      return
    }
    const filtered = allBookings.filter(b => 
      b.booking_number?.toLowerCase().includes(val.toLowerCase()) ||
      b.customer_name?.toLowerCase().includes(val.toLowerCase())
    ).slice(0, 10)
    setBookingResults(filtered)
  }
  
  const handleBookingFocus = () => {
    setShowBookingDropdown(true)
    if(allBookings.length === 0) fetchBookings()
    else setBookingResults(allBookings.slice(0, 10))
  }

  // Category creation
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [newCategory, setNewCategory] = useState<{ name: string; description: string; color: string }>({ name: '', description: '', color: '#2563eb' })
  const [showAllCats, setShowAllCats] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<string|null>(null)
  const [editingCategoryForm, setEditingCategoryForm] = useState<{name:string;color:string}>({ name:'', color:'#2563eb'})
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<{id:string; name:string}|null>(null)
  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/expense-categories', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch categories')
      const { data } = await res.json()
      if(data) setCategories(data as any)
    } catch(e){ console.error('Load categories failed', e) }
  }
  const addCategory = async () => {
    if(!newCategory.name.trim()) { toast.error('Name required'); return }
    try {
      const res = await fetch('/api/expense-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newCategory.name,
          description: newCategory.description || null,
          color: newCategory.color || '#2563eb'
        })
      })
      if (!res.ok) throw new Error('Failed to add category')
      const { data } = await res.json()
      if(data) setCategories(prev=>[...prev, data as any])
      toast.success('Category added')
      setShowCategoryDialog(false)
      setNewCategory({ name:'', description:'', color:'#2563eb'})
    } catch(e){ console.error('Add category error:', e); toast.error('Add category failed') }
  }
  const updateCategory = async () => {
    if(!editingCategoryId) return
    if(!editingCategoryForm.name.trim()) { toast.error('Name required'); return }
    try {
      const res = await fetch('/api/expense-categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: editingCategoryId,
          name: editingCategoryForm.name,
          color: editingCategoryForm.color
        })
      })
      if (!res.ok) throw new Error('Update failed')
      const { data } = await res.json()
      if(data) setCategories(prev => prev.map(c => c.id===editingCategoryId ? { ...c, name:data.name, color:data.color } : c))
      toast.success('Category updated')
      setEditingCategoryId(null)
    } catch(e){ console.error(e); toast.error('Update failed') }
  }
  const deleteCategory = async (id:string) => {
    try {
      const res = await fetch(`/api/expense-categories?id=${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) throw new Error('Delete failed')
      setCategories(prev=>prev.filter(c=>c.id!==id))
      toast.success('Category deleted')
    } catch(e){ console.error(e); toast.error('Delete failed') }
  }
  useEffect(()=>{ fetchCategories() }, [])

  // Re-fetch expenses when categories change (to properly map category names)
  useEffect(() => {
    if (categories.length > 0 && expenses.length > 0) {
      // Re-map expenses with proper category data
      setExpenses(prev => prev.map(expense => ({
        ...expense,
        category: categories.find((cat) => cat.id === expense.subcategory),
      })))
    }
  }, [categories])

  // View / Edit / File dialogs
  const [viewExpense, setViewExpense] = useState<Expense|null>(null)
  const [editExpense, setEditExpense] = useState<Expense|null>(null)
  const [fileViewer, setFileViewer] = useState<Expense|null>(null)
  const [editForm, setEditForm] = useState<{amount:string; status:Expense['status']; description:string; category_id:string; expense_date:string}>({amount:'', status:'pending', description:'', category_id:'other', expense_date:new Date().toISOString().split('T')[0]})
  const openEdit = (exp:Expense) => { setEditExpense(exp); setEditForm({ amount:String(exp.amount), status: exp.status, description: exp.description, category_id: exp.subcategory||'other', expense_date: exp.expense_date }) }
  const submitEdit = async () => {
    if(!editExpense) return
    try {
      const { error } = await supabase.from('expenses').update({ amount:Number.parseFloat(editForm.amount)||0, description: editForm.description, status: editForm.status, subcategory: editForm.category_id, expense_date: editForm.expense_date, updated_at: new Date().toISOString() }).eq('id', editExpense.id)
      if(error) throw error
      toast.success('Expense updated')
      setEditExpense(null)
      fetchExpenses()
    } catch(e){ console.error(e); toast.error('Update failed') }
  }

  useEffect(() => {
    fetchExpenses()
    fetchVendors()
  }, [])

  const fetchVendors = async () => {
    try {
      const res = await fetch('/api/vendors?status=active')
      if (!res.ok) throw new Error('Failed to fetch vendors')
      const { vendors } = await res.json()
      setVendors(vendors || [])
    } catch (error) {
      console.error("Error fetching vendors:", error)
    }
  }

  const fetchExpenses = async () => {
    try {
      // Use API to fetch expenses (handles franchise filtering)
      const res = await fetch('/api/expenses?pageSize=1000', {
        credentials: 'include'
      })
      
      if (!res.ok) {
        throw new Error('Failed to fetch expenses')
      }
      
      const result = await res.json()
      const data = result.data || []

      const enhancedExpenses = data.map((expense: any) => ({
        ...expense,
        category: categories.find((cat) => cat.id === expense.subcategory), // Updated field
        status: expense.status || "pending",
      }))

      setExpenses(enhancedExpenses)

      if (data.length > 0) {
        toast.success(`Loaded ${data.length} expense records`)
      }
    } catch (error) {
      console.error("Error fetching expenses:", error)
      toast.error("Failed to load expenses", {
        description: "Please check your connection and try again",
      })
    } finally {
      setLoading(false)
    }
  }

    // Removed handleAddVendor (vendor creation disabled)

  const uploadBillPhoto = async (file: File, onChunk?: (loaded:number,total:number)=>void): Promise<string | null> => {
    try {
      const res = await uploadWithProgress(file, { folder:'bills' }, onChunk)
      return res.url
    } catch(e){
      console.error('Error uploading file', e)
      toast.error('Failed to upload file')
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.amount || Number.parseFloat(formData.amount) <= 0) {
      toast.error("Please fill in amount")
      return
    }

    if (!formData.category_id) {
      toast.error("Please select a category")
      return
    }

    try {
      toast.info("Adding expense...")

      let billPhotoUrl = null
      // File upload is OPTIONAL - skip if no files selected
      if (billFiles.length > 0) {
        try {
          const uploaded = await trackUpload(billFiles, (file, onChunk) => uploadBillPhoto(file, onChunk))
          billPhotoUrl = uploaded.filter(Boolean).join('|')
          console.log('[Expenses] Files uploaded:', billPhotoUrl)
        } catch (uploadError) {
          console.warn('[Expenses] File upload failed, continuing without files:', uploadError)
          // Continue without files - they are optional
        }
      }

      const expenseData = {
        description: formData.description || `₹${Number.parseFloat(formData.amount).toLocaleString()} expense`,
        amount: Number.parseFloat(formData.amount),
        expense_date: formData.expense_date,
        receipt_number: formData.receipt_number || null,
        vendor_name: formData.vendor_name || null,
        receipt_url: billPhotoUrl,
        subcategory: formData.category_id || "other",
        booking_id: selectedBooking?.id || null,
        booking_number: selectedBooking?.booking_number || null,
        status: 'approved', // All expenses are approved/paid
        is_recurring: false,
        recurring_frequency: null,
      }

      // Use the API to add expense (which handles auth and RLS)
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(expenseData)
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to add expense')
      }

      toast.success("Expense added successfully!", {
        description: `₹${Number.parseFloat(formData.amount).toLocaleString()} expense recorded`,
      })
      setShowAddDialog(false)
      setFormData({
        description: "",
        amount: "",
        expense_date: new Date().toISOString().split("T")[0],
        receipt_number: "",
        vendor_name: "",
        vendor_id: "",
        notes: "",
        category_id: "other",
        status: "pending",
      })
      setBillPhoto(null)
      setBillFiles([])
      setBookingQuery('')
      setSelectedBooking(null)
      fetchExpenses()
    } catch (error) {
      console.error("Error adding expense:", error)
      toast.error("Failed to add expense", {
        description: error instanceof Error ? error.message : "Please check your data and try again",
      })
    }
  }

  const [deleteTarget, setDeleteTarget] = useState<{id:number; description:string}|null>(null)
  const handleDeleteExpense = (expense: Expense) => {
    setDeleteTarget({id: expense.id, description: expense.description})
  }
  const confirmDeleteExpense = async () => {
    if(!deleteTarget) return
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', deleteTarget.id)
      if(error) throw error
      toast.success('Expense deleted', { description: deleteTarget.description })
      fetchExpenses()
    } catch(e){
      console.error('Delete expense error', e)
      toast.error('Failed to delete expense')
    } finally {
      setDeleteTarget(null)
    }
  }

  const exportExpenses = async (format: 'csv' | 'pdf') => {
    const rows = filteredExpenses
    if(rows.length===0){ toast.error('No expenses to export'); return }
    if(format==='csv'){
      const csvContent = [
  ['Date','Description','Amount','Vendor','Category'].join(','),
        ...rows.map(r=>[
          r.expense_date,
          '"'+r.description.replace(/"/g,'""')+'"',
          r.amount,
          r.vendor_name||'',
          r.category?.name||''
        ].join(','))
      ].join('\n')
      const blob = new Blob([csvContent],{type:'text/csv'})
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href=url; a.download=`expenses-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url)
      toast.success('CSV exported')
    } else {
      // Optional company settings for branding
      let companyName='Company'; let logoUrl: string | null = null
      try { const res = await fetch('/api/company-settings'); if(res.ok){ const json= await res.json(); companyName=json.company_name||companyName; logoUrl=json.logo_url||null }} catch{}
      const doc = new jsPDF({orientation:'landscape'})
      if(logoUrl){ try{ const imgResp=await fetch(logoUrl); const b=await imgResp.blob(); const fr=new FileReader(); const dataUrl:string= await new Promise(r=>{fr.onload=()=>r(fr.result as string); fr.readAsDataURL(b)}) ; doc.addImage(dataUrl,'PNG',14,8,20,20)}catch{}}
      doc.setFontSize(16); doc.text(`${companyName} - Expenses`, logoUrl?40:14,16)
      doc.setFontSize(10); doc.text(`Generated: ${new Date().toLocaleString()}`, logoUrl?40:14,22)
  autoTable(doc, { startY: logoUrl?30:24, head: [['Date','Description','Amount','Vendor','Category']], body: rows.map(r=>[
        r.expense_date,
        r.description.length>40? r.description.slice(0,37)+'...': r.description,
        r.amount.toFixed(2),
        r.vendor_name||'',
  r.category?.name||''
      ]), styles:{fontSize:8}, headStyles:{fillColor:[34,197,94]}, didDrawPage:(d)=>{ const pageCount=(doc as any).internal.getNumberOfPages(); doc.setFontSize(8); doc.text(`Page ${d.pageNumber}/${pageCount}`, d.settings.margin.left, doc.internal.pageSize.height-5)} })
      doc.save(`expenses-${new Date().toISOString().slice(0,10)}.pdf`)
      toast.success('PDF exported')
    }
  }

  const filteredExpenses = expenses.filter((expense: Expense) => {
    const matchesSearch =
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase())

  const matchesCategory = !filters.category || filters.category==='all' || expense.subcategory === filters.category
  const matchesStatus = true // status filter removed
    const matchesVendor = !filters.vendor || expense.vendor_name?.toLowerCase().includes(filters.vendor.toLowerCase())

    const matchesDateFrom = !filters.dateFrom || new Date(expense.expense_date) >= new Date(filters.dateFrom)
    const matchesDateTo = !filters.dateTo || new Date(expense.expense_date) <= new Date(filters.dateTo)

  return matchesSearch && matchesCategory && matchesVendor && matchesDateFrom && matchesDateTo
  })

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const pendingExpenses = filteredExpenses
    .filter((e) => e.status === "pending")
    .reduce((sum, expense) => sum + expense.amount, 0)
  const approvedExpenses = filteredExpenses
    .filter((e) => e.status === "approved")
    .reduce((sum, expense) => sum + expense.amount, 0)

  const categoryBreakdown = categories
    .map((category) => {
      const categoryExpenses = filteredExpenses.filter((e) => e.subcategory === category.id) // Updated field
      const total = categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0)
      return { ...category, total, count: categoryExpenses.length }
    })
    .filter((cat) => cat.count > 0)

  // Sorting state (date default desc)
  const [sort, setSort] = useState<{field:'date'|'amount'; dir:'asc'|'desc'}>({ field:'date', dir:'desc'})
  const sortedExpenses = [...filteredExpenses].sort((a,b)=>{
    if(sort.field==='date'){
      const ad = new Date(a.expense_date).getTime(); const bd = new Date(b.expense_date).getTime();
      return sort.dir==='asc'? ad-bd : bd-ad
    } else {
      return sort.dir==='asc'? a.amount - b.amount : b.amount - a.amount
    }
  })
  const toggleSort = (field:'date'|'amount') => {
    setSort(prev => prev.field===field ? { field, dir: prev.dir==='asc'?'desc':'asc'} : { field, dir:'asc'})
  }

  const paginatedExpenses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return sortedExpenses.slice(startIndex, startIndex + itemsPerPage)
  }, [sortedExpenses, currentPage, itemsPerPage])

  const totalPages = Math.ceil(sortedExpenses.length / itemsPerPage)

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filters.category, filters.dateFrom, filters.dateTo, filters.vendor])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Track and manage all business expenses with categorization, approval workflows, and detailed
                      reporting
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">Loading expenses...</div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Expense"
        description={`Are you sure you want to delete: ${deleteTarget?.description || ''}? This cannot be undone.`}
        destructive
        confirmLabel="Delete"
        onConfirm={confirmDeleteExpense}
        onCancel={()=>setDeleteTarget(null)}
      />
      <ConfirmDialog
        open={!!deleteCategoryTarget}
        title="Delete Category"
        description={`Delete category ${deleteCategoryTarget?.name}? Expenses will retain the old string but category list will hide it.`}
        destructive
        confirmLabel="Delete"
        onConfirm={()=>{ if(deleteCategoryTarget) deleteCategory(deleteCategoryTarget.id); setDeleteCategoryTarget(null) }}
        onCancel={()=>setDeleteCategoryTarget(null)}
      />
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
              <p className="text-muted-foreground">Track and manage business expenses</p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Manage, filter & export expenses. Use the compact toolbar below for quick actions.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Expense</DialogTitle>
                  <DialogDescription>
                    Record a new business expense with proper categorization and approval workflow
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (₹) *</Label>
                      <Input
                        id="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                        placeholder="0.00"
                        className="placeholder:text-muted-foreground/50"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expense_date">Date *</Label>
                      <Input
                        id="expense_date"
                        type="date"
                        value={formData.expense_date}
                        onChange={(e) => setFormData((prev) => ({ ...prev, expense_date: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={formData.category_id}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, category_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${category.color}`} />
                                {category.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status selection removed (default pending) */}

                    <div className="space-y-2">
                      <Label htmlFor="vendor">Vendor (optional)</Label>
                      <Select
                        value={formData.vendor_id}
                        onValueChange={(value) => {
                          const selectedVendor = vendors.find((v) => v.id === value)
                          setFormData((prev) => ({
                            ...prev,
                            vendor_id: value,
                            vendor_name: selectedVendor?.name || "",
                          }))
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                        <SelectContent>
                          {vendors.map((vendor) => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              {vendor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="booking-search">Booking (optional)</Label>
                      <div className="relative">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              id="booking-search" 
                              placeholder="Search by booking # or customer..." 
                              value={bookingQuery} 
                              onChange={(e) => handleBookingSearch(e.target.value)}
                              onFocus={handleBookingFocus}
                              onBlur={() => setTimeout(() => setShowBookingDropdown(false), 200)}
                              className="pl-8"
                            />
                          </div>
                          {selectedBooking && (
                            <Button type="button" variant="ghost" size="icon" onClick={() => { setSelectedBooking(null); setBookingQuery(''); setFormData(prev => ({...prev, booking_id: undefined} as any)) }}>
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                        {showBookingDropdown && bookingResults.length > 0 && (
                          <div className="absolute z-20 mt-1 w-full border bg-background rounded-md shadow-lg max-h-60 overflow-auto">
                            {bookingResults.map(b => (
                              <button 
                                type="button" 
                                key={b.id} 
                                className={`w-full text-left px-3 py-2 hover:bg-muted flex justify-between items-center border-b last:border-b-0 ${selectedBooking?.id === b.id ? 'bg-muted' : ''}`}
                                onClick={() => { 
                                  setSelectedBooking(b)
                                  setFormData(prev => ({...prev, booking_id: b.id} as any))
                                  setBookingQuery(`${b.booking_number}${b.customer_name ? ' - ' + b.customer_name : ''}`)
                                  setShowBookingDropdown(false)
                                }}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">{b.booking_number}</span>
                                    {b.type && <Badge variant="outline" className="text-[10px] px-1 py-0">{b.type}</Badge>}
                                  </div>
                                  {b.customer_name && <div className="text-xs text-muted-foreground">{b.customer_name}</div>}
                                </div>
                                {b.event_date && <span className="text-xs text-muted-foreground ml-2">{new Date(b.event_date).toLocaleDateString()}</span>}
                              </button>
                            ))}
                          </div>
                        )}
                        {showBookingDropdown && bookingsLoading && (
                          <div className="absolute z-20 mt-1 w-full border bg-background rounded-md shadow-lg p-3 text-sm text-muted-foreground">
                            Loading bookings...
                          </div>
                        )}
                        {showBookingDropdown && !bookingsLoading && bookingResults.length === 0 && (
                          <div className="absolute z-20 mt-1 w-full border bg-background rounded-md shadow-lg p-3 text-sm text-muted-foreground">
                            {bookingQuery ? 'No bookings found' : 'No bookings available'}
                          </div>
                        )}
                      </div>
                      {selectedBooking && (
                        <p className="text-xs text-muted-foreground">Selected: {selectedBooking.booking_number}{selectedBooking.customer_name ? ` - ${selectedBooking.customer_name}` : ''}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="receipt_number">Receipt Number</Label>
                      <Input
                        id="receipt_number"
                        value={formData.receipt_number}
                        onChange={(e) => setFormData((prev) => ({ ...prev, receipt_number: e.target.value }))}
                        placeholder="Receipt or invoice number"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bill_photo">Bill Files (image or PDF, multiple)</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="bill_photo"
                        type="file"
                        multiple
                        accept="image/*,application/pdf"
                        onChange={(e) => setBillFiles(Array.from(e.target.files||[]))}
                        className="flex-1"
                        style={{ display: "none" }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById("bill_photo")?.click()}
                        className="flex-1"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {billFiles.length>0 ? `Change (${billFiles.length})` : "Select Files"}
                      </Button>
                    </div>
                    {billFiles.length>0 && <p className="text-sm text-muted-foreground">Selected: {billFiles.map(f=>f.name).join(', ')}</p>}
                    {isUploading && <UploadProgress progress={uploadProgress} className="mt-2" />}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the expense"
                    />
                  </div>

                  <div className="flex justify-end space-x-4">
                    <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Add Expense</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={()=>exportExpenses('csv')}><FileText className="w-4 h-4 mr-2"/>CSV</Button>
              <Button variant="outline" size="sm" onClick={()=>exportExpenses('pdf')}><FileText className="w-4 h-4 mr-2"/>PDF</Button>
            </div>
          </div>
        </div>
        {/* Compact toolbar */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:flex-wrap bg-muted/30 p-3 rounded-md">
          <div className="relative md:w-48">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="pl-8" />
          </div>
          <Select value={pendingFilters.category} onValueChange={(v)=>setPendingFilters(p=>({...p, category: v==='all'?'':v}))}>
            <SelectTrigger className="md:w-40"><SelectValue placeholder="Category"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {categories.map(c=> <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {/* Status filter removed */}
          <Input type="date" value={pendingFilters.dateFrom} onChange={e=>setPendingFilters(p=>({...p,dateFrom:e.target.value}))} className="md:w-40" />
            <span className="hidden md:inline text-muted-foreground">to</span>
          <Input type="date" value={pendingFilters.dateTo} onChange={e=>setPendingFilters(p=>({...p,dateTo:e.target.value}))} className="md:w-40" />
          {/* Vendor search input removed as per request */}
          <Button variant="ghost" size="sm" onClick={resetFilters}>Reset</Button>
          <Button variant="secondary" size="sm" onClick={applyPendingFilters}>Apply Filters</Button>
          <Button variant="outline" size="sm" onClick={()=>setShowCategoryDialog(true)}>+ Category</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <IndianRupee className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="text-2xl font-bold">₹{totalExpenses.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Total Expenses</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">This Period</div>
                  <div className="text-sm font-medium text-green-600">{expenses.length} records</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold">{expenses.filter(e => {
                      const today = new Date()
                      const expDate = new Date(e.expense_date)
                      return expDate.getMonth() === today.getMonth() && expDate.getFullYear() === today.getFullYear()
                    }).length}</div>
                    <div className="text-sm text-muted-foreground">This Month</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">₹</div>
                  <div className="text-sm font-medium text-blue-600">
                    {expenses.filter(e => {
                      const today = new Date()
                      const expDate = new Date(e.expense_date)
                      return expDate.getMonth() === today.getMonth() && expDate.getFullYear() === today.getFullYear()
                    }).reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                  <div>
                    <div className="text-2xl font-bold">₹{expenses.length > 0 ? Math.round(totalExpenses / expenses.length).toLocaleString() : 0}</div>
                    <div className="text-sm text-muted-foreground">Avg. Expense</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Per Record</div>
                  <div className="text-sm font-medium text-purple-600">Average</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-orange-500" />
                  <div>
                    <div className="text-2xl font-bold">{filteredExpenses.length}</div>
                    <div className="text-sm text-muted-foreground">Filtered</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">of {expenses.length} total</div>
                  <div className="text-sm font-medium text-orange-600">
                    {expenses.length > 0 ? `${((filteredExpenses.length / expenses.length) * 100).toFixed(0)}%` : '0%'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category breakdown removed for compact layout */}

        <Card>
          <CardHeader>
            <CardTitle>Expenses ({filteredExpenses.length})</CardTitle>
            <CardDescription>
              {filteredExpenses.length} of {expenses.length} expenses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={()=>toggleSort('date')}>
                      Date {sort.field==='date' && (sort.dir==='asc'?'▲':'▼')}
                    </TableHead>
                    <TableHead>Booking</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={()=>toggleSort('amount')}>
                      Amount {sort.field==='amount' && (sort.dir==='asc'?'▲':'▼')}
                    </TableHead>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedExpenses.map(expense => (
                    <TableRow key={expense.id}>
                      <TableCell>{expense.expense_date}</TableCell>
                      <TableCell>
                        {expense.booking_number ? (
                          <span className="text-sm font-medium text-primary">{expense.booking_number}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {expense.category?.name || 'Uncategorized'}
                        </span>
                      </TableCell>
                      <TableCell>{expense.vendor_name || '-'}</TableCell>
                      <TableCell className="font-medium">₹{expense.amount.toLocaleString()}</TableCell>
                      <TableCell>{expense.receipt_number || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" onClick={() => setViewExpense(expense)} title="View">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openEdit(expense)} title="Edit">
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteExpense(expense)} title="Delete">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          
          {/* Pagination Controls */}
          {sortedExpenses.length > 0 && (
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to{" "}
                    {Math.min(currentPage * itemsPerPage, sortedExpenses.length)} of{" "}
                    {sortedExpenses.length} expenses
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

        {/* Category Management Dialog */}
        <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Manage Expense Categories</DialogTitle>
              <DialogDescription>Add or remove expense categories.</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Existing Categories */}
              {categories.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Existing Categories</Label>
                  <div className="max-h-48 overflow-auto rounded-md border">
                    {categories.map(cat => {
                      const isEditing = editingCategoryId === cat.id
                      return (
                        <div key={cat.id} className="flex items-center justify-between p-2 border-b last:border-b-0 hover:bg-muted/50">
                          {!isEditing ? (
                            <>
                              <span className="text-sm">{cat.name}</span>
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7" 
                                  onClick={() => { 
                                    setEditingCategoryId(cat.id)
                                    setEditingCategoryForm({ name: cat.name, color: cat.color }) 
                                  }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-destructive hover:text-destructive" 
                                  onClick={() => setDeleteCategoryTarget({ id: cat.id, name: cat.name })}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-2 w-full">
                              <Input 
                                value={editingCategoryForm.name} 
                                onChange={e => setEditingCategoryForm(f => ({ ...f, name: e.target.value }))} 
                                placeholder="Category name" 
                                className="h-8 flex-1" 
                              />
                              <Button variant="ghost" size="sm" onClick={() => setEditingCategoryId(null)}>Cancel</Button>
                              <Button size="sm" onClick={updateCategory}>Save</Button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {categories.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No categories yet. Add one below.</p>
              )}

              {/* Add New Category */}
              <div className="space-y-2 pt-2 border-t">
                <Label htmlFor="new-cat-name" className="text-sm font-medium">Add New Category</Label>
                <div className="flex gap-2">
                  <Input 
                    id="new-cat-name" 
                    placeholder="Enter category name" 
                    value={newCategory.name} 
                    onChange={e => setNewCategory(c => ({ ...c, name: e.target.value }))} 
                    className="flex-1"
                    onKeyDown={e => { if (e.key === 'Enter' && newCategory.name.trim()) addCategory() }}
                  />
                  <Button onClick={addCategory} disabled={!newCategory.name.trim()}>Add</Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Expense Dialog */}
        <Dialog open={!!viewExpense} onOpenChange={(o) => { if(!o) setViewExpense(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Expense Details</DialogTitle>
              <DialogDescription>
                {viewExpense?.expense_number && <span className="font-mono text-xs">{viewExpense.expense_number}</span>}
              </DialogDescription>
            </DialogHeader>
            {viewExpense && (
              <div className="space-y-4">
                {/* Amount & Date Header */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <div className="text-2xl font-bold text-primary">₹{Number(viewExpense.amount).toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">{format(new Date(viewExpense.expense_date), 'dd MMM yyyy')}</div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Paid
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs uppercase tracking-wide">Category</div>
                    <div className="font-medium">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {viewExpense.category?.name || viewExpense.subcategory || 'Uncategorized'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs uppercase tracking-wide">Vendor</div>
                    <div className="font-medium">{viewExpense.vendor_name || '-'}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs uppercase tracking-wide">Related Booking</div>
                    <div className="font-medium">
                      {viewExpense.booking_number ? (
                        <span className="text-primary">{viewExpense.booking_number}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs uppercase tracking-wide">Receipt #</div>
                    <div className="font-medium">{viewExpense.receipt_number || '-'}</div>
                  </div>
                </div>

                {/* Description */}
                {viewExpense.description && (
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs uppercase tracking-wide">Description</div>
                    <div className="text-sm p-3 bg-muted/50 rounded-md">{viewExpense.description}</div>
                  </div>
                )}

                {/* Receipt Files */}
                {viewExpense.receipt_url && (
                  <div className="space-y-2">
                    <div className="text-muted-foreground text-xs uppercase tracking-wide">Attachments</div>
                    <Button variant="outline" size="sm" onClick={() => { setFileViewer(viewExpense); setViewExpense(null); }}>
                      <Eye className="h-4 w-4 mr-2" /> View Receipt Files
                    </Button>
                  </div>
                )}

                {/* Metadata */}
                <div className="pt-3 border-t text-xs text-muted-foreground">
                  <div>Created: {viewExpense.created_at ? format(new Date(viewExpense.created_at), 'dd MMM yyyy, hh:mm a') : '-'}</div>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { if(viewExpense) openEdit(viewExpense); setViewExpense(null); }}>
                <Pencil className="h-4 w-4 mr-2" /> Edit
              </Button>
              <Button onClick={() => setViewExpense(null)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Expense Dialog */}
        <Dialog open={!!editExpense} onOpenChange={(o) => { if(!o) setEditExpense(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Expense</DialogTitle>
            </DialogHeader>
            {editExpense && (
              <form onSubmit={(e)=>{ e.preventDefault(); submitEdit(); }} className="space-y-4 text-sm">
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Input value={editForm.description} onChange={e=>setEditForm(f=>({...f, description:e.target.value}))} />
                </div>
                <div className="space-y-1">
                  <Label>Amount</Label>
                  <Input type="number" step="0.01" value={editForm.amount} onChange={e=>setEditForm(f=>({...f, amount:e.target.value}))} />
                </div>
                <div className="space-y-1">
                  <Label>Date</Label>
                  <Input type="date" value={editForm.expense_date} onChange={e=>setEditForm(f=>({...f, expense_date:e.target.value}))} />
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={editForm.status} onValueChange={v=>setEditForm(f=>({...f, status:v as Expense['status']}))}>
                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Select value={editForm.category_id} onValueChange={v=>setEditForm(f=>({...f, category_id:v}))}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={()=>setEditExpense(null)}>Cancel</Button>
                  <Button type="submit">Save</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* File Viewer Dialog */}
        <Dialog open={!!fileViewer} onOpenChange={(o) => { if(!o) setFileViewer(null); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Receipt File</DialogTitle>
            </DialogHeader>
            {fileViewer?.receipt_url ? (
              <div className="space-y-4">
                {fileViewer.receipt_url.split('|').map((url,i)=>{
                  const isImg = /\.(png|jpg|jpeg|gif|webp)$/i.test(url)
                  const isPdf = /\.(pdf)$/i.test(url)
                  return (
                    <div key={i} className="border rounded p-2">
                      <p className="text-xs mb-1 break-all">File {i+1}</p>
                      {isImg ? (
                        <img src={url} alt={`Receipt ${i+1}`} className="max-h-[40vh] w-auto mx-auto rounded border" />
                      ) : isPdf ? (
                        <iframe src={url} className="w-full h-[40vh] border rounded" />
                      ) : (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Open File</a>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No file available.</div>
            )}
            <div className="flex justify-end">
              <Button onClick={() => setFileViewer(null)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
