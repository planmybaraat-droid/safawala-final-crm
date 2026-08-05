"use client"

import { useMemo, useState } from "react"
import {
  AlertCircle,
  BadgeCheck,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  DollarSign,
  FileText,
  HandCoins,
  HelpCircle,
  Info,
  Plus,
  Receipt,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  UserCheck,
  Wallet,
  X,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

export type WarehouseLoan = {
  id: string
  user_id: string
  ledger_id?: string | null
  amount: number
  purpose: "emergency" | "personal" | "medical" | "education" | "festival" | "equipment" | "other"
  reason?: string | null
  tenure_months: number
  monthly_emi: number
  status: "pending" | "approved" | "rejected" | "active" | "repaid"
  repaid_amount: number
  disbursed_at?: string | null
  reviewed_by?: string | null
  reviewed_at?: string | null
  review_notes?: string | null
  created_at: string
}

const PURPOSE_LABELS: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  emergency: { label: "Emergency", icon: AlertCircle, color: "#dc2626", bg: "#fef2f2" },
  personal: { label: "Personal Need", icon: Coins, color: "#2563eb", bg: "#eff6ff" },
  medical: { label: "Medical Expense", icon: ShieldCheck, color: "#059669", bg: "#ecfdf5" },
  education: { label: "Education / Skill", icon: FileText, color: "#7c3aed", bg: "#f5f3ff" },
  festival: { label: "Festival / Event", icon: Sparkles, color: "#d97706", bg: "#fffbeb" },
  equipment: { label: "Equipment / Tools", icon: CreditCard, color: "#0891b2", bg: "#ecfeff" },
  other: { label: "Other Purpose", icon: HelpCircle, color: "#475569", bg: "#f8fafc" },
}

function fmt(n: number) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`
}

function statusBadge(status: WarehouseLoan["status"]) {
  switch (status) {
    case "active":
    case "approved":
      return { label: "Active Loan", bg: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 }
    case "pending":
      return { label: "Pending Approval", bg: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock }
    case "rejected":
      return { label: "Rejected", bg: "bg-rose-50 text-rose-700 border-rose-200", icon: XCircle }
    case "repaid":
      return { label: "Fully Repaid", bg: "bg-purple-50 text-purple-700 border-purple-200", icon: BadgeCheck }
    default:
      return { label: status, bg: "bg-slate-50 text-slate-700 border-slate-200", icon: Info }
  }
}

export function WarehouseLoanSystem({
  user,
  ledger,
  loans = [],
  loadingLoans = false,
  isAdmin = false,
  onRefresh,
}: {
  user: any
  ledger: any
  loans: WarehouseLoan[]
  loadingLoans?: boolean
  isAdmin?: boolean
  onRefresh: () => Promise<void> | void
}) {
  const [openModal, setOpenModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [search, setSearch] = useState("")

  // Form State
  const [amount, setAmount] = useState<string>("10000")
  const [purpose, setPurpose] = useState<WarehouseLoan["purpose"]>("personal")
  const [tenureMonths, setTenureMonths] = useState<number>(6)
  const [reason, setReason] = useState("")

  // Review Modal State for Managers/Admin
  const [reviewLoan, setReviewLoan] = useState<WarehouseLoan | null>(null)
  const [reviewAction, setReviewAction] = useState<"approved" | "rejected">("approved")
  const [reviewNotes, setReviewNotes] = useState("")
  const [submittingReview, setSubmittingReview] = useState(false)

  const numAmount = Number(amount) || 0
  const calculatedEmi = useMemo(() => {
    if (numAmount <= 0 || tenureMonths <= 0) return 0
    return Math.ceil(numAmount / tenureMonths)
  }, [numAmount, tenureMonths])

  const totals = useMemo(() => {
    const active = loans.filter((l) => l.status === "active" || l.status === "approved")
    const pending = loans.filter((l) => l.status === "pending")
    const repaid = loans.filter((l) => l.status === "repaid")

    const totalActivePrincipal = active.reduce((sum, l) => sum + Number(l.amount || 0), 0)
    const totalRepaidAmount = loans.reduce((sum, l) => sum + Number(l.repaid_amount || 0), 0)
    const totalMonthlyEmi = active.reduce((sum, l) => sum + Number(l.monthly_emi || 0), 0)

    const creditLimit = Number(ledger?.creditLimit || ledger?.credit_limit || 50000)
    const utilizedCredit = Number(ledger?.utilizedCredit || ledger?.utilized_credit || 0)
    const availableCredit = Math.max(0, creditLimit - utilizedCredit)

    return {
      availableCredit,
      totalActivePrincipal,
      totalMonthlyEmi,
      totalRepaidAmount,
      activeCount: active.length,
      pendingCount: pending.length,
      repaidCount: repaid.length,
    }
  }, [loans, ledger])

  const filteredLoans = useMemo(() => {
    const q = search.trim().toLowerCase()
    return loans.filter((l) => {
      const matchStatus = statusFilter === "all" || l.status === statusFilter
      const text = `${l.purpose} ${l.reason || ""} ${l.status}`.toLowerCase()
      return matchStatus && (!q || text.includes(q))
    })
  }, [loans, statusFilter, search])

  async function handleApplyLoan(e: React.FormEvent) {
    e.preventDefault()
    if (numAmount <= 0) {
      toast.error("Please enter a valid loan amount")
      return
    }
    if (numAmount > totals.availableCredit) {
      toast.error(`Loan amount cannot exceed available limit of ${fmt(totals.availableCredit)}`)
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/staff-ledgers/${user.id}/loans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          purpose,
          tenureMonths,
          reason,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to submit loan application")
      }

      toast.success("Loan application submitted successfully!")
      setOpenModal(false)
      setAmount("10000")
      setPurpose("personal")
      setTenureMonths(6)
      setReason("")
      await onRefresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to submit loan request")
    } finally {
      setSaving(false)
    }
  }

  async function handleReviewLoan(e: React.FormEvent) {
    e.preventDefault()
    if (!reviewLoan) return

    setSubmittingReview(true)
    try {
      const res = await fetch(`/api/staff-ledgers/loans/${reviewLoan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: reviewAction,
          reviewNotes,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update loan status")
      }

      toast.success(reviewAction === "approved" ? "Loan approved and disbursed!" : "Loan application rejected")
      setReviewLoan(null)
      setReviewNotes("")
      await onRefresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to review loan")
    } finally {
      setSubmittingReview(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Available Loan Limit</p>
              <p className="mt-1 text-xl font-black text-slate-900">{fmt(totals.availableCredit)}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">Max limit {fmt(ledger?.creditLimit || ledger?.credit_limit || 50000)}</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-[#5B246B]">
              <Wallet size={20} strokeWidth={2.2} />
            </span>
          </div>
          <button
            onClick={() => setOpenModal(true)}
            className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#5B246B] py-2 text-xs font-bold text-white shadow-xs hover:bg-[#6B2C7D] transition"
          >
            <Plus size={14} /> Apply for Loan
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Active Loan Principal</p>
              <p className="mt-1 text-xl font-black text-[#5B246B]">{fmt(totals.totalActivePrincipal)}</p>
              <p className="mt-0.5 text-[10px] font-amber-600">{totals.activeCount} active loan(s)</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <HandCoins size={20} strokeWidth={2.2} />
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Monthly EMI Deduction</p>
              <p className="mt-1 text-xl font-black text-rose-600">{fmt(totals.totalMonthlyEmi)}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">Deducted from salary</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <TrendingDown size={20} strokeWidth={2.2} />
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Completed Repayments</p>
              <p className="mt-1 text-xl font-black text-emerald-600">{fmt(totals.totalRepaidAmount)}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">{totals.repaidCount} cleared loan(s)</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={20} strokeWidth={2.2} />
            </span>
          </div>
        </div>
      </div>

      {/* Main Loan List Box */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Section Header */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900">Warehouse Staff Loan System</h2>
            <p className="mt-0.5 text-[10px] text-slate-500">
              Request personal or emergency salary loans. Only 1 active loan permitted at a time.
            </p>
          </div>
          <button
            onClick={() => setOpenModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5B246B] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#6B2C7D]"
          >
            <Plus size={16} /> Apply for Loan
          </button>
        </div>

        {/* Filter Bar */}
        <div className="grid gap-2 border-b border-slate-100 p-4 sm:grid-cols-[1fr_180px]">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search loan purpose, notes, or status..."
              className="w-full bg-transparent text-xs outline-none"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none"
          >
            <option value="all">All Loan Statuses</option>
            <option value="pending">Pending Approval ({totals.pendingCount})</option>
            <option value="active">Active Loans ({totals.activeCount})</option>
            <option value="repaid">Completed / Repaid ({totals.repaidCount})</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Loan Requests List */}
        {loadingLoans ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading loan records...</div>
        ) : filteredLoans.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-[#5B246B]">
              <HandCoins size={24} />
            </span>
            <p className="mt-3 text-sm font-bold text-slate-800">No loan records found</p>
            <p className="mt-1 text-[10px] text-slate-500">Click &quot;Request New Loan&quot; to apply for a salary advance or loan.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLoans.map((loan) => {
              const purposeMeta = PURPOSE_LABELS[loan.purpose] || PURPOSE_LABELS.other
              const PurposeIcon = purposeMeta.icon
              const statusMeta = statusBadge(loan.status)
              const StatusIcon = statusMeta.icon

              const isPaidPct = Math.min(100, Math.round(((loan.repaid_amount || 0) / loan.amount) * 100))

              return (
                <div key={loan.id} className="p-4 transition hover:bg-slate-50/70 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{ color: purposeMeta.color, background: purposeMeta.bg }}
                      >
                        <PurposeIcon size={20} />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-bold text-slate-900">{purposeMeta.label}</p>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold ${statusMeta.bg}`}
                          >
                            <StatusIcon size={11} /> {statusMeta.label}
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] text-slate-500">
                          Applied on <span className="font-semibold text-slate-700">{new Date(loan.created_at).toLocaleDateString("en-IN")}</span>
                        </p>
                        {loan.reason && <p className="mt-1 line-clamp-2 text-[10px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">{loan.reason}</p>}
                        {loan.review_notes && (
                          <p className="mt-1 text-[10px] text-purple-700 bg-purple-50 p-2 rounded-lg border border-purple-100">
                            <strong>Review Note:</strong> {loan.review_notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-base font-black text-slate-900">{fmt(loan.amount)}</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase">Loan Amount</p>

                      {isAdmin && loan.status === "pending" && (
                        <button
                          onClick={() => {
                            setReviewLoan(loan)
                            setReviewAction("approved")
                            setReviewNotes("")
                          }}
                          className="mt-2 inline-flex items-center gap-1 rounded-lg bg-[#5B246B] px-2.5 py-1 text-[10px] font-bold text-white shadow-xs"
                        >
                          <UserCheck size={12} /> Review Application
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Repayment Progress Bar for Active/Repaid Loans */}
                  {(loan.status === "active" || loan.status === "approved" || loan.status === "repaid") && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-600">
                        <span>Repayment Progress</span>
                        <span>
                          {fmt(loan.repaid_amount || 0)} paid of {fmt(loan.amount)} ({isPaidPct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${isPaidPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-400 pt-0.5">
                        <span>Monthly EMI: {fmt(loan.monthly_emi)}/mo</span>
                        <span>Status: {loan.status === "repaid" ? "Fully Settled" : "Deducted from Salary"}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Apply Loan Modal */}
      {openModal && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <form
            onSubmit={handleApplyLoan}
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:max-w-xl sm:rounded-3xl space-y-4"
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900">Apply for Salary Loan / Advance</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Select loan parameters. Repayment will be scheduled via monthly salary deductions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
              >
                <X size={17} />
              </button>
            </div>

              {/* Single Loan Constraint Alert */}
              {(totals.activeCount > 0 || totals.pendingCount > 0) && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-rose-900 font-extrabold">
                    <AlertCircle size={16} /> Active Loan Found
                  </div>
                  <p className="text-[11px] font-normal text-rose-700">
                    A staff member can only have 1 active loan at a time. Please fully repay your current loan before applying for a new one.
                  </p>
                </div>
              )}

              {/* Credit Limit Alert Banner */}
              <div className="rounded-xl border border-purple-100 bg-purple-50/70 p-3 flex items-center justify-between text-xs">
                <div>
                  <p className="text-[10px] font-extrabold uppercase text-purple-700">Available Loan Credit</p>
                  <p className="text-sm font-black text-[#5B246B]">{fmt(totals.availableCredit)}</p>
                </div>
                <span className="text-[10px] text-purple-600 font-medium text-right">Max Limit: {fmt(ledger?.creditLimit || ledger?.credit_limit || 50000)}</span>
              </div>

              {/* Inputs */}
              <div className="space-y-3">
                <label className="block text-[10px] font-bold text-slate-700">
                  Loan Amount (₹) *
                  <input
                    type="number"
                    min="1000"
                    max={totals.availableCredit}
                    step="500"
                    required
                    disabled={totals.activeCount > 0 || totals.pendingCount > 0}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[#5B246B] disabled:bg-slate-100"
                    placeholder="Enter amount (e.g. 10000)"
                  />
                </label>

                {/* Amount Quick Pickers */}
                <div className="flex flex-wrap gap-1.5">
                  {[5000, 10000, 15000, 25000, 50000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      disabled={val > totals.availableCredit || totals.activeCount > 0 || totals.pendingCount > 0}
                      onClick={() => setAmount(String(val))}
                      className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold transition ${
                        numAmount === val
                          ? "border-[#5B246B] bg-[#5B246B] text-white"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                      }`}
                    >
                      ₹{val.toLocaleString("en-IN")}
                    </button>
                  ))}
                </div>

                <label className="block text-[10px] font-bold text-slate-700">
                  Loan Purpose *
                  <select
                    value={purpose}
                    disabled={totals.activeCount > 0 || totals.pendingCount > 0}
                    onChange={(e) => setPurpose(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold outline-none focus:border-[#5B246B] disabled:bg-slate-100"
                  >
                    {Object.entries(PURPOSE_LABELS).map(([key, item]) => (
                      <option key={key} value={key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-[10px] font-bold text-slate-700">
                  Reason / Justification Notes
                  <textarea
                    rows={3}
                    disabled={totals.activeCount > 0 || totals.pendingCount > 0}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain why you need this loan..."
                    className="mt-1 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5B246B] disabled:bg-slate-100"
                  />
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setOpenModal(false)}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || numAmount <= 0 || totals.activeCount > 0 || totals.pendingCount > 0}
                  className="rounded-xl bg-[#5B246B] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#6B2C7D] disabled:opacity-50"
                >
                  {saving ? "Submitting..." : "Submit Application"}
                </button>
              </div>
          </form>
        </div>
      )}

      {/* Admin / Manager Review Modal */}
      {reviewLoan && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <form
            onSubmit={handleReviewLoan}
            className="w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl space-y-4"
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900">Review Loan Application</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">Approve or reject this loan request for staff.</p>
              </div>
              <button
                type="button"
                onClick={() => setReviewLoan(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
              >
                <X size={17} />
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1 border border-slate-200">
              <p>
                <strong>Requested Amount:</strong> {fmt(reviewLoan.amount)}
              </p>
              <p>
                <strong>Purpose:</strong> {PURPOSE_LABELS[reviewLoan.purpose]?.label || reviewLoan.purpose}
              </p>
              <p>
                <strong>Tenure & EMI:</strong> {reviewLoan.tenure_months} Months ({fmt(reviewLoan.monthly_emi)}/mo)
              </p>
              {reviewLoan.reason && (
                <p>
                  <strong>Reason:</strong> {reviewLoan.reason}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-700">Decision *</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setReviewAction("approved")}
                  className={`flex-1 rounded-xl border p-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    reviewAction === "approved"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  <CheckCircle2 size={16} /> Approve Loan
                </button>
                <button
                  type="button"
                  onClick={() => setReviewAction("rejected")}
                  className={`flex-1 rounded-xl border p-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    reviewAction === "rejected"
                      ? "border-rose-500 bg-rose-50 text-rose-700"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  <XCircle size={16} /> Reject Request
                </button>
              </div>
            </div>

            <label className="block text-[10px] font-bold text-slate-700">
              Review Notes / Remarks
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add approval comments or rejection reason..."
                className="mt-1 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5B246B]"
              />
            </label>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setReviewLoan(null)}
                disabled={submittingReview}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingReview}
                className={`rounded-xl px-5 py-2 text-xs font-bold text-white shadow-sm ${
                  reviewAction === "approved" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {submittingReview ? "Processing..." : reviewAction === "approved" ? "Approve & Disburse" : "Confirm Reject"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
