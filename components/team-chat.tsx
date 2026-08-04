"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase"
import {
  X, Send, Loader2, Users, Minimize2, Maximize2, Mic, MicOff,
  Sparkles, RotateCcw, Trash2, ChevronDown, Radio, Volume2, PhoneOff,
  Phone, PhoneCall
} from "lucide-react"

interface ChatMessage {
  id: string
  user_name: string
  user_role: string
  message: string
  message_type: "text" | "voice" | "image" | "file" | "walkie_talkie_log" | "location" | "contact"
  voice_url?: string
  created_at: string
  user_id?: string
  seen_by?: string[]
  file_url?: string
}

const ROLE_COLORS: Record<string, string> = {
  franchise_admin: "#a855f7",
  franchise_owner: "#a855f7",
  manager: "#6366f1",
  booking_staff: "#22c55e",
  warehouse_staff: "#a855f7",
  hr_staff: "#6366f1",
  accounts_staff: "#ef4444",
  delivery_staff: "#14b8a6",
  qc_staff: "#eab308",
  stylist: "#ec4899",
  travels_staff: "#0891b2",
  staff: "#64748b",
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
}

function getColor(role: string) {
  return ROLE_COLORS[role] || "#64748b"
}

const EMOJI_CATEGORIES: Record<string, { tab: string; list: string[] }> = {
  turban: {
    tab: "👳‍♂️",
    list: [":turban-smile:", ":turban-laugh:", ":turban-love:", ":turban-cool:"]
  },
  smileys: {
    tab: "😊",
    list: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "👽", "👾", "🤖", "🎃", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾"]
  },
  gestures: {
    tab: "✌️",
    list: ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "👂", "👃", "🧠", "👀", "👅", "👄", "💋", "🩸"]
  },
  animals: {
    tab: "🐶",
    list: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦢", "🦉", "🦩", "🦚", "🦜", "🐊", "🐢", "🦎", "🐍", "🐳", "🐋", "🐬", "🐟", "🐠", "🐡", "🦈", "🐙", "🐚", "🐌", "🦋", "🐛", "🐜", "🐝", "🐞", "🦗", "🕷️", "🕸️", "🦂", "💐", "🌸", "💮", "🌹", "🥀", "🌺", "🌻", "🌼", "🌷", "🌱", "🌲", "🌳", "🌴", "🌵", "🍀", "🍁", "🍂", "🍃"]
  },
  food: {
    tab: "🍏",
    list: ["🍏", "🍎", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🥑", "🥦", "🌽", "🥕", "🍞", "🥐", "🥖", "🥨", "🥯", "🥞", "🧇", "🧀", "🍖", "🍗", "🥩", "🥓", "🍔", "🍟", "🍕", "🌭", "🥪", "🌮", "🌯", "🍳", "🍲", "🍿", "🧂", "🥫", "🍱", "🍣", "🍤", "🍦", "🍧", "🍨", "🍩", "🍪", "🎂", "🍰", "🍫", "🍬", "🍭", "🍯", "🥛", "☕", "🍷", "🍸", "🍹", "🍺", "🍻", "🥤"]
  },
  hearts: {
    tab: "❤️",
    list: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🎱", "🏓", "🏸", "🥅", "⛳", "🏹", "🎣", "🥊", "🥋", "🏂", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "🎫", "🎟️", "🎭", "🖼️", "🎨", "🎬", "🎤", "🎧", "🎼", "🎹", "🥁", "🎷", "🎺", "🎸", "🎻", "🎲", "🧩", "🎳", "🎮", "🎯"]
  }
}

const playNotificationSound = () => {
  try {
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav")
    audio.volume = 0.5
    audio.play().catch(() => {})
  } catch (err) {
    console.warn("Failed to play sound:", err)
  }
}

function censorMessage(text: string): string {
  if (!text) return ""
  const abusiveWords = [
    "fuck", "motherfucker", "bitch", "asshole", "cunt", "bastard", "shit",
    "chutiya", "chutyew", "chutya", "bhosdike", "bhosdika", "bhosadi", "bhaosdike",
    "behenchod", "bhenchod", "madarchod", "madharchode", "gandu", "haramzada", "saala",
    "kamine", "kutta", "kamina", "haramkhor", "randi", "chhinal", "bhadwa",
    "bhen ke lode", "maa ke lode", "lavde", "lund", "tatti", "suar", "gadha",
    "nalayak", "bewakoof", "pagal", "bakwas", "haraami",
    "idiot", "fool", "stupid", "moron", "nonsense"
  ]
  
  let censored = text
  abusiveWords.forEach(word => {
    const escapedWord = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
    const regex = new RegExp(`\\b${escapedWord}\\b|${escapedWord}`, "gi")
    censored = censored.replace(regex, (match) => {
      if (match.length <= 2) return "**"
      return match[0] + "*".repeat(match.length - 2) + match[match.length - 1]
    })
  })
  return censored
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
}

const showDesktopNotification = (senderName: string, messageBody: string) => {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    const censoredBody = censorMessage(messageBody)
    const notif = new Notification(senderName, {
      body: censoredBody,
      icon: "/favicon.ico",
    })
    setTimeout(() => notif.close(), 4000)
  }
}

function formatDay(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Today"
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

export function TeamChat() {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [unread, setUnread] = useState(0)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [refining, setRefining] = useState(false)

  const [aiState, setAiState] = useState({ open: false, minimized: false })
  const [userStatus, setUserStatus] = useState<"online" | "offline">("online")
  const [onlineUsers, setOnlineUsers] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])

  // Emojis, file upload, mentions & private chat states
  const [showEmojis, setShowEmojis] = useState(false)
  const [privateChatUser, setPrivateChatUser] = useState<{ id: string; name: string; role: string } | null>(null)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionIndex, setMentionIndex] = useState<number>(-1)
  const [notifyPermission, setNotifyPermission] = useState<string>("default")
  const [activeEmojiTab, setActiveEmojiTab] = useState<string>("turban")

  // WhatsApp style attachment options
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
  const [showContactPicker, setShowContactPicker] = useState(false)
  const [fileAccept, setFileAccept] = useState("*")
  const [fileCapture, setFileCapture] = useState<string | undefined>(undefined)

  // Live and current location sharing states
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [showLiveDurationSelector, setShowLiveDurationSelector] = useState(false)
  const [locationCoords, setLocationCoords] = useState<{ latitude: number; longitude: number } | null>(null)

  // Walkie-Talkie states
  // Live Voice Call state
  const [activeGroupCall, setActiveGroupCall] = useState<{
    callId: string;
    initiatorId: string;
    initiatorName: string;
    joinedMembers: { id: string; name: string }[];
    isMuted: boolean;
    isCalling: boolean; // true if initiating or receiving ring
    isJoined: boolean;  // true if fully connected to voice stream
  } | null>(null);

  const [speakingUsers, setSpeakingUsers] = useState<Record<string, boolean>>({})

  const groupCallChannelRef = useRef<any>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const callRecorderRef = useRef<MediaRecorder | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const playTimesRef = useRef<Record<string, number>>({})
  const ringingAudioRef = useRef<HTMLAudioElement | null>(null)

  // Draggable offsets and flags
  const [btnOffset, setBtnOffset] = useState({ x: 0, y: 0 })
  const [winOffset, setWinOffset] = useState({ x: 0, y: 0 })
  const [btnDragging, setBtnDragging] = useState(false)
  const [winDragging, setWinDragging] = useState(false)

  const btnDragStart = useRef({ x: 0, y: 0 })
  const winDragStart = useRef({ x: 0, y: 0 })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastSeenRef = useRef<string>("")
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const seenMessageIdsRef = useRef<Set<string>>(new Set())
  const lastTypingSentRef = useRef<number>(0)

  // Check notification permission on mount and dispatch setter
  useEffect(() => {
    if (typeof window !== "undefined") {
      const w = window as any
      w.__setPrivateChatUser = setPrivateChatUser
      w.__currentUserId = currentUser?.id
      w.__stopLiveLocation = stopLiveLocation
      if ("Notification" in window) {
        setNotifyPermission(Notification.permission)
      }
    }
  }, [setPrivateChatUser, currentUser])

  // Load user data and presence status preferences
  useEffect(() => {
    const raw = localStorage.getItem("safawala_user")
    if (raw) { try { setCurrentUser(JSON.parse(raw)) } catch {} }

    const saved = localStorage.getItem("safawala_chat_status") as "online" | "offline"
    if (saved && (saved === "online" || saved === "offline")) {
      setUserStatus(saved)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      if ((window as any).__safawalaAIState) {
        setAiState((window as any).__safawalaAIState)
      }
      const handler = (e: Event) => {
        const detail = (e as CustomEvent).detail
        if (detail) {
          setAiState(detail)
        }
      }
      window.addEventListener("safawala-ai-state", handler)
      return () => window.removeEventListener("safawala-ai-state", handler)
    }
  }, [])

  // Heartbeat to update database presence record
  useEffect(() => {
    if (!currentUser?.id) return

    const sendPresence = async (status: "online" | "offline") => {
      try {
        await fetch("/api/team-chat/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        })
      } catch (err) {
        console.error("Failed to update presence:", err)
      }
    }

    sendPresence(userStatus)

    if (userStatus === "offline") return

    const interval = setInterval(() => {
      sendPresence("online")
    }, 15000)

    return () => clearInterval(interval)
  }, [userStatus, currentUser])

  // Poll online users in real-time
  useEffect(() => {
    if (!open || !currentUser) return

    const fetchOnline = async () => {
      try {
        const res = await fetch("/api/team-chat/presence")
        const json = await res.json()
        if (json.data) {
          // Exclude self from other online list
          setOnlineUsers(json.data.filter((u: any) => u.id !== currentUser.id))
        }
      } catch (err) {
        console.error("Failed to fetch online users:", err)
      }
    }

    fetchOnline()
    const interval = setInterval(fetchOnline, 15000)
    return () => clearInterval(interval)
  }, [open, currentUser])

  // Fetch all users once when chat opens
  useEffect(() => {
    if (!open || !currentUser) return

    const fetchAllUsers = async () => {
      try {
        const res = await fetch("/api/users?limit=200")
        const json = await res.json()
        if (json.data) {
          // Exclude self
          setAllUsers(json.data.filter((u: any) => u.id !== currentUser.id))
        }
      } catch (err) {
        console.error("Failed to fetch all franchise users:", err)
      }
    }

    fetchAllUsers()
  }, [open, currentUser])

  // Setup Supabase Realtime Channel for Voice Calls
  useEffect(() => {
    if (!open || !currentUser?.id) return

    const supabase = createClient()
    const channelName = `team-calls-${currentUser.franchise_id || 'global'}`
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } }
    })

    groupCallChannelRef.current = channel

    const playSynthesizedRing = () => {
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        }
        const ctx = audioCtxRef.current
        if (ctx.state === "suspended") {
          ctx.resume()
        }
        
        let ringInterval = setInterval(() => {
          const now = ctx.currentTime
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          
          osc.type = "sine"
          osc.frequency.setValueAtTime(440, now) // Standard dialing note
          
          gain.gain.setValueAtTime(0, now)
          gain.gain.linearRampToValueAtTime(0.15, now + 0.1)
          gain.gain.linearRampToValueAtTime(0, now + 1.2)
          
          osc.connect(gain)
          gain.connect(ctx.destination)
          
          osc.start(now)
          osc.stop(now + 1.3)
        }, 2000)

        ;(window as any).__ringInterval = ringInterval
      } catch (e) {
        console.warn("Could not play ring synthesizer:", e)
      }
    }

    const stopRingSound = () => {
      if ((window as any).__ringInterval) {
        clearInterval((window as any).__ringInterval)
        delete (window as any).__ringInterval
      }
    }

    const stopLocalAudioStream = () => {
      stopRingSound()
      if (callRecorderRef.current && callRecorderRef.current.state !== "inactive") {
        callRecorderRef.current.stop()
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop())
        mediaStreamRef.current = null
      }
    }

    const playAudioPacket = (payload: any) => {
      if (payload.userId === currentUser.id) return
      
      try {
        const binaryString = window.atob(payload.audio)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        }
        const audioCtx = audioCtxRef.current
        if (audioCtx.state === "suspended") {
          audioCtx.resume()
        }

        audioCtx.decodeAudioData(bytes.buffer, (buffer) => {
          const source = audioCtx.createBufferSource()
          source.buffer = buffer
          source.connect(audioCtx.destination)
          
          const now = audioCtx.currentTime
          let nextPlayTime = playTimesRef.current[payload.userId] || 0
          const startTime = Math.max(now, nextPlayTime)
          source.start(startTime)

          // Set speaking visual wave state
          setSpeakingUsers(prev => ({ ...prev, [payload.userId]: true }))
          setTimeout(() => {
            setSpeakingUsers(prev => {
              const next = { ...prev }
              delete next[payload.userId]
              return next
            })
          }, buffer.duration * 1000)

          playTimesRef.current[payload.userId] = startTime + buffer.duration
        }, (err) => {
          console.error("Audio packet decode error:", err)
        })
      } catch (err) {
        console.error("Audio playback error:", err)
      }
    }

    channel
      .on("broadcast", { event: "group_call_invite" }, (payload: any) => {
        const data = payload.payload
        setActiveGroupCall({
          callId: data.callId,
          initiatorId: data.initiatorId,
          initiatorName: data.initiatorName,
          joinedMembers: [{ id: data.initiatorId, name: data.initiatorName }],
          isMuted: false,
          isCalling: true,
          isJoined: false
        })
        playSynthesizedRing()
      })
      .on("broadcast", { event: "group_call_join" }, (payload: any) => {
        const data = payload.payload
        setActiveGroupCall(prev => {
          if (!prev || prev.callId !== data.callId) return prev
          const members = [...prev.joinedMembers]
          if (!members.find(m => m.id === data.userId)) {
            members.push({ id: data.userId, name: data.userName })
          }
          return { ...prev, joinedMembers: members }
        })
      })
      .on("broadcast", { event: "group_call_leave" }, (payload: any) => {
        const data = payload.payload
        setActiveGroupCall(prev => {
          if (!prev || prev.callId !== data.callId) return prev
          const members = prev.joinedMembers.filter(m => m.id !== data.userId)
          if (members.length <= 1) {
            stopLocalAudioStream()
            return null
          }
          return { ...prev, joinedMembers: members }
        })
      })
      .on("broadcast", { event: "audio_packet" }, (payload: any) => {
        playAudioPacket(payload.payload)
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
      stopLocalAudioStream()
    }
  }, [open, currentUser, activeGroupCall?.isJoined])

  // Trigger typing = true when input changes (throttled)
  useEffect(() => {
    if (!input.trim() || userStatus === "offline" || !currentUser?.id) return

    const now = Date.now()
    if (now - lastTypingSentRef.current < 2000) return

    lastTypingSentRef.current = now

    fetch("/api/team-chat/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "online", typing: true })
    }).catch(() => {})
  }, [input, userStatus, currentUser])

  // Trigger typing = false when input is cleared/empty
  useEffect(() => {
    if (input.trim() === "" && lastTypingSentRef.current > 0 && currentUser?.id && userStatus !== "offline") {
      lastTypingSentRef.current = 0
      fetch("/api/team-chat/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "online", typing: false })
      }).catch(() => {})
    }
  }, [input, currentUser, userStatus])

  const getRightPosition = () => {
    if (!aiState.open) return 124
    if (aiState.minimized) return 316
    return 378
  }

  // Draggable logic for floating button
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

  // Draggable logic for window header
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

  const fetchMessages = useCallback(async (since?: string) => {
    try {
      const url = since ? `/api/team-chat?since=${encodeURIComponent(since)}` : "/api/team-chat"
      const res = await fetch(url)
      const json = await res.json()
      if (json.needsSetup) { setNeedsSetup(true); return }
      if (json.data) {
        if (since) {
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id))
            const newMsgs = json.data.filter((m: ChatMessage) => !existingIds.has(m.id))
            if (newMsgs.length > 0) {
              const fromOthers = newMsgs.filter((m: ChatMessage) => m.user_id !== currentUser?.id && m.user_name !== currentUser?.name)
              if (fromOthers.length > 0) {
                playNotificationSound()
                fromOthers.forEach((m: ChatMessage) => {
                  showDesktopNotification(m.user_name, m.message_type === "text" ? m.message : `Sent a ${m.message_type}`)
                })
              }
              if (!open) setUnread(u => u + newMsgs.length)
            }
            return [...prev, ...newMsgs]
          })
        } else {
          setMessages(json.data)
        }
        if (json.data.length > 0) {
          lastSeenRef.current = json.data[json.data.length - 1].created_at
        }

        // Automatic Seen receipts: if chat is open, mark other users' messages as read/seen
        if (open && currentUser && json.data.length > 0) {
          const unseenIds = json.data
            .filter((m: ChatMessage) => m.user_id !== currentUser.id && m.user_name !== currentUser.name && !seenMessageIdsRef.current.has(m.id))
            .map((m: ChatMessage) => m.id)

          if (unseenIds.length > 0) {
            unseenIds.forEach((id: string) => seenMessageIdsRef.current.add(id))
            fetch("/api/team-chat/seen", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ messageIds: unseenIds })
            }).catch(() => {})
          }
        }
      }
    } catch {}
  }, [open, currentUser])

  useEffect(() => {
    fetchMessages()
    pollRef.current = setInterval(() => {
      fetchMessages(lastSeenRef.current || undefined)
    }, 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [fetchMessages])

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
    }
  }, [open, messages])

  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg) return
    setSending(true)
    setInput("")
    try {
      const res = await fetch("/api/team-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, message_type: "text" }),
      })
      const json = await res.json()
      if (json.needsSetup) { setNeedsSetup(true); return }
      if (json.data) {
        setMessages(prev => [...prev, json.data])
        lastSeenRef.current = json.data.created_at
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
      }
    } catch {} finally {
      setSending(false)
    }
  }

  const refineWithAI = async () => {
    if (!input.trim()) return
    setRefining(true)
    try {
      const res = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Please rewrite this message in clear, professional Hindi/English for a business team chat. Keep it short and natural. Original: "${input.trim()}"\n\nReturn ONLY the improved message, nothing else.`,
          context: "message_refinement",
        }),
      })
      const json = await res.json()
      const refined = json.response || json.message || json.content
      if (refined) setInput(refined.trim())
    } catch {} finally {
      setRefining(false)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []
      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        await uploadVoiceMessage(blob)
      }
      mr.start()
      setIsRecording(true)
      setRecordingTime(0)
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
    } catch { alert("Microphone permission denied") }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
  }

  const uploadVoiceMessage = async (blob: Blob) => {
    setSending(true)
    try {
      const fd = new FormData()
      fd.append("file", blob, `voice_${Date.now()}.webm`)
      fd.append("bucket", "team-chat-voices")
      const uploadRes = await fetch("/api/upload-simple", { method: "POST", body: fd })
      const uploadJson = await uploadRes.json()
      const voiceUrl = uploadJson.url || uploadJson.publicUrl
      if (!voiceUrl) throw new Error("Upload failed")

      const res = await fetch("/api/team-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "🎤 Voice message", message_type: "voice", voice_url: voiceUrl }),
      })
      const json = await res.json()
      if (json.data) {
        setMessages(prev => [...prev, json.data])
        lastSeenRef.current = json.data.created_at
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
      }
    } catch { alert("Failed to send voice message") } finally {
      setSending(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      alert("File size exceeds 2MB limit. Please upload a smaller file.")
      return
    }

    setSending(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const uploadRes = await fetch("/api/upload-simple", { method: "POST", body: fd })
      const uploadJson = await uploadRes.json()
      
      if (!uploadJson.success || !uploadJson.url) {
        throw new Error(uploadJson.error || "Upload failed")
      }

      const isImg = file.type.startsWith("image/")
      
      const res = await fetch("/api/team-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: file.name,
          message_type: isImg ? "image" : "file",
          file_url: uploadJson.url
        }),
      })
      const json = await res.json()
      if (json.data) {
        setMessages(prev => [...prev, json.data])
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
      }
    } catch (err: any) {
      alert("Failed to upload attachment: " + err.message)
    } finally {
      setSending(false)
    }
  }

  const insertMention = (name: string) => {
    if (mentionQuery === null || mentionIndex === -1) return
    const before = input.slice(0, mentionIndex)
    const after = input.slice(mentionIndex + mentionQuery.length + 1)
    const newValue = before + `@${name} ` + after
    setInput(newValue)
    setMentionQuery(null)
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        const newPos = mentionIndex + name.length + 2
        inputRef.current.setSelectionRange(newPos, newPos)
      }
    }, 50)
  }

  const startGroupCall = async () => {
    if (!currentUser) return
    const callId = "call_" + Date.now()
    setActiveGroupCall({
      callId,
      initiatorId: currentUser.id,
      initiatorName: currentUser.name,
      joinedMembers: [{ id: currentUser.id, name: currentUser.name }],
      isMuted: false,
      isCalling: true,
      isJoined: true
    })

    if (groupCallChannelRef.current) {
      groupCallChannelRef.current.send({
        type: "broadcast",
        event: "group_call_invite",
        payload: { callId, initiatorId: currentUser.id, initiatorName: currentUser.name }
      })
    }

    await startLocalAudioStream(callId)
  }

  const joinGroupCall = async () => {
    if (!activeGroupCall || !currentUser) return
    stopRingSound()

    setActiveGroupCall(prev => prev ? { ...prev, isCalling: false, isJoined: true } : null)

    if (groupCallChannelRef.current) {
      groupCallChannelRef.current.send({
        type: "broadcast",
        event: "group_call_join",
        payload: { callId: activeGroupCall.callId, userId: currentUser.id, userName: currentUser.name }
      })
    }

    await startLocalAudioStream(activeGroupCall.callId)
  }

  const declineGroupCall = () => {
    stopRingSound()
    setActiveGroupCall(null)
  }

  const leaveGroupCall = () => {
    if (activeGroupCall && currentUser) {
      if (groupCallChannelRef.current) {
        groupCallChannelRef.current.send({
          type: "broadcast",
          event: "group_call_leave",
          payload: { callId: activeGroupCall.callId, userId: currentUser.id }
        })
      }
    }
    stopLocalAudioStream()
    setActiveGroupCall(null)
  }

  const toggleMute = () => {
    if (!activeGroupCall) return
    const nextMuted = !activeGroupCall.isMuted
    setActiveGroupCall(prev => prev ? { ...prev, isMuted: nextMuted } : null)
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !nextMuted
      })
    }
  }

  const startLocalAudioStream = async (callId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
      callRecorderRef.current = recorder

      recorder.ondataavailable = async (e) => {
        if (e.data.size === 0 || !currentUser) return
        
        const reader = new FileReader()
        reader.readAsDataURL(e.data)
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(",")[1]
          if (base64data && groupCallChannelRef.current) {
            groupCallChannelRef.current.send({
              type: "broadcast",
              event: "audio_packet",
              payload: {
                callId,
                userId: currentUser.id,
                userName: currentUser.name,
                audio: base64data
              }
            })
          }
        }
      }

      recorder.start(300) // stream audio chunks every 300ms
    } catch (err) {
      console.error("Microphone permission denied for call:", err)
      alert("Microphone permission is required to join the call.")
    }
  }

  const stopRingSound = () => {
    if ((window as any).__ringInterval) {
      clearInterval((window as any).__ringInterval)
      delete (window as any).__ringInterval
    }
  }

  const stopLocalAudioStream = () => {
    stopRingSound()
    if (callRecorderRef.current && callRecorderRef.current.state !== "inactive") {
      callRecorderRef.current.stop()
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop())
      mediaStreamRef.current = null
    }
  }

  const shareLocation = () => {
    setShowAttachmentMenu(false)
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.")
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
        setShowLocationModal(true)
      },
      (err) => {
        alert("Failed to retrieve location: " + err.message)
      }
    )
  }

  const sendLocationMessage = async (type: "current" | "live", durationLabel?: string, durationMs?: number) => {
    if (!locationCoords) return
    setShowLocationModal(false)
    setShowLiveDurationSelector(false)
    setSending(true)
    try {
      const { latitude, longitude } = locationCoords
      const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`
      
      let messagePayload = mapsUrl
      if (type === "live" && durationMs && durationLabel) {
        messagePayload = JSON.stringify({
          type: "live",
          latitude,
          longitude,
          duration: durationLabel,
          expires_at: new Date(Date.now() + durationMs).toISOString(),
          sender_id: currentUser?.id
        })
      }

      const res = await fetch("/api/team-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messagePayload,
          message_type: "location",
          file_url: mapsUrl
        }),
      })
      const json = await res.json()
      if (json.data) {
        setMessages(prev => [...prev, json.data])
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
      }
    } catch {
      alert("Failed to share location")
    } finally {
      setSending(false)
    }
  }

  const stopLiveLocation = async (messageId: string) => {
    try {
      const res = await fetch("/api/team-chat", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: messageId,
          message: JSON.stringify({ type: "ended" })
        })
      })
      const json = await res.json()
      if (json.data) {
        setMessages(prev => prev.map(m => m.id === messageId ? json.data : m))
      }
    } catch {
      alert("Failed to stop sharing location")
    }
  }

  const shareContact = async (contactUser: any) => {
    setShowContactPicker(false)
    setSending(true)
    try {
      const res = await fetch("/api/team-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: JSON.stringify({ name: contactUser.name, role: contactUser.role, id: contactUser.id }),
          message_type: "contact"
        }),
      })
      const json = await res.json()
      if (json.data) {
        setMessages(prev => [...prev, json.data])
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
      }
    } catch {
      alert("Failed to share contact")
    } finally {
      setSending(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Group messages by date
  const grouped: { day: string; msgs: ChatMessage[] }[] = []
  messages.forEach(msg => {
    const day = formatDay(msg.created_at)
    const last = grouped[grouped.length - 1]
    if (last && last.day === day) last.msgs.push(msg)
    else grouped.push({ day, msgs: [msg] })
  })

  if (!currentUser || currentUser.role === "super_admin") return null

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onMouseDown={onBtnMouseDown}
          onClick={handleBtnClick}
          style={{
            position: "fixed", bottom: 14, right: getRightPosition(), zIndex: 9998,
            width: 52, height: 52, borderRadius: "50%",
            background: "linear-gradient(135deg, #22c55e, #16a34a)",
            border: "none", cursor: btnDragging ? "grabbing" : "grab",
            boxShadow: "0 4px 20px rgba(34,197,94,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white",
            transition: btnDragging ? "none" : "right 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            transform: `translate(${btnOffset.x}px, ${btnOffset.y}px)`,
            userSelect: "none",
          }}
          title="Team Chat (Drag to move)"
        >
          <Users size={22} />
          {unread > 0 && (
            <span style={{
              position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: "50%",
              background: "#ffffff", color: "#000000", fontSize: 10, fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "2px solid white",
            }}>{unread > 9 ? "9+" : unread}</span>
          )}
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div style={{
          position: "fixed", bottom: 14, right: getRightPosition(), zIndex: 9999,
          width: 340, borderRadius: 20,
          background: "#ffffff", boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          border: "1px solid #e4e4e7",
          display: "flex", flexDirection: "column",
          height: minimized ? "auto" : 500,
          fontFamily: "system-ui,-apple-system,sans-serif",
          overflow: "hidden",
          transition: winDragging ? "none" : "right 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: `translate(${winOffset.x}px, ${winOffset.y}px)`,
        }}>
          {/* Header (Drag Handle) */}
          <div 
            onMouseDown={onWinMouseDown}
            style={{
              padding: "12px 16px", borderBottom: "1px solid #f4f4f5",
              background: "linear-gradient(135deg, #18181b, #27272a)",
              display: "flex", alignItems: "center", gap: 10, borderRadius: "20px 20px 0 0",
              flexShrink: 0,
              cursor: winDragging ? "grabbing" : "grab",
              userSelect: "none",
            }}
          >
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg, #22c55e, #16a34a)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Users size={16} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#fff" }}>Team Chat</p>
              <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
                {userStatus === "online" ? "🟢 Online" : "🔴 Offline"}
              </p>
            </div>
            {!activeGroupCall && (
               <button 
                 onClick={startGroupCall} 
                 title="Start Group Call" 
                 style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", padding: 4 }}
               >
                 <Phone size={14} />
               </button>
             )}
            <button onClick={() => setMinimized(m => !m)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", padding: 4 }}>
              {minimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
            </button>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", padding: 4 }}>
              <X size={14} />
            </button>
          </div>

          {!minimized && (
            <>
              {/* Desktop Notification Request Prompt */}
              {notifyPermission === "default" && (
                <div style={{
                  background: "#eff6ff", borderBottom: "1px solid #bfdbfe",
                  padding: "6px 12px", display: "flex", alignItems: "center", gap: 8,
                  justifyContent: "space-between", flexShrink: 0
                }}>
                  <span style={{ fontSize: 10, color: "#1e40af", fontWeight: 600 }}>
                    Enable desktop notifications?
                  </span>
                  <button 
                    onClick={async () => {
                      if (typeof window !== "undefined" && "Notification" in window) {
                        const res = await Notification.requestPermission()
                        setNotifyPermission(res)
                      }
                    }}
                    style={{
                      background: "#2563eb", color: "white", border: "none",
                      borderRadius: 8, padding: "2px 8px", fontSize: 9,
                      fontWeight: 700, cursor: "pointer"
                    }}
                  >
                    Enable
                  </button>
                </div>
              )}
              {activeGroupCall?.isCalling && !activeGroupCall?.isJoined && (
                <div style={{
                  background: "#eff6ff", borderBottom: "1px solid #bfdbfe",
                  padding: "10px 12px", display: "flex", alignItems: "center", gap: 10,
                  justifyContent: "space-between", flexShrink: 0
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <PhoneCall size={18} style={{ color: "#2563eb", animation: "bounce 1s infinite" }} />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: 11, color: "#1e40af", fontWeight: 700 }}>
                        Incoming Group Call
                      </span>
                      <span style={{ fontSize: 9, color: "#1e40af" }}>
                        from {activeGroupCall.initiatorName}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button 
                      onClick={joinGroupCall}
                      style={{
                        background: "#22c55e", color: "white", border: "none",
                        borderRadius: 8, padding: "4px 10px", fontSize: 10,
                        fontWeight: 700, cursor: "pointer"
                      }}
                    >
                      Accept
                    </button>
                    <button 
                      onClick={declineGroupCall}
                      style={{
                        background: "#ef4444", color: "white", border: "none",
                        borderRadius: 8, padding: "4px 10px", fontSize: 10,
                        fontWeight: 700, cursor: "pointer"
                      }}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              )}

              {activeGroupCall?.isJoined ? (
                /* Group Call Live View */
                <div style={{
                  flex: 1, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  background: "#0f172a", color: "white", padding: 20, gap: 20,
                  minHeight: 300,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: "#22c55e", animation: "pulse 1s infinite"
                    }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Live Group Voice Call
                    </span>
                  </div>
                  {/* Joined Members Avatars & Speaking Indicators */}
                  <div style={{
                    display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16, maxWidth: "100%", margin: "10px 0"
                  }}>
                    {activeGroupCall.joinedMembers.map((member) => {
                      const isSpeaking = speakingUsers[member.id] || false
                      return (
                        <div key={member.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <div style={{
                            position: "relative",
                            width: 50, height: 50, borderRadius: "50%",
                            background: "linear-gradient(135deg, #1e293b, #334155)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 14, fontWeight: 800, color: "white",
                            border: isSpeaking ? "3px solid #22c55e" : "2px solid #64748b",
                            boxShadow: isSpeaking ? "0 0 15px rgba(34,197,94,0.6)" : "none",
                            transition: "all 0.2s ease"
                          }}>
                            {getInitials(member.name)}
                            {isSpeaking && (
                              <span style={{
                                position: "absolute", bottom: -2, right: -2,
                                background: "#22c55e", borderRadius: "50%", padding: 2,
                                display: "flex", alignItems: "center", justifyContent: "center"
                              }}>
                                <Volume2 size={10} color="white" />
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: 9, color: isSpeaking ? "#22c55e" : "#94a3b8", fontWeight: isSpeaking ? 700 : 500 }}>
                            {member.name.split(" ")[0]}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Speaker status text */}
                  <div style={{ height: 20 }}>
                    <p style={{ fontSize: 10, color: "#94a3b8", margin: 0 }}>
                      {Object.keys(speakingUsers).length > 0 
                        ? "🎙️ Someone is talking..." 
                        : "Listening (All quiet)..."}
                    </p>
                  </div>
 
                  {/* Call Controls: Mute Toggle and End Call */}
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 10 }}>
                    <button
                      onClick={toggleMute}
                      style={{
                        width: 44, height: 44, borderRadius: "50%",
                        background: activeGroupCall.isMuted ? "#ef4444" : "#334155",
                        color: "white", border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        transition: "all 0.2s ease"
                      }}
                      title={activeGroupCall.isMuted ? "Unmute Microphone" : "Mute Microphone"}
                    >
                      {activeGroupCall.isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                    
                    <button
                      onClick={leaveGroupCall}
                      style={{
                        width: 52, height: 52, borderRadius: "50%",
                        background: "#ef4444",
                        color: "white", border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 4px 15px rgba(239,68,68,0.4)",
                        transition: "all 0.2s ease"
                      }}
                      title="Leave Group Call"
                    >
                      <PhoneOff size={22} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{
                    padding: "8px 12px",
                    borderBottom: "1px solid #e4e4e7",
                    background: "#fafafa",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    overflowX: "auto",
                    scrollbarWidth: "none",
                    flexShrink: 0,
                  }}>
                    {/* Current User Toggle Avatar */}
                    <div 
                      onClick={() => {
                        const newStatus = userStatus === "online" ? "offline" : "online"
                        setUserStatus(newStatus)
                        localStorage.setItem("safawala_chat_status", newStatus)
                      }}
                      title={`You are ${userStatus}. Click to toggle status.`}
                      style={{
                        position: "relative",
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: getColor(currentUser?.role || "staff"),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 800,
                        color: "white",
                        cursor: "pointer",
                        flexShrink: 0,
                        border: "2px solid #ffffff",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      }}
                    >
                      {getInitials(currentUser?.name || "Me")}
                      <span style={{
                        position: "absolute",
                        bottom: -2,
                        right: -2,
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        background: userStatus === "online" ? "#22c55e" : "#ef4444",
                        border: "1.5px solid white",
                      }} />
                    </div>

                    {/* Status Toggle Button Label */}
                    <button 
                      onClick={() => {
                        const newStatus = userStatus === "online" ? "offline" : "online"
                        setUserStatus(newStatus)
                        localStorage.setItem("safawala_chat_status", newStatus)
                      }}
                      style={{
                        background: userStatus === "online" ? "#dcfce7" : "#fee2e2",
                        color: userStatus === "online" ? "#15803d" : "#b91c1c",
                        border: `1px solid ${userStatus === "online" ? "#bbf7d0" : "#fecaca"}`,
                        borderRadius: 12,
                        padding: "3px 8px",
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        transition: "all 0.2s ease",
                        flexShrink: 0,
                      }}
                    >
                      <span style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: userStatus === "online" ? "#22c55e" : "#ef4444",
                      }} />
                      {userStatus === "online" ? "Active" : "Offline"}
                    </button>

                    {/* Divider */}
                    <div style={{ width: 1, height: 18, background: "#e4e4e7", flexShrink: 0, margin: "0 2px" }} />

                    {/* Online avatars list */}
                    <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
                      {onlineUsers.length === 0 ? (
                        <span style={{ fontSize: 10, color: "#a1a1aa", alignSelf: "center", fontStyle: "italic", whiteSpace: "nowrap" }}>
                          No other members online
                        </span>
                      ) : (
                        onlineUsers.map(u => (
                          <div 
                            key={u.id}
                            title={`${u.name} (${u.role.replace("_", " ")}) - ${u.is_typing ? "Typing..." : "Online"}. Click to open private chat.`}
                            onClick={() => setPrivateChatUser(u)}
                            style={{
                              position: "relative",
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              background: getColor(u.role),
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 10,
                              fontWeight: 800,
                              color: "white",
                              cursor: "pointer",
                              flexShrink: 0,
                              border: "2px solid #ffffff",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                            }}
                          >
                            {getInitials(u.name)}
                            <span style={{
                              position: "absolute",
                              bottom: -2,
                              right: -2,
                              width: 9,
                              height: 9,
                              borderRadius: "50%",
                              background: "#22c55e",
                              border: "1.5px solid white",
                            }} />
                            {u.is_typing && (
                              <span style={{
                                position: "absolute",
                                top: -2,
                                left: -2,
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                background: "#a855f7",
                                border: "1.5px solid white",
                                fontSize: 7,
                                display: "flex",
                                alignItems: "center",
                                justifyItems: "center",
                                color: "white",
                                fontWeight: "bold",
                                animation: "pulse 1s infinite"
                              }}>✍️</span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Messages */}
                  <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", background: "#fafafa", display: "flex", flexDirection: "column", gap: 2 }}>
                    {needsSetup ? (
                      <div style={{ textAlign: "center", padding: "32px 16px", color: "#a1a1aa" }}>
                        <Users size={32} style={{ margin: "0 auto 8px", display: "block", opacity: 0.3 }} />
                        <p style={{ fontSize: 12, margin: 0 }}>Team chat needs one-time setup.</p>
                        <p style={{ fontSize: 11, margin: "4px 0 0", color: "#d4d4d8" }}>Ask your admin to run the SQL migration.</p>
                      </div>
                    ) : messages.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "32px 16px", color: "#a1a1aa" }}>
                        <Users size={32} style={{ margin: "0 auto 8px", display: "block", opacity: 0.3 }} />
                        <p style={{ fontSize: 12, margin: 0 }}>No messages yet. Say hello!</p>
                      </div>
                    ) : grouped.map(({ day, msgs }) => (
                      <div key={day}>
                        <div style={{ textAlign: "center", margin: "8px 0", fontSize: 10, color: "#a1a1aa", fontWeight: 600 }}>{day}</div>
                        {msgs.map((msg, i) => {
                          const isMe = msg.user_id === currentUser?.id || msg.user_name === currentUser?.name
                          const color = getColor(msg.user_role)
                          const showName = !isMe && (i === 0 || msgs[i - 1]?.user_name !== msg.user_name)
                          const isOnline = onlineUsers.some(u => u.id === msg.user_id || u.name === msg.user_name)
                          return (
                            <div key={msg.id} style={{ display: "flex", gap: 8, marginBottom: 4, flexDirection: isMe ? "row-reverse" : "row", alignItems: "flex-end" }}>
                              {!isMe && (
                                <div 
                                  onClick={() => setPrivateChatUser({ id: msg.user_id || "", name: msg.user_name, role: msg.user_role || "staff" })}
                                  title={`Chat with ${msg.user_name}`}
                                  style={{ position: "relative", flexShrink: 0, cursor: "pointer" }}
                                >
                                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "white" }}>
                                    {getInitials(msg.user_name)}
                                  </div>
                                  {isOnline && (
                                    <span style={{
                                      position: "absolute", bottom: -1, right: -1, width: 8, height: 8, borderRadius: "50%",
                                      background: "#22c55e", border: "1px solid white"
                                    }} />
                                  )}
                                </div>
                              )}
                              <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                                {showName && !isMe && (
                                  <span style={{ fontSize: 10, color, fontWeight: 700, marginBottom: 2, paddingLeft: 4 }}>{msg.user_name}</span>
                                )}
                                <div style={{
                                  background: isMe ? "#18181b" : "#ffffff",
                                  color: isMe ? "#ffffff" : "#18181b",
                                  borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                                  padding: "8px 12px", fontSize: 13, lineHeight: 1.4,
                                  border: isMe ? "none" : "1px solid #e4e4e7",
                                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                                }}>
                                  {renderMessageContent(msg)}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2, paddingLeft: 4 }}>
                                  <span style={{ fontSize: 9, color: "#a1a1aa" }}>{formatTime(msg.created_at)}</span>
                                  {isMe && (
                                    <span 
                                      title={msg.seen_by && msg.seen_by.length > 0 ? `Seen by: ${msg.seen_by.join(", ")}` : "Sent"}
                                      style={{ display: "flex", alignItems: "center" }}
                                    >
                                      {msg.seen_by && msg.seen_by.length > 0 ? (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 6L8.5 14.5L5 11M22 6L13.5 14.5M10 16L9 17L4 12" /></svg>
                                      ) : (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                    
                    {/* Typing Indicator */}
                    {onlineUsers.filter(u => u.is_typing).length > 0 && (
                      <div style={{ padding: "4px 12px", display: "flex", alignItems: "center", gap: 6, color: "#22c55e", fontSize: 11, fontWeight: 600 }}>
                        <span style={{ fontStyle: "italic" }}>
                          {onlineUsers.filter(u => u.is_typing).map(u => u.name).join(", ")}{" "}
                          {onlineUsers.filter(u => u.is_typing).length === 1 ? "is" : "are"} typing...
                        </span>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input area */}
                  <div style={{ padding: "10px 12px", borderTop: "1px solid #f4f4f5", background: "#ffffff", flexShrink: 0, position: "relative" }}>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept={fileAccept}
                      capture={fileCapture as any}
                      style={{ display: "none" }} 
                    />

                    {/* Mentions Autocomplete Popup */}
                    {mentionQuery !== null && allUsers.filter(u => u.name.toLowerCase().includes(mentionQuery.toLowerCase())).length > 0 && (
                      <div style={{
                        position: "absolute", bottom: 56, left: 12, right: 12,
                        background: "white", border: "1px solid #e4e4e7",
                        borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                        maxHeight: 140, overflowY: "auto", zIndex: 10000,
                        display: "flex", flexDirection: "column", padding: "4px 0",
                      }}>
                        {allUsers
                          .filter(u => u.name.toLowerCase().includes(mentionQuery.toLowerCase()))
                          .map(u => {
                            const isOnline = onlineUsers.some(ou => ou.id === u.id)
                            return (
                              <div
                                key={u.id}
                                onClick={() => insertMention(u.name)}
                                style={{
                                  padding: "8px 12px", fontSize: 12, cursor: "pointer",
                                  display: "flex", alignItems: "center", gap: 8,
                                  background: "none", color: "#18181b", transition: "background 0.2s"
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = "#f4f4f5"}
                                onMouseLeave={e => e.currentTarget.style.background = "none"}
                              >
                                <div style={{
                                  position: "relative",
                                  width: 20, height: 20, borderRadius: "50%",
                                  background: getColor(u.role), color: "white",
                                  display: "flex", alignItems: "center",
                                  fontSize: 8, fontWeight: "bold", justifyContent: "center"
                                }}>
                                  {getInitials(u.name)}
                                  {isOnline && (
                                    <span style={{
                                      position: "absolute", bottom: -1, right: -1, width: 6, height: 6,
                                      borderRadius: "50%", background: "#22c55e", border: "1px solid white"
                                    }} />
                                  )}
                                </div>
                                <span style={{ fontWeight: 600 }}>{u.name}</span>
                                <span style={{ fontSize: 9, color: "#a1a1aa", marginLeft: "auto" }}>{u.role.replace("_", " ")}</span>
                              </div>
                            )
                          })}
                      </div>
                    )}

                    {showEmojis && (
                      <div style={{
                        position: "absolute", bottom: 54, right: 10,
                        background: "white", border: "1px solid #e4e4e7",
                        borderRadius: 16, padding: "8px 10px", width: 260,
                        boxShadow: "0 8px 30px rgba(0,0,0,0.15)", zIndex: 10002,
                        display: "flex", flexDirection: "column", gap: 8
                      }}>
                        {/* Categories Tab Selector */}
                        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f4f4f5", paddingBottom: 6 }}>
                          {Object.keys(EMOJI_CATEGORIES).map(catKey => (
                            <button
                              key={catKey}
                              type="button"
                              onClick={() => setActiveEmojiTab(catKey)}
                              style={{
                                background: activeEmojiTab === catKey ? "#f4f4f5" : "none",
                                border: "none", borderRadius: 8, fontSize: 16, cursor: "pointer",
                                padding: "4px 8px", transition: "background 0.2s"
                              }}
                            >
                              {EMOJI_CATEGORIES[catKey].tab}
                            </button>
                          ))}
                        </div>

                        {/* Scrollable Emojis Grid */}
                        <div style={{
                          display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
                          gap: 4, maxHeight: 150, overflowY: "auto", paddingRight: 2
                        }}>
                          {EMOJI_CATEGORIES[activeEmojiTab].list.map(emoji => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                setInput(prev => prev + emoji)
                                inputRef.current?.focus()
                              }}
                              style={{
                                background: "none", border: "none", fontSize: 18,
                                cursor: "pointer", padding: 4, borderRadius: 6,
                                display: "flex", alignItems: "center", justifyContent: "center"
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = "#f4f4f5"}
                              onMouseLeave={e => e.currentTarget.style.background = "none"}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {isRecording && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "6px 12px", background: "#fee2e2", borderRadius: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", animation: "pulse 1s infinite" }} />
                        <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 600 }}>Recording... {recordingTime}s</span>
                        <button onClick={stopRecording} style={{ marginLeft: "auto", background: "#ef4444", color: "white", border: "none", borderRadius: 8, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>Stop & Send</button>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                      {/* Emoji Button */}
                      <button
                        onClick={() => setShowEmojis(!showEmojis)}
                        style={{
                          width: 34, height: 34, borderRadius: 10, border: "none",
                          background: "#f4f4f5", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 16, flexShrink: 0,
                        }}
                        title="Insert emoji"
                      >
                        😊
                      </button>

                      {/* Attachment Button */}
                      <button
                        onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                        style={{
                          width: 34, height: 34, borderRadius: 10, border: "none",
                          background: showAttachmentMenu ? "#e4e4e7" : "#f4f4f5", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 16, flexShrink: 0,
                        }}
                        title="Upload attachment"
                      >
                        📎
                      </button>

                      {/* WhatsApp Style Attachment Menu Options */}
                      {showAttachmentMenu && (
                        <div style={{
                          position: "absolute", bottom: 54, left: 12,
                          background: "#ffffff", border: "1px solid #e4e4e7",
                          borderRadius: 16, boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
                          padding: "6px 0", width: 180, zIndex: 10000,
                          display: "flex", flexDirection: "column",
                        }}>
                          <div 
                            onClick={() => {
                              setFileAccept(".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip")
                              setFileCapture(undefined)
                              setShowAttachmentMenu(false)
                              setTimeout(() => fileInputRef.current?.click(), 50)
                            }}
                            style={{ padding: "8px 14px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, color: "#18181b" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#f4f4f5"}
                            onMouseLeave={e => e.currentTarget.style.background = "none"}
                          >
                            <span>📄</span> <span style={{ fontWeight: 600 }}>Document</span>
                          </div>
                          <div 
                            onClick={() => {
                              setFileAccept("image/*")
                              setFileCapture("environment")
                              setShowAttachmentMenu(false)
                              setTimeout(() => fileInputRef.current?.click(), 50)
                            }}
                            style={{ padding: "8px 14px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, color: "#18181b" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#f4f4f5"}
                            onMouseLeave={e => e.currentTarget.style.background = "none"}
                          >
                            <span>📷</span> <span style={{ fontWeight: 600 }}>Camera</span>
                          </div>
                          <div 
                            onClick={() => {
                              setFileAccept("image/*,video/*")
                              setFileCapture(undefined)
                              setShowAttachmentMenu(false)
                              setTimeout(() => fileInputRef.current?.click(), 50)
                            }}
                            style={{ padding: "8px 14px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, color: "#18181b" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#f4f4f5"}
                            onMouseLeave={e => e.currentTarget.style.background = "none"}
                          >
                            <span>🖼️</span> <span style={{ fontWeight: 600 }}>Gallery (Photos & Videos)</span>
                          </div>
                          <div 
                            onClick={() => {
                              setFileAccept("audio/*")
                              setFileCapture(undefined)
                              setShowAttachmentMenu(false)
                              setTimeout(() => fileInputRef.current?.click(), 50)
                            }}
                            style={{ padding: "8px 14px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, color: "#18181b" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#f4f4f5"}
                            onMouseLeave={e => e.currentTarget.style.background = "none"}
                          >
                            <span>🎵</span> <span style={{ fontWeight: 600 }}>Audio / Music</span>
                          </div>
                          <div 
                            onClick={shareLocation}
                            style={{ padding: "8px 14px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, color: "#18181b" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#f4f4f5"}
                            onMouseLeave={e => e.currentTarget.style.background = "none"}
                          >
                            <span>📍</span> <span style={{ fontWeight: 600 }}>Location Live & current</span>
                          </div>
                          <div 
                            onClick={() => {
                              setShowAttachmentMenu(false)
                              setShowContactPicker(true)
                            }}
                            style={{ padding: "8px 14px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, color: "#18181b" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#f4f4f5"}
                            onMouseLeave={e => e.currentTarget.style.background = "none"}
                          >
                            <span>👤</span> <span style={{ fontWeight: 600 }}>Share Contact</span>
                          </div>
                        </div>
                      )}

                      {/* Contact Picker Modal Popup overlay */}
                      {showContactPicker && (
                        <div style={{
                          position: "absolute", bottom: 54, left: 12, right: 12,
                          background: "#ffffff", border: "1px solid #e4e4e7",
                          borderRadius: 16, boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
                          maxHeight: 180, overflowY: "auto", zIndex: 10001,
                          display: "flex", flexDirection: "column", padding: "6px 0"
                        }}>
                          <div style={{ padding: "8px 12px", borderBottom: "1px solid #f4f4f5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: "#71717a" }}>Select Contact to Share</span>
                            <button onClick={() => setShowContactPicker(false)} style={{ background: "none", border: "none", fontSize: 11, cursor: "pointer", fontWeight: 700, color: "#ef4444" }}>Close</button>
                          </div>
                          {allUsers.map(u => (
                            <div
                              key={u.id}
                              onClick={() => shareContact(u)}
                              style={{ padding: "8px 12px", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                              onMouseEnter={e => e.currentTarget.style.background = "#f4f4f5"}
                              onMouseLeave={e => e.currentTarget.style.background = "none"}
                            >
                              <div style={{ width: 20, height: 20, borderRadius: "50%", background: getColor(u.role), color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: "bold" }}>
                                {getInitials(u.name)}
                              </div>
                              <span style={{ fontWeight: 600 }}>{u.name}</span>
                              <span style={{ fontSize: 8, color: "#a1a1aa", marginLeft: "auto" }}>{u.role.replace("_", " ")}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Location Share Mode Picker Modal Popup overlay */}
                      {showLocationModal && (
                        <div style={{
                          position: "absolute", bottom: 54, left: 12, right: 12,
                          background: "#ffffff", border: "1px solid #e4e4e7",
                          borderRadius: 16, boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
                          padding: "12px", zIndex: 10002,
                          display: "flex", flexDirection: "column", gap: 10
                        }}>
                          {!showLiveDurationSelector ? (
                            <>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: 12, fontWeight: 800, color: "#18181b" }}>Share Location</span>
                                <button onClick={() => setShowLocationModal(false)} style={{ background: "none", border: "none", fontSize: 11, cursor: "pointer", fontWeight: 700, color: "#ef4444" }}>Cancel</button>
                              </div>
                              <button
                                onClick={() => sendLocationMessage("current")}
                                style={{
                                  background: "#f4f4f5", border: "1px solid #e4e4e7", borderRadius: 10,
                                  padding: "10px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                                  display: "flex", alignItems: "center", gap: 8, color: "#18181b", textAlign: "left"
                                }}
                              >
                                <span>📍</span>
                                <div>
                                  <div style={{ fontWeight: 800 }}>Send Current Location</div>
                                  <div style={{ fontSize: 10, color: "#71717a", fontWeight: 400 }}>Share a static spot on map</div>
                                </div>
                              </button>
                              <button
                                onClick={() => setShowLiveDurationSelector(true)}
                                style={{
                                  background: "#f4f4f5", border: "1px solid #e4e4e7", borderRadius: 10,
                                  padding: "10px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                                  display: "flex", alignItems: "center", gap: 8, color: "#18181b", textAlign: "left"
                                }}
                              >
                                <span>📡</span>
                                <div>
                                  <div style={{ fontWeight: 800 }}>Share Live Location</div>
                                  <div style={{ fontSize: 10, color: "#71717a", fontWeight: 400 }}>Updates real-time as you move</div>
                                </div>
                              </button>
                            </>
                          ) : (
                            <>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: 12, fontWeight: 800, color: "#18181b" }}>Select Live Duration</span>
                                <button onClick={() => setShowLiveDurationSelector(false)} style={{ background: "none", border: "none", fontSize: 11, cursor: "pointer", fontWeight: 700, color: "#71717a" }}>Back</button>
                              </div>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button
                                  onClick={() => sendLocationMessage("live", "15 Mins", 15 * 60 * 1000)}
                                  style={{ flex: 1, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: 10, padding: "8px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}
                                >
                                  15 Mins
                                </button>
                                <button
                                  onClick={() => sendLocationMessage("live", "1 Hour", 1 * 60 * 60 * 1000)}
                                  style={{ flex: 1, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: 10, padding: "8px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}
                                >
                                  1 Hour
                                </button>
                                <button
                                  onClick={() => sendLocationMessage("live", "24 Hours", 24 * 60 * 60 * 1000)}
                                  style={{ flex: 1, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: 10, padding: "8px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}
                                >
                                  24 Hours
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={e => {
                          const val = e.target.value
                          const cursor = e.target.selectionStart
                          setInput(val)
                          
                          const textBeforeCursor = val.slice(0, cursor)
                          const match = textBeforeCursor.match(/@(\w*)$/)
                          if (match) {
                            setMentionQuery(match[1])
                            setMentionIndex(cursor - match[1].length - 1)
                          } else {
                            setMentionQuery(null)
                          }
                        }}
                        onKeyDown={onKeyDown}
                        placeholder="Type a message... (Enter to send)"
                        rows={1}
                        style={{
                          flex: 1, borderRadius: 12, border: "1px solid #e4e4e7",
                          padding: "8px 12px", fontSize: 13, resize: "none",
                          fontFamily: "inherit", outline: "none", background: "#f4f4f5",
                          maxHeight: 80, lineHeight: 1.4, color: "#18181b",
                        }}
                      />
                      {/* AI Refine */}
                      {input.trim() && (
                        <button
                          onClick={refineWithAI}
                          disabled={refining}
                          title="Refine with AI"
                          style={{
                            width: 34, height: 34, borderRadius: 10, border: "1px solid #e4e4e7",
                            background: refining ? "#f4f4f5" : "#faf5ff", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#a855f7", flexShrink: 0,
                          }}
                        >
                          {refining ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        </button>
                      )}
                      {/* Voice */}
                      <button
                        onClick={isRecording ? stopRecording : startRecording}
                        title={isRecording ? "Stop recording" : "Voice message"}
                        style={{
                          width: 34, height: 34, borderRadius: 10, border: "none",
                          background: isRecording ? "#ef4444" : "#f4f4f5",
                          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                          color: isRecording ? "white" : "#71717a", flexShrink: 0,
                        }}
                      >
                        {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                      </button>
                      {/* Send */}
                      <button
                        onClick={() => sendMessage()}
                        disabled={sending || !input.trim()}
                        style={{
                          width: 34, height: 34, borderRadius: 10, border: "none",
                          background: input.trim() ? "#18181b" : "#f4f4f5",
                          cursor: input.trim() ? "pointer" : "default",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: input.trim() ? "white" : "#a1a1aa", flexShrink: 0,
                        }}
                      >
                        {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Private Chat Window Popup */}
      {privateChatUser && (
        <PrivateChatWindow 
          user={{
            ...privateChatUser,
            is_typing: onlineUsers.find(u => u.id === privateChatUser.id)?.is_typing
          }}
          currentUser={currentUser}
          onClose={() => setPrivateChatUser(null)}
          rightOffset={getRightPosition() + 360}
          winDragging={winDragging}
          winOffset={winOffset}
        />
      )}
    </>
  )
}

/* --- Read Receipts, Link highlighting, and Private Chat Sub-components --- */

function renderMessageText(text: string) {
  if (!text) return ""
  const censoredText = censorMessage(text)
  
  const turbanEmojis: Record<string, string> = {
    ":turban-smile:": "/emojis/turban_smile.png",
    ":turban-laugh:": "/emojis/turban_laugh.png",
    ":turban-love:": "/emojis/turban_love.png",
    ":turban-cool:": "/emojis/turban_cool.png",
  }

  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(?:com|net|org|co|in|info|io|xyz)[^\s]*)/gi
  const parts = censoredText.split(urlRegex)

  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      let href = part
      if (!/^https?:\/\//i.test(part)) {
        href = "https://" + part
      }
      return (
        <a 
          key={i} 
          href={href} 
          target="_blank" 
          rel="noopener noreferrer" 
          style={{ color: "#3b82f6", textDecoration: "underline", wordBreak: "break-all" }}
        >
          {part}
        </a>
      )
    }
    
    // Split by turban emoji markups to render inline images
    const emojiRegex = /(:turban-[a-z]+:)/g
    const subParts = part.split(emojiRegex)
    if (subParts.length > 1) {
      return subParts.map((sub, idx) => {
        if (turbanEmojis[sub]) {
          return (
            <img 
              key={`${i}-${idx}`}
              src={turbanEmojis[sub]} 
              alt={sub} 
              style={{ width: 22, height: 22, display: "inline-block", verticalAlign: "middle", margin: "0 2px" }} 
            />
          )
        }
        return sub
      })
    }
    return part
  })
}

function renderMessageContent(msg: ChatMessage) {
  if (msg.message_type === "voice" && msg.voice_url) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <audio src={msg.voice_url} controls style={{ height: 32, maxWidth: 180 }} />
        <a href={msg.voice_url} download target="_blank" rel="noopener noreferrer" style={{ fontSize: 9, color: "inherit", opacity: 0.7, textDecoration: "underline", alignSelf: "flex-end" }}>
          ⬇️ Download Voice
        </a>
      </div>
    )
  }
  if (msg.message_type === "image" && msg.file_url) {
    return (
      <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 4 }}>
        <img 
          src={msg.file_url} 
          alt="Attachment" 
          style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, cursor: "pointer" }} 
          onClick={() => window.open(msg.file_url, "_blank")}
        />
        {msg.message && <p style={{ margin: "4px 0 0", fontSize: 12 }}>{msg.message}</p>}
        <a href={msg.file_url} download target="_blank" rel="noopener noreferrer" style={{ fontSize: 9, color: "inherit", opacity: 0.7, textDecoration: "underline", alignSelf: "flex-end" }}>
          ⬇️ Download Image
        </a>
      </div>
    )
  }
  if (msg.message_type === "file" && msg.file_url) {
    return (
      <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 16 }}>📎</span>
          <a 
            href={msg.file_url} 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ textDecoration: "underline", color: "inherit", fontWeight: 600, wordBreak: "break-all" }}
          >
            {msg.message || "Download Attachment"}
          </a>
        </div>
        <a href={msg.file_url} download target="_blank" rel="noopener noreferrer" style={{ fontSize: 9, color: "inherit", opacity: 0.7, textDecoration: "underline", alignSelf: "flex-end" }}>
          ⬇️ Download File
        </a>
      </div>
    )
  }
  if (msg.message_type === "location" && msg.file_url) {
    let liveData: any = null
    try {
      if (msg.message.startsWith("{")) {
        liveData = JSON.parse(msg.message)
      }
    } catch {}

    if (liveData) {
      if (liveData.type === "ended") {
        return (
          <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 4, minWidth: 160 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 16 }}>📍</span>
              <span style={{ fontWeight: 700, fontSize: 12, color: "#6b7280" }}>Live Location (Ended)</span>
            </div>
          </div>
        )
      }
      
      const isExpired = new Date() > new Date(liveData.expires_at)
      if (isExpired) {
        return (
          <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 4, minWidth: 160 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 16 }}>📍</span>
              <span style={{ fontWeight: 700, fontSize: 12, color: "#6b7280" }}>Live Location (Expired)</span>
            </div>
          </div>
        )
      }

      const diffMins = Math.round((new Date(liveData.expires_at).getTime() - Date.now()) / 60000)

      return (
        <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 4, minWidth: 160 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 16, animation: "pulse 1.5s infinite" }}>📡</span>
            <span style={{ fontWeight: 700, fontSize: 12, color: "#16a34a" }}>Live Location (Active)</span>
          </div>
          <p style={{ margin: 0, fontSize: 9, opacity: 0.8 }}>
            Expires in {diffMins > 0 ? diffMins : 0} mins
          </p>
          <a 
            href={msg.file_url} 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{
              display: "inline-block", background: "#22c55e", color: "white",
              textDecoration: "none", borderRadius: 8, padding: "6px 12px",
              fontSize: 10, fontWeight: 700, textAlign: "center", textTransform: "uppercase"
            }}
          >
            Track Location
          </a>
          {liveData.sender_id === (window as any).__currentUserId && (
            <button
              onClick={() => {
                if ((window as any).__stopLiveLocation) {
                  (window as any).__stopLiveLocation(msg.id)
                }
              }}
              style={{
                background: "#ef4444", color: "white", border: "none",
                borderRadius: 8, padding: "4px 8px", fontSize: 9,
                fontWeight: 800, cursor: "pointer", textAlign: "center", textTransform: "uppercase",
                marginTop: 2
              }}
            >
              Stop Sharing
            </button>
          )}
        </div>
      )
    }

    return (
      <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 4, minWidth: 160 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 16 }}>📍</span>
          <span style={{ fontWeight: 700, fontSize: 12 }}>Shared Location</span>
        </div>
        <a 
          href={msg.file_url} 
          target="_blank" 
          rel="noopener noreferrer" 
          style={{
            display: "inline-block", background: "#22c55e", color: "white",
            textDecoration: "none", borderRadius: 8, padding: "6px 12px",
            fontSize: 10, fontWeight: 700, textAlign: "center", textTransform: "uppercase"
          }}
        >
          Open Google Maps
        </a>
      </div>
    )
  }
  if (msg.message_type === "contact" && msg.message) {
    let contactData = { name: "Unknown", role: "staff", id: "" }
    try {
      contactData = JSON.parse(msg.message)
    } catch {
      contactData.name = msg.message
    }
    return (
      <div style={{
        background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 12, padding: "8px 10px", minWidth: 160,
        display: "flex", flexDirection: "column", gap: 6, color: "inherit"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 14 }}>👤</span>
          <span style={{ fontWeight: 700, fontSize: 11 }}>Shared Contact</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 12, fontWeight: 800 }}>{contactData.name}</span>
          <span style={{ fontSize: 9, opacity: 0.7 }}>{contactData.role.replace("_", " ")}</span>
        </div>
        <button
          onClick={() => {
            if (typeof window !== "undefined" && (window as any).__setPrivateChatUser) {
              (window as any).__setPrivateChatUser({ id: contactData.id, name: contactData.name, role: contactData.role })
            }
          }}
          style={{
            background: "#22c55e", color: "white", border: "none",
            borderRadius: 8, padding: "4px 8px", fontSize: 9,
            fontWeight: 800, cursor: "pointer", textAlign: "center", textTransform: "uppercase"
          }}
        >
          Message User
        </button>
      </div>
    )
  }
  if (msg.message_type === "walkie_talkie_log") {
    let transmissions: any[] = []
    try {
      if (msg.voice_url) {
        transmissions = JSON.parse(msg.voice_url)
      }
    } catch {}

    return (
      <div style={{
        background: "#f0fdf4", border: "1px solid #bbf7d0",
        borderRadius: 12, padding: "10px", color: "#166534",
        maxWidth: 240, display: "flex", flexDirection: "column", gap: 6
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 16 }}>📻</span>
          <span style={{ fontWeight: 700, fontSize: 12 }}>Walkie-Talkie Session Log</span>
        </div>
        <p style={{ margin: 0, fontSize: 10, color: "#14532d" }}>
          {msg.message}
        </p>
        {transmissions.length > 0 && (
          <div style={{
            display: "flex", flexDirection: "column", gap: 4,
            maxHeight: 120, overflowY: "auto", background: "white",
            padding: 6, borderRadius: 8, border: "1px solid #dcfce7"
          }}>
            {transmissions.map((t, idx) => (
              <div 
                key={t.id || idx} 
                style={{ 
                  display: "flex", alignItems: "center", gap: 4, 
                  justifyContent: "space-between", fontSize: 9 
                }}
              >
                <span style={{ fontWeight: 600, color: "#166534", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100 }}>
                  {t.sender_name}:
                </span>
                <audio src={t.audio_url} controls style={{ height: 16, width: 80 }} />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
  return renderMessageText(msg.message)
}

function PrivateChatWindow({ 
  user, 
  currentUser, 
  onClose, 
  rightOffset, 
  winDragging, 
  winOffset 
}: { 
  user: any
  currentUser: any
  onClose: () => void
  rightOffset: number
  winDragging: boolean
  winOffset: { x: number; y: number }
}) {
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [showEmojis, setShowEmojis] = useState(false)
  const [activeEmojiTab, setActiveEmojiTab] = useState<string>("smileys")
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastSeenRef = useRef<string>("")
  const seenMessageIdsRef = useRef<Set<string>>(new Set())
  const lastTypingSentRef = useRef<number>(0)

  const fetchMessages = useCallback(async (since?: string) => {
    try {
      let url = `/api/team-chat?recipient_id=${user.id}`
      if (since) url += `&since=${encodeURIComponent(since)}`
      const res = await fetch(url)
      const json = await res.json()
      if (json.data) {
        if (since) {
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id))
            const newMsgs = json.data.filter((m: any) => !existingIds.has(m.id))
            if (newMsgs.length > 0) {
              const fromOthers = newMsgs.filter((m: any) => m.user_id !== currentUser?.id && m.user_name !== currentUser?.name)
              if (fromOthers.length > 0) {
                playNotificationSound()
                fromOthers.forEach((m: any) => {
                  showDesktopNotification(`Private: ${m.user_name}`, m.message_type === "text" ? m.message : `Sent a ${m.message_type}`)
                })
              }
            }
            return [...prev, ...newMsgs]
          })
        } else {
          setMessages(json.data)
        }
        if (json.data.length > 0) {
          lastSeenRef.current = json.data[json.data.length - 1].created_at
        }

        // Auto mark private messages as seen
        const unseenIds = json.data
          .filter((m: any) => m.user_id !== currentUser.id && m.user_name !== currentUser.name && !seenMessageIdsRef.current.has(m.id))
          .map((m: any) => m.id)

        if (unseenIds.length > 0) {
          unseenIds.forEach((id: string) => seenMessageIdsRef.current.add(id))
          await fetch("/api/team-chat/seen", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageIds: unseenIds })
          })
        }
      }
    } catch {}
  }, [user.id, currentUser.id])

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(() => {
      fetchMessages(lastSeenRef.current || undefined)
    }, 4000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  useEffect(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
  }, [messages])

  // Trigger typing in private chat
  useEffect(() => {
    if (!input.trim() || !currentUser?.id) return
    const now = Date.now()
    if (now - lastTypingSentRef.current < 2000) return
    lastTypingSentRef.current = now
    fetch("/api/team-chat/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "online", typing: true })
    }).catch(() => {})
  }, [input, currentUser])

  useEffect(() => {
    if (input.trim() === "" && lastTypingSentRef.current > 0 && currentUser?.id) {
      lastTypingSentRef.current = 0
      fetch("/api/team-chat/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "online", typing: false })
      }).catch(() => {})
    }
  }, [input, currentUser])

  const sendMessage = async () => {
    const msg = input.trim()
    if (!msg) return
    setSending(true)
    setInput("")
    try {
      const res = await fetch("/api/team-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          message_type: "text",
          recipient_id: user.id
        })
      })
      const json = await res.json()
      if (json.data) {
        setMessages(prev => [...prev, json.data])
      }
    } catch {} finally {
      setSending(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      alert("File size exceeds 2MB limit.")
      return
    }

    setSending(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const uploadRes = await fetch("/api/upload-simple", { method: "POST", body: fd })
      const uploadJson = await uploadRes.json()
      if (!uploadJson.success || !uploadJson.url) throw new Error(uploadJson.error || "Upload failed")

      const isImg = file.type.startsWith("image/")
      const res = await fetch("/api/team-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: file.name,
          message_type: isImg ? "image" : "file",
          file_url: uploadJson.url,
          recipient_id: user.id
        })
      })
      const json = await res.json()
      if (json.data) {
        setMessages(prev => [...prev, json.data])
      }
    } catch (err: any) {
      alert("Failed to upload: " + err.message)
    } finally {
      setSending(false)
    }
  }

  // Group messages by date
  const grouped: { day: string; msgs: any[] }[] = []
  messages.forEach(msg => {
    const day = formatDay(msg.created_at)
    const last = grouped[grouped.length - 1]
    if (last && last.day === day) last.msgs.push(msg)
    else grouped.push({ day, msgs: [msg] })
  })

  // Format initials
  const initials = user.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()

  return (
    <div style={{
      position: "fixed", bottom: 24, right: rightOffset, zIndex: 9999,
      width: 300, borderRadius: 20, height: 400,
      background: "#ffffff", boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
      border: "1px solid #e4e4e7",
      display: "flex", flexDirection: "column",
      fontFamily: "system-ui,-apple-system,sans-serif",
      overflow: "hidden",
      transition: winDragging ? "none" : "right 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      transform: `translate(${winOffset.x}px, ${winOffset.y}px)`,
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 14px", borderBottom: "1px solid #f4f4f5",
        background: "linear-gradient(135deg, #18181b, #27272a)",
        display: "flex", alignItems: "center", gap: 8,
        flexShrink: 0,
      }}>
        <div style={{
          position: "relative",
          width: 26, height: 26, borderRadius: "50%",
          background: getColor(user.role),
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, fontWeight: 800, color: "white", flexShrink: 0
        }}>
          {initials}
          <span style={{
            position: "absolute", bottom: -1, right: -1, width: 8, height: 8,
            borderRadius: "50%", background: "#22c55e", border: "1.5px solid white"
          }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {user.name}
          </p>
          <p style={{ margin: 0, fontSize: 9, color: "rgba(255,255,255,0.4)" }}>
            {user.is_typing ? "Typing..." : user.role.replace("_", " ")}
          </p>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", padding: 4 }}>
          <X size={14} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", background: "#fafafa", display: "flex", flexDirection: "column", gap: 2 }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 16px", color: "#a1a1aa", fontSize: 11 }}>
            No messages yet. Start your private chat!
          </div>
        ) : grouped.map(({ day, msgs }) => (
          <div key={day}>
            <div style={{ textAlign: "center", margin: "4px 0", fontSize: 9, color: "#a1a1aa", fontWeight: 600 }}>{day}</div>
            {msgs.map(msg => {
              const isMe = msg.user_id === currentUser?.id || msg.user_name === currentUser?.name
              return (
                <div key={msg.id} style={{ display: "flex", gap: 6, marginBottom: 4, flexDirection: isMe ? "row-reverse" : "row", alignItems: "flex-end" }}>
                  <div style={{ maxWidth: "80%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                    <div style={{
                      background: isMe ? "#18181b" : "#ffffff",
                      color: isMe ? "#ffffff" : "#18181b",
                      borderRadius: isMe ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                      padding: "6px 10px", fontSize: 12, lineHeight: 1.4,
                      border: isMe ? "none" : "1px solid #e4e4e7",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    }}>
                      {renderMessageContent(msg)}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 1 }}>
                      <span style={{ fontSize: 8, color: "#a1a1aa" }}>{formatTime(msg.created_at)}</span>
                      {isMe && (
                        <span 
                          title={msg.seen_by && msg.seen_by.length > 0 ? `Seen` : "Sent"}
                          style={{ display: "flex", alignItems: "center" }}
                        >
                          {msg.seen_by && msg.seen_by.length > 0 ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 6L8.5 14.5L5 11M22 6L13.5 14.5M10 16L9 17L4 12" /></svg>
                          ) : (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        {user.is_typing && (
          <div style={{ padding: "2px 4px", color: "#22c55e", fontSize: 10, fontStyle: "italic", fontWeight: 600 }}>
            typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "8px", borderTop: "1px solid #f4f4f5", background: "#ffffff", flexShrink: 0, position: "relative" }}>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          style={{ display: "none" }} 
        />
        
        {showEmojis && (
          <div style={{
            position: "absolute", bottom: 44, right: 6,
            background: "white", border: "1px solid #e4e4e7",
            borderRadius: 16, padding: "8px 10px", width: 250,
            boxShadow: "0 8px 30px rgba(0,0,0,0.15)", zIndex: 10002,
            display: "flex", flexDirection: "column", gap: 8
          }}>
            {/* Categories Tab Selector */}
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f4f4f5", paddingBottom: 6 }}>
              {Object.keys(EMOJI_CATEGORIES).map(catKey => (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => setActiveEmojiTab(catKey)}
                  style={{
                    background: activeEmojiTab === catKey ? "#f4f4f5" : "none",
                    border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer",
                    padding: "3px 6px", transition: "background 0.2s"
                  }}
                >
                  {EMOJI_CATEGORIES[catKey].tab}
                </button>
              ))}
            </div>

            {/* Scrollable Emojis Grid */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
              gap: 4, maxHeight: 120, overflowY: "auto", paddingRight: 2
            }}>
              {EMOJI_CATEGORIES[activeEmojiTab].list.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setInput(prev => prev + emoji)
                    inputRef.current?.focus()
                  }}
                  style={{
                    background: "none", border: "none", fontSize: 16,
                    cursor: "pointer", padding: 3, borderRadius: 6,
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f4f4f5"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 4, alignItems: "flex-end" }}>
          {/* Emojis */}
          <button
            onClick={() => setShowEmojis(!showEmojis)}
            style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "#f4f4f5", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}
            title="Emojis"
          >
            😊
          </button>
          
          {/* Attachments */}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "#f4f4f5", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}
            title="Upload File"
          >
            📎
          </button>

          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Message..."
            rows={1}
            style={{
              flex: 1, borderRadius: 8, border: "1px solid #e4e4e7",
              padding: "6px 10px", fontSize: 12, resize: "none",
              fontFamily: "inherit", outline: "none", background: "#f4f4f5",
              maxHeight: 60, lineHeight: 1.4, color: "#18181b",
            }}
          />
          
          <button
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            style={{
              width: 28, height: 28, borderRadius: 8, border: "none",
              background: input.trim() ? "#18181b" : "#f4f4f5",
              cursor: input.trim() ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: input.trim() ? "white" : "#a1a1aa", flexShrink: 0,
            }}
          >
            <Send size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
