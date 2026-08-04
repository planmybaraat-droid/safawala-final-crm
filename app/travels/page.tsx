"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Plane, Hotel, MapPin, Calendar, Search, Loader2, RefreshCw, FileText, Image as ImageIcon, Upload, X, Paperclip } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { uploadWithProgress, type UploadResult } from "@/lib/upload-with-progress"

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "arranged", label: "Arranged" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  arranged: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  // legacy values from the old schema, mapped to a sensible color
  ticket_booked: "bg-blue-100 text-blue-700 border-blue-200",
  hotel_booked: "bg-blue-100 text-blue-700 border-blue-200",
  fully_booked: "bg-blue-100 text-blue-700 border-blue-200",
  departed: "bg-blue-100 text-blue-700 border-blue-200",
  returned: "bg-green-100 text-green-700 border-green-200",
}

const DOC_LABELS = ["Ticket", "Hotel Booking Confirmation", "ID Proof", "Other"]

interface TravelDoc extends UploadResult {
  label: string
  uploaded_at: string
}

export default function TravelsPage() {
  const [trips, setTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<any | null>(null)

  useEffect(() => { fetchTrips() }, [])

  async function fetchTrips() {
    try {
      setLoading(true)
      const res = await fetch("/api/travel-bookings")
      const json = await res.json()
      setTrips(json.data ?? [])
    } catch {
      toast.error("Failed to load bookings")
    } finally {
      setLoading(false)
    }
  }

  const filtered = trips.filter(t =>
    (t.customer_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (t.venue ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (t.order_number ?? "").toLowerCase().includes(search.toLowerCase())
  )

  const upcoming = filtered.filter(t => t.event_date >= format(new Date(), "yyyy-MM-dd"))
  const past = filtered.filter(t => t.event_date < format(new Date(), "yyyy-MM-dd"))

  const handleSaved = (updated: any) => {
    setTrips(prev => prev.map(t => (t.id === updated.booking_id ? { ...t, travel: updated } : t)))
    setSelected(null)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-semibold text-gray-900 tracking-tight flex items-center gap-2">
              <Plane className="w-8 h-8 text-[#0891b2]" />
              Travels & Hotels
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Every out-of-town booking — click one to arrange travel & hotel
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchTrips}>
            <RefreshCw className="h-4 w-4 mr-2" />Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total Bookings", value: trips.length, icon: Plane, color: "#0891b2" },
            { label: "Upcoming", value: upcoming.length, icon: Calendar, color: "#22c55e" },
            { label: "Documents Added", value: trips.filter(t => (t.travel?.documents?.length ?? 0) > 0).length, icon: Paperclip, color: "#a855f7" },
            { label: "Pending", value: trips.filter(t => (t.travel?.status ?? "pending") === "pending").length, icon: MapPin, color: "#f59e0b" },
          ].map((stat) => (
            <Card key={stat.label} className="border border-gray-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${stat.color}15` }}>
                  <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">{loading ? "…" : stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search by client, venue, order #..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-14 text-gray-400">
              <Plane className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-sm">No bookings found</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Upcoming ({upcoming.length})</h3>
                <div className="space-y-2">{upcoming.map(t => <BookingRow key={t.id} trip={t} onClick={() => setSelected(t)} />)}</div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Past ({past.length})</h3>
                <div className="space-y-2 opacity-70">{past.map(t => <BookingRow key={t.id} trip={t} onClick={() => setSelected(t)} />)}</div>
              </div>
            )}
          </>
        )}
      </div>

      {selected && (
        <TravelPanel trip={selected} onClose={() => setSelected(null)} onSaved={handleSaved} />
      )}
    </DashboardLayout>
  )
}

function BookingRow({ trip, onClick }: { trip: any; onClick: () => void }) {
  const status = trip.travel?.status ?? "pending"
  const docCount = trip.travel?.documents?.length ?? 0
  return (
    <Card onClick={onClick} className="border border-gray-200 hover:border-cyan-300 hover:shadow-sm transition-all cursor-pointer">
      <CardContent className="p-3.5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-lg bg-cyan-50 flex flex-col items-center justify-center shrink-0 text-cyan-700">
          <Calendar className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-x-4 gap-y-0.5 items-center">
          <div>
            <p className="text-sm font-bold text-gray-900 truncate">{trip.customer_name}</p>
            <p className="text-xs text-gray-500">
              {format(new Date(trip.event_date), "dd MMM yyyy")}
              {trip.event_time ? ` · ${trip.event_time}` : ""}
            </p>
          </div>
          <p className="text-xs text-gray-500 truncate flex items-center gap-1">
            <MapPin className="w-3 h-3 shrink-0" /> {trip.venue || "No venue on file"}
          </p>
          <div className="flex items-center gap-2 justify-start sm:justify-end">
            {docCount > 0 && (
              <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><Paperclip className="w-3 h-3" />{docCount}</span>
            )}
            <Badge variant="outline" className={`text-[10px] ${STATUS_COLOR[status] || STATUS_COLOR.pending}`}>
              {STATUS_OPTIONS.find(s => s.value === status)?.label || status}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TravelPanel({ trip, onClose, onSaved }: { trip: any; onClose: () => void; onSaved: (t: any) => void }) {
  const [status, setStatus] = useState(trip.travel?.status ?? "pending")
  const [notes, setNotes] = useState(trip.travel?.notes ?? "")
  const [documents, setDocuments] = useState<TravelDoc[]>(trip.travel?.documents ?? [])
  const [uploadLabel, setUploadLabel] = useState(DOC_LABELS[0])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setUploading(true)
    try {
      const result = await uploadWithProgress(file, { folder: "travel-documents" })
      setDocuments(prev => [...prev, { ...result, label: uploadLabel, uploaded_at: new Date().toISOString() }])
      toast.success(`${uploadLabel} uploaded`)
    } catch (err: any) {
      toast.error(err.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/travel-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: trip.id,
          order_number: trip.order_number,
          event_date: trip.event_date,
          event_name: trip.customer_name,
          venue: trip.venue,
          customer_name: trip.customer_name,
          status, notes, documents,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to save")
      toast.success("Travel & hotel details saved")
      onSaved(json.data)
    } catch (err: any) {
      toast.error(err.message || "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hotel className="w-5 h-5 text-[#0891b2]" />
            Travel & Hotel — {trip.customer_name}
          </DialogTitle>
          <DialogDescription>
            {format(new Date(trip.event_date), "dd MMM yyyy")}{trip.event_time ? ` · ${trip.event_time}` : ""} · {trip.venue || "No venue on file"} · {trip.order_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div>
            <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any arrangement notes..." className="text-sm resize-none" />
          </div>

          <div>
            <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">Documents</Label>
            <div className="space-y-2 mb-2">
              {documents.length === 0 && (
                <p className="text-xs text-gray-400">No documents uploaded yet.</p>
              )}
              {documents.map((doc, idx) => {
                const isImage = doc.type?.startsWith("image/")
                return (
                  <div key={idx} className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
                    {isImage ? <ImageIcon className="w-4 h-4 text-gray-400 shrink-0" /> : <FileText className="w-4 h-4 text-gray-400 shrink-0" />}
                    <a href={doc.url} target="_blank" rel="noreferrer" className="text-xs text-gray-700 hover:text-cyan-600 truncate flex-1">
                      <span className="font-semibold">{doc.label}</span> — {doc.filename}
                    </a>
                    <button onClick={() => setDocuments(prev => prev.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-500 shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-2">
              <Select value={uploadLabel} onValueChange={setUploadLabel}>
                <SelectTrigger className="h-9 flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_LABELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              <label className="shrink-0">
                <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={handleFile} disabled={uploading} />
                <Button type="button" variant="outline" size="sm" className="h-9" disabled={uploading} asChild>
                  <span>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
                    {uploading ? "" : "Upload"}
                  </span>
                </Button>
              </label>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full bg-[#0891b2] hover:bg-[#0e7490] text-white h-9">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
