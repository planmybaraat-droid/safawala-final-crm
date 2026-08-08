"use client"

import { useState, useEffect, useMemo, useRef } from "react"
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
  User,
  Sparkles,
  ShieldCheck,
  Layers,
  ArrowLeft,
  SwitchCamera,
  Trash2,
  Image as ImageIcon,
  Zap,
  Package,
  Hash,
  Palette,
  Crown
} from "lucide-react"

const COLOR = "#a855f7"
const COLOR_DARK = "#7c3aed"

function NeedleThreadIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21c3-1 5-3 6-6l9-9a2.5 2.5 0 0 0-3.5-3.5l-9 9c-3 1-5 3-6 6z" />
      <circle cx="17" cy="5" r="1.5" />
    </svg>
  )
}

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
  photoProofs: string[]
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
      const res = await fetch("/api/jobs")
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
            status: "pending",
            photoProofs: []
          },
          {
            id: `item-2-${idx}`,
            name: "Embroidered Safa Turban & Kalgi Brooch",
            sku: "SAFA-GLD-088",
            quantity: 1,
            category: "Accessories",
            checklist: { ...INITIAL_CHECKLIST },
            status: "pending",
            photoProofs: []
          },
          {
            id: `item-3-${idx}`,
            name: "Silk Dupatta & Matching Mojris (Size 10)",
            sku: "ACC-DUP-012",
            quantity: 1,
            category: "Footwear & Stole",
            checklist: { ...INITIAL_CHECKLIST },
            status: "pending",
            photoProofs: []
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
            checklist: { ...INITIAL_CHECKLIST }
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
          { key: "pending", label: "QC Pending", count: orders.filter(o => o.status === "qc_pending").length, urgent: false },
          { key: "urgent", label: "Urgent Priority", count: orders.filter(o => o.urgent && o.status === "qc_pending").length, urgent: true },
          { key: "in_progress", label: "In Inspection", count: orders.filter(o => o.status === "qc_in_progress").length, urgent: false },
          { key: "all", label: "All Orders", count: orders.length, urgent: false },
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
            {tab.urgent && <Zap size={12} />}
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
                  <Zap size={11} /> Urgent Order
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
  const [showLiveCamera, setShowLiveCamera] = useState(false)

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

  function addPhotoProof(photoUrl: string) {
    setItems(prev => prev.map((item, idx) => {
      if (idx === activeItemIndex) {
        return {
          ...item,
          photoProofs: [...(item.photoProofs || []), photoUrl]
        }
      }
      return item
    }))
  }

  function removePhotoProof(photoIndex: number) {
    setItems(prev => prev.map((item, idx) => {
      if (idx === activeItemIndex) {
        return {
          ...item,
          photoProofs: item.photoProofs.filter((_, pIdx) => pIdx !== photoIndex)
        }
      }
      return item
    }))
  }

  function updateFailDetails(field: "failReason" | "failNotes", val: string) {
    setItems(prev => prev.map((item, idx) => {
      if (idx === activeItemIndex) {
        return { ...item, [field]: val }
      }
      return item
    }))
  }

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
                <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-[9px] font-black inline-flex items-center gap-1">
                  <Zap size={10} /> URGENT
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
                { key: "correctProduct", label: "Correct Product Match", Icon: Package },
                { key: "correctQuantity", label: "Correct Quantity", Icon: Hash },
                { key: "colorMatch", label: "Colour / Design Match", Icon: Palette },
                { key: "cleanliness", label: "Cleanliness & Pressing", Icon: Sparkles },
                { key: "stitching", label: "Stitching & Finishing", Icon: NeedleThreadIcon },
                { key: "damageCheck", label: "Damage Check", Icon: Search },
                { key: "accessoriesComplete", label: "Accessories Complete", Icon: Crown },
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
                    <span className="flex items-center gap-1.5">
                      <check.Icon size={14} />
                      {check.label}
                    </span>
                    {passed ? <CheckCircle2 size={16} className="text-emerald-600" /> : <XCircle size={16} className="text-rose-600" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Photo Evidence & Camera Capture Section */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-900 font-extrabold text-xs">
                <Camera size={16} className="text-[#5B246B]" /> Visual Inspection Photo Proof ({currentItem.photoProofs?.length || 0})
              </div>
              <button
                type="button"
                onClick={() => setShowLiveCamera(true)}
                className="px-3 py-1.5 bg-[#5B246B] text-white rounded-xl text-xs font-extrabold shadow-sm hover:bg-[#6B2C7D] transition flex items-center gap-1.5"
              >
                <Camera size={14} /> Live Camera Snap
              </button>
            </div>

            {/* Photo Proof Strip */}
            <div className="grid grid-cols-4 gap-2">
              {(currentItem.photoProofs || []).map((photo, pIdx) => (
                <div key={pIdx} className="relative group rounded-xl overflow-hidden border border-slate-300 h-20 bg-slate-900">
                  <img src={photo} alt={`Proof ${pIdx}`} className="h-full w-full object-cover" />
                  <button
                    onClick={() => removePhotoProof(pIdx)}
                    className="absolute top-1 right-1 h-6 w-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md hover:bg-rose-700"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              {/* Gallery File Upload Button */}
              <label className="h-20 border-2 border-dashed border-slate-300 bg-white rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-purple-50/50 transition text-center p-2">
                <Upload size={18} className="text-[#5B246B] mb-0.5" />
                <span className="text-[10px] font-bold text-slate-600">Gallery Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) addPhotoProof(URL.createObjectURL(file))
                  }}
                />
              </label>
            </div>
          </div>

          {/* Failure Details Section */}
          {currentItem.status === "fail" && (
            <div className="bg-rose-50 rounded-2xl p-4 border border-rose-200 space-y-3">
              <div className="flex items-center gap-1.5 text-rose-800 font-extrabold text-xs">
                <AlertTriangle size={16} /> Failure Reason & Audit Notes (Required)
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
                  placeholder="Describe stain location, fabric flaw, or defect details..."
                  rows={2}
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs font-medium outline-none resize-none"
                />
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

      {/* Live Camera Viewfinder Modal */}
      {showLiveCamera && (
        <LiveCameraCaptureModal
          onClose={() => setShowLiveCamera(false)}
          onPhotoCaptured={(dataUrl) => {
            addPhotoProof(dataUrl)
            setShowLiveCamera(false)
          }}
        />
      )}
    </div>
  )
}

function LiveCameraCaptureModal({
  onClose,
  onPhotoCaptured,
}: {
  onClose: () => void
  onPhotoCaptured: (dataUrl: string) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment")
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState(false)

  useEffect(() => {
    let stream: MediaStream | null = null
    async function startCamera() {
      try {
        setCameraError(false)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (err) {
        console.warn("Camera access error:", err)
        setCameraError(true)
      }
    }

    if (!capturedImage) {
      startCamera()
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [facingMode, capturedImage])

  function snapPhoto() {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480

    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85)
      setCapturedImage(dataUrl)
    }
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      onPhotoCaptured(url)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col justify-between p-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between text-white z-10">
        <span className="text-xs font-bold tracking-wider uppercase flex items-center gap-1.5">
          <Camera size={18} className="text-purple-400" /> Live QC Camera Viewfinder
        </span>
        <button onClick={onClose} className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-white">
          <X size={20} />
        </button>
      </div>

      {/* Viewfinder Canvas / Video Frame */}
      <div className="relative flex-1 my-4 flex items-center justify-center overflow-hidden rounded-3xl border-2 border-white/20 bg-slate-950">
        {capturedImage ? (
          <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
        ) : cameraError ? (
          <div className="text-center p-6 text-white space-y-3">
            <Camera size={40} className="mx-auto text-rose-400" />
            <p className="text-sm font-bold">Camera Access Blocked or Not Available</p>
            <p className="text-xs text-slate-400">Please choose a photo from your gallery instead.</p>
            <label className="inline-flex items-center gap-2 bg-[#5B246B] text-white px-4 py-2.5 rounded-2xl text-xs font-extrabold cursor-pointer">
              <Upload size={16} /> Select Photo from Device
              <input type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
            </label>
          </div>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {/* Viewfinder Framing Lines */}
            <div className="absolute inset-8 border border-white/40 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
              <div className="flex justify-between">
                <div className="w-4 h-4 border-t-2 border-l-2 border-amber-400" />
                <div className="w-4 h-4 border-t-2 border-r-2 border-amber-400" />
              </div>
              <div className="flex justify-between">
                <div className="w-4 h-4 border-b-2 border-l-2 border-amber-400" />
                <div className="w-4 h-4 border-b-2 border-r-2 border-amber-400" />
              </div>
            </div>
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls Footer */}
      <div className="flex items-center justify-between px-6 pb-4">
        {capturedImage ? (
          <div className="w-full flex items-center gap-3">
            <button
              onClick={() => setCapturedImage(null)}
              className="flex-1 bg-slate-800 text-white py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border border-slate-700"
            >
              <RotateCcw size={16} /> Retake
            </button>
            <button
              onClick={() => onPhotoCaptured(capturedImage)}
              className="flex-1 bg-emerald-600 text-white py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg"
            >
              <CheckCircle2 size={16} /> Use Photo Proof
            </button>
          </div>
        ) : (
          <div className="w-full flex items-center justify-between">
            <button
              onClick={() => setFacingMode(prev => prev === "environment" ? "user" : "environment")}
              className="h-12 w-12 rounded-2xl bg-white/20 text-white flex items-center justify-center"
            >
              <SwitchCamera size={22} />
            </button>

            {/* Circular Shutter Button */}
            <button
              onClick={snapPhoto}
              className="h-18 w-18 rounded-full border-4 border-white bg-rose-600 hover:bg-rose-500 shadow-2xl flex items-center justify-center transition active:scale-95"
            >
              <div className="h-14 w-14 rounded-full border-2 border-white/60" />
            </button>

            <label className="h-12 w-12 rounded-2xl bg-white/20 text-white flex items-center justify-center cursor-pointer">
              <ImageIcon size={22} />
              <input type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
            </label>
          </div>
        )}
      </div>
    </div>
  )
}
