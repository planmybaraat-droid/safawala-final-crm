"use client"

import { useState, useEffect } from "react"
import { PortalIcon } from "./portal-icons"
import { uploadWithProgress, type UploadResult } from "@/lib/upload-with-progress"

const COLOR = "#14b8a6"

export interface StylingTask {
  id: string
  status: "pending" | "active" | "completed" | "cancelled"
  assigned_to?: string | null
  metadata?: {
    interested_stylists?: Array<{ user_id: string; name: string; note?: string; at: string }>
    assigned_stylist?: { id: string; name: string; assigned_at: string }
  } | null
}

interface StylistOption {
  id: string
  name: string
  role: string
  department: string
}

interface TravelDoc extends UploadResult {
  label: string
  uploaded_at: string
}

const TRAVEL_MODES = [
  { key: "train", label: "Train" },
  { key: "flight", label: "Flight" },
  { key: "bus", label: "Bus" },
  { key: "cab", label: "Cab" },
  { key: "self_drive", label: "Self Drive" },
]
const emptyTravelForm = {
  travel_mode: "train", ticket_ref: "", pnr: "", departure_from: "", arrival_at: "",
  departure_date: "", departure_time: "", return_date: "", return_time: "",
  hotel_name: "", hotel_address: "", hotel_checkin: "", hotel_checkout: "",
  hotel_ref: "", hotel_contact: "", ticket_cost: "", hotel_cost: "",
  other_cost: "", advance_given: "", notes: "",
}

function isSupportedTravelFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
  return file.type === "application/pdf" || file.type.startsWith("image/") || ["pdf", "jpg", "jpeg", "png", "gif", "webp"].includes(extension)
}

/** One upload slot (image or PDF, any format) — Travel Ticket / Hotel Booking / Other Documents all use this. */
function DocUploadSection({
  title, label, documents, uploadingLabel, onUpload, onRemove, color,
}: {
  title: string
  label: string
  documents: TravelDoc[]
  uploadingLabel: string | null
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemove: (index: number) => void
  color: string
}) {
  const isUploading = uploadingLabel === label
  const items = documents
    .map((doc, index) => ({ doc, index }))
    .filter(({ doc }) => doc.label === label)

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color }}>{title}</p>
        <label>
          <input type="file" accept="image/*,application/pdf,.pdf" multiple className="hidden" onChange={onUpload} disabled={isUploading} />
          <span className="flex items-center justify-center h-8 px-3 rounded-lg border border-slate-200 text-[11px] font-bold cursor-pointer" style={{ color: isUploading ? "#94a3b8" : color }}>
            {isUploading ? "Uploading…" : "Upload"}
          </span>
        </label>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-slate-400 p-2 rounded-xl border border-dashed border-slate-200">No file uploaded yet — image or PDF, any format.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map(({ doc, index }) => (
            <div key={`${doc.url}-${index}`} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5">
              <a href={doc.url} target="_blank" rel="noreferrer" className="flex-1 min-w-0 text-[11px] truncate font-semibold text-slate-700">
                {doc.filename}
              </a>
              <button onClick={() => onRemove(index)} className="text-slate-400 text-[14px]">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Assign-a-stylist + book-travel panel for a single rental event. Used inside
 * any job popup (Team & Travel list, Fulfillment/dispatch popup, …) — always
 * independent of warehouse/QC/dispatch status, since staffing/travel can be
 * arranged the moment a booking is confirmed.
 */
export function TeamTravelPanel({
  workOrder,
  stylingTask,
  onStylingTaskUpdate,
  showToast,
  onTravelSaved,
}: {
  workOrder: { booking_id: string; booking_number: string; customer_name: string }
  stylingTask: StylingTask
  onStylingTaskUpdate: (task: StylingTask) => void
  showToast: (message: string, kind?: "success" | "error") => void
  /** Called after travel details save successfully — parent can close the popup and jump to Closed Jobs. */
  onTravelSaved?: () => void
}) {
  const [step, setStep] = useState<'stylist' | 'travel'>(stylingTask.assigned_to ? 'travel' : 'stylist')
  const [stylistRoster, setStylistRoster] = useState<StylistOption[]>([])
  const [selectedStylistId, setSelectedStylistId] = useState<string | null>(stylingTask.assigned_to ?? null)
  const [editingStylist, setEditingStylist] = useState(!stylingTask.assigned_to)
  const [savingStylist, setSavingStylist] = useState(false)

  const [travelEvent, setTravelEvent] = useState<any | null>(null)
  const [travelForm, setTravelForm] = useState({ ...emptyTravelForm })
  const [documents, setDocuments] = useState<TravelDoc[]>([])
  const [uploadingLabel, setUploadingLabel] = useState<string | null>(null)
  const [savingTravel, setSavingTravel] = useState(false)
  const [loadingTravel, setLoadingTravel] = useState(true)

  useEffect(() => {
    fetch("/api/portal/staff")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const all = Array.isArray(d?.data) ? d.data : []
        setStylistRoster(all.filter((u: StylistOption) => u.department === "styling"))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoadingTravel(true)
    fetch("/api/travel-bookings")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const events = Array.isArray(d?.data) ? d.data : []
        const ev = events.find((e: any) => e.id === workOrder.booking_id) || null
        setTravelEvent(ev)
        const t = ev?.travel ?? {}
        setTravelForm({
          travel_mode: t.travel_mode ?? "train", ticket_ref: t.ticket_ref ?? "", pnr: t.pnr ?? "",
          departure_from: t.departure_from ?? "", arrival_at: t.arrival_at ?? "",
          departure_date: t.departure_date ?? "", departure_time: t.departure_time ?? "",
          return_date: t.return_date ?? "", return_time: t.return_time ?? "",
          hotel_name: t.hotel_name ?? "", hotel_address: t.hotel_address ?? "",
          hotel_checkin: t.hotel_checkin ?? "", hotel_checkout: t.hotel_checkout ?? "",
          hotel_ref: t.hotel_ref ?? "", hotel_contact: t.hotel_contact ?? "",
          ticket_cost: t.ticket_cost?.toString() ?? "", hotel_cost: t.hotel_cost?.toString() ?? "",
          other_cost: t.other_cost?.toString() ?? "", advance_given: t.advance_given?.toString() ?? "",
          notes: t.notes ?? "",
        })
        setDocuments(t.documents ?? [])
      })
      .catch(() => {})
      .finally(() => setLoadingTravel(false))
  }, [workOrder.booking_id])

  async function saveStylist() {
    if (!selectedStylistId || savingStylist) return
    setSavingStylist(true)
    try {
      const res = await fetch(`/api/work-orders/tasks/${stylingTask.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stylist_id: selectedStylistId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to assign stylist")
      onStylingTaskUpdate(data.data)
      setEditingStylist(false)
      showToast("Stylist saved!")
    } catch (err: any) {
      showToast(err.message || "Failed to assign stylist", "error")
    } finally {
      setSavingStylist(false)
    }
  }

  async function handleFiles(label: string, e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (!files.length) return
    setUploadingLabel(label)
    try {
      const results = await Promise.all(files.map(async file => {
        if (!isSupportedTravelFile(file)) throw new Error("Only image and PDF files are allowed")
        const result = await uploadWithProgress(file, { folder: "travel-documents" })
        return { ...result, label, uploaded_at: new Date().toISOString() }
      }))
      setDocuments(prev => [...prev, ...results])
    } catch (error: any) {
      showToast(error.message || "Upload failed", "error")
    } finally {
      setUploadingLabel(null)
    }
  }

  async function saveTravel() {
    setSavingTravel(true)
    try {
      const body: any = {
        booking_id: workOrder.booking_id,
        order_number: workOrder.booking_number,
        event_date: travelEvent?.event_date ?? null,
        customer_name: workOrder.customer_name,
        venue: travelEvent?.venue ?? null,
        stylist_id: stylingTask.assigned_to ?? null,
        ...travelForm,
        // These date/time fields no longer have inputs in this simplified UI —
        // empty strings are invalid for date/time columns, so send null instead.
        departure_date: travelForm.departure_date || null,
        departure_time: travelForm.departure_time || null,
        return_date: travelForm.return_date || null,
        return_time: travelForm.return_time || null,
        hotel_checkin: travelForm.hotel_checkin || null,
        hotel_checkout: travelForm.hotel_checkout || null,
        ticket_cost: parseFloat(travelForm.ticket_cost) || 0,
        hotel_cost: parseFloat(travelForm.hotel_cost) || 0,
        other_cost: parseFloat(travelForm.other_cost) || 0,
        advance_given: parseFloat(travelForm.advance_given) || 0,
        documents,
      }
      let method = "POST"
      if (travelEvent?.travel?.id) { method = "PATCH"; body.id = travelEvent.travel.id }
      const res = await fetch("/api/travel-bookings", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Save failed")
      showToast(stylingTask.assigned_to ? "Job confirmed — stylist notified!" : "Travel details saved!")
      onTravelSaved?.()
    } catch (err: any) {
      showToast(err.message || "Failed to save travel details", "error")
    } finally {
      setSavingTravel(false)
    }
  }

  const labelCls = "block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1"

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {[
          { key: "stylist", label: "① Assign Stylist" },
          { key: "travel", label: "② Travel & Tickets" },
        ].map(s => {
          const active = step === s.key
          return (
            <button
              key={s.key}
              onClick={() => setStep(s.key as 'stylist' | 'travel')}
              className="flex-1 py-2 rounded-xl text-center text-[11px] font-bold transition-all duration-300"
              style={{
                background: active ? COLOR : "#f1f5f9",
                color: active ? "white" : "#94a3b8",
                transform: active ? "scale(1.02)" : "scale(1)",
              }}
            >
              {s.label}
            </button>
          )
        })}
      </div>

      {step === "stylist" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
          {stylingTask.assigned_to && !editingStylist && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-2.5">
              <PortalIcon name="check-circle" size={16} className="text-emerald-600" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-emerald-800 truncate">
                  {stylingTask.metadata?.assigned_stylist?.name || "Stylist"} confirmed
                </p>
              </div>
              <button
                onClick={() => { setSelectedStylistId(stylingTask.assigned_to ?? null); setEditingStylist(true) }}
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white border border-emerald-200 text-emerald-700"
                title="Edit stylist"
              >
                <PortalIcon name="edit" size={14} />
              </button>
            </div>
          )}

          {editingStylist && (
            <>
              {(() => {
                const interested = stylingTask.metadata?.interested_stylists || []
                const interestedIds = new Set(interested.map(s => s.user_id))
                const otherRoster = stylistRoster.filter(s => !interestedIds.has(s.id))
                return (
                  <>
                    {interested.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-bold text-pink-500 uppercase tracking-wider">Interested ({interested.length})</p>
                        {interested.map(s => {
                          const selected = selectedStylistId === s.user_id
                          return (
                            <div
                              key={s.user_id}
                              onClick={() => setSelectedStylistId(s.user_id)}
                              className="flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors"
                              style={{ borderColor: selected ? "#ec4899" : "#fbcfe8", background: selected ? "#fce7f3" : "#fdf2f8" }}
                            >
                              <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                                style={{ borderColor: selected ? "#ec4899" : "#f9a8d4", background: selected ? "#ec4899" : "white" }}
                              >
                                {selected && <PortalIcon name="check" size={11} className="text-white" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[12px] font-bold text-slate-700 truncate">{s.name}</p>
                                {s.note && <p className="text-[10px] text-slate-500 truncate">{s.note}</p>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">All Stylists</p>
                      {otherRoster.length === 0 && interested.length === 0 ? (
                        <p className="text-[11px] text-slate-400 p-2">No stylists on the roster yet.</p>
                      ) : otherRoster.length === 0 ? (
                        <p className="text-[11px] text-slate-400 p-2">Everyone on the roster is already listed as interested above.</p>
                      ) : (
                        otherRoster.map(s => {
                          const selected = selectedStylistId === s.id
                          return (
                            <div
                              key={s.id}
                              onClick={() => setSelectedStylistId(s.id)}
                              className="flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors"
                              style={{ borderColor: selected ? COLOR : "#e2e8f0", background: selected ? `${COLOR}10` : "#f8fafc" }}
                            >
                              <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                                style={{ borderColor: selected ? COLOR : "#cbd5e1", background: selected ? COLOR : "white" }}
                              >
                                {selected && <PortalIcon name="check" size={11} className="text-white" />}
                              </div>
                              <p className="text-[12px] font-bold text-slate-700 truncate flex-1">{s.name}</p>
                            </div>
                          )
                        })
                      )}
                    </div>

                    <div className="flex gap-2 pt-1">
                      {stylingTask.assigned_to && (
                        <button
                          onClick={() => { setSelectedStylistId(stylingTask.assigned_to ?? null); setEditingStylist(false) }}
                          className="flex-1 py-3 rounded-xl text-[12px] font-bold text-slate-600 bg-slate-100"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        onClick={saveStylist}
                        disabled={!selectedStylistId || savingStylist}
                        className="flex-[2] py-3 rounded-xl text-[13px] font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ background: COLOR }}
                      >
                        {savingStylist ? "Saving…" : (<><PortalIcon name="check" size={15} /> Save Stylist</>)}
                      </button>
                    </div>
                  </>
                )
              })()}
            </>
          )}
        </div>
      )}

      {step === "travel" && (
        loadingTravel ? (
          <p className="text-[12px] text-slate-400 text-center py-6">Loading travel details…</p>
        ) : (
        <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-300">
          <div>
            <p className={labelCls}>Travel Mode</p>
            <div className="flex gap-1.5 flex-wrap">
              {TRAVEL_MODES.map(m => (
                <button key={m.key} onClick={() => setTravelForm(f => ({ ...f, travel_mode: m.key }))}
                  className="px-3 py-1.5 rounded-full text-[11px] font-bold"
                  style={{ background: travelForm.travel_mode === m.key ? COLOR : "#f1f5f9", color: travelForm.travel_mode === m.key ? "white" : "#64748b" }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <DocUploadSection
            title="Travel Ticket"
            label="Ticket"
            documents={documents}
            uploadingLabel={uploadingLabel}
            onUpload={e => handleFiles("Ticket", e)}
            onRemove={i => setDocuments(prev => prev.filter((_, idx) => idx !== i))}
            color={COLOR}
          />

          <DocUploadSection
            title="Hotel Booking"
            label="Hotel Booking Confirmation"
            documents={documents}
            uploadingLabel={uploadingLabel}
            onUpload={e => handleFiles("Hotel Booking Confirmation", e)}
            onRemove={i => setDocuments(prev => prev.filter((_, idx) => idx !== i))}
            color={COLOR}
          />

          <DocUploadSection
            title="Other Documents"
            label="Other"
            documents={documents}
            uploadingLabel={uploadingLabel}
            onUpload={e => handleFiles("Other", e)}
            onRemove={i => setDocuments(prev => prev.filter((_, idx) => idx !== i))}
            color={COLOR}
          />

          <button onClick={saveTravel} disabled={savingTravel}
            className="w-full py-3.5 rounded-xl text-[13px] font-bold text-white transition-opacity flex items-center justify-center gap-2"
            style={{ background: COLOR, opacity: savingTravel ? 0.7 : 1 }}
          >
            {savingTravel ? "Confirming…" : (<><PortalIcon name="check" size={16} /> Confirm Job & Notify Stylist</>)}
          </button>
        </div>
        )
      )}
    </div>
  )
}
