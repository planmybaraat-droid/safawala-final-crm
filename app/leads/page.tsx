"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { format, parseISO } from "date-fns"
import {
  Users, Phone, MapPin, Calendar, Search, RefreshCw, Filter,
  CheckCircle, Clock, X, MessageSquare, ExternalLink,
  Copy, ChevronDown, Loader2, Plus, Edit2, Mail, Building2, Globe, Check,
  Lock, Trash2, User, FileText, UserPlus
} from "lucide-react"
import { toast } from "sonner"
import { validatePhoneWithCountry } from "@/lib/form-validation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase"
import { KYCDialog } from "@/components/customers/kyc-dialog"

interface Lead {
  id: string
  name: string
  phone: string
  email: string | null
  event_date: string | null
  location: string | null
  message: string | null
  package_interest: string | null
  status: "new" | "contacted" | "interested" | "converted" | "lost"
  source: string
  notes: string | null
  assigned_to: string | null
  franchise_id: string | null
  created_at: string
}

const STATUS_CONFIG = {
  new:        { label: "New",        color: "bg-blue-500/10 text-blue-400 border-blue-500/20",      dot: "bg-blue-400" },
  contacted:  { label: "Contacted",  color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", dot: "bg-yellow-400" },
  interested: { label: "Interested", color: "bg-purple-500/10 text-purple-400 border-purple-500/20", dot: "bg-purple-400" },
  converted:  { label: "Converted ✓", color: "bg-green-500/10 text-green-400 border-green-500/20",  dot: "bg-green-400" },
  lost:       { label: "Lost",       color: "bg-red-500/10 text-red-400 border-red-500/20",          dot: "bg-red-400" },
}

const SOURCE_OPTIONS = [
  { label: "Website", value: "website" },
  { label: "Instagram", value: "instagram" },
  { label: "Facebook", value: "facebook" },
  { label: "Google Search", value: "google" },
  { label: "Walk-in", value: "walk_in" },
  { label: "Referral", value: "referral" },
  { label: "Manual Entry", value: "manual" },
  { label: "Other", value: "other" },
]

const getWhatsAppLink = (phone: string) => {
  const trimmed = phone.trim()
  
  // If it explicitly starts with '+', it already contains the country code
  if (trimmed.startsWith("+")) {
    const clean = trimmed.replace(/\D/g, "")
    return `https://wa.me/${clean}`
  }

  let clean = trimmed.replace(/\D/g, "")

  // Handle leading '00' as a replacement for '+'
  if (clean.startsWith("00")) {
    clean = clean.slice(2)
    return `https://wa.me/${clean}`
  }

  // Handle local 11-digit numbers starting with '0' (common in India, e.g., 09876543210)
  if (clean.length === 11 && clean.startsWith("0")) {
    clean = clean.slice(1)
  }

  // Default to India country code '91' for standard 10-digit local numbers
  if (clean.length === 10) {
    return `https://wa.me/91${clean}`
  }

  // If it's already longer and has a country code (like 919876543210 or 97150...)
  return `https://wa.me/${clean}`
}

export default function LeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [franchiseFilter, setFranchiseFilter] = useState("all")
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [noteInput, setNoteInput] = useState("")

  // KYC states
  const [kycDialogOpen, setKycDialogOpen] = useState(false)
  const [kycCustomer, setKycCustomer] = useState<any>(null)
  const [loadingKycCustomer, setLoadingKycCustomer] = useState(false)

  const handleStartKYC = async () => {
    if (!selectedLead) return
    setLoadingKycCustomer(true)
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(selectedLead.phone)}`)
      if (!res.ok) throw new Error("Failed to search customer")
      const result = await res.json()
      if (result.success && result.data && result.data.length > 0) {
        // Find matching lead_id or fallback to phone match
        const matched = result.data.find((c: any) => c.lead_id === selectedLead.id) || result.data[0]
        setKycCustomer(matched)
        setKycDialogOpen(true)
      } else {
        toast.error("No customer record found for this lead. Make sure status is set to Converted.")
      }
    } catch (err: any) {
      console.error("Error opening KYC Dialog from lead:", err)
      toast.error("Failed to load customer profile for KYC")
    } finally {
      setLoadingKycCustomer(false)
    }
  }

  // Locked date PERSON/CITY/NOTE encoding (matches components/lock-date/lock-date-dialog.tsx)
  const parseLockNote = (raw: string | null) => {
    if (!raw) return { personName: "", city: "", note: "" }
    const personMatch = raw.match(/^PERSON:\s*([^|]+)\|/)
    const cityMatch = raw.match(/\|CITY:\s*([^|]+)(\||$)/)
    const noteMatch = raw.match(/\|NOTE:\s*([\s\S]*)$/)
    return {
      personName: personMatch ? personMatch[1].trim() : "",
      city: cityMatch ? cityMatch[1].trim() : "",
      note: noteMatch ? noteMatch[1].trim() : (!personMatch ? raw : ""),
    }
  }

  const handleStartEditLock = (ld: any) => {
    const parsed = parseLockNote(ld.notes)
    setEditLockForm({
      personName: parsed.personName,
      city: parsed.city && parsed.city !== "—" ? parsed.city : "",
      whatsapp_number: ld.whatsapp_number || "",
      note: parsed.note,
    })
    setEditingLockId(ld.id)
  }

  const handleSaveLockEdit = async (id: string) => {
    if (!editLockForm.personName.trim()) {
      toast.error("Person name is required")
      return
    }
    setSavingLockId(id)
    try {
      const encodedNotes = `PERSON: ${editLockForm.personName.trim()}|CITY: ${editLockForm.city.trim() || "—"}|NOTE: ${editLockForm.note.trim()}`
      const res = await fetch(`/api/locked-dates?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp_number: editLockForm.whatsapp_number || null, notes: encodedNotes }),
      })
      if (res.ok) {
        const { data } = await res.json()
        setLockedDates((prev) => prev.map((ld) => (ld.id === id ? { ...ld, ...data } : ld)))
        setEditingLockId(null)
        toast.success("Locked date updated")
      } else {
        toast.error("Failed to update locked date")
      }
    } catch {
      toast.error("Failed to update locked date")
    } finally {
      setSavingLockId(null)
    }
  }

  const createCustomerFromLock = async (ld: any, parsed: { personName: string; city: string; note: string }) => {
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: parsed.personName.trim(),
          phone: ld.whatsapp_number,
          whatsapp: ld.whatsapp_number,
          city: parsed.city && parsed.city !== "—" ? parsed.city : undefined,
          notes: parsed.note || undefined,
        }),
      })
      if (res.ok) {
        setConvertedLockIds((prev) => new Set(prev).add(ld.id))
        toast.success(`${parsed.personName} added to Customers`)
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Failed to convert to customer")
      }
    } catch {
      toast.error("Failed to convert to customer")
    }
  }

  const handleConvertLockToCustomer = async (ld: any) => {
    const parsed = parseLockNote(ld.notes)
    if (!parsed.personName.trim()) {
      toast.error("Add a person name before converting to a customer")
      return
    }
    const phone = (ld.whatsapp_number || "").replace(/\D/g, "")
    if (phone.length < 10) {
      toast.error("Add a valid WhatsApp number before converting to a customer")
      return
    }
    setConvertingLockId(ld.id)
    try {
      // Check for a duplicate by phone first, then by name, before creating a new record
      let match: any = null
      const phoneRes = await fetch(`/api/customers?search=${encodeURIComponent(phone)}`)
      if (phoneRes.ok) {
        const j = await phoneRes.json()
        if (j.success && j.data?.length > 0) match = j.data[0]
      }
      if (!match) {
        const nameRes = await fetch(`/api/customers?search=${encodeURIComponent(parsed.personName.trim())}`)
        if (nameRes.ok) {
          const j = await nameRes.json()
          if (j.success && j.data?.length > 0) match = j.data[0]
        }
      }

      if (match) {
        setDuplicateCandidate({ lockedDate: ld, customer: match, parsed })
        return
      }

      await createCustomerFromLock(ld, parsed)
    } catch {
      toast.error("Failed to convert to customer")
    } finally {
      setConvertingLockId(null)
    }
  }

  const handleCreateLockDate = async () => {
    if (!newLock.date) { toast.error("Please select a date"); return }
    if (!newLock.personName.trim()) { toast.error("Person name is required"); return }
    setCreatingLock(true)
    const encodedNotes = `PERSON: ${newLock.personName.trim()}|CITY: ${newLock.city.trim() || "—"}|NOTE: ${newLock.note.trim()}`
    try {
      const res = await fetch("/api/locked-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked_date: newLock.date, whatsapp_number: newLock.whatsapp || null, notes: encodedNotes }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to lock date")
      setLockedDates((prev) => [...prev, json.data].sort((a, b) => a.locked_date.localeCompare(b.locked_date)))
      toast.success(`${format(new Date(newLock.date), "dd MMM yyyy")} locked`)
      setNewLock({ date: format(new Date(), "yyyy-MM-dd"), personName: "", city: "", whatsapp: "", note: "" })
      setShowAddLockDialog(false)
    } catch (e: any) {
      toast.error(e.message || "Failed to lock date")
    } finally {
      setCreatingLock(false)
    }
  }

  // Master Data
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [staffMembers, setStaffMembers] = useState<any[]>([])
  const [franchises, setFranchises] = useState<any[]>([])

  // Form States (Add Lead)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newName, setNewName] = useState("")
  const [newPhone, setNewPhone] = useState("+91")
  const [newEmail, setNewEmail] = useState("")
  const [newEventDate, setNewEventDate] = useState("")
  const [newLocation, setNewLocation] = useState("")
  const [newPackage, setNewPackage] = useState("")
  const [newSource, setNewSource] = useState("manual")
  const [newStatus, setNewStatus] = useState("new")
  const [newAssignedTo, setNewAssignedTo] = useState("")
  const [newFranchiseId, setNewFranchiseId] = useState("")
  const [newRequirements, setNewRequirements] = useState("")
  const [newNotes, setNewNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Locked dates state
  const [lockedDates, setLockedDates] = useState<any[]>([])
  const [loadingLocks, setLoadingLocks] = useState(false)
  const [deletingLockId, setDeletingLockId] = useState<string | null>(null)
  const [editingLockId, setEditingLockId] = useState<string | null>(null)
  const [editLockForm, setEditLockForm] = useState({ personName: "", city: "", whatsapp_number: "", note: "" })
  const [savingLockId, setSavingLockId] = useState<string | null>(null)
  const [convertingLockId, setConvertingLockId] = useState<string | null>(null)
  const [convertedLockIds, setConvertedLockIds] = useState<Set<string>>(new Set())
  const [duplicateCandidate, setDuplicateCandidate] = useState<{ lockedDate: any; customer: any; parsed: { personName: string; city: string; note: string } } | null>(null)
  const [showAddLockDialog, setShowAddLockDialog] = useState(false)
  const [creatingLock, setCreatingLock] = useState(false)
  const [newLock, setNewLock] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    personName: "",
    city: "",
    whatsapp: "",
    note: "",
  })

  // Details Edit States
  const [isEditingDetails, setIsEditingDetails] = useState(false)
  const [editName, setEditName] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editEventDate, setEditEventDate] = useState("")
  const [editLocation, setEditLocation] = useState("")
  const [editMessage, setEditMessage] = useState("")

  // Get current user session
  useEffect(() => {
    const userStr = localStorage.getItem("safawala_user")
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setCurrentUser(user)
        if (user.franchise_id) {
          setNewFranchiseId(user.franchise_id)
        }
      } catch (err) {
        console.error("Failed to parse user session:", err)
      }
    }
    // Fetch locked dates
    setLoadingLocks(true)
    fetch("/api/locked-dates")
      .then(r => r.json())
      .then(d => setLockedDates((d.data ?? []).sort((a: any, b: any) => a.locked_date.localeCompare(b.locked_date))))
      .catch(() => {})
      .finally(() => setLoadingLocks(false))
  }, [])

  // Load master data (Staff and Franchises)
  useEffect(() => {
    async function loadMasterData() {
      try {
        const supabase = createClient()

        // Fetch staff
        let staffQuery = supabase
          .from("users")
          .select("id, name, role, franchise_id")
          .eq("is_active", true)

        if (currentUser && !currentUser.is_super_admin && currentUser.franchise_id) {
          staffQuery = staffQuery.or(`franchise_id.eq.${currentUser.franchise_id},role.eq.super_admin`)
        }
        
        const { data: staff } = await staffQuery.order("name")
        setStaffMembers(staff || [])

        // Fetch franchises
        let franchiseQuery = supabase
          .from("franchises")
          .select("id, name, code")
          .eq("is_active", true)

        if (currentUser && !currentUser.is_super_admin && currentUser.franchise_id) {
          franchiseQuery = franchiseQuery.eq("id", currentUser.franchise_id)
        }

        const { data: franchisesData } = await franchiseQuery.order("name")
        setFranchises(franchisesData || [])
      } catch (err) {
        console.error("Failed to load master data:", err)
      }
    }

    if (currentUser) {
      loadMasterData()
    }
  }, [currentUser])

  // Fetch leads based on search, source, and franchise filters
  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (sourceFilter !== "all") params.set("source", sourceFilter)
      if (franchiseFilter !== "all") params.set("franchise_id", franchiseFilter)
      
      const res = await fetch(`/api/leads?${params}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to load leads")
      }
      
      const loadedLeads = data.data || []
      setLeads(loadedLeads)
      
      // Update selected lead reference if it's currently open
      if (selectedLead) {
        const updatedSelected = loadedLeads.find((l: Lead) => l.id === selectedLead.id)
        if (updatedSelected) {
          setSelectedLead(updatedSelected)
        }
      }
    } catch (err: any) {
      setLeads([])
      toast.error(err.message || "Failed to load leads")
    } finally {
      setLoading(false)
    }
  }, [search, sourceFilter, franchiseFilter, selectedLead])

  useEffect(() => {
    const t = setTimeout(fetchLeads, 300)
    return () => clearTimeout(t)
  }, [search, sourceFilter, franchiseFilter])

  // Reset Add Lead form
  const resetAddForm = () => {
    setNewName("")
    setNewPhone("+91")
    setNewEmail("")
    setNewEventDate("")
    setNewLocation("")
    setNewPackage("")
    setNewSource("manual")
    setNewStatus("new")
    setNewAssignedTo("")
    setNewFranchiseId(currentUser?.franchise_id || "")
    setNewRequirements("")
    setNewNotes("")
  }

  // Create lead manually
  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || !newEventDate) {
      toast.error("Please fill in all required fields")
      return
    }

    const phoneValidation = validatePhoneWithCountry(newPhone)
    if (!phoneValidation.isValid) {
      toast.error(phoneValidation.error || "Please enter a valid phone number")
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          phone: newPhone,
          email: newEmail || null,
          event_date: newEventDate,
          location: newLocation || null,
          package_interest: newPackage || null,
          source: newSource,
          status: newStatus,
          assigned_to: newAssignedTo === "none" || !newAssignedTo ? null : newAssignedTo,
          franchise_id: newFranchiseId === "none" || !newFranchiseId ? null : newFranchiseId,
          message: newRequirements || null,
          notes: newNotes || null,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success("Lead created successfully")
        setShowAddDialog(false)
        resetAddForm()
        fetchLeads()
      } else {
        toast.error(data.error || "Failed to create lead")
      }
    } catch (err) {
      toast.error("Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  // Update lead fields
  const handleUpdateLeadField = async (id: string, fields: Partial<Lead>) => {
    setUpdatingId(id)
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...fields }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success("Lead updated")
        
        // Fast local update
        setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...fields } : l)))
        
        if (selectedLead?.id === id) {
          setSelectedLead((prev) => (prev ? { ...prev, ...fields } : null))
        }
      } else {
        toast.error("Failed to update lead")
      }
    } catch {
      toast.error("Failed to update")
    } finally {
      setUpdatingId(null)
    }
  }

  // Save edit details panel
  const handleSaveDetails = async () => {
    if (!editName.trim() || !editPhone.trim() || !editEventDate) {
      toast.error("Name, WhatsApp number, and Event Date are required")
      return
    }

    await handleUpdateLeadField(selectedLead!.id, {
      name: editName,
      phone: editPhone,
      email: editEmail || null,
      event_date: editEventDate,
      location: editLocation || null,
      message: editMessage || null,
    })
    setIsEditingDetails(false)
  }

  // Set edit details inputs
  const handleStartEditDetails = () => {
    if (!selectedLead) return
    setEditName(selectedLead.name)
    setEditPhone(selectedLead.phone)
    setEditEmail(selectedLead.email || "")
    setEditEventDate(selectedLead.event_date || "")
    setEditLocation(selectedLead.location || "")
    setEditMessage(selectedLead.message || "")
    setIsEditingDetails(true)
  }

  // Format date helper
  const formatDateString = (dateStr: string | null) => {
    if (!dateStr) return "Not specified"
    try {
      return format(parseISO(dateStr), "dd MMM yyyy")
    } catch (e) {
      return dateStr
    }
  }

  // Filter leads list locally by status filter
  const localFilteredLeads = useMemo(() => {
    return leads.filter((l) => statusFilter === "all" || l.status === statusFilter)
  }, [leads, statusFilter])

  // Counts based on fetched leads matching source/franchise/search filters
  const counts = useMemo(() => {
    return {
      all: leads.length,
      new: leads.filter((l) => l.status === "new").length,
      contacted: leads.filter((l) => l.status === "contacted").length,
      interested: leads.filter((l) => l.status === "interested").length,
      converted: leads.filter((l) => l.status === "converted").length,
      lost: leads.filter((l) => l.status === "lost").length,
    }
  }, [leads])

  const copyWhatsApp = (phone: string) => {
    navigator.clipboard.writeText(phone)
    toast.success("WhatsApp number copied!")
  }

  const getSourceLabel = (src: string) => {
    const opt = SOURCE_OPTIONS.find((o) => o.value === src)
    return opt ? opt.label : src
  }

  const getSourceBadgeColor = (src: string) => {
    switch (src?.toLowerCase()) {
      case "website":
        return "bg-emerald-50 text-emerald-700 border-emerald-200"
      case "instagram":
        return "bg-pink-50 text-pink-700 border-pink-200"
      case "facebook":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "google":
        return "bg-amber-50 text-amber-700 border-amber-200"
      case "walk_in":
        return "bg-teal-50 text-teal-700 border-teal-200"
      case "referral":
        return "bg-indigo-50 text-indigo-700 border-indigo-200"
      case "manual":
        return "bg-slate-100 text-slate-700 border-slate-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-semibold text-gray-900 tracking-tight flex items-center gap-2">
              <Users className="w-8 h-8 text-[#102516]" />
              Leads Center
            </h1>
            <p className="text-muted-foreground text-sm">
              Track package enquiries, manage manual leads, filter sources, and assign follow-ups.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchLeads} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button 
              onClick={() => { resetAddForm(); setShowAddDialog(true) }} 
              size="sm" 
              className="bg-[#102516] hover:bg-[#1a3a26] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {(["new", "contacted", "interested", "converted", "lost"] as const).map((s) => {
            const cfg = STATUS_CONFIG[s]
            const isActive = statusFilter === s
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(isActive ? "all" : s)}
                className={`rounded-xl p-4 border text-left transition-all ${
                  isActive 
                    ? "border-[#102516] bg-[#102516]/5 shadow-sm font-semibold" 
                    : "border-gray-200 bg-white hover:border-[#102516]/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{cfg.label}</span>
                </div>
                <p className="text-3xl font-bold font-serif mt-1 text-gray-900">{counts[s]}</p>
              </button>
            )
          })}
        </div>

        {/* Filters Toolbar */}
        <Card className="shadow-sm border-gray-100">
          <CardContent className="p-4 flex flex-col md:flex-row gap-3 items-end">
            <div className="flex-1 w-full space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, WhatsApp, location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-10 border-gray-200 focus:border-[#102516] focus:ring-[#102516]"
                />
              </div>
            </div>

            <div className="w-full md:w-44 space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Lead Source</Label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="h-10 border-gray-200">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All Sources</SelectItem>
                  {SOURCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {currentUser?.is_super_admin && (
              <div className="w-full md:w-48 space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Franchise</Label>
                <Select value={franchiseFilter} onValueChange={setFranchiseFilter}>
                  <SelectTrigger className="h-10 border-gray-200">
                    <SelectValue placeholder="All Franchises" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">All Franchises</SelectItem>
                    <SelectItem value="unassigned">Unassigned Leads</SelectItem>
                    {franchises.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("")
                setSourceFilter("all")
                setFranchiseFilter("all")
                setStatusFilter("all")
              }}
              className="h-10 text-muted-foreground hover:text-gray-900 border border-dashed border-gray-200"
            >
              Reset Filters
            </Button>
          </CardContent>
        </Card>

        {/* Content Area: Table + Detail Panel */}
        <div className="flex gap-4 items-start overflow-hidden">
          {/* Leads Table */}
          <div className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-all ${selectedLead ? "w-[58%]" : "w-full"}`}>
            {loading ? (
              <div className="p-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-[#102516]" />
                <span className="text-sm font-medium">Fetching lead entries...</span>
              </div>
            ) : localFilteredLeads.length === 0 ? (
              <div className="p-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                <Users className="w-16 h-16 opacity-25 text-gray-400 stroke-1" />
                <p className="font-semibold text-gray-700">No leads found</p>
                <p className="text-sm text-gray-400 max-w-xs">Try adjusting your filters or create a manual entry.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 border-b">
                    <tr className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                      <th className="px-5 py-3">Lead details</th>
                      <th className="px-4 py-3">Event Date</th>
                      <th className="px-4 py-3">Source</th>
                      {currentUser?.is_super_admin && <th className="px-4 py-3">Franchise</th>}
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {localFilteredLeads.map((lead) => {
                      const cfg = STATUS_CONFIG[lead.status]
                      const franchiseObj = franchises.find((f) => f.id === lead.franchise_id)
                      const isSelected = selectedLead?.id === lead.id
                      return (
                        <tr
                          key={lead.id}
                          onClick={() => {
                            setSelectedLead(lead)
                            setNoteInput(lead.notes || "")
                            setIsEditingDetails(false)
                          }}
                          className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${
                            isSelected ? "bg-slate-50" : ""
                          }`}
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#7C3AED] text-sm font-semibold text-white shadow-sm">
                                {(lead.name || "L").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">{lead.name}</div>
                                <div className="text-xs text-slate-500 font-mono mt-0.5">{lead.phone}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-xs font-medium text-gray-700">
                            {formatDateString(lead.event_date)}
                            {lead.location && (
                              <div className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                                <MapPin className="w-3 h-3 text-gray-400" />
                                {lead.location}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <Badge variant="outline" className={`font-semibold text-[10px] ${getSourceBadgeColor(lead.source)}`}>
                              {getSourceLabel(lead.source)}
                            </Badge>
                          </td>
                          {currentUser?.is_super_admin && (
                            <td className="px-4 py-4 text-xs font-semibold text-gray-600">
                              {franchiseObj ? franchiseObj.name : <span className="text-gray-400 italic font-normal">Unassigned</span>}
                            </td>
                          )}
                          <td className="px-4 py-4">
                            <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 flex items-center gap-1.5 w-fit ${cfg.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1.5">
                              <a
                                href={`tel:${lead.phone}`}
                                className="w-8 h-8 flex items-center justify-center border border-gray-200 bg-white text-gray-600 rounded-lg hover:bg-slate-50 hover:text-gray-900 transition"
                                title="Call Number"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                              <a
                                href={getWhatsAppLink(lead.phone)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 flex items-center justify-center border border-emerald-100 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition"
                                title="WhatsApp Chat"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Lead Detail Panel */}
          {selectedLead && (
            <div className="w-[42%] bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <div>
                  <h3 className="font-semibold text-gray-900">Lead Details</h3>
                  <span className="text-[10px] text-muted-foreground font-mono">ID: {selectedLead.id.slice(0, 8)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditingDetails && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500" onClick={handleStartEditDetails}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedLead(null); setIsEditingDetails(false) }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Detail Contents */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {isEditingDetails ? (
                  // Detail Edit Mode
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700">Full Name *</Label>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700">WhatsApp / Phone *</Label>
                      <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700">Email Address</Label>
                      <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="h-9" placeholder="Optional" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-700">Event Date *</Label>
                        <Input type="date" value={editEventDate} onChange={(e) => setEditEventDate(e.target.value)} className="h-9" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-700">Location</Label>
                        <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className="h-9" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700">Requirements Box</Label>
                      <Textarea value={editMessage} onChange={(e) => setEditMessage(e.target.value)} rows={3} className="resize-none" />
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                      <Button variant="outline" size="sm" onClick={() => setIsEditingDetails(false)}>Cancel</Button>
                      <Button size="sm" onClick={handleSaveDetails} className="bg-[#102516] hover:bg-[#1a3a26] text-white">Save Changes</Button>
                    </div>
                  </div>
                ) : (
                  // Detail View Mode
                  <>
                    {/* Contact Quick card */}
                    <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-lg text-gray-900 leading-tight">{selectedLead.name}</h4>
                          {selectedLead.email && <span className="text-xs text-gray-500 flex items-center gap-1 mt-1 font-medium"><Mail className="w-3.5 h-3.5 text-gray-400" /> {selectedLead.email}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-700 font-mono">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{selectedLead.phone}</span>
                        <button onClick={() => copyWhatsApp(selectedLead.phone)} className="text-gray-400 hover:text-gray-600 transition" title="Copy">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {selectedLead.location && (
                        <div className="text-xs text-gray-600 flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span>{selectedLead.location}</span>
                        </div>
                      )}

                      <div className="flex gap-2 pt-1.5">
                        <a
                          href={`tel:${selectedLead.phone}`}
                          className="flex-1 flex items-center justify-center gap-2 border border-gray-200 bg-white text-gray-700 hover:bg-slate-50 rounded-lg py-2 text-xs font-semibold transition"
                        >
                          <Phone className="w-3.5 h-3.5 text-gray-400" /> Call Number
                        </a>
                         <a
                           href={getWhatsAppLink(selectedLead.phone)}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="flex-1 flex items-center justify-center gap-2 bg-[#25d366] hover:bg-[#20ba56] text-white rounded-lg py-2 text-xs font-semibold transition shadow-sm"
                         >
                          <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                        </a>
                      </div>
                    </div>

                    {/* Metadata details */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Event & Lead Details</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50/20 rounded-lg p-3 border border-gray-100">
                          <p className="text-[10px] text-muted-foreground uppercase font-semibold">Event Date</p>
                          <p className="font-semibold text-sm mt-0.5 text-gray-900">{formatDateString(selectedLead.event_date)}</p>
                        </div>
                        <div className="bg-slate-50/20 rounded-lg p-3 border border-gray-100">
                          <p className="text-[10px] text-muted-foreground uppercase font-semibold">Lead Source</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className={`font-semibold text-[10px] ${getSourceBadgeColor(selectedLead.source)}`}>
                              {getSourceLabel(selectedLead.source)}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Dropdowns */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Assigned Staff</Label>
                          <Select
                            value={selectedLead.assigned_to || "unassigned"}
                            onValueChange={(val) => handleUpdateLeadField(selectedLead.id, { assigned_to: val === "unassigned" ? null : val })}
                            disabled={updatingId === selectedLead.id}
                          >
                            <SelectTrigger className="h-9 text-xs border-gray-200">
                              <SelectValue placeholder="Assign Staff" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {staffMembers.map((staff) => (
                                <SelectItem key={staff.id} value={staff.id}>
                                  {staff.name} ({staff.role.replace("_", " ")})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Lead Source</Label>
                          <Select
                            value={selectedLead.source}
                            onValueChange={(val) => handleUpdateLeadField(selectedLead.id, { source: val })}
                            disabled={updatingId === selectedLead.id}
                          >
                            <SelectTrigger className="h-9 text-xs border-gray-200">
                              <SelectValue placeholder="Source" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              {SOURCE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {currentUser?.is_super_admin && (
                          <div className="space-y-1 md:col-span-2">
                            <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Franchise Assignment</Label>
                            <Select
                              value={selectedLead.franchise_id || "unassigned"}
                              onValueChange={(val) => handleUpdateLeadField(selectedLead.id, { franchise_id: val === "unassigned" ? null : val })}
                              disabled={updatingId === selectedLead.id}
                            >
                              <SelectTrigger className="h-9 text-xs border-gray-200">
                                <SelectValue placeholder="Select Franchise" />
                              </SelectTrigger>
                              <SelectContent className="bg-white">
                                <SelectItem value="unassigned">Unassigned (Global)</SelectItem>
                                {franchises.map((f) => (
                                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Requirements box */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Requirements Box</h4>
                      <div className="bg-[#102516]/5 border border-[#102516]/10 rounded-xl p-3.5 text-sm leading-relaxed text-gray-800 font-medium">
                        {selectedLead.message ? selectedLead.message : <span className="text-gray-400 italic font-normal">No specific requirements mentioned</span>}
                      </div>
                    </div>

                    {/* Lead Status */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Update Status</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {(Object.keys(STATUS_CONFIG) as (keyof typeof STATUS_CONFIG)[]).map((s) => {
                          const cfg = STATUS_CONFIG[s]
                          const isActive = selectedLead.status === s
                          return (
                            <button
                              key={s}
                              onClick={() => handleUpdateLeadField(selectedLead.id, { status: s })}
                              disabled={updatingId === selectedLead.id}
                              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-all ${
                                isActive
                                  ? cfg.color + " border-2 ring-1 ring-[#102516]/10"
                                  : "border-gray-200 hover:bg-slate-50 text-gray-600"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* KYC Section if Converted */}
                    {selectedLead.status === "converted" && (
                      <div className="space-y-2 border-t border-slate-100 pt-3">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer KYC</h4>
                        <Button
                          type="button"
                          onClick={handleStartKYC}
                          disabled={loadingKycCustomer}
                          className="w-full text-white bg-green-700 hover:bg-green-800 h-9 flex items-center justify-center gap-2 rounded-lg font-medium shadow-sm transition-all"
                        >
                          {loadingKycCustomer ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          <span>Start Customer KYC</span>
                        </Button>
                      </div>
                    )}

                    {/* Internal Notes */}
                    <div className="space-y-2 pt-1">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Internal Notes</h4>
                      <Textarea
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="Add internal log or notes..."
                        rows={3}
                        className="w-full text-xs border-gray-200 focus:border-[#102516] focus:ring-[#102516] resize-none"
                      />
                      <Button
                        onClick={() => handleUpdateLeadField(selectedLead.id, { notes: noteInput })}
                        disabled={updatingId === selectedLead.id}
                        size="sm"
                        className="w-full text-white bg-[#102516] hover:bg-[#1a3a26] h-8 flex items-center justify-center gap-1"
                      >
                        {updatingId === selectedLead.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Save Notes
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {/* Footer info */}
              <div className="px-5 py-3 border-t bg-gray-50 text-[10px] text-muted-foreground flex justify-between">
                <span>Received: {format(parseISO(selectedLead.created_at), "dd MMM yyyy, hh:mm a")}</span>
                {selectedLead.source && <span>via {getSourceLabel(selectedLead.source)}</span>}
              </div>
            </div>
          )}
        </div>

        {/* ─── Locked Dates Section ─── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-green-500" />
              <h2 className="text-lg font-semibold text-gray-900">Locked Dates</h2>
              {lockedDates.length > 0 && (
                <Badge className="text-xs bg-green-100 text-green-800 border-green-200 hover:bg-green-100">{lockedDates.filter(ld => ld.locked_date >= format(new Date(), "yyyy-MM-dd")).length} upcoming</Badge>
              )}
            </div>
            <Button size="sm" onClick={() => setShowAddLockDialog(true)} className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="h-4 w-4 mr-1" />
              Lock a Date
            </Button>
          </div>

          {loadingLocks ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : lockedDates.filter(ld => ld.locked_date >= format(new Date(), "yyyy-MM-dd")).length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Lock className="h-10 w-10 mb-2 opacity-20" />
                <p className="text-sm">No upcoming locked dates</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[560px] overflow-y-auto pr-1">
              {lockedDates
                .filter(ld => ld.locked_date >= format(new Date(), "yyyy-MM-dd"))
                .map(ld => {
                  const parsed = parseLockNote(ld.notes)
                  const { personName, city, note } = parsed
                  const isToday = ld.locked_date === format(new Date(), "yyyy-MM-dd")
                  const canManage = currentUser?.role === "franchise_admin" || currentUser?.role === "franchise_owner" || currentUser?.role === "super_admin"
                  const isEditing = editingLockId === ld.id
                  const isConverted = convertedLockIds.has(ld.id)
                  return (
                    <Card key={ld.id} className={`shadow-sm border ${isToday ? "border-green-300 bg-green-50" : "border-green-100 bg-white"}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isToday ? "bg-green-200" : "bg-green-100"}`}>
                              <Lock className={`h-3.5 w-3.5 ${isToday ? "text-green-700" : "text-green-500"}`} />
                            </div>
                            <div>
                              <div className={`text-sm font-bold ${isToday ? "text-green-700" : "text-gray-800"}`}>
                                {format(new Date(ld.locked_date + "T00:00:00"), "EEE, dd MMM yyyy")}
                              </div>
                              {isToday && <span className="text-[10px] font-bold text-green-600 uppercase tracking-wide">TODAY</span>}
                            </div>
                          </div>
                          {canManage && !isEditing && (
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => handleStartEditLock(ld)}
                                className="text-gray-400 hover:text-indigo-600"
                                title="Edit"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={async () => {
                                  setDeletingLockId(ld.id)
                                  try {
                                    const res = await fetch(`/api/locked-dates?id=${ld.id}`, { method: "DELETE" })
                                    if (res.ok) setLockedDates(prev => prev.filter(d => d.id !== ld.id))
                                    else toast.error("Failed to unlock")
                                  } catch { toast.error("Error") }
                                  finally { setDeletingLockId(null) }
                                }}
                                disabled={deletingLockId === ld.id}
                                className="text-red-300 hover:text-red-500"
                                title="Delete"
                              >
                                {deletingLockId === ld.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="mt-2 pt-2 border-t border-green-100 space-y-2">
                            <Input
                              value={editLockForm.personName}
                              onChange={(e) => setEditLockForm(f => ({ ...f, personName: e.target.value }))}
                              placeholder="Person name"
                              className="h-8 text-xs"
                            />
                            <Input
                              value={editLockForm.city}
                              onChange={(e) => setEditLockForm(f => ({ ...f, city: e.target.value }))}
                              placeholder="City"
                              className="h-8 text-xs"
                            />
                            <Input
                              value={editLockForm.whatsapp_number}
                              onChange={(e) => setEditLockForm(f => ({ ...f, whatsapp_number: e.target.value }))}
                              placeholder="WhatsApp number"
                              className="h-8 text-xs"
                            />
                            <Textarea
                              value={editLockForm.note}
                              onChange={(e) => setEditLockForm(f => ({ ...f, note: e.target.value }))}
                              placeholder="Note"
                              rows={2}
                              className="text-xs resize-none"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleSaveLockEdit(ld.id)}
                                disabled={savingLockId === ld.id}
                                className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700"
                              >
                                {savingLockId === ld.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingLockId(null)}
                                className="h-7 text-xs"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {personName && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                                  <User className="h-3 w-3 text-indigo-500" /> {personName}
                                </span>
                                {city && city !== "—" && (
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> {city}
                                  </span>
                                )}
                              </div>
                            )}
                            {ld.whatsapp_number && (
                              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {ld.whatsapp_number}
                              </p>
                            )}
                            {note && (
                              <p className="text-xs text-gray-500 mt-1 truncate flex items-start gap-1">
                                <FileText className="h-3 w-3 mt-0.5 shrink-0" /> {note}
                              </p>
                            )}
                            {canManage && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isConverted || convertingLockId === ld.id}
                                onClick={() => handleConvertLockToCustomer(ld)}
                                className="mt-2 h-7 text-xs w-full text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                              >
                                {convertingLockId === ld.id ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <UserPlus className="h-3 w-3 mr-1" />
                                )}
                                {isConverted ? "Customer" : "Convert to Customer"}
                              </Button>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          )}
        </div>

      </div>

      {/* Lock a Date Dialog */}
      <Dialog open={showAddLockDialog} onOpenChange={setShowAddLockDialog}>
        <DialogContent className="max-w-md bg-white border border-slate-100 shadow-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              <Lock className="h-5 w-5 text-green-600" />
              Lock a Date
            </DialogTitle>
            <DialogDescription>Block a date from new bookings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div>
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
                <Calendar className="h-3.5 w-3.5" /> Select Date *
              </Label>
              <Input
                type="date"
                value={newLock.date}
                onChange={(e) => setNewLock((f) => ({ ...f, date: e.target.value }))}
                className="h-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
                  <User className="h-3.5 w-3.5" /> Person Name *
                </Label>
                <Input
                  placeholder="e.g. Rahul Sharma"
                  value={newLock.personName}
                  onChange={(e) => setNewLock((f) => ({ ...f, personName: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
                  <MapPin className="h-3.5 w-3.5" /> City
                </Label>
                <Input
                  placeholder="e.g. Surat"
                  value={newLock.city}
                  onChange={(e) => setNewLock((f) => ({ ...f, city: e.target.value }))}
                  className="h-9"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
                <Phone className="h-3.5 w-3.5" /> WhatsApp Number
              </Label>
              <Input
                type="tel"
                placeholder="+91 97252 95691"
                value={newLock.whatsapp}
                onChange={(e) => setNewLock((f) => ({ ...f, whatsapp: e.target.value }))}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
                <FileText className="h-3.5 w-3.5" /> Requirement / Notes
              </Label>
              <Textarea
                placeholder="e.g. High season, no new bookings after 4pm..."
                value={newLock.note}
                onChange={(e) => setNewLock((f) => ({ ...f, note: e.target.value }))}
                rows={2}
                className="text-sm resize-none"
              />
            </div>
            <Button
              onClick={handleCreateLockDate}
              disabled={creatingLock || !newLock.date}
              className="w-full bg-green-600 hover:bg-green-700 text-white h-9"
            >
              {creatingLock ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
              Lock This Date
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicate Customer Confirmation */}
      <Dialog open={!!duplicateCandidate} onOpenChange={(open) => !open && setDuplicateCandidate(null)}>
        <DialogContent className="max-w-md bg-white border border-slate-100 shadow-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Already a Customer</DialogTitle>
            <DialogDescription>
              {duplicateCandidate?.customer?.name} is already a customer (matched by {duplicateCandidate?.customer?.phone === duplicateCandidate?.lockedDate?.whatsapp_number ? "phone number" : "name"}). Do you want to use this customer for the next order?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={() => {
                if (!duplicateCandidate) return
                router.push(`/create-invoice?customerId=${duplicateCandidate.customer.id}&mode=new`)
                setDuplicateCandidate(null)
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Yes, Same Customer — New Booking
            </Button>
            <Button
              variant="outline"
              disabled={!!(duplicateCandidate && convertingLockId === duplicateCandidate.lockedDate.id)}
              onClick={async () => {
                if (!duplicateCandidate) return
                const { lockedDate, parsed } = duplicateCandidate
                setConvertingLockId(lockedDate.id)
                await createCustomerFromLock(lockedDate, parsed)
                setConvertingLockId(null)
                setDuplicateCandidate(null)
              }}
              className="w-full"
            >
              {duplicateCandidate && convertingLockId === duplicateCandidate.lockedDate.id ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Add as New Customer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Add Lead Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-white border border-slate-100 shadow-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif font-semibold text-gray-900">Add New Lead Manually</DialogTitle>
            <DialogDescription>Create a new lead entry inside the CRM dashboard database.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddLead} className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="lead-name" className="text-xs font-semibold text-gray-700">Full Name *</Label>
                <Input
                  id="lead-name"
                  placeholder="Enter customer name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="border-gray-200 focus:border-[#102516]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-phone" className="text-xs font-semibold text-gray-700">WhatsApp / Phone *</Label>
                <Input
                  id="lead-phone"
                  placeholder="e.g. +91 9876543210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  required
                  className="border-gray-200 focus:border-[#102516]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-email" className="text-xs font-semibold text-gray-700">Email Address (Optional)</Label>
                <Input
                  id="lead-email"
                  type="email"
                  placeholder="customer@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="border-gray-200 focus:border-[#102516]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-date" className="text-xs font-semibold text-gray-700">Event Date *</Label>
                <Input
                  id="lead-date"
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  required
                  className="border-gray-200 focus:border-[#102516]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-location" className="text-xs font-semibold text-gray-700">Location</Label>
                <Input
                  id="lead-location"
                  placeholder="Event venue or city"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="border-gray-200 focus:border-[#102516]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-package" className="text-xs font-semibold text-gray-700">Package Interest</Label>
                <Input
                  id="lead-package"
                  placeholder="Turban pack, jewelry etc."
                  value={newPackage}
                  onChange={(e) => setNewPackage(e.target.value)}
                  className="border-gray-200 focus:border-[#102516]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-source" className="text-xs font-semibold text-gray-700">Lead Source</Label>
                <Select value={newSource} onValueChange={setNewSource}>
                  <SelectTrigger id="lead-source" className="border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {SOURCE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-status" className="text-xs font-semibold text-gray-700">Initial Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger id="lead-status" className="border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="interested">Interested</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-assignee" className="text-xs font-semibold text-gray-700">Assigned Staff</Label>
                <Select value={newAssignedTo} onValueChange={setNewAssignedTo}>
                  <SelectTrigger id="lead-assignee" className="border-gray-200">
                    <SelectValue placeholder="Select follow-up staff" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="none">Unassigned</SelectItem>
                    {staffMembers.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.name} ({staff.role.replace("_", " ")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {currentUser?.is_super_admin ? (
                <div className="space-y-1.5">
                  <Label htmlFor="lead-franchise" className="text-xs font-semibold text-gray-700">Franchise Assignment</Label>
                  <Select value={newFranchiseId} onValueChange={setNewFranchiseId}>
                    <SelectTrigger id="lead-franchise" className="border-gray-200">
                      <SelectValue placeholder="Select Franchise" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="none">Unassigned (Global)</SelectItem>
                      {franchises.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1.5 flex flex-col justify-end">
                  <span className="text-xs text-muted-foreground italic mb-1.5">
                    Lead will be auto-assigned to your franchise: <b>{franchises.find(f => f.id === currentUser?.franchise_id)?.name || "Your Franchise"}</b>
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lead-req" className="text-xs font-semibold text-gray-700">Requirements Box</Label>
              <Textarea
                id="lead-req"
                placeholder="Enter details on client requests (safas, turban designs, count...)"
                value={newRequirements}
                onChange={(e) => setNewRequirements(e.target.value)}
                rows={2}
                className="resize-none border-gray-200 focus:border-[#102516]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lead-notes" className="text-xs font-semibold text-gray-700">Internal Notes</Label>
              <Textarea
                id="lead-notes"
                placeholder="Staff follow-up logs, notes, or calls..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                rows={2}
                className="resize-none border-gray-200 focus:border-[#102516]"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-[#102516] hover:bg-[#1a3a26] text-white">
                {submitting ? "Creating Lead..." : "Create Lead"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {kycCustomer && (
        <KYCDialog
          open={kycDialogOpen}
          onOpenChange={setKycDialogOpen}
          customer={kycCustomer}
          onKYCUpdated={(updatedCust) => {
            setKycCustomer(updatedCust)
          }}
        />
      )}
    </DashboardLayout>
  )
}
