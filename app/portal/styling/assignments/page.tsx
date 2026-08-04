"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PortalPageHeader, PortalListCard, PortalEmptyState, PortalSkeleton, PortalSectionLabel } from "@/components/portal/portal-shared"

const COLOR = "#ec4899"

interface Gig {
  id: string
  customerName: string
  groomName: string
  venue: string
  eventDate: string
  eventTime: string
  safaCount: number
  payout: number
  allowance: number
  status: string
}

export default function AssignmentsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"my-jobs" | "available-gigs">("my-jobs")
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState("")
  const [errorState, setErrorState] = useState<string | null>(null)

  // Available gig jobs list (Zomato/Swiggy style open pools)
  const [gigs, setGigs] = useState<Gig[]>([
    {
      id: "gig-101",
      customerName: "Rahul Medhe",
      groomName: "Rahul",
      venue: "JW Marriott, Senapati Bapat Road, Pune",
      eventDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0], // 2 days from now
      eventTime: "11:00 AM",
      safaCount: 21,
      payout: 2500,
      allowance: 500,
      status: "unassigned"
    },
    {
      id: "gig-102",
      customerName: "Sidharth Malhotra",
      groomName: "Siddharth",
      venue: "The Taj Mahal Palace, Colaba, Mumbai",
      eventDate: new Date(Date.now() + 86400000 * 4).toISOString().split("T")[0], // 4 days from now
      eventTime: "04:30 PM",
      safaCount: 51,
      payout: 4500,
      allowance: 1200,
      status: "unassigned"
    },
    {
      id: "gig-103",
      customerName: "Vikram Malhotra",
      groomName: "Vikram",
      venue: "Novotel Pune, Nagar Road, Pune",
      eventDate: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0], // 5 days from now
      eventTime: "09:00 AM",
      safaCount: 11,
      payout: 1500,
      allowance: 300,
      status: "unassigned"
    }
  ])

  useEffect(() => { fetchAssignments() }, [])

  async function fetchAssignments() {
    setLoading(true)
    setErrorState(null)
    try {
      const res = await fetch("/api/bookings?limit=50&status=confirmed")
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch styling assignments")
      }
      setBookings(Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []))
    } catch (err: any) {
      console.error("Failed to fetch assignments:", err)
      setErrorState(err.message || "Failed to fetch styling assignments")
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  function handleRegisterInterest(gig: Gig) {
    setClaimingId(gig.id)
    setSuccessToast("")
    
    // Simulate API registration delay
    setTimeout(() => {
      // Remove from available gigs
      setGigs(prev => prev.filter(g => g.id !== gig.id))
      
      // Construct a booking item to inject into My Jobs (marked as pending approval)
      const newJob = {
        id: gig.id,
        customer: { name: gig.customerName },
        groom_name: gig.groomName,
        venue_name: gig.venue,
        event_date: gig.eventDate,
        status: "pending_approval", // Stylist interest pending review
        payout: gig.payout,
        allowance: gig.allowance,
        safaCount: gig.safaCount,
        is_gig: true
      }
      
      setBookings(prev => [newJob, ...prev])
      setClaimingId(null)
      setSuccessToast(`Interest registered for ${gig.groomName}'s wedding! 🎯`)
      
      // Auto clear toast after 4s
      setTimeout(() => setSuccessToast(""), 4000)
    }, 850)
  }

  const today = new Date().toISOString().split("T")[0]
  const upcoming = bookings.filter(b => b.event_date >= today)
  const past = bookings.filter(b => b.event_date < today)

  const BookingCard = (b: any) => (
    <div
      key={b.id}
      className="p-4 bg-white border border-gray-100 rounded-2xl flex flex-col gap-2.5 relative overflow-hidden mb-3.5 shadow-sm"
      style={{
        borderLeft: `4px solid ${b.status === "pending_approval" ? "#f59e0b" : COLOR}`
      }}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xs font-bold text-gray-800">{b.customer?.name ?? "Customer"} — {b.groom_name ?? "Groom"}</h3>
          <p className="text-[10px] text-gray-400 mt-1 font-semibold">
            📍 {b.venue_name ?? b.venue_address ?? "Venue TBC"}
          </p>
        </div>
        <span 
          className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
          style={{
            background: b.status === "pending_approval" ? "#fef3c7" : "#fce7f3",
            color: b.status === "pending_approval" ? "#d97706" : COLOR
          }}
        >
          {b.status === "pending_approval" ? "Pending Approval" : b.status}
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-dashed border-gray-100 pt-2.5 mt-1 text-[11px] font-semibold text-gray-500">
        <span>📅 {b.event_date ? new Date(b.event_date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : "—"}</span>
        {b.payout && (
          <span className="text-emerald-600 font-extrabold">
            Est. Pay: ₹{(b.payout + (b.allowance || 0)).toLocaleString("en-IN")}
          </span>
        )}
      </div>
      
      <button
        onClick={() => router.push(`/bookings/${b.id}`)}
        className="w-full mt-1.5 py-2 text-center text-[10px] font-bold rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
      >
        View Booking Details
      </button>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <PortalPageHeader title="Gigs & Jobs" subtitle="Safa styling schedule" color={COLOR} backHref="/portal/styling" />

      {errorState && (
        <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex flex-col gap-1.5 shadow-sm">
          <p className="text-[12px] font-extrabold text-red-800 flex items-center gap-1.5">
            ⚠️ Error
          </p>
          <p className="text-[11px] font-medium text-red-700 leading-relaxed">
            {errorState}
          </p>
        </div>
      )}

      {/* Tabs pills bar */}
      <div className="flex p-1 bg-gray-100 rounded-2xl mx-4 mt-4 gap-1">
        <button
          onClick={() => setActiveTab("my-jobs")}
          className="flex-1 py-2 text-[11px] font-extrabold rounded-xl transition-all"
          style={{
            background: activeTab === "my-jobs" ? "white" : "transparent",
            color: activeTab === "my-jobs" ? "#1e1208" : "rgba(80,55,30,0.5)",
            boxShadow: activeTab === "my-jobs" ? "0 2px 8px rgba(0,0,0,0.06)" : "none"
          }}
        >
          My Jobs ({bookings.length})
        </button>
        <button
          onClick={() => setActiveTab("available-gigs")}
          className="flex-1 py-2 text-[11px] font-extrabold rounded-xl transition-all relative"
          style={{
            background: activeTab === "available-gigs" ? "white" : "transparent",
            color: activeTab === "available-gigs" ? "#1e1208" : "rgba(80,55,30,0.5)",
            boxShadow: activeTab === "available-gigs" ? "0 2px 8px rgba(0,0,0,0.06)" : "none"
          }}
        >
          Available Gigs ({gigs.length})
          {gigs.length > 0 && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="mx-4 mt-3 p-3 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">
          🎉 {successToast}
        </div>
      )}

      {activeTab === "my-jobs" ? (
        <div className="mt-4">
          {loading ? (
            <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)" }}>
              <PortalSkeleton rows={5} />
            </div>
          ) : bookings.length === 0 ? (
            <PortalEmptyState icon="clipboard" title="No assignments yet" subtitle="Jobs assigned to you will appear here" color={COLOR} />
          ) : (
            <>
              {upcoming.length > 0 && (
                <>
                  <PortalSectionLabel label={`Upcoming — ${upcoming.length}`} />
                  <div className="mx-4">
                    {upcoming.map(b => <BookingCard key={b.id} {...b} />)}
                  </div>
                </>
              )}
              {past.length > 0 && (
                <>
                  <PortalSectionLabel label={`Past — ${past.length}`} />
                  <div className="mx-4">
                    {past.map(b => <BookingCard key={b.id} {...b} />)}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="mt-4">
          <PortalSectionLabel label={`Available gigs nearby (${gigs.length})`} />
          <div className="mx-4 space-y-3.5">
            {gigs.length === 0 ? (
              <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)" }}>
                <PortalEmptyState icon="sparkle" title="No available gigs" subtitle="Check back later for new styling assignments" color={COLOR} />
              </div>
            ) : (
              gigs.map(g => (
                <div
                  key={g.id}
                  className="p-4 bg-white border border-gray-100 rounded-2xl flex flex-col gap-2 relative overflow-hidden shadow-sm"
                  style={{
                    borderLeft: `4px solid ${COLOR}`
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xs font-bold text-gray-800">{g.groomName}&apos;s Groom Party</h3>
                      <p className="text-[10px] text-gray-400 mt-0.5 font-semibold">
                        📍 {g.venue}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                      {g.safaCount} Safas
                    </span>
                  </div>

                  {/* Gig specific details (Compensation panel Zomato/Swiggy style) */}
                  <div className="flex items-center gap-4 bg-pink-50/50 p-2.5 rounded-xl border border-pink-100/30 mt-1">
                    <div>
                      <p className="text-[8px] text-gray-400 font-extrabold uppercase tracking-wider">Estimated Payout</p>
                      <p className="text-sm font-black text-emerald-600 mt-0.5">₹{g.payout.toLocaleString("en-IN")}</p>
                    </div>
                    <div className="w-px h-6 bg-pink-100" />
                    <div>
                      <p className="text-[8px] text-gray-400 font-extrabold uppercase tracking-wider">Travel Allowance</p>
                      <p className="text-xs font-bold text-gray-700 mt-0.5">₹{g.allowance.toLocaleString("en-IN")}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500 mt-1.5">
                    <span>📅 {new Date(g.eventDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</span>
                    <span>⏰ {g.eventTime}</span>
                  </div>

                  <button
                    disabled={claimingId === g.id}
                    onClick={() => handleRegisterInterest(g)}
                    className="w-full mt-2 py-2.5 text-center text-xs font-bold text-white rounded-xl bg-pink-500 hover:bg-pink-600 transition-colors disabled:opacity-50"
                    style={{ background: COLOR }}
                  >
                    {claimingId === g.id ? "Registering Interest..." : "🙋 I'm Interested (Claim Job)"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="h-6" />
    </div>
  )
}
