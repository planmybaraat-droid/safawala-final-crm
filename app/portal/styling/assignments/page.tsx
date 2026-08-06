"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PortalPageHeader, PortalEmptyState, PortalSkeleton, PortalSectionLabel } from "@/components/portal/portal-shared"

const COLOR = "#ec4899"

interface InterestModalState {
  isOpen: boolean
  booking: any | null
}

export default function AssignmentsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"available-gigs" | "my-jobs">("available-gigs")
  const [bookings, setBookings] = useState<any[]>([])
  const [userInterests, setUserInterests] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [successToast, setSuccessToast] = useState("")
  const [errorState, setErrorState] = useState<string | null>(null)

  // Modal State for Stylist Interest Registration
  const [modal, setModal] = useState<InterestModalState>({ isOpen: false, booking: null })
  const [stylistName, setStylistName] = useState("")
  const [stylistPhone, setStylistPhone] = useState("")
  const [quotedRate, setQuotedRate] = useState("")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    // Load pre-saved stylist profile from localStorage if available
    try {
      const user = JSON.parse(localStorage.getItem("safawala_user") || "{}")
      if (user.name) setStylistName(user.name)
      if (user.phone) setStylistPhone(user.phone)
    } catch {}

    fetchAssignments()
  }, [])

  async function fetchAssignments() {
    setLoading(true)
    setErrorState(null)
    try {
      // Fetch bookings from CRM API
      const res = await fetch("/api/bookings?limit=50")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch rental assignments")

      const rawBookings = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : [])
      
      // Filter for Rental bookings or active orders requiring Safa Tying
      const rentalBookings = rawBookings.filter((b: any) => 
        b.booking_type === "rental" || 
        b.booking_type === "Rental" ||
        (b.status !== "cancelled" && b.status !== "rejected")
      )

      setBookings(rentalBookings)
    } catch (err: any) {
      console.error("Failed to fetch assignments:", err)
      setErrorState(err.message || "Failed to fetch rental assignments")
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  function openInterestModal(booking: any) {
    setModal({ isOpen: true, booking })
    setQuotedRate("")
    setNotes("")
  }

  function closeInterestModal() {
    setModal({ isOpen: false, booking: null })
  }

  async function handleSubmitInterest(e: React.FormEvent) {
    e.preventDefault()
    if (!modal.booking) return
    if (!stylistName.trim() || !stylistPhone.trim()) {
      alert("Please enter your Name and Phone Number")
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        booking_id: modal.booking.id,
        order_number: modal.booking.order_number,
        stylist_name: stylistName.trim(),
        stylist_phone: stylistPhone.trim(),
        quoted_rate: quotedRate.trim() || "Market Standard",
        notes: notes.trim(),
      }

      const res = await fetch("/api/styling/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok && !data.success) {
        throw new Error(data.error || "Failed to register interest")
      }

      // Track locally
      setUserInterests(prev => ({
        ...prev,
        [modal.booking.id]: payload
      }))

      setSuccessToast(`Interest & Rate (₹${quotedRate || "Standard"}) registered for ${modal.booking.groom_name || modal.booking.customer?.name || 'Customer'}'s Booking! 🎯`)
      closeInterestModal()

      setTimeout(() => setSuccessToast(""), 5000)
    } catch (err: any) {
      alert(err.message || "Failed to submit interest")
    } finally {
      setSubmitting(false)
    }
  }

  // Split bookings into Available Gigs and Registered Jobs
  const availableGigs = bookings.filter(b => !userInterests[b.id])
  const myRegisteredJobs = bookings.filter(b => !!userInterests[b.id])

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", minHeight: "100vh", background: "#fdf2f8", paddingBottom: 40 }}>
      <PortalPageHeader title="Safa Styling Gigs" subtitle="Rental Safa Tying Notifications & Jobs" color={COLOR} backHref="/portal/styling" />

      {errorState && (
        <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex flex-col gap-1.5 shadow-sm">
          <p className="text-[12px] font-extrabold text-red-800 flex items-center gap-1.5">
            ⚠️ Connection Notice
          </p>
          <p className="text-[11px] font-medium text-red-700 leading-relaxed">
            {errorState}
          </p>
        </div>
      )}

      {/* Tabs bar */}
      <div className="flex p-1 bg-white/80 backdrop-blur-md border border-pink-100 rounded-2xl mx-4 mt-4 gap-1 shadow-sm">
        <button
          onClick={() => setActiveTab("available-gigs")}
          className="flex-1 py-2.5 text-[11px] font-extrabold rounded-xl transition-all relative"
          style={{
            background: activeTab === "available-gigs" ? COLOR : "transparent",
            color: activeTab === "available-gigs" ? "white" : "#831843",
          }}
        >
          Notifications & Available Gigs ({availableGigs.length})
          {availableGigs.length > 0 && activeTab !== "available-gigs" && (
            <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("my-jobs")}
          className="flex-1 py-2.5 text-[11px] font-extrabold rounded-xl transition-all"
          style={{
            background: activeTab === "my-jobs" ? COLOR : "transparent",
            color: activeTab === "my-jobs" ? "white" : "#831843",
          }}
        >
          My Applied Jobs ({myRegisteredJobs.length})
        </button>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="mx-4 mt-3 p-3.5 rounded-2xl text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 shadow-sm flex items-center gap-2 animate-bounce">
          <span>🎉</span>
          <span>{successToast}</span>
        </div>
      )}

      {/* AVAILABLE GIGS / NOTIFICATIONS LIST */}
      {activeTab === "available-gigs" ? (
        <div className="mt-4">
          <PortalSectionLabel label={`Rental Booking Notifications (${availableGigs.length})`} />
          
          {loading ? (
            <div className="mx-4 rounded-2xl overflow-hidden bg-white/70">
              <PortalSkeleton rows={5} />
            </div>
          ) : availableGigs.length === 0 ? (
            <div className="mx-4 rounded-2xl overflow-hidden bg-white/70">
              <PortalEmptyState icon="sparkle" title="No open styling gigs" subtitle="All rental safa tying jobs are currently assigned" color={COLOR} />
            </div>
          ) : (
            <div className="mx-4 space-y-3.5">
              {availableGigs.map((b: any) => {
                const orderNo = b.order_number ? `#ORD-${b.order_number}` : `#QUO-${b.id?.slice(0, 7)}`
                const customerName = b.customer?.name || b.groom_name || "Customer"
                const groomName = b.groom_name ? ` (Groom: ${b.groom_name})` : ""
                const address = b.venue_address || b.groom_address || "Venue Address TBC"
                const safaCount = b.total_safas || (Array.isArray(b.items) ? b.items.length * 10 : 25)
                const eventDate = b.event_date || b.delivery_date
                const eventTime = b.event_time || b.delivery_time || "10:00 AM"

                return (
                  <div
                    key={b.id}
                    className="p-4 bg-white border border-pink-100 rounded-2xl flex flex-col gap-2.5 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    style={{ borderLeft: `5px solid ${COLOR}` }}
                  >
                    {/* Header line: Booking number + Badge */}
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex alignItems-center gap-1.5">
                          <span className="text-[10px] font-black text-pink-600 bg-pink-50 px-2 py-0.5 rounded-md border border-pink-100">
                            {orderNo}
                          </span>
                          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                            RENTAL SAFA TYING
                          </span>
                        </div>
                        <h3 className="text-xs font-black text-gray-900 mt-1">
                          👤 {customerName}{groomName}
                        </h3>
                      </div>
                      <span className="text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {b.status || "CONFIRMED"}
                      </span>
                    </div>

                    {/* Venue Address */}
                    <div className="bg-pink-50/40 p-2.5 rounded-xl border border-pink-100/60 mt-0.5">
                      <p className="text-[10px] text-gray-700 font-semibold leading-relaxed">
                        📍 <strong>Venue / Address:</strong> {address}
                      </p>
                    </div>

                    {/* Details Grid: Date, Time & Safa Count */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-gray-600 border-t border-dashed border-pink-100 pt-2 mt-0.5">
                      <div>
                        <span className="text-[9px] text-gray-400 block font-semibold uppercase">Event / Delivery Date</span>
                        <span>📅 {eventDate ? new Date(eventDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 block font-semibold uppercase">Time & Volume</span>
                        <span>⏰ {eventTime} • 👳 {safaCount} Safas</span>
                      </div>
                    </div>

                    {/* Action Button: Register Interest */}
                    <button
                      onClick={() => openInterestModal(b)}
                      className="w-full mt-1.5 py-3 text-center text-xs font-black text-white rounded-xl bg-pink-500 hover:bg-pink-600 transition-transform active:scale-[0.99] shadow-sm flex items-center justify-center gap-1.5"
                      style={{ background: `linear-gradient(135deg, ${COLOR}, #db2777)` }}
                    >
                      <span>🙋</span>
                      <span>I&apos;m Interested (Quote Your Rate)</span>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        /* MY APPLIED JOBS LIST */
        <div className="mt-4">
          <PortalSectionLabel label={`Applied Jobs (${myRegisteredJobs.length})`} />
          {myRegisteredJobs.length === 0 ? (
            <div className="mx-4 rounded-2xl overflow-hidden bg-white/70">
              <PortalEmptyState icon="clipboard" title="No applied jobs yet" subtitle="Click 'I'm Interested' on any available gig to submit your rate" color={COLOR} />
            </div>
          ) : (
            <div className="mx-4 space-y-3.5">
              {myRegisteredJobs.map((b: any) => {
                const interest = userInterests[b.id]
                const orderNo = b.order_number ? `#ORD-${b.order_number}` : `#QUO-${b.id?.slice(0, 7)}`
                const customerName = b.customer?.name || b.groom_name || "Customer"

                return (
                  <div
                    key={b.id}
                    className="p-4 bg-white border border-emerald-200 rounded-2xl flex flex-col gap-2 relative overflow-hidden shadow-sm"
                    style={{ borderLeft: `5px solid #10b981` }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {orderNo}
                        </span>
                        <h3 className="text-xs font-bold text-gray-800 mt-1">👤 {customerName}</h3>
                      </div>
                      <span className="text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase bg-emerald-100 text-emerald-800">
                        Interest Registered ✓
                      </span>
                    </div>

                    <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100 mt-1 text-xs font-bold text-emerald-900 space-y-1">
                      <p>👤 <strong>Artist:</strong> {interest.stylist_name} ({interest.stylist_phone})</p>
                      <p>💰 <strong>Interested Rate / Fee:</strong> ₹{interest.quoted_rate}</p>
                      {interest.notes && <p className="text-[10px] text-gray-600 font-normal">💬 Notes: {interest.notes}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── STYLIST EXPRESSION OF INTEREST MODAL ── */}
      {modal.isOpen && modal.booking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-black text-pink-600 uppercase tracking-wider bg-pink-50 px-2 py-0.5 rounded-md">
                  Express Interest
                </span>
                <h2 className="text-base font-black text-gray-900 mt-1">
                  Safa Tying Assignment #{modal.booking.order_number || modal.booking.id?.slice(0, 6)}
                </h2>
                <p className="text-xs text-gray-500 font-medium">
                  {modal.booking.customer?.name || modal.booking.groom_name || "Customer"} — {modal.booking.venue_address || "Venue Address"}
                </p>
              </div>
              <button
                onClick={closeInterestModal}
                className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 font-black text-sm flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Interest Form */}
            <form onSubmit={handleSubmitInterest} className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-wider mb-1">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={stylistName}
                  onChange={e => setStylistName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 focus:outline-none focus:border-pink-500 bg-gray-50/50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-wider mb-1">
                  WhatsApp / Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={stylistPhone}
                  onChange={e => setStylistPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 focus:outline-none focus:border-pink-500 bg-gray-50/50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-wider mb-1">
                  Interested Rate / Expected Fee (₹) *
                </label>
                <input
                  type="text"
                  required
                  value={quotedRate}
                  onChange={e => setQuotedRate(e.target.value)}
                  placeholder="e.g. ₹2,500 total OR ₹100 per safa"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-pink-300 text-xs font-extrabold text-pink-700 focus:outline-none focus:border-pink-500 bg-pink-50/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-wider mb-1">
                  Additional Notes / Experience (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Available for Pune event, 5 years tying experience"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-800 focus:outline-none focus:border-pink-500 bg-gray-50/50 resize-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={closeInterestModal}
                  className="flex-1 py-3 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] py-3 text-xs font-black text-white bg-pink-500 hover:bg-pink-600 rounded-xl transition-all shadow-md disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${COLOR}, #db2777)` }}
                >
                  {submitting ? "Submitting Rate..." : "Submit My Interest & Rate 🚀"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
