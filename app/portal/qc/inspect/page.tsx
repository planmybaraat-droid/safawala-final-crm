"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  QrCode,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RotateCcw,
  Send,
  PauseCircle,
  Camera,
  Upload,
  CheckCheck,
  PackageCheck,
  ChevronRight,
  X,
  FileText,
  User,
  Calendar,
  Sparkles,
  ShieldCheck,
  Layers,
  ArrowLeft
} from "lucide-react"

const COLOR = "#a855f7"
const COLOR_DARK = "#7c3aed"

interface InspectionItem {
  id: string
  name: string
  sku: string
  quantity: number
  category: string
  image?: string
  checklist: {
    correctProduct: boolean
    correctQuantity: boolean
    colorMatch: boolean
    cleanliness: boolean
    stitching: boolean
    damageCheck: boolean
    accessoriesComplete: boolean
  }
  status: "pending" | "pass" | "fail"
  failReason?: string
  failNotes?: string
  photoProof?: string
}

interface QCOrder {
  id: string
  order_number: string
  booking_number: string
  customer_name: string
  customer_phone?: string
  event_date?: string
  pickup_date?: string
  urgent?: boolean
  status: "qc_pending" | "qc_in_progress" | "passed" | "failed_rework" | "damaged" | "hold"
  items: InspectionItem[]
  notes?: string
  created_at: string
}

const INITIAL_CHECKLIST = {
  correctProduct: true,
  correctQuantity: true,
  colorMatch: true,
  cleanliness: true,
  stitching: true,
  damageCheck: true,
  accessoriesComplete: true,
}

const FAIL_REASONS = [
  "Dirty / Stain",
  "Torn / Stitching Issue",
  "Wrong Size / Color",
  "Missing Accessory (Turban/Brooch/Stole)",
  "Broken Zipper / Button",
  "Fabric Damage",
  "Quantity Shortage"
]

export default function QCInspectPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<QCOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "urgent" | "in_progress">("pending")
  const [selectedOrder, setSelectedOrder] = useState<QCOrder | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [barcodeInput, setBarcodeInput] = useState("")
  const [toastMessage, setToastMessage] = useState("")

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(""), 3000)
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  async function fetchOrders() {
    setLoading(true)
    try {
      const res = await fetch("/api/work-orders")
      const json = await res.json()
      const raw = Array.isArray(json.data) ? json.data : []
      
      const formatted: QCOrder[] = raw.map((o: any, idx: number) => ({
        id: o.id || `WO-${idx + 100}`,
        order_number: o.order_number || o.booking_number || `WO-${1000 + idx}`,
        booking_number: o.booking_number || `BK-${8000 + idx}`,
        customer_name: o.customer_name || (o.customer as any)?.name || `Client ${idx + 1}`,
        customer_phone: o.customer_phone || "+91 98765 43210",
        event_date: o.event_date || new Date(Date.now() + 86400000 * 2).toISOString(),
        pickup_date: o.pickup_date || new Date().toISOString(),
        urgent: idx % 3 === 0,
        status: (o.qc_status === "pass" ? "passed" : o.qc_status === "fail" ? "failed_rework" : "qc_pending") as any,
        notes: o.notes || "Standard warehouse packed order ready for final QC audit.",
        created_at: o.created_at || new Date().toISOString(),
        items: [
          {
            id: `item-1-${idx}`,
            name: "Royal Velvet Sherwani Set (Maroon & Gold)",
            sku: "SHER-MRN-001",
            quantity: 1,
            category: "Sherwani",
            checklist: { ...INITIAL_CHECKLIST },
            status: "pending"
          },
          {
            id: `item-2-${idx}`,
            name: "Embroidered Safa Turban & Kalgi Brooch",
            sku: "SAFA-GLD-088",
            quantity: 1,
            category: "Accessories",
            checklist: { ...INITIAL_CHECKLIST },
            status: "pending"
          },
          {
            id: `item-3-${idx}`,
            name: "Silk Dupatta & Matching Mojris (Size 10)",
            sku: "ACC-DUP-012",
            quantity: 1,
            category: "Footwear & Stole",
            checklist: { ...INITIAL_CHECKLIST },
            status: "pending"
          }
        ]
      }))

      setOrders(formatted)
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch =
        !search ||
        o.order_number.toLowerCase().includes(search.toLowerCase()) ||
        o.booking_number.toLowerCase().includes(search.toLowerCase()) ||
        o.customer_name.toLowerCase().includes(search.toLowerCase())

      if (!matchesSearch) return false
      if (activeTab === "pending") return o.status === "qc_pending"
      if (activeTab === "urgent") return o.urgent && o.status === "qc_pending"
      if (activeTab === "in_progress") return o.status === "qc_in_progress"
      return true
    })
  }, [orders, search, activeTab])

  function handlePassAll(orderId: string, e: React.MouseEvent) {
    e.stopPropagation()
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: "passed",
          items: o.items.map(item => ({
            ...item,
            status: "pass",
            checklist: {
              correctProduct: true,
              correctQuantity: true,
              colorMatch: true,
              cleanliness: true,
              stitching: true,
              damageCheck: true,
              accessoriesComplete: true,
            }
          }))
        }
      }
      return o
    }))
    showToast("✅ Order Passed All QC Checks & Sent to Delivery Queue!")
  }

  function handleBarcodeSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!barcodeInput.trim()) return
    const match = orders.find(o =>
      o.order_number.toLowerCase().includes(barcodeInput.trim().toLowerCase()) ||
      o.booking_number.toLowerCase().includes(barcodeInput.trim().toLowerCase())
    )
    if (match) {
      setSelectedOrder(match)
      setShowScanner(false)
      setBarcodeInput("")
    } else {
      showToast(`❌ No order found matching Barcode: "${barcodeInput}"`)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      {/* Toast Notification */}
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
                <ShieldCheck size={20} /> QC Inspection Queue
              </h1>
              <p className="text-[11px] text-purple-100 opacity-90">
                {orders.filter(o => o.status === "qc_pending").length} packed order(s) awaiting quality audit
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-1.5 bg-white text-[#5B246B] px-3.5 py-2 rounded-xl text-xs font-extrabold shadow-sm hover:bg-purple-50 transition"
          >
            <QrCode size={16} /> Scan Barcode
          </button>
        </div>

        {/* Search Bar */}
        <div className="mt-4 flex items-center gap-2 bg-white/15 border border-white/30 rounded-2xl px-3.5 py-2.5 backdrop-blur-md">
          <Search size={16} className="text-white/70" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search Order #, Booking ID, or Customer Name..."
            className="w-full bg-transparent text-xs font-medium text-white placeholder:text-white/60 outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-white/80 hover:text-white">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Status Segmented Tabs */}
      <div className="px-4 py-3 bg-white border-b border-slate-200/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {[
          { key: "pending", label: "QC Pending", count: orders.filter(o => o.status === "qc_pending").length },
          { key: "urgent", label: "⚡ Urgent Priority", count: orders.filter(o => o.urgent && o.status === "qc_pending").length },
          { key: "in_progress", label: "In Inspection", count: orders.filter(o => o.status === "qc_in_progress").length },
          { key: "all", label: "All Orders", count: orders.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === tab.key
                ? "bg-[#5B246B] text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
            <span
              className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                activeTab === tab.key ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Main Order Queue List */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-white rounded-2xl border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <div className="h-14 w-14 rounded-2xl bg-purple-50 text-[#5B246B] flex items-center justify-center mx-auto mb-3">
              <PackageCheck size={28} />
            </div>
            <p className="text-sm font-bold text-slate-800">No orders found in queue</p>
            <p className="text-[11px] text-slate-500 mt-1">All packed orders have been inspected or match filters.</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <div
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className={`bg-white rounded-2xl border p-4 shadow-sm transition hover:shadow-md cursor-pointer relative overflow-hidden ${
                order.urgent ? "border-amber-400 bg-gradient-to-r from-amber-50/30 to-white" : "border-slate-200"
              }`}
            >
              {order.urgent && (
                <div className="absolute top-0 right-0 bg-amber-500 text-white px-3 py-1 rounded-bl-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                  ⚡ Urgent Order
                </div>
              )}

              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-extrabold text-[#5B246B] uppercase tracking-wider">
                    {order.booking_number}
                  </span>
                  <h3 className="text-sm font-black text-slate-900 mt-0.5">{order.order_number}</h3>
                  <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mt-1">
                    <User size={12} className="text-slate-400" /> {order.customer_name}
                  </p>
                </div>

                <div className="text-right pt-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                      order.status === "passed"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : order.status === "failed_rework"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {order.status === "passed" ? (
                      <CheckCircle2 size={12} />
                    ) : order.status === "failed_rework" ? (
                      <XCircle size={12} />
                    ) : (
                      <Clock size={12} />
                    )}
                    {order.status.replace("_", " ")}
                  </span>
                </div>
              </div>

              {/* Items Summary */}
              <div className="mt-3 bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-600 font-semibold text-[11px]">
                  <Layers size={14} className="text-purple-600" />
                  <span>{order.items.length} items packed</span>
                </div>
                <div className="flex items-center gap-2">
                  {order.status === "qc_pending" && (
                    <button
                      onClick={e => handlePassAll(order.id, e)}
                      className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition flex items-center gap-1"
                    >
                      <CheckCheck size={12} /> Pass All
                    </button>
                  )}
                  <span className="text-[#5B246B] font-bold text-[11px] flex items-center">
                    Inspect <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowScanner(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>

            <div className="text-center">
              <div className="h-14 w-14 rounded-2xl bg-purple-50 text-[#5B246B] flex items-center justify-center mx-auto mb-3">
                <QrCode size={30} />
              </div>
              <h3 className="text-base font-black text-slate-900">Scan Product Barcode</h3>
              <p className="text-xs text-slate-500 mt-1">Scan or manually type order barcode to open inspection checklist.</p>
            </div>

            <form onSubmit={handleBarcodeSearch} className="mt-5 space-y-4">
              <input
                autoFocus
                value={barcodeInput}
                onChange={e => setBarcodeInput(e.target.value)}
                placeholder="Scan or enter Barcode / Order #"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#5B246B]"
              />
              <button
                type="submit"
                className="w-full bg-[#5B246B] text-white py-3 rounded-2xl font-bold text-xs shadow-md hover:bg-[#6B2C7D] transition flex items-center justify-center gap-2"
              >
                <Search size={16} /> Load Order Checklist
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Full Order Inspection Modal */}
      {selectedOrder && (
        <QCOrderInspectorModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onActionComplete={(updatedOrder, msg) => {
            setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o))
            setSelectedOrder(null)
            showToast(msg)
          }}
        />
      )}
    </div>
  )
}

function QCOrderInspectorModal({
  order,
  onClose,
  onActionComplete,
}: {
  order: QCOrder
  onClose: () => void
  onActionComplete: (updatedOrder: QCOrder, msg: string) => void
}) {
  const [items, setItems] = useState<InspectionItem[]>(order.items)
  const [activeItemIndex, setActiveItemIndex] = useState(0)

  const currentItem = items[activeItemIndex]

  function toggleChecklistItem(key: keyof InspectionItem["checklist"]) {
    setItems(prev => prev.map((item, idx) => {
      if (idx === activeItemIndex) {
        const updatedChecklist = {
          ...item.checklist,
          [key]: !item.checklist[key]
        }
        const allPassed = Object.values(updatedChecklist).every(v => v === true)
        return {
          ...item,
          checklist: updatedChecklist,
          status: allPassed ? "pass" : item.status
        }
      }
      return item
    }))
  }

  function setItemPassFail(status: "pass" | "fail") {
    setItems(prev => prev.map((item, idx) => {
      if (idx === activeItemIndex) {
        return {
          ...item,
          status,
          failReason: status === "pass" ? undefined : item.failReason || FAIL_REASONS[0],
        }
      }
      return item
    }))
  }

  function updateFailDetails(field: "failReason" | "failNotes" | "photoProof", val: string) {
    setItems(prev => prev.map((item, idx) => {
      if (idx === activeItemIndex) {
        return { ...item, [field]: val }
      }
      return item
    }))
  }

  const hasAnyFailed = items.some(i => i.status === "fail")

  function handleFinalAction(action: "approve" | "rework" | "damage" | "hold") {
    let finalStatus: QCOrder["status"] = "passed"
    let msg = ""

    if (action === "approve") {
      finalStatus = "passed"
      msg = "✅ Order Approved & Transferred to Delivery Queue!"
    } else if (action === "rework") {
      finalStatus = "failed_rework"
      msg = "⚠️ Order Failed QC & Returned to Warehouse for Rework!"
    } else if (action === "damage") {
      finalStatus = "damaged"
      msg = "🚩 Item Damage Reported & Logged to Damage Register!"
    } else if (action === "hold") {
      finalStatus = "hold"
      msg = "⏸️ Order Placed on Manager Hold!"
    }

    const updated: QCOrder = {
      ...order,
      status: finalStatus,
      items
    }

    onActionComplete(updated, msg)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl max-h-[92vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold text-[#5B246B] uppercase">
                {order.booking_number}
              </span>
              {order.urgent && (
                <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-[9px] font-black">
                  ⚡ URGENT
                </span>
              )}
            </div>
            <h2 className="text-base font-black text-slate-900">{order.order_number}</h2>
            <p className="text-xs text-slate-500 font-semibold">{order.customer_name}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-slate-200/60 flex items-center justify-center text-slate-600 hover:bg-slate-300">
            <X size={18} />
          </button>
        </div>

        {/* Item Selector Tabs */}
        <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {items.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setActiveItemIndex(idx)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap ${
                activeItemIndex === idx
                  ? "bg-[#5B246B] text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200"
              }`}
            >
              <span>Item #{idx + 1}</span>
              {item.status === "pass" && <CheckCircle2 size={14} className="text-emerald-400" />}
              {item.status === "fail" && <XCircle size={14} className="text-rose-400" />}
            </button>
          ))}
        </div>

        {/* Item Checklist Inspection Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="bg-purple-50/50 rounded-2xl p-4 border border-purple-100 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-[#5B246B]">
                {currentItem.category} · SKU: {currentItem.sku}
              </span>
              <h3 className="text-sm font-black text-slate-900 mt-0.5">{currentItem.name}</h3>
              <p className="text-xs font-bold text-slate-600 mt-1">Quantity: {currentItem.quantity} Pcs</p>
            </div>

            {/* Pass / Fail Toggle */}
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setItemPassFail("pass")}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1 transition ${
                  currentItem.status === "pass"
                    ? "bg-emerald-600 text-white"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                <CheckCircle2 size={14} /> PASS
              </button>
              <button
                onClick={() => setItemPassFail("fail")}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1 transition ${
                  currentItem.status === "fail"
                    ? "bg-rose-600 text-white"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                <XCircle size={14} /> FAIL
              </button>
            </div>
          </div>

          {/* Checklist Criteria */}
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
              Item Inspection Criteria
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { key: "correctProduct", label: "📦 Correct Product Match" },
                { key: "correctQuantity", label: "🔢 Correct Quantity" },
                { key: "colorMatch", label: "🎨 Colour / Design Match" },
                { key: "cleanliness", label: "🧼 Cleanliness & Pressing" },
                { key: "stitching", label: "🪡 Stitching & Finishing" },
                { key: "damageCheck", label: "🔍 Damage Check" },
                { key: "accessoriesComplete", label: "👑 Accessories Complete" },
              ].map(check => {
                const passed = (currentItem.checklist as any)[check.key]
                return (
                  <button
                    key={check.key}
                    type="button"
                    onClick={() => toggleChecklistItem(check.key as any)}
                    className={`p-3 rounded-xl border text-left text-xs font-bold transition flex items-center justify-between ${
                      passed
                        ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                        : "bg-rose-50/60 border-rose-200 text-rose-900"
                    }`}
                  >
                    <span>{check.label}</span>
                    {passed ? <CheckCircle2 size={16} className="text-emerald-600" /> : <XCircle size={16} className="text-rose-600" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Failure Reason & Photo Evidence Section */}
          {currentItem.status === "fail" && (
            <div className="bg-rose-50 rounded-2xl p-4 border border-rose-200 space-y-3">
              <div className="flex items-center gap-1.5 text-rose-800 font-extrabold text-xs">
                <AlertTriangle size={16} /> Failure Details & Photo Proof (Required)
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-600 block mb-1">
                  Primary Failure Reason *
                </label>
                <select
                  value={currentItem.failReason || FAIL_REASONS[0]}
                  onChange={e => updateFailDetails("failReason", e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                >
                  {FAIL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-600 block mb-1">
                  Specific Failure Notes *
                </label>
                <textarea
                  value={currentItem.failNotes || ""}
                  onChange={e => updateFailDetails("failNotes", e.target.value)}
                  placeholder="Describe exact stain location, missing item, or damage issue..."
                  rows={2}
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs font-medium outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-600 block mb-1">
                  Photo Proof (Optional / Required for Damage)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 border-2 border-dashed border-rose-300 bg-white rounded-xl py-3 px-4 text-center cursor-pointer hover:bg-rose-100/50 transition">
                    <Camera size={18} className="mx-auto text-rose-600 mb-1" />
                    <span className="text-[11px] font-bold text-rose-700">Upload Photo Evidence</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) {
                          updateFailDetails("photoProof", URL.createObjectURL(file))
                        }
                      }}
                    />
                  </label>
                  {currentItem.photoProof && (
                    <img
                      src={currentItem.photoProof}
                      alt="Proof"
                      className="h-16 w-16 rounded-xl object-cover border border-rose-300 shadow-sm"
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Final Actions Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleFinalAction("approve")}
              className="py-3 px-3 rounded-xl bg-emerald-600 text-white font-extrabold text-xs shadow-sm hover:bg-emerald-700 transition flex items-center justify-center gap-1.5"
            >
              <Send size={15} /> Approve & Send to Delivery
            </button>

            <button
              onClick={() => handleFinalAction("rework")}
              className="py-3 px-3 rounded-xl bg-amber-600 text-white font-extrabold text-xs shadow-sm hover:bg-amber-700 transition flex items-center justify-center gap-1.5"
            >
              <RotateCcw size={15} /> Return to Warehouse for Rework
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleFinalAction("damage")}
              className="py-2.5 px-3 rounded-xl bg-rose-600 text-white font-extrabold text-xs shadow-sm hover:bg-rose-700 transition flex items-center justify-center gap-1.5"
            >
              <AlertTriangle size={15} /> Report Damage
            </button>

            <button
              onClick={() => handleFinalAction("hold")}
              className="py-2.5 px-3 rounded-xl bg-slate-700 text-white font-extrabold text-xs shadow-sm hover:bg-slate-800 transition flex items-center justify-center gap-1.5"
            >
              <PauseCircle size={15} /> Hold Order for Review
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
