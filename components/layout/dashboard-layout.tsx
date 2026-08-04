"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { AppSidebar } from "./app-sidebar"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { getCurrentUser, signOut } from "@/lib/auth"
import type { User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { LogOut, Plus, Bell, Lock } from "lucide-react"
import { LockDateDialog } from "@/components/lock-date/lock-date-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase"
import { CompanyHeader } from "./company-header"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { SafawalaAIAssistant } from "@/components/safawala-ai-assistant"
import { TeamChat } from "@/components/team-chat"
import { useSessionGuard } from "@/hooks/use-session-guard"

interface DashboardLayoutProps {
  children: React.ReactNode
  userRole?: string
}

export function DashboardLayout({ children, userRole }: DashboardLayoutProps) {
  useSessionGuard() // Single-device login enforcement
  const [user, setUser] = useState<User | null>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [profilePhoto, setProfilePhoto] = useState<string>("")
  const [showLockDate, setShowLockDate] = useState(false)
  const [lockedDates, setLockedDates] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Fetch fresh user data from API instead of localStorage
        const response = await fetch("/api/auth/user", {
          credentials: "include",
        })

        if (!response.ok) {
          router.push("/")
          return
        }

        const userData = await response.json()
        
        setUser(userData)
        await fetchNotifications(userData)
        await fetchProfilePhoto(userData)
      } catch {
        router.push("/")
      }
    }

    checkAuth()
  }, [router])

  const fetchNotifications = async (currentUser: User) => {
    try {
      const supabase = createClient()

      let query = supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(10)

      if (currentUser.role !== "super_admin" && currentUser.franchise_id) {
        query = query.eq("franchise_id", currentUser.franchise_id)
      }

      const { data, error } = await query

      if (error) {
        return
      }

      setNotifications(data || [])
    } catch {
      return
    }
  }

  const fetchProfilePhoto = async (currentUser: User) => {
    try {
      if (!currentUser.franchise_id || !currentUser.id) {
        return
      }

      const params = new URLSearchParams({
        franchise_id: currentUser.franchise_id,
        user_id: currentUser.id,
      })

      const response = await fetch(`/api/settings/profile?${params}`)
      
      if (response.ok) {
        const result = await response.json()
        if (result.data?.profile_photo_url) {
          setProfilePhoto(result.data.profile_photo_url)
        }
      }
    } catch {
      return
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  const unreadNotifications = notifications.filter((n) => !n.read).length

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#18181b]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-700 border-t-purple-500"></div>
      </div>
    )
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar userRole={user.role} />
      <SidebarInset>
        <header className="bg-[#18181b] border-b border-zinc-800 flex h-12 shrink-0 items-center justify-between px-3 sm:px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="p-1 h-8 w-8 sm:h-9 sm:w-9 text-zinc-300 hover:text-white hover:bg-zinc-700" />
            <CompanyHeader className="hidden sm:flex" />
            <div className="sm:hidden">
              <CompanyHeader className="text-sm" />
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Lock Date button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLockDate(true)}
              className="gap-1 text-xs px-2 text-green-400 border-zinc-700 bg-zinc-800 hover:bg-green-900/30 hover:text-green-300 hover:border-green-700"
              title="Lock a date"
            >
              <Lock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Lock Date</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 hover:text-white"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Create Order</span>
                  <span className="sm:hidden">Order</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Create New</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/create-invoice" className="cursor-pointer">
                    New Booking
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* New Notification Bell Component */}
            <NotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-full p-0 hover:bg-zinc-700">
                  <Avatar className="h-6 w-6 sm:h-8 sm:w-8">
                    {profilePhoto && <AvatarImage src={profilePhoto} alt={user.name} />}
                    <AvatarFallback className="text-xs sm:text-sm bg-primary text-primary-foreground">
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 max-w-[calc(100vw-1rem)] mr-2" align="end" forceMount>
                <DropdownMenuLabel className="font-normal p-4">
                  <div className="flex flex-col space-y-2">
                    <p className="text-sm font-medium leading-none truncate">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">{user.email}</p>
                    <Badge variant="secondary" className="w-fit text-xs capitalize">
                      {user.role.replace("_", " ")}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="p-3">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="bg-slate-50 flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 pb-20 md:pb-6">{children}</main>

        {/* Mobile bottom navigation */}
        <MobileBottomNav />
      </SidebarInset>

      {/* Lock Date Dialog */}
      <LockDateDialog
        open={showLockDate}
        onOpenChange={setShowLockDate}
        lockedDates={lockedDates}
        onLocked={(ld) => setLockedDates(prev => [...prev, ld])}
        onUnlocked={(id) => setLockedDates(prev => prev.filter(d => d.id !== id))}
      />
      {/* Safawala AI Floating Assistant - Only visible to Franchise Admin */}
      {user?.role === "franchise_admin" && <SafawalaAIAssistant />}
      {/* Team Chat Floating Assistant */}
      <TeamChat />
    </SidebarProvider>
  )
}

function MobileBottomNav() {
  const pathname = usePathname()
  const tabs = [
    { href: "/dashboard",   icon: "🏠", label: "Home" },
    { href: "/bookings",    icon: "📅", label: "Bookings" },
    { href: "/customers",   icon: "👥", label: "Customers" },
    { href: "/deliveries",  icon: "🚚", label: "Deliveries" },
    { href: "/create-invoice", icon: "➕", label: "New" },
  ]
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 flex items-center justify-around h-14 px-1 safe-b">
      {tabs.map(tab => {
        const isActive = pathname === tab.href || (tab.href !== "/dashboard" && tab.href !== "/create-invoice" && pathname.startsWith(tab.href))
        return (
          <a
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-[10px] font-medium transition-colors ${
              isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
          </a>
        )
      })}
    </nav>
  )
}
