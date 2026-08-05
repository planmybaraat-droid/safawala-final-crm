"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  AlertTriangle,
  PauseCircle,
  ArrowLeft,
  RefreshCw,
  User,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
  X,
  Send
} from "lucide-react"

const COLOR = "#a855f7"
const COLOR_DARK = "#7c3aed"

function fmtDate(d: string) {
  return d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"
}

const QC_STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  passed: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Ready for Delivery" },
  pass: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Ready for Delivery" },
  failed_rework: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Warehouse Rework" },
  fail: { bg: "bg-rose-50 text-rose-700 border-rose-200", label: "Failed Inspection" },
  qc_pending: { bg: "bg-purple-50 text-purple-700 border-purple-200", label: "QC Pending" },
  pending: { bg: "bg-purple-50 text-purple-700 border-purple-200", label: "QC Pending" },
  qc_in_progress: { bg: "bg-blue-50 text-blue-700 border-blue-200", label: "In Inspection" },
  damaged: { bg: "bg-rose-50 text-rose-700 border-rose-200", label: "Damaged Report" },
  hold: { bg: "bg-slate-100 text-slate-700 border-slate-300", label: "Manager Hold" },
}

function StatusBadge({ status }: { status: string }) {
  const conf = QC_STATUS_CONFIG[status] || { bg: "bg-slate-100 text-slate-600 border-slate-200", label: status }
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${conf.bg}`}>
      {conf.label}
    </span>
  )
}

export default function QCWorkOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const [toastMessage, setToastMessage] = useState("")

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(""), 3000)
  }

  async function fetchOrders() {
    setLoading(true)
    try {
      const res = await fetch("/api/work-orders")
      const data = await res.json()
      const raw = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : [])
      setOrders(raw)
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const statusKey = o.qc_status || o.status || "qc_pending"
      const matchesFilter = filter === "all" || statusKey === filter
      const matchesSearch =
        !search ||
        (o.order_number || o.id || "").toLowerCase().includes(search.toLowerCase()) ||
        (o.customer_name || (o.customer as any)?.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (o.booking_number || "").toLowerCase().includes(search.toLowerCase())

      return matchesFilter && matchesSearch
    })
  }, [orders, search, filter])

  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => !o.qc_status || o.qc_status === "pending" || o.qc_status === "qc_pending").length,
    passed: orders.filter(o => o.qc_status === "pass" || o.qc_status === "passed").length,
    failed: orders.filter(o => o.qc_status === "fail" || o.qc_status === "failed_rework").length,
    hold: orders.filter(o => o.qc_status === "hold").length,
  }), [orders])

  async function updateOrderStatus(id: string, newStatus: string, notes?: string) {
    try {
      const res = await fetch(`/api/work-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qc_status: newStatus, qc_notes: notes }),
      })
      if (res.ok) {
        showToast(`✅ Order status updated to: ${newStatus.toUpperCase()}`)
        setSelectedOrder(null)
        fetchOrders()
      } else {
        showToast("❌ Failed to update order status")
      }
    } catch {
      showToast("❌ Error updating status")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 border border-slate-700 animate-bounce">
          <Sparkles size={16} className="text-amber-400" /> {toastMessage}
        </div>
      )}

      {/* Header */}
      <div
        className="px-4 pt-5 pb-6 text-white relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${COLOR_DARK}, ${COLOR})` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/portal/qc")}
              className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-lg font-black leading-tight flex items-center gap-2">
                🔍 QC Order Inspection Register
              </h1>
              <p className="text-[11px] text-purple-100 opacity-90">
                Complete audit history of passed, failed & pending QC orders
              </p>
            </div>
          </div>
          <button
            onClick={fetchOrders}
            className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Stats Summary Grid */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          <div className="bg-white/15 backdrop-blur-md p-2.5 rounded-xl border border-white/20 text-center">
            <p className="text-[9px] uppercase font-bold text-white/70">Total</p>
            <p className="text-base font-black text-white">{stats.total}</p>
          </div>
          <div className="bg-white/15 backdrop-blur-md p-2.5 rounded-xl border border-white/20 text-center">
            <p className="text-[9px] uppercase font-bold text-amber-200">Pending</p>
            <p className="text-base font-black text-amber-300">{stats.pending}</p>
          </div>
          <div className="bg-white/15 backdrop-blur-md p-2.5 rounded-xl border border-white/20 text-center">
            <p className="text-[9px] uppercase font-bold text-emerald-200">Passed</p>
            <p className="text-base font-black text-emerald-300">{stats.passed}</p>
          </div>
          <div className="bg-white/15 backdrop-blur-md p-2.5 rounded-xl border border-white/20 text-center">
            <p className="text-[9px] uppercase font-bold text-rose-200">Failed</p>
            <p className="text-base font-black text-rose-300">{stats.failed}</p>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 flex items-center gap-2 bg-white/15 border border-white/30 rounded-2xl px-3.5 py-2.5 backdrop-blur-md">
          <Search size={16} className="text-white/70" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search Order #, Booking ID, or Customer..."
            className="w-full bg-transparent text-xs font-medium text-white placeholder:text-white/60 outline-none"
          />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {[
          { key: "all", label: "All Orders" },
          { key: "qc_pending", label: "QC Pending" },
          { key: "pass", label: "Passed (Ready for Delivery)" },
          { key: "fail", label: "Failed (Warehouse Rework)" },
          { key: "hold", label: "Manager Hold" },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              filter === f.key
                ? "bg-[#5B246B] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Order List */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-2xl border border-slate-200 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <Search size={32} className="text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">No orders match filter</p>
            <p className="text-xs text-slate-500 mt-1">Try selecting another filter or searching.</p>
          </div>
        ) : (
          filtered.map(order => (
            <div
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-sm cursor-pointer transition space-y-2.5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-extrabold text-[#5B246B] uppercase">
                    {order.booking_number || "BOOKING"}
                  </span>
                  <h3 className="text-sm font-black text-slate-900 mt-0.5">
                    {order.order_number || order.id?.slice(0, 8)}
                  </h3>
                  <p className="text-xs font-bold text-slate-700 flex items-center gap-1 mt-0.5">
                    <User size={12} className="text-slate-400" />
                    {order.customer_name || (order.customer as any)?.name || "Customer"}
                  </p>
                </div>
                <StatusBadge status={order.qc_status || "qc_pending"} />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1">
                  <Calendar size={12} /> {fmtDate(order.created_at)}
                </span>
                <span className="text-[#5B246B] font-bold flex items-center gap-0.5">
                  View Audit Details <ChevronRight size={14} />
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Inspection Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>

            <div>
              <span className="text-[10px] font-extrabold text-[#5B246B] uppercase">
                QC Audit Sheet
              </span>
              <h3 className="text-base font-black text-slate-900">
                {selectedOrder.order_number || selectedOrder.id}
              </h3>
              <p className="text-xs text-slate-500 font-bold mt-0.5">
                Customer: {selectedOrder.customer_name || "Client"}
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl space-y-2 text-xs border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Current QC Status:</span>
                <StatusBadge status={selectedOrder.qc_status || "qc_pending"} />
              </div>
              {selectedOrder.qc_notes && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-500 font-semibold block mb-1">QC Inspector Notes:</span>
                  <p className="font-bold text-slate-800 bg-white p-2 rounded-xl border border-slate-200">
                    {selectedOrder.qc_notes}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                Change QC Audit Decision:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateOrderStatus(selectedOrder.id, "pass", "Approved via QC Register")}
                  className="py-2.5 bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-xs hover:bg-emerald-700 flex items-center justify-center gap-1.5"
                >
                  <Send size={14} /> Pass & Delivery
                </button>
                <button
                  onClick={() => updateOrderStatus(selectedOrder.id, "fail", "Returned for Warehouse Rework")}
                  className="py-2.5 bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-xs hover:bg-amber-700 flex items-center justify-center gap-1.5"
                >
                  <RotateCcw size={14} /> Warehouse Rework
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
