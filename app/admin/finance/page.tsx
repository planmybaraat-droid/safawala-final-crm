"use client"

import { useEffect, useState, useMemo } from "react"
import { toast } from "sonner"

const GOLD = "#c9a84c"
const BROWN = "#3d1c02"
const CREAM = "#fdf6ed"
const WARM = "#f5ebe0"
const BORDER = "rgba(201,168,76,0.2)"

interface Transaction {
  id: string
  transaction_date: string
  amount: number
  type: string
  description: string
  reference_number: string
  franchise_id: string
  category: { id: string; name: string; type: string } | null
  franchise: { id: string; name: string; code: string } | null
}

interface Category {
  id: string
  name: string
  type: string
}

export default function FranchisePaymentsPage() {
  const [franchises, setFranchises] = useState<any[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    franchiseId: "",
    categoryId: "",
    type: "income",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    notes: ""
  })

  useEffect(() => {
    load()
    fetch("/api/franchises")
      .then(r => r.json())
      .then(d => setFranchises(d.data ?? d ?? []))
      .catch(() => {})

    fetch("/api/financial-categories", { cache: "no-store" })
      .then(r => r.json())
      .then(d => setCategories(d.data ?? []))
      .catch(() => {})
  }, [])

  function load() {
    setLoading(true)
    fetch("/api/financial-transactions?limit=300")
      .then(r => r.json())
      .then(d => setTransactions(d.data ?? []))
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false))
  }

  const metrics = useMemo(() => {
    let income = 0, expense = 0
    transactions.forEach(t => {
      if (t.type === "income") income += Number(t.amount)
      else expense += Number(t.amount)
    })
    return { income, expense, profit: income - expense }
  }, [transactions])

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const q = search.toLowerCase()
      const matchSearch = !q ||
        t.franchise?.name?.toLowerCase().includes(q) ||
        t.category?.name?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.reference_number?.toLowerCase().includes(q)
      const matchType = !filterType || t.type === filterType
      return matchSearch && matchType
    })
  }, [transactions, search, filterType])

  const filteredCategories = categories.filter(c => c.type === form.type)

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.amount || !form.franchiseId || !form.categoryId) {
      toast.error("Please fill in amount, franchise, and category")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/financial-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          franchise_id: form.franchiseId,
          category_id: form.categoryId,
          type: form.type,
          amount: parseFloat(form.amount),
          description: form.notes,
          transaction_date: form.date,
        })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Transaction recorded successfully")
        setShowAdd(false)
        setForm({ franchiseId: "", categoryId: "", type: "income", amount: "", date: new Date().toISOString().split("T")[0], notes: "" })
        load()
      } else {
        toast.error(data.error || "Failed to record transaction")
      }
    } catch {
      toast.error("Error saving transaction")
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", height: 38, borderRadius: 8, border: "1.5px solid rgba(201,168,76,0.2)",
    padding: "0 12px", fontSize: 13, outline: "none", background: "#fff",
    color: BROWN, boxSizing: "border-box"
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#a07040", marginBottom: 4
  }

  return (
    <div style={{ background: WARM, minHeight: "100vh", fontFamily: "system-ui,-apple-system,sans-serif", paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ background: CREAM, borderBottom: `1px solid ${BORDER}`, padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: BROWN }}>Franchise Payments Ledger</h1>
          <p style={{ margin: 0, fontSize: 12, color: "#a07040", marginTop: 4 }}>
            All franchise income and expense transactions — real data from Supabase.
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{
          background: BROWN, color: GOLD, border: "none", borderRadius: 10,
          padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer"
        }}>
          + Record Transaction
        </button>
      </div>

      <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {[
            { label: "Total Income", value: `₹${metrics.income.toLocaleString("en-IN")}`, color: "#16a34a", desc: "All income transactions" },
            { label: "Total Expenses", value: `₹${metrics.expense.toLocaleString("en-IN")}`, color: "#dc2626", desc: "All expense transactions" },
            { label: "Net Balance", value: `₹${metrics.profit.toLocaleString("en-IN")}`, color: metrics.profit >= 0 ? GOLD : "#dc2626", desc: "Income minus expenses" },
          ].map((m, i) => (
            <div key={i} style={{ background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "18px 20px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#a07040", textTransform: "uppercase" }}>{m.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: m.color, margin: "6px 0 2px" }}>{m.value}</div>
              <div style={{ fontSize: 11, color: "#805020" }}>{m.desc}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            placeholder="Search by branch, category, or notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", maxWidth: 300, height: 38, borderRadius: 10, border: `1.5px solid ${BORDER}`,
              padding: "0 14px", fontSize: 13, background: CREAM, color: BROWN, outline: "none"
            }}
          />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{
              height: 38, borderRadius: 10, border: `1.5px solid ${BORDER}`,
              padding: "0 14px", fontSize: 13, background: CREAM, color: BROWN, outline: "none", cursor: "pointer"
            }}
          >
            <option value="">All Transactions</option>
            <option value="income">Income only (+)</option>
            <option value="expense">Expense only (-)</option>
          </select>
          <span style={{ fontSize: 12, color: "#a07040", marginLeft: 4 }}>
            {loading ? "Loading..." : `${filtered.length} of ${transactions.length} records`}
          </span>
        </div>

        {/* Table */}
        <div style={{ background: CREAM, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#a07040" }}>Loading transactions...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#a07040" }}>No transactions found.</div>
          ) : (
            <>
              {/* Desktop */}
              <div style={{ display: "none" }} className="finance-desktop">
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "rgba(201,168,76,0.08)", borderBottom: `1px solid ${BORDER}` }}>
                      {["Ref #", "Franchise", "Date", "Category", "Amount", "Type", "Notes"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", fontSize: 10, fontWeight: 700, color: "#a07040", textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((t, idx) => (
                      <tr key={t.id} style={{ borderBottom: idx < filtered.length - 1 ? "1px solid rgba(201,168,76,0.1)" : "none" }}>
                        <td style={{ padding: "14px 16px", fontSize: 12, fontWeight: 700, color: BROWN }}>{t.reference_number}</td>
                        <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 600, color: BROWN }}>{t.franchise?.name || "—"}</td>
                        <td style={{ padding: "14px 16px", fontSize: 12, color: "#a07040" }}>{t.transaction_date}</td>
                        <td style={{ padding: "14px 16px", fontSize: 12, color: BROWN }}>{t.category?.name || "—"}</td>
                        <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 700, color: t.type === "income" ? "#16a34a" : "#dc2626" }}>
                          {t.type === "income" ? "+" : "-"} ₹{Number(t.amount).toLocaleString("en-IN")}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 10,
                            background: t.type === "income" ? "#f0fdf4" : "#fef2f2",
                            color: t.type === "income" ? "#16a34a" : "#dc2626"
                          }}>{t.type.toUpperCase()}</span>
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: 12, color: "#805020", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.description || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="finance-mobile" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14 }}>
                {filtered.map(t => (
                  <div key={t.id} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: 13, color: BROWN }}>{t.franchise?.name || "—"}</strong>
                      <span style={{
                        fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 10,
                        background: t.type === "income" ? "#f0fdf4" : "#fef2f2",
                        color: t.type === "income" ? "#16a34a" : "#dc2626"
                      }}>{t.type.toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize: 12, color: BROWN }}><strong>Category:</strong> {t.category?.name || "—"}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.type === "income" ? "#16a34a" : "#dc2626" }}>
                      {t.type === "income" ? "+" : "-"} ₹{Number(t.amount).toLocaleString("en-IN")}
                    </div>
                    <div style={{ fontSize: 11, color: "#a07040" }}>{t.transaction_date}</div>
                    {t.description && <div style={{ fontSize: 11, color: "#805020" }}>{t.description}</div>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setShowAdd(false)}>
          <form onSubmit={handleAddSubmit} style={{ background: CREAM, borderRadius: 20, padding: 24, width: "100%", maxWidth: 500, border: `1px solid ${BORDER}`, boxShadow: "0 20px 50px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: BROWN }}>Record Transaction</h3>
              <button type="button" onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", cursor: "pointer", color: BROWN, display: "flex", alignItems: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label style={labelStyle}>Transaction Type *</label>
                  <select style={inputStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value, categoryId: "" })}>
                    <option value="income">Income (+)</option>
                    <option value="expense">Expense (-)</option>
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label style={labelStyle}>Franchise Branch *</label>
                  <select required style={inputStyle} value={form.franchiseId} onChange={e => setForm({ ...form, franchiseId: e.target.value })}>
                    <option value="">-- Select Franchise --</option>
                    {franchises.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label style={labelStyle}>Category *</label>
                  <select required style={inputStyle} value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                    <option value="">-- Select Category --</option>
                    {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label style={labelStyle}>Amount (₹) *</label>
                  <input required type="number" min="1" placeholder="e.g. 50000" style={inputStyle} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Transaction Date</label>
                <input type="date" style={inputStyle} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Notes / Description</label>
                <textarea rows={2} placeholder="Explain transaction details..." style={{ ...inputStyle, height: 50, padding: 8, resize: "vertical" }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>

            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button type="button" onClick={() => setShowAdd(false)} style={{ flex: 1, height: 38, borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: BROWN, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ flex: 1, height: 38, borderRadius: 8, border: "none", background: BROWN, color: GOLD, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                {saving ? "Saving..." : "Record Transaction"}
              </button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        @media (min-width: 768px) {
          .finance-desktop { display: block !important; }
          .finance-mobile { display: none !important; }
        }
      `}</style>

    </div>
  )
}
