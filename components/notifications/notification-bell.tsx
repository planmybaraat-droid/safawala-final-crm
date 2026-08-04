/**
 * Notification Bell Component
 * Shows notification count badge and dropdown list
 */

'use client'

import { useState } from 'react'
import { useNotifications, type Notification } from '@/lib/hooks/use-notifications'
import { Bell, Check, CheckCheck, X, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

export function NotificationBell() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, archiveNotification } = useNotifications()
  const [open, setOpen] = useState(false)

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }

    // Navigate if action URL exists
    if (notification.action_url) {
      window.location.href = notification.action_url
      setOpen(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'border-l-4 border-l-red-500 bg-red-50'
      case 'high':
        return 'border-l-4 border-l-orange-500 bg-orange-50'
      case 'medium':
        return 'border-l-4 border-l-blue-500 bg-blue-50'
      case 'low':
        return 'border-l-4 border-l-gray-400 bg-gray-50'
      default:
        return 'border-l-4 border-l-gray-300 bg-gray-50'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return '🚨'
      case 'high':
        return '🔴'
      case 'medium':
        return '🟡'
      case 'low':
        return '🔵'
      default:
        return '📢'
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] font-bold"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[420px] p-0"
        sideOffset={8}
      >
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-muted/40">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="rounded-full">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-7 text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>

          {/* Notification List */}
          <ScrollArea className="h-[480px]">
            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Bell className="h-12 w-12 text-muted-foreground/50" />
                  <p className="text-sm font-medium text-muted-foreground">
                    No notifications
                  </p>
                  <p className="text-xs text-muted-foreground">
                    You're all caught up!
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'p-4 hover:bg-muted/50 cursor-pointer transition-colors relative group',
                      !notification.is_read && 'bg-blue-50/50',
                      getPriorityColor(notification.priority)
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {/* Archive button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        archiveNotification(notification.id)
                      }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Archive notification"
                    >
                      <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </button>

                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className="text-2xl flex-shrink-0">
                        {getPriorityIcon(notification.priority)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-sm leading-tight">
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <div className="h-2 w-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground leading-snug">
                          {notification.message}
                        </p>
                        
                        {/* Metadata */}
                        {notification.metadata && Object.keys(notification.metadata).length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {notification.metadata.booking_number && (
                              <Badge variant="outline" className="text-xs">
                                #{notification.metadata.booking_number}
                              </Badge>
                            )}
                            {notification.metadata.amount && (
                              <Badge variant="outline" className="text-xs">
                                ₹{notification.metadata.amount}
                              </Badge>
                            )}
                            {notification.metadata.customer_name && (
                              <Badge variant="outline" className="text-xs">
                                {notification.metadata.customer_name}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true
                            })}
                          </span>
                          {notification.action_label && (
                            <span className="text-xs text-primary font-medium flex items-center gap-1">
                              {notification.action_label}
                              <ExternalLink className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t bg-muted/40">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  window.location.href = '/notifications'
                  setOpen(false)
                }}
              >
                View all notifications
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
