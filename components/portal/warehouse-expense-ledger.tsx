"use client"

import { useMemo, useRef, useState } from "react"
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  HandCoins,
  Plus,
  ReceiptText,
  Search,
  Upload,
  WalletCards,
  X,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

export type WarehouseExpense = {
  id: string
  amount: number
  category: string
  order_reference?: string | null
  vendor_name?: string | null
  expense_date: string
  notes?: string | null
  receipt_url?: string | null
  receipt_name?: string | null
  status: "pending" | "approved" | "rejected" | "reimbursed"
  created_at: string
}

const categories = [
  ["transport", "Transport"],
  ["packing", "Packing Material"],
  ["purchase", "Local Purchase"],
  ["repair", "Repair & Maintenance"],
  ["laundry", "Laundry"],
  ["food", "Food / Refreshment"],
  ["other", "Other"],
] as const

function fmt(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
}

function statusClasses(status: WarehouseExpense["status"]) {
  if (status === "approved" || status === "reimbursed") return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (status === "rejected") return "bg-rose-50 text-rose-700 border-rose-200"
  return "bg-amber-50 text-amber-700 border-amber-200"
}

export function WarehouseExpenseLedger({
  user,
  ledger,
  expenses,
  loadingExpenses,
  onRefresh,
}: {
  user: any
  ledger: any
  expenses: WarehouseExpense[]
  loadingExpenses: boolean
  onRefresh: () => Promise<void> | void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [receipt, setReceipt] = useState<File | null>(null)
  const [form, setForm] = useState({
    amount: "",
    category: "transport",
    orderReference: "",
    vendorName: "",
    expenseDate: new Date().toISOString().slice(0, 10),
    notes: "",
  })

  const totals = useMemo(() => {
    const sum = (wanted: string[]) => expenses
      .filter((item) => wanted.includes(item.status))
      .reduce((total, item) => total + Number(item.amount || 0), 0)
    const transactions = ledger?.transactions || []
    const advanceReceived = transactions
      .filter((item: any) => item.type === "debit" && !String(item.title || "").startsWith("[Expense]"))
      .reduce((total: number, item: any) => total + Number(item.amount || 0), 0)
    return {
      available: Math.max(0, Number(ledger?.creditLimit || 25000) - Number(ledger?.utilizedCredit || 0)),
      advanceReceived,
      approved: sum(["approved", "reimbursed"]),
      pending: sum(["pending"]),
    }
  }, [expenses, ledger])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return expenses.filter((item) => {
      const matchesStatus = status === "all" || item.status === status
      const haystack = `${item.category} ${item.vendor_name || ""} ${item.order_reference || ""} ${item.notes || ""}`.toLowerCase()
      return matchesStatus && (!query || haystack.includes(query))
    })
  }, [expenses, search, status])

  function resetForm() {
    setForm({
      amount: "",
      category: "transport",
      orderReference: "",
      vendorName: "",
      expenseDate: new Date().toISOString().slice(0, 10),
      notes: "",
    })
    setReceipt(null)
  }

  async function submitExpense(event: React.FormEvent) {
    event.preventDefault()
    const amount = Number(form.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid expense amount")
      return
    }
    if (!receipt) {
      toast.error("Please attach a receipt image or PDF")
      return
    }

    setSaving(true)
    try {
      const uploadBody = new FormData()
      uploadBody.append("file", receipt)
      uploadBody.append("folder", "documents")
      const uploadResponse = await fetch("/api/upload", { method: "POST", body: uploadBody })
      const uploadJson = await uploadResponse.json()
      if (!uploadResponse.ok || !uploadJson.success) throw new Error(uploadJson.error || "Receipt upload failed")

      const response = await fetch(`/api/staff-ledgers/${user.id}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount,
          receiptUrl: uploadJson.url,
          receiptName: receipt.name,
        }),
      })
      const json = await response.json()
      if (!response.ok || !json.success) throw new Error(json.error || "Expense submission failed")

      toast.success("Expense submitted for approval")
      setOpen(false)
      resetForm()
      await onRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit expense")
    } finally {
      setSaving(false)
    }
  }

  const summaryCards = [
    { label: "Available Balance", value: fmt(totals.available), note: `Limit ${fmt(ledger?.creditLimit || 25000)}`, icon: WalletCards, color: "#5B246B", bg: "#F3EAF6" },
    { label: "Advance Received", value: fmt(totals.advanceReceived), note: "Cash issued by admin", icon: HandCoins, color: "#2563EB", bg: "#EAF2FF" },
    { label: "Approved Expenses", value: fmt(totals.approved), note: "Posted to your ledger", icon: CheckCircle2, color: "#059669", bg: "#EAF8F1" },
    { label: "Pending Approval", value: fmt(totals.pending), note: `${expenses.filter((item) => item.status === "pending").length} request(s)`, icon: Clock3, color: "#D97706", bg: "#FFF5E7" },
  ]

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{card.label}</p>
                  <p className="mt-2 text-xl font-black text-slate-900">{card.value}</p>
                  <p className="mt-1 text-[10px] text-slate-500">{card.note}</p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ color: card.color, background: card.bg }}>
                  <Icon size={20} strokeWidth={2.2} />
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900">Expense Requests</h2>
            <p className="mt-0.5 text-[10px] text-slate-500">Submit warehouse expenses with proof and track approval.</p>
          </div>
          <button onClick={() => setOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5B246B] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#6B2C7D]">
            <Plus size={16} /> Add Expense
          </button>
        </div>

        <div className="grid gap-2 border-b border-slate-100 p-4 sm:grid-cols-[1fr_180px]">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <Search size={16} className="text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order, vendor or category..." className="w-full bg-transparent text-xs outline-none" />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none">
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {loadingExpenses ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading expenses...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3EAF6] text-[#5B246B]"><ReceiptText size={22} /></span>
            <p className="mt-3 text-sm font-bold text-slate-800">No expense requests found</p>
            <p className="mt-1 text-[10px] text-slate-500">Use Add Expense to submit your first receipt.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((item) => (
              <div key={item.id} className="p-4 transition hover:bg-slate-50/70">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F3EAF6] text-[#5B246B]"><ReceiptText size={17} /></span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-bold capitalize text-slate-800">{item.category.replace(/_/g, " ")}</p>
                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold capitalize ${statusClasses(item.status)}`}>{item.status}</span>
                      </div>
                      <p className="mt-1 truncate text-[10px] text-slate-500">
                        {item.vendor_name || "No vendor"}{item.order_reference ? ` · ${item.order_reference}` : ""} · {new Date(item.expense_date).toLocaleDateString("en-IN")}
                      </p>
                      {item.notes && <p className="mt-1 line-clamp-1 text-[10px] text-slate-500">{item.notes}</p>}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-black text-slate-900">{fmt(item.amount)}</p>
                    {item.receipt_url && (
                      <a href={item.receipt_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-[#5B246B] hover:underline">
                        Receipt <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <form onSubmit={submitExpense} className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-black text-slate-900">Add Warehouse Expense</h2>
                <p className="mt-1 text-[11px] text-slate-500">Attach the receipt. An administrator will review this request.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"><X size={17} /></button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-[10px] font-bold text-slate-600">Amount (₹) *
                <input type="number" min="1" step="0.01" required value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="Enter amount" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-xs font-medium outline-none focus:border-[#5B246B]" />
              </label>
              <label className="space-y-1.5 text-[10px] font-bold text-slate-600">Category *
                <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-xs font-medium outline-none focus:border-[#5B246B]">
                  {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="space-y-1.5 text-[10px] font-bold text-slate-600">Order / Work Order Reference
                <input value={form.orderReference} onChange={(event) => setForm({ ...form, orderReference: event.target.value })} placeholder="Example: WO-2026-0069" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-xs font-medium outline-none focus:border-[#5B246B]" />
              </label>
              <label className="space-y-1.5 text-[10px] font-bold text-slate-600">Vendor / Shop Name
                <input value={form.vendorName} onChange={(event) => setForm({ ...form, vendorName: event.target.value })} placeholder="Enter vendor name" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-xs font-medium outline-none focus:border-[#5B246B]" />
              </label>
              <label className="space-y-1.5 text-[10px] font-bold text-slate-600">Expense Date *
                <input type="date" required value={form.expenseDate} onChange={(event) => setForm({ ...form, expenseDate: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-xs font-medium outline-none focus:border-[#5B246B]" />
              </label>
              <label className="space-y-1.5 text-[10px] font-bold text-slate-600">Receipt (image or PDF) *
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(event) => setReceipt(event.target.files?.[0] || null)} />
                <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full items-center gap-2 rounded-xl border border-dashed border-[#C9AED1] bg-[#FBF8FC] px-3 py-3 text-left text-xs font-medium text-[#5B246B]">
                  {receipt ? <FileText size={16} /> : <Upload size={16} />}
                  <span className="truncate">{receipt?.name || "Choose receipt"}</span>
                </button>
              </label>
              <label className="space-y-1.5 text-[10px] font-bold text-slate-600 sm:col-span-2">Notes
                <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={3} placeholder="What was purchased and why?" className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-xs font-medium outline-none focus:border-[#5B246B]" />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setOpen(false)} disabled={saving} className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-xl bg-[#5B246B] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50">{saving ? "Submitting..." : "Submit for Approval"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export function ExpenseApprovalList({ expenses, onReview }: { expenses: WarehouseExpense[]; onReview: (id: string, status: "approved" | "rejected") => Promise<void> }) {
  const pending = expenses.filter((item) => item.status === "pending")
  if (!pending.length) return null
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending expense approvals</p>
      <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-100">
        {pending.map((item) => (
          <div key={item.id} className="border-b border-slate-100 bg-slate-50 p-3 last:border-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold capitalize text-slate-700">{item.category.replace(/_/g, " ")} · {fmt(item.amount)}</p>
                <p className="mt-1 text-[9px] text-slate-400">{item.vendor_name || "No vendor"}{item.order_reference ? ` · ${item.order_reference}` : ""}</p>
                {item.receipt_url && <a href={item.receipt_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-[#5B246B]">View receipt <ExternalLink size={9} /></a>}
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => onReview(item.id, "approved")} className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700" title="Approve"><CheckCircle2 size={16} /></button>
                <button onClick={() => onReview(item.id, "rejected")} className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700" title="Reject"><XCircle size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
