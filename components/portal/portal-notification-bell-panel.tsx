"use client"

import { useNotifications, type Notification } from "@/lib/hooks/use-notifications"
import { PortalIcon } from "./portal-icons"

const PRIORITY_COLOR: Record<string, string> = {
  critical: "#dc2626",
  high: "#f97316",
  medium: "#a855f7",
  low: "#94a3b8",
  info: "#94a3b8",
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  return `${days}d ago`
}

/** Shared notification panel content — used by both the mobile floating bell and the desktop topnav bell. */
export function PortalNotificationBellPanel({ onClose }: { onClose: () => void }) {
  const {
    notifications, unreadCount, loading,
    markAsRead, markAllAsRead, archiveNotification,
    browserPermission, requestBrowserPermission,
  } = useNotifications()

  function handleClick(n: Notification) {
    if (!n.is_read) markAsRead(n.id)
    if (n.action_url) window.location.href = n.action_url
  }

  return (
    <div className="fixed inset-0 z-[90] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-auto" onClick={onClose}>
      <div
        className="bg-white rounded-t-[28px] sm:rounded-3xl w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h3 className="font-extrabold text-[15px]" style={{ color: "#1e1208" }}>Notifications</h3>
            {unreadCount > 0 && <p className="text-[11px] text-slate-400 mt-0.5">{unreadCount} unread</p>}
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button onClick={markAllAsRead} className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600">
                Mark all read
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-slate-400"><PortalIcon name="x" size={18} /></button>
          </div>
        </div>

        {browserPermission === "default" && (
          <button
            onClick={requestBrowserPermission}
            className="w-full text-left px-5 py-3 text-[11px] font-semibold flex items-center gap-2"
            style={{ background: "#F1EAF5", color: "#4A1F5E" }}
          >
            <PortalIcon name="bell" size={14} /> Turn on browser alerts so you don't miss a job — tap to allow
          </button>
        )}

        {loading ? (
          <div className="p-8 text-center text-[12px] text-slate-400">Loading…</div>
        ) : notifications.length === 0 ? (
          <div className="p-10 text-center">
            <div className="flex justify-center mb-3 text-slate-300"><PortalIcon name="bell" size={36} /></div>
            <p className="text-[13px] font-bold text-slate-500">You're all caught up</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className="px-5 py-3.5 flex gap-3 cursor-pointer active:bg-slate-50"
                style={{ background: n.is_read ? "white" : "#faf5ff" }}
              >
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: PRIORITY_COLOR[n.priority] || "#a855f7", opacity: n.is_read ? 0 : 1 }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-bold text-slate-800 leading-snug">{n.title}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); archiveNotification(n.id) }}
                      className="text-slate-300 hover:text-slate-500 flex-shrink-0"
                    >
                      <PortalIcon name="x" size={13} />
                    </button>
                  </div>
                  <p className="text-[12px] text-slate-500 mt-0.5 leading-snug">{n.message}</p>
                  <p className="text-[10px] mt-1" style={{ color: "rgba(80,55,30,0.4)" }}>{timeAgo(n.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
