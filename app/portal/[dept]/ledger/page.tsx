"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { getPortalConfig } from "@/lib/portal-config"
import { PortalPageHeader, PortalSearchBar, PortalSkeleton, PortalEmptyState, PortalListCard, PortalSectionLabel } from "@/components/portal/portal-shared"
import { toast } from "sonner"

const CREDIT_LIMIT = 25000

function fmt(n: number) {
  return `₹${(n ?? 0).toLocaleString("en-IN")}`
}

export default function LedgerPage() {
  const params = useParams()
  const router = useRouter()
  const dept = params.dept as string
  const config = getPortalConfig(dept)

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAdminView, setIsAdminView] = useState(false)
  const [search, setSearch] = useState("")
  
  // Modals & states
  const [staffData, setStaffData] = useState<any[]>([])
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null)
  const [myLedger, setMyLedger] = useState<any | null>(null)

  const [showAdvanceModal, setShowAdvanceModal] = useState(false)
  const [showPayoutModal, setShowPayoutModal] = useState(false)
  
  const [advanceAmount, setAdvanceAmount] = useState("")
  const [advanceNotes, setAdvanceNotes] = useState("")
  const [payoutAmount, setPayoutAmount] = useState("")
  
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchLedgers = useCallback(async (currentUser: any, adminAccess: boolean) => {
    try {
      setLoading(true)
      if (adminAccess) {
        const res = await fetch("/api/staff-ledgers")
        const json = await res.json()
        if (json.success) {
          setStaffData(json.data || [])
        } else {
          toast.error(json.error || "Failed to load staff ledgers")
        }
      } else {
        const res = await fetch(`/api/staff-ledgers/${currentUser.id}`)
        const json = await res.json()
        if (json.success) {
          setMyLedger(json.data)
        } else {
          toast.error(json.error || "Failed to load your ledger")
        }
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred fetching ledgers")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSelectedStaffLedger = async (userId: string) => {
    try {
      const res = await fetch(`/api/staff-ledgers/${userId}`)
      const json = await res.json()
      if (json.success) {
        setSelectedStaff(json.data)
      } else {
        toast.error(json.error || "Failed to load staff ledger details")
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred")
    }
  }

  useEffect(() => {
    const raw = localStorage.getItem("safawala_user")
    if (raw) {
      try {
        const u = JSON.parse(raw)
        setUser(u)
        // If user has manager/admin role, or HR, display admin view
        const adminAccess = u.role === "super_admin" || u.role === "franchise_admin" || dept === "admin" || dept === "manager" || dept === "hr"
        setIsAdminView(adminAccess)
        fetchLedgers(u, adminAccess)
      } catch {}
    } else {
      setLoading(false)
    }
  }, [dept, fetchLedgers])

  const filteredStaff = staffData.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.department.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSaveAdvance(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedStaff) return
    setErrorMsg("")
    setSuccessMsg("")
    
    const amount = parseFloat(advanceAmount)
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg("Please enter a valid advance amount.")
      return
    }

    const availableCredit = (selectedStaff.creditLimit || CREDIT_LIMIT) - selectedStaff.utilizedCredit
    if (amount > availableCredit) {
      setErrorMsg(`❌ Limit Exceeded: This staff member only has ${fmt(availableCredit)} credit limit remaining. You cannot disburse ${fmt(amount)} advance.`)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/staff-ledgers/${selectedStaff.id}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          title: advanceNotes.trim() || "Cash Advance Given",
          type: "debit"
        })
      })
      const json = await res.json()

      if (!json.success) {
        setErrorMsg(json.error || "Failed to process advance")
      } else {
        setSuccessMsg(`Successfully disbursed cash advance of ${fmt(amount)}!`)
        setShowAdvanceModal(false)
        setAdvanceAmount("")
        setAdvanceNotes("")
        await fetchSelectedStaffLedger(selectedStaff.id)
        if (isAdminView) fetchLedgers(user, isAdminView)
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSavePayout(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedStaff) return
    setErrorMsg("")
    setSuccessMsg("")

    const amount = parseFloat(payoutAmount)
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg("Please enter a valid payout amount.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/staff-ledgers/${selectedStaff.id}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          title: "Advance Loan Cleared (Salary Payout)",
          type: "credit"
        })
      })
      const json = await res.json()

      if (!json.success) {
        setErrorMsg(json.error || "Failed to process payout")
      } else {
        setSuccessMsg(`Recorded payroll/payout settlement of ${fmt(amount)}!`)
        setShowPayoutModal(false)
        setPayoutAmount("")
        await fetchSelectedStaffLedger(selectedStaff.id)
        if (isAdminView) fetchLedgers(user, isAdminView)
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error")
    } finally {
      setSubmitting(false)
    }
  }

  if (!config || !user) return null

  // Credit Meter Arc Calculation
  const strokeWidth = 14
  const radius = 80
  const circumference = 2 * Math.PI * radius
  
  function getGaugeOffset(utilized: number, limit: number = CREDIT_LIMIT) {
    const usagePct = Math.min(1, utilized / limit)
    return circumference - (usagePct * (circumference / 2))
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: "#1e1208", minHeight: "100vh" }}>
      <PortalPageHeader 
        title={isAdminView ? "Staff Ledgers" : "My Ledger"} 
        subtitle="Khatabook Credit Score" 
        color={config.color} 
        backHref={`/portal/${dept}`} 
      />

      {successMsg && (
        <div className="mx-4 mt-3 p-3 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">
          🎉 {successMsg}
        </div>
      )}

      {loading ? (
        <div className="mx-4 mt-4">
          <PortalSkeleton rows={6} />
        </div>
      ) : !isAdminView && myLedger ? (
        /* ==================== PERSONAL STAFF VIEW ==================== */
        <div className="px-4 py-4 space-y-4">
          {/* Circular Gauge Card */}
          <div 
            className="p-6 rounded-3xl text-center border relative overflow-hidden flex flex-col items-center justify-center shadow-lg"
            style={{
              background: "linear-gradient(145deg, #1e1b4b 0%, #312e81 100%)",
              borderColor: "rgba(99,102,241,0.25)",
              color: "white"
            }}
          >
            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-pink-500/10 rounded-full blur-2xl pointer-events-none" />

            <h2 className="text-[10px] font-black uppercase tracking-wider text-indigo-300">Khatabook Limit Utilization</h2>

            {/* SVG Arc Gauge */}
            <div className="relative w-48 h-32 mt-4 flex items-center justify-center overflow-hidden">
              <svg className="w-full h-full transform -rotate-180" viewBox="0 0 200 200">
                {/* Background Arc */}
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference / 2} // Half circle
                  strokeLinecap="round"
                />
                {/* Utilized Arc */}
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  stroke="url(#gradient)"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={getGaugeOffset(myLedger.utilizedCredit || 0, myLedger.creditLimit || CREDIT_LIMIT)}
                  strokeLinecap="round"
                  style={{
                    transition: "stroke-dashoffset 0.8s ease-in-out"
                  }}
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4f46e5" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
              
              {/* Central Text Panel */}
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <p className="text-[10px] text-gray-300 font-medium">Utilized Advance</p>
                <p className="text-2xl font-black mt-0.5 tracking-tight">{fmt(myLedger.utilizedCredit || 0)}</p>
                <p className="text-[9px] text-gray-400 mt-0.5">out of {fmt(myLedger.creditLimit || CREDIT_LIMIT)}</p>
              </div>
            </div>

            <div className="border-t border-white/5 w-full pt-4 mt-2 flex justify-between items-center text-xs">
              <div>
                <p className="text-[9px] text-gray-400 text-left">Available Limit</p>
                <p className="font-extrabold text-emerald-400 text-left mt-0.5">{fmt((myLedger.creditLimit || CREDIT_LIMIT) - (myLedger.utilizedCredit || 0))}</p>
              </div>
              <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg text-[9px] font-black text-emerald-400">
                <span>●</span> ACTIVE LIMIT
              </div>
            </div>
          </div>

          {/* Transaction Ledgers */}
          <PortalSectionLabel label="Ledger History (Debits & Credits)" />
          <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
            {myLedger.transactions?.length === 0 ? (
               <div className="p-4 text-center text-xs text-gray-500">No transactions recorded yet.</div>
            ) : myLedger.transactions?.map((tx: any) => (
              <PortalListCard
                key={tx.id}
                title={tx.title}
                subtitle={tx.transaction_date ? new Date(tx.transaction_date).toLocaleDateString() : ""}
                badge={tx.type === "credit" ? "Credit" : "Debit"}
                meta={`${tx.type === "credit" ? "+" : "-"}${fmt(tx.amount)}`}
                color={tx.type === "credit" ? "#16a34a" : "#ea580c"}
                icon="rupee"
              />
            ))}
          </div>
        </div>
      ) : (
        /* ==================== GLOBAL DIRECTORY VIEW (MANAGER/ADMIN/HR) ==================== */
        <div className="py-4">
          <PortalSearchBar value={search} onChange={setSearch} placeholder="Search staff name or department..." />

          <div className="mx-4 mt-2 rounded-2xl overflow-hidden shadow-sm" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
            {filteredStaff.length === 0 ? (
              <PortalEmptyState icon="users" title="No staff records" subtitle="Staff credit balances appear here" color={config.color} />
            ) : (
              filteredStaff.map(s => {
                const limit = s.creditLimit || CREDIT_LIMIT
                const utilized = s.utilizedCredit || 0
                const remaining = limit - utilized
                const pct = (utilized / limit) * 100
                return (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedStaff(null); fetchSelectedStaffLedger(s.id); }}
                    className="w-full p-4 border-b border-gray-100/50 flex flex-col gap-2 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xs font-bold text-gray-800">{s.name}</h3>
                        <p className="text-[10px] text-gray-400 mt-0.5">{s.role} · <span className="uppercase">{s.department}</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-rose-600">{fmt(utilized)}</p>
                        <p className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">Utilized</p>
                      </div>
                    </div>

                    {/* Progress credit bar */}
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mt-1 relative">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ 
                          width: `${pct}%`,
                          background: pct > 80 ? "#dc2626" : pct > 40 ? "#f59e0b" : "#4f46e5" 
                        }} 
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-semibold text-gray-400 mt-0.5">
                      <span>Limit: {fmt(limit)}</span>
                      <span>Available: {fmt(remaining)}</span>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* ==================== SELECTED STAFF OVERLAY SHEET ==================== */}
          {selectedStaff && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col justify-end">
              <div 
                className="bg-white rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto space-y-5 animate-slide-up"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {/* Overlay Header */}
                <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">{selectedStaff.name}</h2>
                    <p className="text-[10px] text-gray-500 mt-0.5">{selectedStaff.role} · <span className="uppercase">{selectedStaff.department}</span></p>
                  </div>
                  <button 
                    onClick={() => setSelectedStaff(null)}
                    className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500"
                  >
                    ✕
                  </button>
                </div>

                {/* Arc Gauge in Overlay */}
                <div 
                  className="p-5 rounded-2xl text-center relative overflow-hidden flex flex-col items-center justify-center border"
                  style={{
                    background: "linear-gradient(145deg, #1e1b4b 0%, #312e81 100%)",
                    borderColor: "rgba(99,102,241,0.25)",
                    color: "white"
                  }}
                >
                  <h2 className="text-[9px] font-black uppercase tracking-wider text-indigo-300">Staff Credit Meter</h2>
                  <div className="relative w-44 h-28 mt-2 flex items-center justify-center overflow-hidden">
                    <svg className="w-full h-full transform -rotate-180" viewBox="0 0 200 200">
                      <circle
                        cx="100"
                        cy="100"
                        r={radius}
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference / 2}
                      />
                      <circle
                        cx="100"
                        cy="100"
                        r={radius}
                        stroke="url(#overlayGrad)"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={getGaugeOffset(selectedStaff.utilizedCredit || 0, selectedStaff.creditLimit || CREDIT_LIMIT)}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="overlayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#f43f5e" />
                          <stop offset="100%" stopColor="#4f46e5" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute bottom-2 left-0 right-0 text-center">
                      <p className="text-[9px] text-gray-300 font-medium">Utilized Balance</p>
                      <p className="text-xl font-black mt-0.5">{fmt(selectedStaff.utilizedCredit || 0)}</p>
                      <p className="text-[8px] text-gray-400">out of {fmt(selectedStaff.creditLimit || CREDIT_LIMIT)}</p>
                    </div>
                  </div>
                  <div className="border-t border-white/5 w-full pt-3 mt-1 flex justify-between items-center text-xs">
                    <div>
                      <p className="text-[8px] text-gray-400 text-left">Available Limit</p>
                      <p className="font-extrabold text-emerald-400 text-left mt-0.5">{fmt((selectedStaff.creditLimit || CREDIT_LIMIT) - (selectedStaff.utilizedCredit || 0))}</p>
                    </div>
                    <div className="text-[9px] font-bold text-indigo-300">
                      Limit Caps: {fmt(selectedStaff.creditLimit || CREDIT_LIMIT)}
                    </div>
                  </div>
                </div>

                {/* Operations Actions */}
                <div className="flex gap-3">
                  <button 
                    onClick={() => { setShowAdvanceModal(true); setErrorMsg(""); }}
                    className="flex-1 py-3 text-center text-xs font-bold text-white rounded-xl bg-orange-500 hover:bg-orange-600 transition-colors"
                  >
                    💵 Give Advance
                  </button>
                  <button 
                    onClick={() => { setShowPayoutModal(true); setErrorMsg(""); }}
                    className="flex-1 py-3 text-center text-xs font-bold text-white rounded-xl bg-emerald-600 hover:bg-emerald-700 transition-colors"
                  >
                    💳 Record Payout
                  </button>
                </div>

                {/* Individual Transactions history list */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Transaction Ledger</p>
                  <div className="rounded-xl overflow-hidden border border-gray-100 max-h-48 overflow-y-auto">
                    {selectedStaff.transactions?.length === 0 ? (
                      <div className="p-3 text-center text-xs text-gray-500 bg-gray-50">No transactions recorded.</div>
                    ) : selectedStaff.transactions?.map((tx: any) => (
                      <div key={tx.id} className="p-3 bg-gray-50 flex justify-between items-center border-b border-gray-100/50">
                        <div>
                          <p className="text-xs font-bold text-gray-700">{tx.title}</p>
                          <p className="text-[9px] text-gray-400 mt-0.5">{tx.transaction_date ? new Date(tx.transaction_date).toLocaleDateString() : ""}</p>
                        </div>
                        <span className={`text-xs font-extrabold ${tx.type === "credit" ? "text-emerald-600" : "text-rose-600"}`}>
                          {tx.type === "credit" ? "+" : "-"}{fmt(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== ACTION MODALS ==================== */}
          {/* Give Cash Advance Modal */}
          {showAdvanceModal && selectedStaff && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <form onSubmit={handleSaveAdvance} className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4">
                <h3 className="text-sm font-black text-gray-900">Disburse Cash Advance</h3>
                <p className="text-[11px] text-gray-500">Giving advance to **{selectedStaff.name}**. Credit limit remaining: **{fmt((selectedStaff.creditLimit || CREDIT_LIMIT) - (selectedStaff.utilizedCredit || 0))}**.</p>
                
                {errorMsg && (
                  <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl text-[11px] font-semibold">
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Advance Amount (₹)</label>
                  <input
                    type="number"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    placeholder="Enter amount (e.g. 5000)"
                    required
                    className="w-full p-3 border rounded-xl text-sm font-semibold outline-none focus:border-indigo-500"
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Notes / Purpose</label>
                  <input
                    type="text"
                    value={advanceNotes}
                    onChange={(e) => setAdvanceNotes(e.target.value)}
                    placeholder="e.g. Travel fuel or Emergency"
                    className="w-full p-3 border rounded-xl text-sm font-semibold outline-none focus:border-indigo-500"
                    disabled={submitting}
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button 
                    type="button" 
                    onClick={() => { setShowAdvanceModal(false); setErrorMsg(""); }}
                    className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-500 transition-colors"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-xs font-bold text-white transition-colors disabled:opacity-50"
                    disabled={submitting}
                  >
                    {submitting ? "Processing..." : "Disburse"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Record Payout Modal */}
          {showPayoutModal && selectedStaff && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <form onSubmit={handleSavePayout} className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4">
                <h3 className="text-sm font-black text-gray-900">Record Salary Settlement Payout</h3>
                <p className="text-[11px] text-gray-500">Record payout to settle outstanding advances for **{selectedStaff.name}**. Current advance debit: **{fmt(selectedStaff.utilizedCredit || 0)}**.</p>
                
                {errorMsg && (
                  <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl text-[11px] font-semibold">
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Payout/Credit Amount (₹)</label>
                  <input
                    type="number"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder={`e.g. ${selectedStaff.utilizedCredit || 0}`}
                    required
                    className="w-full p-3 border rounded-xl text-sm font-semibold outline-none focus:border-indigo-500"
                    disabled={submitting}
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button 
                    type="button" 
                    onClick={() => { setShowPayoutModal(false); setErrorMsg(""); }}
                    className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-500 transition-colors"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition-colors disabled:opacity-50"
                    disabled={submitting}
                  >
                    {submitting ? "Processing..." : "Settle Payout"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
