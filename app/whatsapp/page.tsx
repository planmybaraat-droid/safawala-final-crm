"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Search, Send, Loader2, RefreshCw, MessageCircle,
  Phone, Clock, CheckCheck, Check, AlertCircle,
  Smile, Paperclip, Settings, ChevronDown
} from "lucide-react"
import { toast } from "sonner"
import { format, isToday, isYesterday, parseISO } from "date-fns"
import Link from "next/link"

interface Contact {
  id: string
  wAid: string
  whatsappName?: string
  fullName?: string
  phone?: string
  lastMessage?: string
  lastMessageTime?: string
  unreadCount?: number
  isOpen?: boolean
}

interface Message {
  id: string
  text?: string
  type: string
  owner: boolean // true = sent by us, false = from customer
  timestamp: string
  status?: string
  image?: { link?: string; caption?: string }
  document?: { link?: string; fileName?: string }
}

function formatMsgTime(ts: string) {
  try {
    const d = new Date(Number(ts) * 1000)
    if (isToday(d)) return format(d, "h:mm a")
    if (isYesterday(d)) return "Yesterday"
    return format(d, "dd MMM")
  } catch { return "" }
}

function ContactItem({ c, active, onClick }: { c: Contact; active: boolean; onClick: () => void }) {
  const name = c.whatsappName || c.fullName || c.phone || c.wAid
  const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${active ? "bg-green-50 border-l-4 border-l-green-500" : ""}`}
    >
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900 truncate">{name}</span>
          {c.lastMessageTime && (
            <span className="text-[10px] text-gray-400 shrink-0 ml-2">{formatMsgTime(c.lastMessageTime)}</span>
          )}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-xs text-gray-500 truncate">{c.lastMessage || "Tap to view"}</span>
          {(c.unreadCount ?? 0) > 0 && (
            <span className="ml-2 bg-green-500 text-white text-[10px] rounded-full px-1.5 py-0.5 shrink-0 font-bold">
              {c.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUs = msg.owner
  const time = formatMsgTime(msg.timestamp)

  return (
    <div className={`flex ${isUs ? "justify-end" : "justify-start"} mb-1`}>
      <div
        className={`max-w-[72%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
          isUs
            ? "bg-[#dcf8c6] text-gray-900 rounded-br-sm"
            : "bg-white text-gray-900 rounded-bl-sm border border-gray-100"
        }`}
      >
        {msg.image?.link && (
          <img src={msg.image.link} alt="img" className="rounded-lg mb-1 max-w-full" />
        )}
        {msg.document && (
          <a href={msg.document.link} target="_blank" rel="noreferrer" className="text-blue-600 underline text-xs">
            📎 {msg.document.fileName || "Document"}
          </a>
        )}
        {msg.text && <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
        <div className={`flex items-center gap-1 mt-1 ${isUs ? "justify-end" : "justify-start"}`}>
          <span className="text-[10px] text-gray-400">{time}</span>
          {isUs && (
            msg.status === "read" ? <CheckCheck className="h-3 w-3 text-blue-500" /> :
            msg.status === "delivered" ? <CheckCheck className="h-3 w-3 text-gray-400" /> :
            <Check className="h-3 w-3 text-gray-400" />
          )}
        </div>
      </div>
    </div>
  )
}

export default function WhatsAppPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState("")
  const [messageText, setMessageText] = useState("")
  const [configured, setConfigured] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchContacts()
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFilteredContacts(
      contacts.filter(c =>
        (c.whatsappName || c.fullName || c.phone || c.wAid || "").toLowerCase().includes(q)
      )
    )
  }, [search, contacts])

  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact.wAid || selectedContact.phone || "")
      // Poll for new messages every 8 seconds
      pollRef.current = setInterval(() => {
        fetchMessages(selectedContact.wAid || selectedContact.phone || "", true)
      }, 8000)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [selectedContact])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function fetchContacts() {
    setLoadingContacts(true)
    try {
      const res = await fetch("/api/wati/contacts?pageSize=100")
      const json = await res.json()
      if (!res.ok) {
        if (json.error?.includes("not configured") || json.error?.includes("WATI")) {
          setConfigured(false)
        }
        return
      }
      setContacts(json.contacts ?? [])
      setFilteredContacts(json.contacts ?? [])
      setConfigured(true)
    } catch {
      setConfigured(false)
    } finally {
      setLoadingContacts(false)
    }
  }

  async function fetchMessages(phone: string, silent = false) {
    if (!silent) setLoadingMessages(true)
    try {
      const res = await fetch(`/api/wati/messages?phone=${encodeURIComponent(phone)}&pageSize=50`)
      const json = await res.json()
      if (res.ok) {
        const sorted = (json.messages ?? []).sort((a: Message, b: Message) =>
          Number(a.timestamp) - Number(b.timestamp)
        )
        setMessages(sorted)
      }
    } catch {}
    finally { if (!silent) setLoadingMessages(false) }
  }

  async function handleSend() {
    if (!messageText.trim() || !selectedContact) return
    const phone = selectedContact.wAid || selectedContact.phone || ""
    setSending(true)
    try {
      const res = await fetch("/api/wati/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "text", phone, message: messageText.trim() }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to send")
      setMessageText("")
      // Refresh messages
      setTimeout(() => fetchMessages(phone, true), 1000)
      inputRef.current?.focus()
    } catch (err: any) {
      if (err.message?.includes("24")) {
        toast.error("24-hour window expired — use a template message", { duration: 5000 })
      } else {
        toast.error(err.message || "Failed to send message")
      }
    } finally {
      setSending(false)
    }
  }

  const contactName = selectedContact
    ? (selectedContact.whatsappName || selectedContact.fullName || selectedContact.phone || selectedContact.wAid)
    : ""

  const contactInitials = contactName
    .split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()

  if (!configured) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <MessageCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Connect WhatsApp (WATI)</h2>
          <p className="text-gray-500 max-w-md text-sm">
            Your WATI account isn't connected yet. Add your WATI API key and base URL in Integrations to start chatting with customers.
          </p>
          <Link href="/integrations">
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              <Settings className="h-4 w-4 mr-2" />
              Go to Integrations
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Full-height WhatsApp layout */}
      <div className="flex h-[calc(100vh-6rem)] rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">

        {/* LEFT — Contact list */}
        <div className="w-80 shrink-0 flex flex-col border-r border-gray-200 bg-white">
          {/* Header */}
          <div className="px-4 py-3 bg-[#075E54] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-white" />
              <span className="text-white font-semibold text-sm">WhatsApp</span>
              <Badge className="bg-green-400 text-white text-[10px] border-0">WATI</Badge>
            </div>
            <button onClick={fetchContacts} className="text-white/70 hover:text-white">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {/* Search */}
          <div className="p-2 bg-gray-50 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Search contacts..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm bg-white border-gray-200"
              />
            </div>
          </div>

          {/* Contacts */}
          <div className="flex-1 overflow-y-auto">
            {loadingContacts ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-sm">
                <MessageCircle className="h-10 w-10 mb-2 opacity-20" />
                <p>{contacts.length === 0 ? "No contacts yet" : "No results"}</p>
              </div>
            ) : (
              filteredContacts.map(c => (
                <ContactItem
                  key={c.id || c.wAid}
                  c={c}
                  active={selectedContact?.wAid === c.wAid}
                  onClick={() => setSelectedContact(c)}
                />
              ))
            )}
          </div>

          <div className="p-3 border-t border-gray-100 bg-gray-50 text-center">
            <span className="text-[11px] text-gray-400">{contacts.length} contacts from WATI</span>
          </div>
        </div>

        {/* RIGHT — Chat window */}
        {!selectedContact ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] text-center">
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-sm mb-4">
              <MessageCircle className="h-10 w-10 text-[#075E54]" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700">Safawala WhatsApp Inbox</h3>
            <p className="text-gray-400 text-sm mt-1">Select a contact to start chatting</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col bg-[#f0f2f5]">
            {/* Chat header */}
            <div className="px-4 py-3 bg-[#075E54] flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-300 to-green-500 flex items-center justify-center text-white text-sm font-bold">
                {contactInitials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold text-sm truncate">{contactName}</div>
                <div className="text-green-200 text-xs">
                  {selectedContact.phone || selectedContact.wAid}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${selectedContact.phone || selectedContact.wAid}`}
                  className="text-white/70 hover:text-white"
                >
                  <Phone className="h-4 w-4" />
                </a>
                <button
                  onClick={() => fetchMessages(selectedContact.wAid || selectedContact.phone || "")}
                  className="text-white/70 hover:text-white"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5"
              style={{
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23075E54' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"
              }}
            >
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="bg-white rounded-lg px-4 py-2 text-xs text-gray-500 shadow-sm">
                    No messages yet
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => {
                    const prevMsg = messages[i - 1]
                    const showDate = !prevMsg || formatMsgTime(prevMsg.timestamp) !== formatMsgTime(msg.timestamp) && i > 0
                    const msgDate = (() => {
                      try {
                        const d = new Date(Number(msg.timestamp) * 1000)
                        if (isToday(d)) return "Today"
                        if (isYesterday(d)) return "Yesterday"
                        return format(d, "dd MMM yyyy")
                      } catch { return "" }
                    })()
                    return (
                      <div key={msg.id || i}>
                        {i === 0 && (
                          <div className="flex justify-center my-3">
                            <span className="bg-white/80 text-xs text-gray-500 px-3 py-1 rounded-full shadow-sm">{msgDate}</span>
                          </div>
                        )}
                        <MessageBubble msg={msg} />
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* 24h warning if no recent customer message */}
            {messages.length > 0 && (() => {
              const lastCustomerMsg = [...messages].reverse().find(m => !m.owner)
              if (!lastCustomerMsg) return null
              const diff = Date.now() - Number(lastCustomerMsg.timestamp) * 1000
              const hoursLeft = 24 - diff / (1000 * 60 * 60)
              if (hoursLeft > 0 && hoursLeft < 4) return (
                <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-100 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                  <span className="text-xs text-yellow-700">
                    24-hour window closing in <strong>{Math.floor(hoursLeft)}h {Math.round((hoursLeft % 1) * 60)}m</strong> — after that only templates can be sent
                  </span>
                </div>
              )
              if (hoursLeft <= 0) return (
                <div className="px-4 py-2 bg-red-50 border-t border-red-100 flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  <span className="text-xs text-red-700">
                    24-hour window expired — only template messages can be sent now
                  </span>
                </div>
              )
              return null
            })()}

            {/* Input box */}
            <div className="px-4 py-3 bg-[#f0f2f5] border-t border-gray-200">
              <div className="flex items-end gap-2 bg-white rounded-2xl px-4 py-2 shadow-sm border border-gray-200">
                <Textarea
                  ref={inputRef}
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
                  }}
                  rows={1}
                  className="flex-1 resize-none border-0 shadow-none focus-visible:ring-0 p-0 text-sm min-h-[24px] max-h-32"
                />
                <Button
                  onClick={handleSend}
                  disabled={!messageText.trim() || sending}
                  size="sm"
                  className="bg-[#075E54] hover:bg-[#054c45] text-white rounded-full h-9 w-9 p-0 shrink-0"
                >
                  {sending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Send className="h-4 w-4" />
                  }
                </Button>
              </div>
              <p className="text-center text-[10px] text-gray-400 mt-1.5">Enter to send · Shift+Enter for new line</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
