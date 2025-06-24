"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Shield,
  Monitor,
  Truck,
  Building,
  Users,
  AlertTriangle,
  Menu,
  LogOut,
  Settings,
  Bell,
  Search,
  HelpCircle,
  BarChart3,
  FileText,
  Database,
  Wifi,
  WifiOff,
  Battery,
  Clock,
  UserIcon,
} from "lucide-react"
import type { User as UserType, Notification } from "@/lib/types"
import { hasPermission, formatRelativeTime } from "@/lib/utils"

interface NavigationProps {
  user: UserType
}

interface NavigationItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles: string[]
  permissions?: { resource: string; action: string }
  badge?: number
  isNew?: boolean
}

export default function Navigation({ user }: NavigationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOnline, setIsOnline] = useState(true)
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Navigation Items mit Berechtigungen
  const navigationItems: NavigationItem[] = [
    {
      href: "/dashboard",
      label: "Alarmmonitor",
      icon: Monitor,
      roles: ["administrator", "dispatcher", "firefighter", "chief", "observer"],
    },
    {
      href: "/emergencies",
      label: "Einsätze",
      icon: AlertTriangle,
      roles: ["administrator", "dispatcher", "chief"],
      permissions: { resource: "emergencies", action: "read" },
    },
    {
      href: "/vehicles",
      label: "Fahrzeuge",
      icon: Truck,
      roles: ["administrator", "dispatcher", "chief"],
      permissions: { resource: "vehicles", action: "read" },
    },
    {
      href: "/stations",
      label: "Wachen",
      icon: Building,
      roles: ["administrator", "chief"],
      permissions: { resource: "stations", action: "read" },
    },
    {
      href: "/users",
      label: "Benutzer",
      icon: Users,
      roles: ["administrator"],
      permissions: { resource: "users", action: "read" },
    },
    {
      href: "/reports",
      label: "Berichte",
      icon: FileText,
      roles: ["administrator", "dispatcher", "chief"],
      permissions: { resource: "reports", action: "read" },
      isNew: true,
    },
    {
      href: "/statistics",
      label: "Statistiken",
      icon: BarChart3,
      roles: ["administrator", "chief"],
      permissions: { resource: "statistics", action: "read" },
    },
    {
      href: "/backup",
      label: "Datensicherung",
      icon: Database,
      roles: ["administrator"],
      permissions: { resource: "system", action: "backup" },
    },
  ]

  // Online/Offline Status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Battery Status
  useEffect(() => {
    if ("getBattery" in navigator) {
      ;(navigator as any)
        .getBattery()
        .then((battery: any) => {
          setBatteryLevel(Math.round(battery.level * 100))

          battery.addEventListener("levelchange", () => {
            setBatteryLevel(Math.round(battery.level * 100))
          })
        })
        .catch(() => {
          // Battery API nicht verfügbar
        })
    }
  }, [])

  // Aktuelle Zeit
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Benachrichtigungen laden
  useEffect(() => {
    const loadNotifications = () => {
      const savedNotifications = localStorage.getItem("notifications")
      if (savedNotifications) {
        try {
          const parsed = JSON.parse(savedNotifications)
          const userNotifications = parsed.filter((n: Notification) => !n.userId || n.userId === user.id)
          setNotifications(userNotifications)
          setUnreadCount(userNotifications.filter((n: Notification) => !n.read).length)
        } catch (error) {
          console.error("Fehler beim Laden der Benachrichtigungen:", error)
        }
      }
    }

    loadNotifications()

    // Storage Event Listener für Benachrichtigungen
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "notifications") {
        loadNotifications()
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [user.id])

  const handleLogout = () => {
    localStorage.removeItem("user")
    localStorage.removeItem("authToken")
    router.push("/")
  }

  const markNotificationAsRead = (notificationId: string) => {
    const updatedNotifications = notifications.map((n) =>
      n.id === notificationId ? { ...n, read: true, readAt: new Date().toISOString() } : n,
    )
    setNotifications(updatedNotifications)
    localStorage.setItem("notifications", JSON.stringify(updatedNotifications))
    setUnreadCount(updatedNotifications.filter((n) => !n.read).length)
  }

  const markAllNotificationsAsRead = () => {
    const updatedNotifications = notifications.map((n) => ({
      ...n,
      read: true,
      readAt: new Date().toISOString(),
    }))
    setNotifications(updatedNotifications)
    localStorage.setItem("notifications", JSON.stringify(updatedNotifications))
    setUnreadCount(0)
  }

  // Gefilterte Navigation Items basierend auf Berechtigungen
  const filteredItems = navigationItems.filter((item) => {
    // Rollen-Check
    if (!item.roles.includes(user.role)) return false

    // Berechtigungs-Check
    if (item.permissions) {
      return hasPermission(user, item.permissions.resource, item.permissions.action)
    }

    return true
  })

  const getUserInitials = (user: UserType) => {
    return `${user.firstName?.[0] || ""}${user.lastName?.[0] || user.username[0]}`.toUpperCase()
  }

  const getRoleLabel = (role: string) => {
    const labels = {
      administrator: "Administrator",
      dispatcher: "Disponent",
      firefighter: "Feuerwehrmann",
      chief: "Wehrführer",
      observer: "Beobachter",
    }
    return labels[role as keyof typeof labels] || role
  }

  const getRoleColor = (role: string) => {
    const colors = {
      administrator: "bg-red-100 text-red-800",
      dispatcher: "bg-blue-100 text-blue-800",
      firefighter: "bg-green-100 text-green-800",
      chief: "bg-purple-100 text-purple-800",
      observer: "bg-gray-100 text-gray-800",
    }
    return colors[role as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const NavItems = () => (
    <>
      {filteredItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href

        return (
          <TooltipProvider key={item.href}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors relative ${
                    isActive ? "bg-red-100 text-red-700" : "text-gray-600 hover:bg-gray-100"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {item.badge}
                    </Badge>
                  )}
                  {item.isNew && (
                    <Badge variant="secondary" className="text-xs">
                      Neu
                    </Badge>
                  )}
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>{item.label}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      })}
    </>
  )

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-red-600" />
            <div>
              <span className="text-xl font-bold text-gray-900">Feuerwehr Leitstelle</span>
              <div className="text-xs text-gray-500">Professional v1.0</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <NavItems />
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            {/* System Status */}
            <div className="hidden lg:flex items-center gap-2 text-sm text-gray-500">
              {isOnline ? <Wifi className="h-4 w-4 text-green-600" /> : <WifiOff className="h-4 w-4 text-red-600" />}
              {batteryLevel !== null && (
                <div className="flex items-center gap-1">
                  <Battery className="h-4 w-4" />
                  <span>{batteryLevel}%</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{currentTime.toLocaleTimeString()}</span>
              </div>
            </div>

            {/* Search */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="hidden md:flex">
                    <Search className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Suchen (Strg+K)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  Benachrichtigungen
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllNotificationsAsRead} className="text-xs">
                      Alle als gelesen markieren
                    </Button>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.slice(0, 10).map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className={`flex flex-col items-start p-3 cursor-pointer ${
                          !notification.read ? "bg-blue-50" : ""
                        }`}
                        onClick={() => markNotificationAsRead(notification.id)}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              notification.level === "error"
                                ? "bg-red-500"
                                : notification.level === "warning"
                                  ? "bg-yellow-500"
                                  : notification.level === "success"
                                    ? "bg-green-500"
                                    : "bg-blue-500"
                            }`}
                          />
                          <span className="font-medium text-sm">{notification.title}</span>
                          {!notification.read && <div className="w-2 h-2 bg-blue-600 rounded-full ml-auto" />}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                        <span className="text-xs text-gray-400 mt-1">{formatRelativeTime(notification.timestamp)}</span>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500 text-sm">Keine Benachrichtigungen</div>
                  )}
                </div>
                {notifications.length > 10 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/notifications" className="text-center">
                        Alle Benachrichtigungen anzeigen
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.profileImage || "/placeholder.svg"} alt={user.username} />
                    <AvatarFallback className="bg-red-100 text-red-700">{getUserInitials(user)}</AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-medium">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-xs text-gray-500">{getRoleLabel(user.role)}</div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                    <Badge className={getRoleColor(user.role)} variant="outline">
                      {getRoleLabel(user.role)}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    Profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Einstellungen
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/help" className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" />
                    Hilfe
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  Abmelden
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="md:hidden">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-2 mb-6">
                    <Shield className="h-6 w-6 text-red-600" />
                    <span className="font-bold">Feuerwehr Leitstelle</span>
                  </div>

                  {/* User Info Mobile */}
                  <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 rounded-lg">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.profileImage || "/placeholder.svg"} alt={user.username} />
                      <AvatarFallback className="bg-red-100 text-red-700">{getUserInitials(user)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{user.station}</p>
                      <Badge className={getRoleColor(user.role)} variant="outline" size="sm">
                        {getRoleLabel(user.role)}
                      </Badge>
                    </div>
                  </div>

                  {/* System Status Mobile */}
                  <div className="flex items-center justify-between mb-6 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      {isOnline ? (
                        <Wifi className="h-4 w-4 text-green-600" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm">{isOnline ? "Online" : "Offline"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {batteryLevel !== null && (
                        <>
                          <Battery className="h-4 w-4" />
                          <span className="text-sm">{batteryLevel}%</span>
                        </>
                      )}
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">{currentTime.toLocaleTimeString()}</span>
                    </div>
                  </div>

                  {/* Navigation Mobile */}
                  <div className="flex-1 space-y-2">
                    <NavItems />
                  </div>

                  {/* Mobile Actions */}
                  <div className="border-t pt-4 space-y-2">
                    <Button asChild variant="outline" className="w-full justify-start">
                      <Link href="/profile">
                        <UserIcon className="h-4 w-4 mr-2" />
                        Profil
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full justify-start">
                      <Link href="/settings">
                        <Settings className="h-4 w-4 mr-2" />
                        Einstellungen
                      </Link>
                    </Button>
                    <Button onClick={handleLogout} variant="outline" className="w-full justify-start text-red-600">
                      <LogOut className="h-4 w-4 mr-2" />
                      Abmelden
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  )
}
