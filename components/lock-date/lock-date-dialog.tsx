"use client"

import { useState } from "react"
import { Lock, Calendar, Phone, FileText, Trash2, Loader2, User, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { format } from "date-fns"

interface LockedDate {
  id: string
  locked_date: string
  whatsapp_number: string | null
  notes: string | null
  created_at: string
}

interface LockDateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lockedDates: LockedDate[]
  onLocked: (date: LockedDate) => void
  onUnlocked: (id: string) => void
}

function parseLockNote(raw: string | null): { personName: string; city: string; note: string } {
  if (!raw) return { personName: "", city: "", note: "" }
  const personMatch = raw.match(/^PERSON:\s*([^|]+)\|/)
  const cityMatch = raw.match(/\|CITY:\s*([^|]+)(\||$)/)
  const noteMatch = raw.match(/\|NOTE:\s*([\s\S]*)$/)
  return {
    personName: personMatch ? personMatch[1].trim() : "",
    city: cityMatch ? cityMatch[1].trim() : "",
    note: noteMatch ? noteMatch[1].trim() : (personMatch ? "" : raw),
  }
}

export function LockDateDialog({ open, onOpenChange, lockedDates, onLocked, onUnlocked }: LockDateDialogProps) {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [personName, setPersonName] = useState("")
  const [city, setCity] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleLock = async () => {
    if (!date) { toast.error("Please select a date"); return }
    if (!personName.trim()) { toast.error("Person name is required"); return }
    setSaving(true)
    // Encode person + city + note into notes field
    const encodedNotes = `PERSON: ${personName.trim()}|CITY: ${city.trim() || "—"}|NOTE: ${notes.trim()}`
    try {
      const res = await fetch("/api/locked-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked_date: date, whatsapp_number: whatsapp || null, notes: encodedNotes }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to lock date")
      toast.success(`📅 ${format(new Date(date), "dd MMM yyyy")} locked!`)
      onLocked(json.data)
      setDate(format(new Date(), "yyyy-MM-dd"))
      setPersonName("")
      setCity("")
      setWhatsapp("")
      setNotes("")
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleUnlock = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/locked-dates?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to unlock")
      toast.success("Date unlocked")
      onUnlocked(id)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Lock className="h-5 w-5 text-indigo-600" />
            Lock a Date
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Lock form */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3">
            <div>
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
                <Calendar className="h-3.5 w-3.5" /> Select Date *
              </Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 bg-white border-indigo-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
                  <User className="h-3.5 w-3.5" /> Person Name *
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  className="h-9 bg-white border-indigo-200"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
                  <MapPin className="h-3.5 w-3.5" /> City
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. Surat"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-9 bg-white border-indigo-200"
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
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="h-9 bg-white border-indigo-200"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
                <FileText className="h-3.5 w-3.5" /> Requirement / Notes
              </Label>
              <Textarea
                placeholder="e.g. High season, no new bookings after 4pm..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="bg-white border-indigo-200 text-sm resize-none"
              />
            </div>
            <Button
              onClick={handleLock}
              disabled={saving || !date}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-9"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
              Lock This Date
            </Button>
          </div>

          {/* Existing locked dates */}
          {lockedDates.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Locked Dates</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {lockedDates.map((ld) => {
                  const parsed = parseLockNote(ld.notes)
                  return (
                  <div key={ld.id} className="flex items-start justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Lock className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        <span className="text-sm font-bold text-green-700">
                          {format(new Date(ld.locked_date + "T00:00:00"), "dd MMM yyyy")}
                        </span>
                      </div>
                      {parsed.personName && (
                        <p className="text-[11px] text-slate-700 mt-0.5 pl-5 font-semibold">👤 {parsed.personName}{parsed.city && parsed.city !== "—" ? ` · ${parsed.city}` : ""}</p>
                      )}
                      {ld.whatsapp_number && (
                        <p className="text-[11px] text-slate-500 mt-0.5 pl-5">📞 {ld.whatsapp_number}</p>
                      )}
                      {parsed.note && (
                        <p className="text-[11px] text-slate-600 mt-0.5 pl-5 truncate max-w-[220px]">{parsed.note}</p>
                      )}
                      {!parsed.personName && ld.notes && (
                        <p className="text-[11px] text-slate-600 mt-0.5 pl-5 truncate max-w-[220px]">{ld.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleUnlock(ld.id)}
                      disabled={deletingId === ld.id}
                      className="text-red-400 hover:text-red-600 ml-2 mt-0.5"
                    >
                      {deletingId === ld.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
