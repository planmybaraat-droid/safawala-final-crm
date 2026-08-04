"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  X,
  Send,
  Loader2,
  Sparkles,
  Crown,
  Minimize2,
  Maximize2,
  RotateCcw,
  Tag,
  User,
  Phone,
  MessageSquare,
  Calendar,
  MapPin,
  IndianRupee,
  Receipt,
  Briefcase,
  Check,
  Copy,
  Mail,
} from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  card?: {
    type: "coupon" | "staff" | "customer" | "lead" | "expense"
    data: any
  }
}

const QUICK_ACTIONS = [
  "How many bookings today?",
  "Show pending payments",
  "Low stock items",
  "Today's deliveries",
  "Recent leads",
  "Create a booking",
]

/* --- Card Sub-Components --- */

function CouponCard({ data }: { data: any }) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(data.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatDiscount = () => {
    if (data.discount_type === "percentage") return `${data.discount_value}% OFF`
    if (data.discount_type === "fixed_amount") return `₹${data.discount_value} OFF`
    return "Free Shipping"
  }

  return (
    <div className="mt-2.5 p-3.5 bg-white/5 border border-yellow-500/20 rounded-xl flex flex-col gap-2 relative overflow-hidden backdrop-blur-md">
      <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full blur-xl -mr-6 -mt-6 pointer-events-none" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-yellow-500/10 rounded-lg flex items-center justify-center border border-yellow-500/20">
            <Tag className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <h4 className="text-[11px] font-bold text-white tracking-wide uppercase">Coupon Created</h4>
            <p className="text-[10px] text-white/50">{formatDiscount()}</p>
          </div>
        </div>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1 text-[10px] font-bold bg-yellow-500 hover:bg-yellow-400 text-black px-2.5 py-1 rounded-lg transition-all"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>{data.code}</span>
            </>
          )}
        </button>
      </div>

      <div className="border-t border-white/5 pt-2 flex flex-col gap-1 text-[11px] text-white/70">
        {data.description && <p className="italic text-white/50">"{data.description}"</p>}
        {data.min_order_value > 0 && (
          <p>
            Min Order Value: <span className="font-semibold text-white">₹{data.min_order_value}</span>
          </p>
        )}
        {data.valid_until && (
          <p>
            Valid Until: <span className="font-semibold text-white">{new Date(data.valid_until).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
          </p>
        )}
      </div>
    </div>
  )
}

function StaffCard({ data }: { data: any }) {
  const initials = data.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="mt-2.5 p-3.5 bg-white/5 border border-purple-500/20 rounded-xl flex items-center gap-3 relative overflow-hidden backdrop-blur-md">
      <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl -mr-6 -mt-6 pointer-events-none" />
      <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-purple-500/10 border border-purple-500/30 rounded-xl flex items-center justify-center text-sm font-bold text-purple-300">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h4 className="text-xs font-bold text-white truncate">{data.name}</h4>
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" title="Active" />
        </div>
        <p className="text-[10px] text-white/50 flex items-center gap-1 truncate mt-0.5">
          <Mail className="w-3 h-3 text-white/40" />
          <span>{data.email}</span>
        </p>
        <p className="text-[9px] bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-md px-1.5 py-0.5 w-fit mt-1.5 capitalize font-medium flex items-center gap-1">
          <Briefcase className="w-2.5 h-2.5" />
          <span>{data.role.replace("_", " ")}</span>
        </p>
      </div>
    </div>
  )
}

function CustomerCard({ data }: { data: any }) {
  const getWhatsAppLink = (ph: string) => {
    const cleanNum = ph.replace(/\D/g, "")
    const fullNum = cleanNum.length === 10 ? `91${cleanNum}` : cleanNum
    return `https://wa.me/${fullNum}`
  }

  return (
    <div className="mt-2.5 p-3.5 bg-white/5 border border-blue-500/20 rounded-xl flex flex-col gap-2 relative overflow-hidden backdrop-blur-md">
      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl -mr-6 -mt-6 pointer-events-none" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
            <User className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Customer Profile</h4>
            <p className="text-[10px] text-white/50">{data.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <a
            href={`tel:${data.phone}`}
            className="w-7 h-7 bg-white/5 hover:bg-white/10 text-white/75 hover:text-white border border-white/10 rounded-lg flex items-center justify-center transition"
            title="Call Customer"
          >
            <Phone className="w-3.5 h-3.5" />
          </a>
          <a
            href={getWhatsAppLink(data.whatsapp || data.phone)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-7 h-7 bg-green-500/10 hover:bg-green-500/20 text-green-400 hover:text-green-300 border border-green-500/20 rounded-lg flex items-center justify-center transition"
            title="WhatsApp Customer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <div className="border-t border-white/5 pt-2 flex flex-col gap-1 text-[11px] text-white/70">
        {data.email && <p className="truncate">Email: <span className="font-semibold text-white">{data.email}</span></p>}
        {data.address && <p className="truncate">Address: <span className="font-semibold text-white">{data.address}</span></p>}
        {(data.city || data.state || data.pincode) && (
          <p>
            Location:{" "}
            <span className="font-semibold text-white">
              {[data.city, data.state, data.pincode].filter(Boolean).join(", ")}
            </span>
          </p>
        )}
        {data.notes && <p className="italic text-white/50 mt-1">"{data.notes}"</p>}
      </div>
    </div>
  )
}

function LeadCard({ data }: { data: any }) {
  return (
    <div className="mt-2.5 p-3.5 bg-white/5 border border-pink-500/20 rounded-xl flex flex-col gap-2 relative overflow-hidden backdrop-blur-md">
      <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 rounded-full blur-xl -mr-6 -mt-6 pointer-events-none" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-pink-500/10 rounded-lg flex items-center justify-center border border-pink-500/20">
            <Sparkles className="w-4 h-4 text-pink-400" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Lead Registered</h4>
            <p className="text-[10px] text-white/50">{data.name}</p>
          </div>
        </div>
        <span className="text-[9px] bg-pink-500/10 border border-pink-500/20 text-pink-300 rounded-md px-1.5 py-0.5 font-medium uppercase tracking-wide">
          {data.status}
        </span>
      </div>

      <div className="border-t border-white/5 pt-2 flex flex-col gap-1.5 text-[11px] text-white/70">
        <p className="flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 text-white/40" />
          <span>{data.phone}</span>
        </p>
        {data.event_date && (
          <p className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-white/40" />
            <span>Event Date: <span className="font-semibold text-white">{new Date(data.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span></span>
          </p>
        )}
        {data.location && (
          <p className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-white/40" />
            <span>Location: <span className="font-semibold text-white">{data.location}</span></span>
          </p>
        )}
        {data.package_interest && (
          <p className="text-[10px] bg-white/5 border border-white/10 rounded-md px-2 py-1 w-fit">
            Interested in: <span className="font-semibold text-white">{data.package_interest}</span>
          </p>
        )}
        {data.message && <p className="italic text-white/50 mt-1 border-l-2 border-white/10 pl-2">"{data.message}"</p>}
      </div>
    </div>
  )
}

function ExpenseCard({ data }: { data: any }) {
  return (
    <div className="mt-2.5 p-3.5 bg-white/5 border border-red-500/20 rounded-xl flex flex-col gap-2 relative overflow-hidden backdrop-blur-md">
      <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-xl -mr-6 -mt-6 pointer-events-none" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center border border-red-500/20">
            <Receipt className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">{data.subcategory}</h4>
            <p className="text-[9px] text-white/40 font-mono uppercase tracking-tight">{data.expense_number}</p>
          </div>
        </div>
        <div className="flex items-center text-red-400 font-bold text-sm">
          <IndianRupee className="w-3.5 h-3.5" />
          <span>{data.amount}</span>
        </div>
      </div>

      <div className="border-t border-white/5 pt-2 flex flex-col gap-1 text-[11px] text-white/70">
        <p>Date: <span className="font-semibold text-white">{new Date(data.expense_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span></p>
        {data.vendor_name && <p>Paid To: <span className="font-semibold text-white">{data.vendor_name}</span></p>}
        {data.receipt_number && <p>Receipt #: <span className="font-semibold text-white">{data.receipt_number}</span></p>}
        {data.booking_number && <p>Booking: <span className="font-semibold text-white">{data.booking_number}</span></p>}
        {data.description && <p className="italic text-white/50 mt-1 pl-2 border-l-2 border-white/10">"{data.description}"</p>}
      </div>
    </div>
  )
}

function ProductCard({ data }: { data: any }) {
  return (
    <div className="mt-2.5 p-3.5 bg-white/5 border border-emerald-500/20 rounded-xl flex flex-col gap-2 relative overflow-hidden backdrop-blur-md">
      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl -mr-6 -mt-6 pointer-events-none" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20">
            <Crown className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white truncate">{data.name}</h4>
            <p className="text-[10px] text-white/50 capitalize">{data.category || "General"}</p>
          </div>
        </div>
        <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-md px-1.5 py-0.5 font-medium">
          Product Details
        </span>
      </div>

      <div className="border-t border-white/5 pt-2 grid grid-cols-2 gap-2 text-[11px] text-white/70">
        <div>
          <p className="text-white/40 text-[9px] uppercase tracking-wide">Rental Price</p>
          <p className="font-semibold text-white mt-0.5">₹{data.rental_price}</p>
        </div>
        <div>
          <p className="text-white/40 text-[9px] uppercase tracking-wide">Sale Price</p>
          <p className="font-semibold text-white mt-0.5">₹{data.sale_price || data.price || "—"}</p>
        </div>
        <div>
          <p className="text-white/40 text-[9px] uppercase tracking-wide">Available Stock</p>
          <p className="font-semibold text-white mt-0.5">{data.stock_available} units</p>
        </div>
        <div>
          <p className="text-white/40 text-[9px] uppercase tracking-wide">Total Stock</p>
          <p className="font-semibold text-white mt-0.5">{data.stock_total || data.stock_available} units</p>
        </div>
      </div>
    </div>
  )
}

function BookingCard({ data }: { data: any }) {
  const customerName = data.customer?.name || "Customer"
  const pendingAmount = Number(data.total_amount || 0) - Number(data.paid_amount || 0)
  
  const statusColors: Record<string, string> = {
    confirmed: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    delivered: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    order_complete: "bg-green-500/10 border-green-500/20 text-green-400",
    cancelled: "bg-red-500/10 border-red-500/20 text-red-400",
  }
  
  const statusColor = statusColors[data.status] || "bg-white/5 border-white/10 text-white/70"

  return (
    <div className="mt-2.5 p-3.5 bg-white/5 border border-indigo-500/20 rounded-xl flex flex-col gap-2 relative overflow-hidden backdrop-blur-md">
      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl -mr-6 -mt-6 pointer-events-none" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center border border-indigo-500/20">
            <Calendar className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white tracking-wide uppercase">{data.booking_number}</h4>
            <p className="text-[10px] text-white/50 truncate max-w-[120px]">{customerName}</p>
          </div>
        </div>
        <span className={`text-[9px] border rounded-md px-1.5 py-0.5 font-medium uppercase tracking-wide ${statusColor}`}>
          {data.status.replace("_", " ")}
        </span>
      </div>

      <div className="border-t border-white/5 pt-2 grid grid-cols-3 gap-1.5 text-[11px] text-white/70">
        <div>
          <p className="text-white/40 text-[9px] uppercase tracking-wide">Total</p>
          <p className="font-bold text-white mt-0.5">₹{data.total_amount}</p>
        </div>
        <div>
          <p className="text-white/40 text-[9px] uppercase tracking-wide">Paid</p>
          <p className="font-bold text-green-400 mt-0.5">₹{data.paid_amount || 0}</p>
        </div>
        <div>
          <p className="text-white/40 text-[9px] uppercase tracking-wide">Due</p>
          <p className="font-bold text-red-400 mt-0.5">₹{pendingAmount}</p>
        </div>
      </div>
      {data.event_date && (
        <div className="text-[10px] text-white/40 mt-1 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>Event: {new Date(data.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
        </div>
      )}
    </div>
  )
}

/* --- Main Assistant Component --- */

export function SafawalaAIAssistant() {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Namaste! 👑 I'm Safawala AI. I can help you manage your CRM — check bookings, customer data, inventory, leads, payments, and more. What can I do for you?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Draggable states
  const [btnOffset, setBtnOffset] = useState({ x: 0, y: 0 })
  const [winOffset, setWinOffset] = useState({ x: 0, y: 0 })
  const [btnDragging, setBtnDragging] = useState(false)
  const [winDragging, setWinDragging] = useState(false)

  const btnDragStart = useRef({ x: 0, y: 0 })
  const winDragStart = useRef({ x: 0, y: 0 })

  const onBtnMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    btnDragStart.current = { x: e.clientX - btnOffset.x, y: e.clientY - btnOffset.y }
    setBtnDragging(false)

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - btnDragStart.current.x
      const dy = moveEvent.clientY - btnDragStart.current.y
      if (Math.abs(dx - btnOffset.x) > 3 || Math.abs(dy - btnOffset.y) > 3) {
        setBtnDragging(true)
      }
      setBtnOffset({ x: dx, y: dy })
    }

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
  }

  const handleBtnClick = (e: React.MouseEvent) => {
    if (btnDragging) {
      e.preventDefault()
      e.stopPropagation()
      setTimeout(() => setBtnDragging(false), 50)
      return
    }
    setOpen(true)
  }

  const onWinMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest("button")) return

    winDragStart.current = { x: e.clientX - winOffset.x, y: e.clientY - winOffset.y }
    setWinDragging(true)

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - winDragStart.current.x
      const dy = moveEvent.clientY - winDragStart.current.y
      setWinOffset({ x: dx, y: dy })
    }

    const onMouseUp = () => {
      setWinDragging(false)
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
  }

  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
    }
  }, [messages, open, minimized])

  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [open, minimized])

  useEffect(() => {
    if (typeof window !== "undefined") {
      ;(window as any).__safawalaAIState = { open, minimized }
      window.dispatchEvent(new CustomEvent("safawala-ai-state", { detail: { open, minimized } }))
    }
  }, [open, minimized])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      const data = await res.json()
      const reply = data.reply || data.error || "Sorry, I couldn't process that. Please try again."

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: reply,
          timestamp: new Date(),
          card: data.card || undefined,
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          timestamp: new Date(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }, [loading, messages])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const reset = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Namaste! 👑 I'm Safawala AI. How can I help you today?",
        timestamp: new Date(),
      },
    ])
  }

  const formatContent = (content: string) => {
    return content
      .split("\n")
      .map((line, i) => {
        if (line.startsWith("**") && line.endsWith("**")) {
          return <p key={i} className="font-semibold text-white">{line.slice(2, -2)}</p>
        }
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return (
            <p key={i} className="flex items-start gap-1.5">
              <span className="text-yellow-400 mt-0.5">•</span>
              <span>{line.slice(2)}</span>
            </p>
          )
        }
        if (line.trim() === "") return <br key={i} />
        return <p key={i}>{line}</p>
      })
  }

  const renderCard = (card: any) => {
    if (!card) return null
    switch (card.type) {
      case "coupon":
        return <CouponCard data={card.data} />
      case "staff":
        return <StaffCard data={card.data} />
      case "customer":
        return <CustomerCard data={card.data} />
      case "lead":
        return <LeadCard data={card.data} />
      case "expense":
        return <ExpenseCard data={card.data} />
      case "product":
        return <ProductCard data={card.data} />
      case "booking":
        return <BookingCard data={card.data} />
      default:
        return null
    }
  }

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onMouseDown={onBtnMouseDown}
          onClick={handleBtnClick}
          className="fixed bottom-4 right-4 z-50 group flex items-center gap-2.5 bg-gradient-to-r from-yellow-500 to-yellow-400 hover:from-yellow-400 hover:to-yellow-300 text-black font-bold rounded-2xl px-4 py-3 shadow-2xl shadow-yellow-500/30 transition-all hover:scale-105 active:scale-95"
          style={{
            transform: `translate(${btnOffset.x}px, ${btnOffset.y}px)`,
            cursor: btnDragging ? "grabbing" : "grab",
            userSelect: "none",
            transition: btnDragging ? "none" : undefined,
          }}
          title="AI Assistant (Drag to move)"
        >
          <Crown className="w-5 h-5 fill-black/20" />
          <span className="text-sm">AI</span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-40"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-black/50"></span>
          </span>
        </button>
      )}

      {/* Chat Window */}
      {open && (
        <div
          className={`fixed z-50 right-4 bottom-4 bg-[#0f0d1a] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 flex flex-col transition-all overflow-hidden ${
            minimized ? "w-72 h-14" : "w-[350px] h-[500px]"
          }`}
          style={{
            transform: `translate(${winOffset.x}px, ${winOffset.y}px)`,
            transition: winDragging ? "none" : "width 0.3s ease, height 0.3s ease",
          }}
        >
          {/* Header */}
          <div 
            onMouseDown={onWinMouseDown}
            className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-yellow-500/10 to-purple-500/10 border-b border-white/8 flex-shrink-0"
            style={{
              cursor: winDragging ? "grabbing" : "grab",
              userSelect: "none",
            }}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
              <Crown className="w-4 h-4 text-black fill-black/20" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white leading-none">AI</p>
              {!minimized && (
                <p className="text-[10px] text-white/40 mt-0.5">Your CRM assistant</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={reset}
                title="Clear chat"
                className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setMinimized(!minimized)}
                className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                {minimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                        <Crown className="w-3 h-3 text-black" />
                      </div>
                    )}
                    <div
                      className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed space-y-1 ${
                        msg.role === "user"
                          ? "bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-br-md"
                          : "bg-white/8 text-white/85 rounded-bl-md shadow-lg"
                      }`}
                    >
                      {msg.role === "assistant"
                        ? formatContent(msg.content)
                        : <p>{msg.content}</p>}
                      {msg.role === "assistant" && msg.card && renderCard(msg.card)}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center mr-2 flex-shrink-0">
                      <Crown className="w-3 h-3 text-black" />
                    </div>
                    <div className="bg-white/8 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1.5 items-center">
                        <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Quick Actions */}
              {messages.length <= 1 && (
                <div className="px-4 pb-2">
                  <p className="text-[10px] text-white/30 mb-2 uppercase tracking-wide">Quick actions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action}
                        onClick={() => sendMessage(action)}
                        className="text-[11px] bg-white/8 hover:bg-white/14 text-white/60 hover:text-white border border-white/10 rounded-full px-2.5 py-1 transition"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="flex items-end gap-2 p-3 border-t border-white/8 flex-shrink-0">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about your CRM..."
                  rows={1}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:border-yellow-500/50 resize-none leading-5 max-h-24 overflow-y-auto"
                  style={{ minHeight: "40px", backgroundColor: "#ffffff", color: "#0f172a" }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-yellow-500 to-yellow-400 hover:from-yellow-400 hover:to-yellow-300 text-black rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
