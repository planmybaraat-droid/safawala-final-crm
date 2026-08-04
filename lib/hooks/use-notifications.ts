/**
 * Realtime Notifications Hook
 * Subscribes to notification updates and provides notification management
 */

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export interface Notification {
  id: string
  user_id: string
  franchise_id: string
  type: string
  title: string
  message: string
  priority: 'critical' | 'high' | 'medium' | 'low' | 'info'
  entity_type?: string
  entity_id?: string
  metadata?: Record<string, any>
  is_read: boolean
  is_archived: boolean
  read_at?: string
  action_url?: string
  action_label?: string
  created_at: string
  updated_at: string
}

interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  archiveNotification: (notificationId: string) => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
  refreshNotifications: () => Promise<void>
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  // Calculate unread count
  const unreadCount = notifications.filter((n) => !n.is_read && !n.is_archived).length

  // Fetch notifications
  const refreshNotifications = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userData.user.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      setNotifications(data || [])
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId)

      if (error) throw error

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
      toast.error('Failed to mark notification as read')
    }
  }, [])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userData.user.id)
        .eq('is_read', false)

      if (error) throw error

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          is_read: true,
          read_at: new Date().toISOString()
        }))
      )

      toast.success('All notifications marked as read')
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      toast.error('Failed to mark all notifications as read')
    }
  }, [])

  // Archive notification (soft delete)
  const archiveNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_archived: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId)

      if (error) throw error

      // Remove from local state
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))

      toast.success('Notification archived')
    } catch (error) {
      console.error('Error archiving notification:', error)
      toast.error('Failed to archive notification')
    }
  }, [])

  // Delete notification (hard delete)
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) throw error

      // Remove from local state
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))

      toast.success('Notification deleted')
    } catch (error) {
      console.error('Error deleting notification:', error)
      toast.error('Failed to delete notification')
    }
  }, [])

  // Subscribe to realtime notifications
  useEffect(() => {
    let mounted = true

    const setupRealtimeSubscription = async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user || !mounted) return

      // Initial fetch
      await refreshNotifications()

      // Subscribe to new notifications
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userData.user.id}`
          },
          (payload: any) => {
            console.log('New notification received:', payload.new)
            
            const newNotification = payload.new as Notification

            // Add to local state
            setNotifications((prev) => [newNotification, ...prev])

            // Show toast notification
            showToastNotification(newNotification)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userData.user.id}`
          },
          (payload: any) => {
            console.log('Notification updated:', payload.new)
            
            const updatedNotification = payload.new as Notification

            // Update local state
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === updatedNotification.id ? updatedNotification : n
              )
            )
          }
        )
        .subscribe()

      // Cleanup
      return () => {
        channel.unsubscribe()
      }
    }

    setupRealtimeSubscription()

    return () => {
      mounted = false
    }
  }, [refreshNotifications])

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    deleteNotification,
    refreshNotifications
  }
}

// Helper function to show toast notifications
function showToastNotification(notification: Notification) {
  const icon = getPriorityIcon(notification.priority)
  const duration = getPriorityDuration(notification.priority)

  toast(notification.title, {
    description: notification.message,
    duration,
    action: notification.action_url
      ? {
          label: notification.action_label || 'View',
          onClick: () => {
            window.location.href = notification.action_url!
          }
        }
      : undefined,
    icon
  })

  // Play sound for high/critical priority
  if (notification.priority === 'high' || notification.priority === 'critical') {
    playNotificationSound()
  }
}

function getPriorityIcon(priority: string): string {
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

function getPriorityDuration(priority: string): number {
  switch (priority) {
    case 'critical':
      return 10000 // 10 seconds
    case 'high':
      return 7000 // 7 seconds
    case 'medium':
      return 5000 // 5 seconds
    default:
      return 4000 // 4 seconds
  }
}

function playNotificationSound() {
  try {
    const audio = new Audio('/notification-sound.mp3')
    audio.volume = 0.3
    audio.play().catch((e) => console.log('Could not play notification sound:', e))
  } catch (error) {
    console.log('Audio playback not supported')
  }
}
