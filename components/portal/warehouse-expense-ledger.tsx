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
import { WarehouseLoanSystem, type WarehouseLoan } from "@/components/portal/warehouse-loan-system"

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
  loans = [],
  loadingLoans = false,
  isAdmin = false,
  onRefresh,
}: {
  user: any
  ledger: any
  expenses: WarehouseExpense[]
  loadingExpenses: boolean
  loans?: WarehouseLoan[]
  loadingLoans?: boolean
  isAdmin?: boolean
  onRefresh: () => Promise<void> | void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<"expenses" | "loans">("expenses")
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
  ]

  return (
    <div className="px-4 py-4 space-y-4">
      <WarehouseLoanSystem
        user={user}
        ledger={ledger}
        loans={loans}
        loadingLoans={loadingLoans}
        isAdmin={isAdmin}
        onRefresh={onRefresh}
      />
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
