"use client"

import type * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import {
  Calendar,
  Users,
  Package,
  FileText,
  Settings,
  BarChart3,
  Truck,
  Shirt,
  Receipt,
  Building2,
  UserCheck,
  LogOut,
  ChevronUp,
  User2,
  Home,
  DollarSign,
  Clock,
  Store,
  Zap,
  Info,
  Layers,
  FileCheck,
  Archive,
  UserPlus,
  Plane,
  Stethoscope,
  ShieldCheck,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { signOut } from "@/lib/auth"
import Link from "next/link"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { UserPermissions } from "@/lib/types"
import { useI18n } from "@/lib/i18n-context"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userRole?: string
}

// Helper function to get initials from name
function getInitials(name: string): string {
  if (!name) return "U"
  const parts = name.trim().split(" ")
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const navigationItems = {
  main: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      permission: "dashboard",
      description: "Overview of your business metrics, recent activities, and key performance indicators",
    },
    {
      title: "Bookings",
      url: "/bookings",
      icon: Calendar,
      permission: "bookings",
      description: "Manage wedding bookings, event schedules, and customer appointments",
    },
    {
      title: "Quotes",
      url: "/quotes",
      icon: FileText,
      permission: "bookings",
      description: "Generate and manage customer quotes, accept and convert to bookings",
    },
    {
      title: "Customers",
      url: "/customers",
      icon: Users,
      permission: "customers",
      description: "Customer database with contact information, booking history, and preferences",
    },
    {
      title: "Inventory",
      url: "/inventory",
      icon: Package,
      permission: "inventory",
      description: "Track wedding accessories, manage stock levels, and monitor product availability",
    },
    {
      title: "Packages",
      url: "/sets",
      icon: Layers,
      permission: "packages",
      description:
        "Manage categories, variants, levels, and distance-based pricing",
    },
    {
      title: "Vendors",
      url: "/vendors",
      icon: Store,
      permission: "vendors",
      description: "Manage supplier relationships, vendor contacts, and procurement processes",
    },
    {
      title: "Tasks & Tickets",
      url: "/tasks",
      icon: FileCheck,
      permission: "dashboard",
      description: "Assign, update, and comment on peer-to-peer tasks and ticket issues",
    },
    {
      title: "Leads",
      url: "/leads",
      icon: UserPlus,
      permission: "customers",
      description: "Enquiries from your public packages page — track, call and convert leads",
    },
    {
      title: "HR",
      url: "/hr",
      icon: Stethoscope,
      permission: "staff",
      description: "Staff management, payroll, attendance, and HR letters",
    },
    {
      title: "Travels & Hotels",
      url: "/travels",
      icon: Plane,
      permission: "bookings",
      description: "Manage travel bookings, hotel stays, and event logistics for out-of-town events",
    },
  ],
  business: [
    {
      title: "New Booking",
      url: "/create-invoice",
      icon: FileText,
      permission: "bookings",
      description: "Create new booking with invoice, print, save as quote, or confirm order",
    },
    {
      title: "Challans",
      url: "/challans",
      icon: FileText,
      permission: "bookings",
      description: "Create, view, and print delivery/pickup challans with signatory options",
    },
    {
      title: "Vouchers",
      url: "/vouchers",
      icon: Receipt,
      permission: "bookings",
      description: "Create and print payment/receipt vouchers for expenses and customer payments",
    },
    {
      title: "Laundry",
      url: "/laundry",
      icon: Shirt,
      permission: "laundry",
      description: "Track laundry batches, vendor relationships, and cleaning schedules",
    },
    {
      title: "Expenses",
      url: "/expenses",
      icon: Receipt,
      permission: "expenses",
      description: "Record business expenses, categorize costs, and track spending patterns",
    },
    {
      title: "Deliveries & Returns",
      url: "/deliveries",
      icon: Truck,
      permission: "deliveries",
      description: "Manage delivery schedules, track shipments, coordinate logistics, and handle product returns",
    },
    {
      title: "Modifications",
      url: "/modifications",
      icon: Shirt,
      permission: "bookings",
      description: "Manage tailoring, stitching notes, and custom alterations for customer orders",
    },
    {
      title: "Product Archive",
      url: "/product-archive",
      icon: Archive,
      permission: "productArchive",
      description: "Manage lost, damaged, stolen, or discontinued products with detailed records",
    },
    {
      title: "Payroll",
      url: "/payroll",
      icon: DollarSign,
      permission: "payroll",
      description: "Process employee salaries, manage attendance, and handle payroll calculations",
    },
    {
      title: "Attendance",
      url: "/attendance",
      icon: Clock,
      permission: "attendance",
      description: "Track employee attendance, working hours, and leave management",
    },
  ],
  reports: [
    {
      title: "Reports",
      url: "/reports",
      icon: BarChart3,
      roles: ["super_admin", "franchise_admin"],
      permission: "reports",
      description: "Generate business reports, analytics, and performance insights",
    },
    // TODO: Temporarily hidden - Financials page
    // {
    //   title: "Financials",
    //   url: "/financials",
    //   icon: FileText,
    //   roles: ["super_admin", "franchise_admin"],
    //   permission: "financials",
    //   description: "Financial overview, revenue tracking, and profit/loss analysis",
    // },
  ],
  admin: [
    {
      title: "Franchises",
      url: "/franchises",
      icon: Building2,
      permission: "franchises",
      description: "Manage franchise locations, permissions, and organizational structure",
    },
    {
      title: "Staff",
      url: "/staff",
      icon: UserCheck,
      permission: "staff",
      description: "Employee management, role assignments, and staff administration",
    },
    {
      title: "Integrations",
      url: "/integrations",
      icon: Zap,
      permission: "integrations",
      description: "Connect third-party services, APIs, and external tools",
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
      permission: "settings",
      description: "System configuration, preferences, and application settings",
    },
  ],
}

export function AppSidebar({ userRole = "staff", ...props }: AppSidebarProps) {
  const router = useRouter()
  const { t } = useI18n()
  const pathname = usePathname()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [profilePhoto, setProfilePhoto] = useState<string>("")

  const getNavTitle = (title: string) => {
    const key = title.toLowerCase().replace(/[^a-z0-9]/g, "_")
    if (key === "new_booking") return t("create_invoice")
    return t(key)
  }

  // Load user data from localStorage
  useEffect(() => {
    try {
      const userStr = localStorage.getItem("safawala_user")
      if (userStr) {
        const user = JSON.parse(userStr)
        setCurrentUser(user)
      }
    } catch (error) {
      console.error("Failed to load user data:", error)
    }
  }, [])

  // Fetch profile photo - SIMPLIFIED VERSION
  useEffect(() => {
    if (!currentUser?.franchise_id) {
      console.log('[Sidebar] Waiting for franchise_id...')
      return
    }

    console.log('[Sidebar] Fetching profile for franchise:', currentUser.franchise_id)

    fetch(`/api/settings/profile?franchise_id=${currentUser.franchise_id}`)
      .then(res => res.json())
      .then(data => {
        console.log('[Sidebar] Full API Response:', JSON.stringify(data, null, 2))

        // Try to get profile_photo_url from different possible structures
        let photoUrl = null

        if (data.data) {
          if (Array.isArray(data.data) && data.data.length > 0) {
            photoUrl = data.data[0].profile_photo_url
            console.log('[Sidebar] Found in array[0]:', photoUrl)
          } else if (typeof data.data === 'object') {
            photoUrl = data.data.profile_photo_url
            console.log('[Sidebar] Found in object:', photoUrl)
          }
        }
        
        if (photoUrl) {
          console.log('[Sidebar] ✅ Setting profile photo:', photoUrl)
          setProfilePhoto(photoUrl)
        } else {
          console.log('[Sidebar] ❌ No profile_photo_url found in:', data)
        }
      })
      .catch(err => console.error('[Sidebar] Fetch error:', err))
  }, [currentUser?.franchise_id, pathname]) // Re-fetch when pathname changes

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  const filterItemsByRole = (items: any[]) => {
    // Filter items based on user permissions
    // Only show menu items where the permission is checked (true)
    // Super admin manages what each staff member can access
    
    // If no user permissions, show minimal items (dashboard + settings only)
    if (!currentUser?.permissions) {
      return items.filter((item) => {
        return item.permission === "dashboard" || item.permission === "settings"
      })
    }

    // Filter items based on permissions - only show if permission is true
    return items.filter((item) => {
      // If no permission field, skip this item
      if (!item.permission) {
        return false
      }
      
      // Check if this permission is enabled for the user
      const userPermissions = currentUser.permissions
      return userPermissions[item.permission] === true
    })
  }

  const isActiveItem = (url: string) => {
    return pathname === url || pathname.startsWith(url + "/")
  }

  // Get user display info
  const userName = currentUser?.name || "User"
  const userInitials = getInitials(userName)
  const userAvatar = profilePhoto || currentUser?.avatar_url || ""

  console.log('[Sidebar] Render - profilePhoto:', profilePhoto)
  console.log('[Sidebar] Render - userAvatar:', userAvatar)

  return (
    <TooltipProvider>
      <Sidebar variant="inset" collapsible="icon" className="heritage-sidebar" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                asChild
                isActive={isActiveItem("/dashboard")}
                className="heritage-sidebar-item"
              >
                <Link href="/dashboard" className="w-full">
                  <div className="flex w-full items-center justify-start py-4 pl-4">
                    <img 
                      src="/safawalalogo.png" 
                      alt="Safawala Logo" 
                      className="w-[80%] md:w-[85%] h-auto max-h-[45px] object-contain" 
                      style={{ 
                        imageRendering: "-webkit-optimize-contrast",
                        WebkitFontSmoothing: "antialiased",
                      }}
                    />
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-2">Main</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filterItemsByRole(navigationItems.main).map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActiveItem(item.url)}
                      tooltip={getNavTitle(item.title)}
                      className="heritage-sidebar-item"
                    >
                      <Link href={item.url} className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <item.icon />
                          <span>{getNavTitle(item.title)}</span>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <p className="text-sm">{item.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-2">Business</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filterItemsByRole(navigationItems.business).map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActiveItem(item.url)}
                      tooltip={getNavTitle(item.title)}
                      className="heritage-sidebar-item"
                    >
                      <Link href={item.url} className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <item.icon />
                          <span>{getNavTitle(item.title)}</span>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <p className="text-sm">{item.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-2">Analytics</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filterItemsByRole(navigationItems.reports).map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActiveItem(item.url)}
                      tooltip={getNavTitle(item.title)}
                      className="heritage-sidebar-item"
                    >
                      <Link href={item.url} className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <item.icon />
                          <span>{getNavTitle(item.title)}</span>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <p className="text-sm">{item.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {(userRole === "super_admin" || userRole === "franchise_admin") && (
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-2">Administration</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filterItemsByRole(navigationItems.admin).map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActiveItem(item.url)}
                        tooltip={item.title}
                        className="heritage-sidebar-item"
                      >
                        <Link href={item.url} className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <item.icon />
                            <span>{item.title}</span>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              <p className="text-sm">{item.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="heritage-sidebar-item data-[state=open]:bg-purple-900/20 data-[state=open]:text-purple-300"
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      {userAvatar && <AvatarImage src={userAvatar} alt={userName} />}
                      <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold text-white">{userName}</span>
                      <span className="truncate text-xs capitalize text-zinc-400">{userRole.replace("_", " ")}</span>
                    </div>
                    <ChevronUp className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="bottom"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuItem asChild>
                    <Link href="/settings?tab=profile">
                      <User2 className="mr-2 h-4 w-4" />
                      {t("settings")}
                    </Link>
                  </DropdownMenuItem>
                  {currentUser && ['super_admin', 'franchise_admin'].includes(currentUser.role) && (
                    <DropdownMenuItem asChild>
                      <Link href="/settings/2fa">
                        <ShieldCheck className="mr-2 h-4 w-4 text-green-600" />
                        Two-Factor Auth (2FA)
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    {t("logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </TooltipProvider>
  )
}
