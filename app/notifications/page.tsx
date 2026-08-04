"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { getCurrentUser } from "@/lib/auth"
import type { User } from "@/lib/types"
import { Calendar, Users, Package, DollarSign, Eye, Bell, Check, CheckCheck, ArrowLeft, RefreshCw, Archive, Trash2, AlertCircle, AlertTriangle, Info } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useNotifications } from "@/lib/hooks/use-notifications"
import { formatDistanceToNow } from "date-fns"

export default function NotificationsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  
  // Use the new notification hook
  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    archiveNotification,
    refreshNotifications
  } = useNotifications()

  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await getCurrentUser()
      if (currentUser) {
        setUser(currentUser)
      }
      setLoading(false)
    }
    fetchUser()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await refreshNotifications()
    setRefreshing(false)
    toast.success("Notifications refreshed")
  }

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId)
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
  }

  const handleArchive = async (notificationId: string) => {
    await archiveNotification(notificationId)
  }

  const handleDelete = async (notificationId: string) => {
    await deleteNotification(notificationId)
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "booking_created":
      case "booking_updated":
      case "booking_cancelled":
      case "booking_completed":
        return Calendar
      case "payment_received":
      case "payment_failed":
      case "payment_pending":
      case "payment_refunded":
        return DollarSign
      case "inventory_low_stock":
      case "inventory_out_of_stock":
      case "inventory_restocked":
        return Package
      case "customer_created":
      case "customer_updated":
        return Users
      case "task_assigned":
      case "task_completed":
      case "task_overdue":
        return Bell
      default:
        return Bell
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200"
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "low":
        return "bg-green-100 text-green-800 border-green-200"
      case "info":
        return "bg-blue-100 text-blue-800 border-blue-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "critical":
      case "high":
        return <AlertCircle className="h-4 w-4" />
      case "medium":
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  const formatTimeAgo = (date: Date | string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true })
  }

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === "all") return true
    if (filter === "unread") return !notification.is_read
    if (filter === "read") return notification.is_read
    return notification.type.includes(filter)
  })

  const getTypeCount = (typePrefix: string) => {
    return notifications.filter((n) => n.type.startsWith(typePrefix)).length
  }

  const readCount = notifications.filter((n) => n.is_read).length

  if (loading || notificationsLoading) {
    return (
      <DashboardLayout userRole={user?.role}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }
  return (
    <DashboardLayout userRole={user?.role}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
              <p className="text-muted-foreground">
                Stay updated with all your business activities
                {unreadCount > 0 && <Badge className="ml-2 bg-red-500">{unreadCount} unread</Badge>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Filter Notifications</CardTitle>
                <CardDescription>Filter by type or status</CardDescription>
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter notifications" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Notifications ({notifications.length})</SelectItem>
                  <SelectItem value="unread">Unread Only ({unreadCount})</SelectItem>
                  <SelectItem value="read">Read Only ({readCount})</SelectItem>
                  <SelectItem value="booking">
                    📅 Bookings ({getTypeCount("booking")})
                  </SelectItem>
                  <SelectItem value="payment">
                    💰 Payments ({getTypeCount("payment")})
                  </SelectItem>
                  <SelectItem value="inventory">
                    📦 Inventory ({getTypeCount("inventory")})
                  </SelectItem>
                  <SelectItem value="customer">
                    👤 Customers ({getTypeCount("customer")})
                  </SelectItem>
                  <SelectItem value="delivery">
                    🚚 Deliveries ({getTypeCount("delivery")})
                  </SelectItem>
                  <SelectItem value="task">
                    ✅ Tasks ({getTypeCount("task")})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
        </Card>

        {/* Notifications List */}
        <Card>
          <CardHeader>
            <CardTitle>
              {filter === "all"
                ? "All Notifications"
                : filter === "unread"
                  ? "Unread Notifications"
                  : filter === "read"
                    ? "Read Notifications"
                    : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Notifications`}
            </CardTitle>
            <CardDescription>
              {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((notification) => {
                  const NotificationIcon = getNotificationIcon(notification.type)
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 border rounded-lg transition-all hover:shadow-md ${
                        !notification.is_read ? "bg-blue-50 border-blue-200" : "bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <NotificationIcon className="h-6 w-6 text-blue-600 mt-1" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-sm">{notification.title}</h3>
                                <Badge className={getPriorityColor(notification.priority)}>
                                  {getPriorityIcon(notification.priority)}
                                  <span className="ml-1">{notification.priority}</span>
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {notification.type.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                              <p className="text-xs text-gray-400">{formatTimeAgo(notification.created_at)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {!notification.is_read && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleMarkAsRead(notification.id)}
                                  title="Mark as read"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                              {!notification.is_archived && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleArchive(notification.id)}
                                  title="Archive"
                                >
                                  <Archive className="h-4 w-4" />
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDelete(notification.id)}
                                title="Delete"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              {notification.action_url && (
                                <Link href={notification.action_url}>
                                  <Button variant="outline" size="sm">
                                    {notification.action_label || "View"}
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications found</h3>
                  <p className="text-gray-500">
                    {filter === "all"
                      ? "You're all caught up! No notifications to show."
                      : `No ${filter} notifications found.`}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
