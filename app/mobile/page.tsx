"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  Shield,
  Truck,
  AlertTriangle,
  LogOut,
  Smartphone,
  RefreshCw,
  Wifi,
  WifiOff,
  CheckCircle,
  Phone,
  Download,
  Bell,
  Vibrate,
  Settings,
  Battery,
  Signal,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  User,
} from "lucide-react"

// Interfaces
interface UserType {
  id: string
  username: string
  email: string
  role: "administrator" | "dispatcher" | "firefighter"
  station: string
  authorizedVehicles: string[]
  active: boolean
  lastLogin?: string
  deviceId?: string
}

interface Vehicle {
  id: string
  callSign: string
  speechCallSign?: string
  type: string
  station: string
  status: number
  location: string
  lastUpdate?: string
  crew?: string[]
}

interface Emergency {
  id: string
  title: string
  description: string
  location: string
  priority: "low" | "medium" | "high"
  status: "active" | "completed" | "cancelled"
  createdAt: string
  assignedVehicles: string[]
  coordinates: { lat: number; lng: number }
  estimatedDuration?: number
  actualDuration?: number
}

interface StatusLogEntry {
  id: string
  vehicleId: string
  vehicleCallSign: string
  oldStatus: number
  newStatus: number
  timestamp: string
  confirmed: boolean
  previousStatus?: number
  jSprechSent?: boolean
  userId?: string
  location?: { lat: number; lng: number }
}

interface AppSettings {
  soundEnabled: boolean
  vibrationEnabled: boolean
  autoSync: boolean
  syncInterval: number
  offlineMode: boolean
  debugMode: boolean
  theme: "light" | "dark" | "auto"
  language: "de" | "en"
}

// Konstanten
const STATUS_LABELS = {
  0: "Priorisierter Sprechwunsch",
  1: "Frei auf Funk",
  2: "Frei auf Wache",
  3: "Auf Einsatzfahrt",
  4: "Am Einsatzort",
  5: "Sprechwunsch",
  6: "Nicht Einsatzbereit",
  7: "Patienten Aufgenommen",
  8: "Am Krankenhaus",
  9: "Nicht Belegt",
} as const

const STATUS_COLORS = {
  0: "bg-red-600",
  1: "bg-green-500",
  2: "bg-green-600",
  3: "bg-blue-500",
  4: "bg-red-500",
  5: "bg-purple-500",
  6: "bg-gray-500",
  7: "bg-orange-500",
  8: "bg-cyan-500",
  9: "bg-gray-400",
} as const

const STATUS_SHORT_LABELS = {
  0: "PRIO SPRECH",
  1: "FREI FUNK",
  2: "FREI WACHE",
  3: "EINSATZFAHRT",
  4: "AM EINSATZORT",
  5: "SPRECHWUNSCH",
  6: "NICHT BEREIT",
  7: "PATIENT AUFGEN.",
  8: "AM KRANKENHAUS",
  9: "NICHT BELEGT",
} as const

const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  vibrationEnabled: true,
  autoSync: true,
  syncInterval: 5000,
  offlineMode: false,
  debugMode: false,
  theme: "auto",
  language: "de",
}

export default function ProfessionalMobilePage() {
  // State Management
  const [user, setUser] = useState<UserType | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [emergencies, setEmergencies] = useState<Emergency[]>([])
  const [statusLog, setStatusLog] = useState<StatusLogEntry[]>([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loginForm, setLoginForm] = useState({ username: "", password: "", rememberMe: false })
  const [loginError, setLoginError] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(true)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "error">("synced")
  const [syncProgress, setSyncProgress] = useState(0)
  const [currentDomain, setCurrentDomain] = useState("")
  const [jSprechRequests, setJSprechRequests] = useState<StatusLogEntry[]>([])
  const [processedJSprechIds, setProcessedJSprechIds] = useState<Set<string>>(new Set())
  const [isInstallable, setIsInstallable] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default")
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [showSettings, setShowSettings] = useState(false)
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)
  const [connectionType, setConnectionType] = useState<string>("unknown")
  const [deviceInfo, setDeviceInfo] = useState<any>({})
  const [isScreenLocked, setIsScreenLocked] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)

  // Refs
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const wakeLockRef = useRef<any>(null)

  // Device Information
  useEffect(() => {
    const getDeviceInfo = async () => {
      const info: any = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        hardwareConcurrency: navigator.hardwareConcurrency,
        maxTouchPoints: navigator.maxTouchPoints,
        deviceMemory: (navigator as any).deviceMemory,
        connection: (navigator as any).connection,
      }

      // Battery API
      if ("getBattery" in navigator) {
        try {
          const battery = await (navigator as any).getBattery()
          setBatteryLevel(Math.round(battery.level * 100))

          battery.addEventListener("levelchange", () => {
            setBatteryLevel(Math.round(battery.level * 100))
          })
        } catch (error) {
          console.log("Battery API not available")
        }
      }

      // Connection Info
      if ((navigator as any).connection) {
        const connection = (navigator as any).connection
        setConnectionType(connection.effectiveType || connection.type || "unknown")

        connection.addEventListener("change", () => {
          setConnectionType(connection.effectiveType || connection.type || "unknown")
        })
      }

      setDeviceInfo(info)
    }

    getDeviceInfo()
  }, [])

  // Geolocation
  useEffect(() => {
    if ("geolocation" in navigator && settings.autoSync) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          console.error("Geolocation error:", error)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        },
      )

      return () => navigator.geolocation.clearWatch(watchId)
    }
  }, [settings.autoSync])

  // Screen Wake Lock
  const requestWakeLock = async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen")
        console.log("Screen wake lock activated")
      }
    } catch (error) {
      console.error("Wake lock failed:", error)
    }
  }

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release()
      wakeLockRef.current = null
      console.log("Screen wake lock released")
    }
  }

  // PWA Installation
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstallable(false)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  // Service Worker Registration
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("SW registered: ", registration)

          // Check for updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  // New version available
                  if (confirm("Eine neue Version ist verfügbar. Jetzt aktualisieren?")) {
                    window.location.reload()
                  }
                }
              })
            }
          })
        })
        .catch((registrationError) => {
          console.log("SW registration failed: ", registrationError)
        })
    }
  }, [])

  // Settings Management
  useEffect(() => {
    const savedSettings = localStorage.getItem("app-settings")
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setSettings({ ...DEFAULT_SETTINGS, ...parsed })
      } catch (error) {
        console.error("Failed to parse settings:", error)
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("app-settings", JSON.stringify(settings))
  }, [settings])

  // Notification Permission
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission)
    }
  }, [])

  // Online/Offline Detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (settings.autoSync) {
        forceSync()
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      setSyncStatus("error")
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [settings.autoSync])

  // Auto Sync
  useEffect(() => {
    if (settings.autoSync && isLoggedIn && user && isOnline) {
      syncIntervalRef.current = setInterval(() => {
        syncData()
      }, settings.syncInterval)

      return () => {
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current)
        }
      }
    }
  }, [settings.autoSync, settings.syncInterval, isLoggedIn, user, isOnline])

  // Domain Info
  useEffect(() => {
    setCurrentDomain(window.location.origin)
  }, [])

  // Initial Data Load
  useEffect(() => {
    loadAllData()
    setIsLoading(false)

    // Storage Change Listener
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === "users" ||
        e.key === "vehicles" ||
        e.key === "emergencies" ||
        e.key === "stations" ||
        e.key === "statusLog"
      ) {
        console.log("🔄 MOBILE: localStorage geändert:", e.key)
        setSyncStatus("syncing")

        if (e.key === "statusLog" && selectedVehicle && e.newValue) {
          checkForNewJSprechRequests(e.newValue)
        }

        if (e.key === "vehicles" && selectedVehicle) {
          checkForVehicleStatusChange(e.newValue)
        }

        loadAllData()
        setLastSync(new Date())
        setTimeout(() => setSyncStatus("synced"), 1000)
      }
    }

    window.addEventListener("storage", handleStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [selectedVehicle, processedJSprechIds])

  // Functions
  const installPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === "accepted") {
        setIsInstallable(false)
      }
      setDeferredPrompt(null)
    }
  }

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)

      if (permission === "granted") {
        new Notification("🚨 Feuerwehr Mobile", {
          body: "Benachrichtigungen sind jetzt aktiviert!",
          icon: "/icon-192.png",
          badge: "/icon-192.png",
        })
      }
    }
  }

  const testVibration = () => {
    if ("vibrate" in navigator && settings.vibrationEnabled) {
      navigator.vibrate([200, 100, 200, 100, 200])
    }
  }

  const testSound = () => {
    if (settings.soundEnabled) {
      playAlertSound()
    }
  }

  const playAlertSound = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    const oscillator = audioContextRef.current.createOscillator()
    const gainNode = audioContextRef.current.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContextRef.current.destination)

    oscillator.frequency.setValueAtTime(800, audioContextRef.current.currentTime)
    oscillator.type = "sine"

    gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.3, audioContextRef.current.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.5)

    oscillator.start(audioContextRef.current.currentTime)
    oscillator.stop(audioContextRef.current.currentTime + 0.5)
  }

  const loadAllData = useCallback(() => {
    console.log("=== MOBILE APP: LADE ALLE DATEN ===")
    setSyncStatus("syncing")
    setSyncProgress(0)

    try {
      // Users laden
      const savedUsers = localStorage.getItem("users")
      setSyncProgress(25)

      if (savedUsers) {
        const users = JSON.parse(savedUsers)
        const firefighters = users.filter((u: UserType) => u.role === "firefighter" && u.active)
        console.log("Aktive Feuerwehrleute:", firefighters.length)
      }

      // Vehicles laden
      const savedVehicles = localStorage.getItem("vehicles")
      setSyncProgress(50)

      // Emergencies laden
      const savedEmergencies = localStorage.getItem("emergencies")
      setSyncProgress(75)

      // Status Log laden
      const savedStatusLog = localStorage.getItem("statusLog")
      if (savedStatusLog) {
        const logEntries = JSON.parse(savedStatusLog)
        setStatusLog(logEntries)
      }

      setSyncProgress(100)
      setSyncStatus("synced")
      setLastSync(new Date())
    } catch (error) {
      console.error("Fehler beim Laden der Daten:", error)
      setSyncStatus("error")
    }
  }, [])

  const syncData = useCallback(() => {
    if (!user || !isOnline) return

    setSyncStatus("syncing")

    try {
      // Fahrzeuge synchronisieren
      const savedVehicles = localStorage.getItem("vehicles")
      if (savedVehicles) {
        const allVehicles = JSON.parse(savedVehicles)
        const userStationVehicles = allVehicles.filter((v: Vehicle) => v.station === user.station)

        if (JSON.stringify(userStationVehicles) !== JSON.stringify(vehicles)) {
          setVehicles(userStationVehicles)
          setLastSync(new Date())

          if (selectedVehicle) {
            const updatedSelectedVehicle = userStationVehicles.find((v: Vehicle) => v.id === selectedVehicle.id)
            if (updatedSelectedVehicle) {
              setSelectedVehicle(updatedSelectedVehicle)
            } else {
              setSelectedVehicle(null)
            }
          }
        }
      }

      // Einsätze synchronisieren
      const savedEmergencies = localStorage.getItem("emergencies")
      if (savedEmergencies) {
        const allEmergencies = JSON.parse(savedEmergencies)
        const activeEmergencies = allEmergencies.filter((e: Emergency) => e.status === "active")

        if (JSON.stringify(activeEmergencies) !== JSON.stringify(emergencies)) {
          setEmergencies(activeEmergencies)
          setLastSync(new Date())
        }
      }

      setSyncStatus("synced")
    } catch (error) {
      console.error("Sync error:", error)
      setSyncStatus("error")
    }
  }, [user, isOnline, vehicles, emergencies, selectedVehicle])

  const forceSync = useCallback(() => {
    console.log("🔄 Erzwinge Synchronisation...")
    loadAllData()
    if (user) {
      syncData()
    }
  }, [loadAllData, syncData, user])

  const checkForNewJSprechRequests = (newStatusLogValue: string) => {
    if (!selectedVehicle) return

    try {
      const newStatusLog = JSON.parse(newStatusLogValue)
      const allJRequests = newStatusLog.filter(
        (entry: StatusLogEntry) =>
          entry.vehicleId === selectedVehicle.id &&
          (entry.newStatus === 0 || entry.newStatus === 5) &&
          entry.jSprechSent === true,
      )

      const newJRequests = allJRequests.filter((req: StatusLogEntry) => !processedJSprechIds.has(req.id))

      if (newJRequests.length > 0) {
        setProcessedJSprechIds((prev) => {
          const newSet = new Set(prev)
          newJRequests.forEach((req: StatusLogEntry) => newSet.add(req.id))
          return newSet
        })

        setJSprechRequests(newJRequests)

        // Native Benachrichtigung
        if (notificationPermission === "granted") {
          new Notification("📞 J-Sprechaufforderung", {
            body: `Leitstelle fordert Sprechkontakt für ${selectedVehicle.callSign}`,
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            vibrate: settings.vibrationEnabled ? [200, 100, 200, 100, 200] : [],
            requireInteraction: true,
            tag: "j-sprech-request",
          })
        }

        // Sound und Vibration
        if (settings.soundEnabled) {
          playAlertSound()
        }
        if (settings.vibrationEnabled && "vibrate" in navigator) {
          navigator.vibrate([200, 100, 200, 100, 200])
        }
      }
    } catch (error) {
      console.error("Fehler beim Prüfen der J-Sprechaufforderungen:", error)
    }
  }

  const checkForVehicleStatusChange = (newVehiclesValue: string | null) => {
    if (!newVehiclesValue || !selectedVehicle) return

    try {
      const newVehicles = JSON.parse(newVehiclesValue)
      const updatedVehicle = newVehicles.find((v: Vehicle) => v.id === selectedVehicle.id)

      if (updatedVehicle && updatedVehicle.status !== selectedVehicle.status) {
        setSelectedVehicle(updatedVehicle)
      }
    } catch (error) {
      console.error("Fehler beim Prüfen der Fahrzeugstatus-Änderung:", error)
    }
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError("")

    if (!loginForm.username) {
      setLoginError("Bitte geben Sie einen Benutzername ein.")
      return
    }

    const savedUsers = localStorage.getItem("users")
    if (!savedUsers) {
      setLoginError("❌ Keine Benutzer gefunden.")
      return
    }

    try {
      const users = JSON.parse(savedUsers)
      const foundUser = users.find((u: UserType) => u.username.toLowerCase() === loginForm.username.toLowerCase())

      if (!foundUser) {
        const availableUsers = users.filter((u: UserType) => u.role === "firefighter" && u.active)
        const userList = availableUsers.map((u: UserType) => u.username).join(", ")
        setLoginError(
          `Benutzername "${loginForm.username}" nicht gefunden. ${
            availableUsers.length > 0
              ? `Verfügbare Feuerwehrleute: ${userList}`
              : "Keine aktiven Feuerwehrleute verfügbar."
          }`,
        )
        return
      }

      if (!foundUser.active) {
        setLoginError("Ihr Benutzerkonto ist deaktiviert.")
        return
      }

      if (foundUser.role !== "firefighter") {
        setLoginError(`Nur Feuerwehrleute können die mobile App verwenden. Ihre Rolle: ${foundUser.role}`)
        return
      }

      // Login erfolgreich
      const updatedUser = {
        ...foundUser,
        lastLogin: new Date().toISOString(),
        deviceId: generateDeviceId(),
      }

      setUser(updatedUser)
      setIsLoggedIn(true)
      setLoginForm({ username: "", password: "", rememberMe: false })

      // Remember Me
      if (loginForm.rememberMe) {
        localStorage.setItem("remembered-user", updatedUser.username)
      }

      loadUserData(updatedUser)

      // Wake Lock aktivieren
      if (settings.autoSync) {
        requestWakeLock()
      }
    } catch (error) {
      console.error("Login error:", error)
      setLoginError("Fehler beim Verarbeiten der Anmeldedaten.")
    }
  }

  const generateDeviceId = () => {
    return `mobile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  const loadUserData = (currentUser: UserType) => {
    const savedVehicles = localStorage.getItem("vehicles")
    if (savedVehicles) {
      const allVehicles = JSON.parse(savedVehicles)
      const userStationVehicles = allVehicles.filter((v: Vehicle) => v.station === currentUser.station)
      setVehicles(userStationVehicles)
    }

    const savedEmergencies = localStorage.getItem("emergencies")
    if (savedEmergencies) {
      const allEmergencies = JSON.parse(savedEmergencies)
      const activeEmergencies = allEmergencies.filter((e: Emergency) => e.status === "active")
      setEmergencies(activeEmergencies)
    }
  }

  const handleLogout = () => {
    setUser(null)
    setIsLoggedIn(false)
    setSelectedVehicle(null)
    setVehicles([])
    setEmergencies([])
    setJSprechRequests([])
    setProcessedJSprechIds(new Set())

    // Wake Lock freigeben
    releaseWakeLock()

    // Remembered User löschen
    localStorage.removeItem("remembered-user")
  }

  const selectVehicle = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId)
    if (vehicle) {
      setSelectedVehicle(vehicle)
      setJSprechRequests([])

      const savedStatusLog = localStorage.getItem("statusLog")
      if (savedStatusLog) {
        try {
          const logEntries = JSON.parse(savedStatusLog)
          const existingJRequests = logEntries.filter(
            (entry: StatusLogEntry) =>
              entry.vehicleId === vehicle.id &&
              (entry.newStatus === 0 || entry.newStatus === 5) &&
              entry.jSprechSent === true,
          )

          const existingIds = existingJRequests.map((req: StatusLogEntry) => req.id)
          setProcessedJSprechIds(new Set(existingIds))
        } catch (error) {
          console.error("Fehler beim Laden der J-Sprechaufforderungen:", error)
        }
      } else {
        setProcessedJSprechIds(new Set())
      }
    }
  }

  const updateVehicleStatus = (newStatus: number) => {
    if (!selectedVehicle || !user) return

    const updatedVehicle = {
      ...selectedVehicle,
      status: newStatus,
      lastUpdate: new Date().toISOString(),
      crew: [user.username],
    }

    setSelectedVehicle(updatedVehicle)
    setVehicles((prev) => prev.map((v) => (v.id === selectedVehicle.id ? updatedVehicle : v)))

    // Status-Log Eintrag erstellen
    const statusEntry: StatusLogEntry = {
      id: Date.now().toString() + Math.random(),
      vehicleId: selectedVehicle.id,
      vehicleCallSign: selectedVehicle.callSign,
      oldStatus: selectedVehicle.status,
      newStatus: newStatus,
      timestamp: new Date().toISOString(),
      confirmed: false,
      userId: user.id,
      location: currentLocation || undefined,
    }

    setStatusLog((prev) => [statusEntry, ...prev])

    // localStorage aktualisieren
    const savedVehicles = localStorage.getItem("vehicles")
    if (savedVehicles) {
      const allVehicles = JSON.parse(savedVehicles)
      const updatedAllVehicles = allVehicles.map((v: Vehicle) => (v.id === selectedVehicle.id ? updatedVehicle : v))
      localStorage.setItem("vehicles", JSON.stringify(updatedAllVehicles))

      // Storage Event triggern
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "vehicles",
          newValue: JSON.stringify(updatedAllVehicles),
          oldValue: savedVehicles,
        }),
      )
    }

    // Feedback
    if (settings.vibrationEnabled && "vibrate" in navigator) {
      navigator.vibrate([50])
    }
    if (settings.soundEnabled) {
      playAlertSound()
    }
  }

  const dismissJSprechRequest = () => {
    const allCurrentIds = jSprechRequests.map((req) => req.id)
    setProcessedJSprechIds((prev) => {
      const newSet = new Set(prev)
      allCurrentIds.forEach((id) => newSet.add(id))
      return newSet
    })

    setJSprechRequests([])
  }

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }))
  }

  // Auto-Login mit Remember Me
  useEffect(() => {
    const rememberedUser = localStorage.getItem("remembered-user")
    if (rememberedUser && !isLoggedIn) {
      setLoginForm((prev) => ({ ...prev, username: rememberedUser, rememberMe: true }))
    }
  }, [isLoggedIn])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-red-600" />
          <p>Lade Anwendung...</p>
          <Progress value={syncProgress} className="w-48 mt-4" />
        </div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          {/* PWA Installation Banner */}
          {isInstallable && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Download className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">App installieren</p>
                      <p className="text-sm text-blue-700">Für bessere Performance</p>
                    </div>
                  </div>
                  <Button onClick={installPWA} size="sm" className="bg-blue-600 hover:bg-blue-700">
                    Installieren
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* System Status */}
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {isOnline ? (
                    <Wifi className="h-4 w-4 text-green-600" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-600" />
                  )}
                  <span>{isOnline ? "Online" : "Offline"}</span>
                  {connectionType !== "unknown" && <Badge variant="outline">{connectionType}</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  {batteryLevel !== null && (
                    <>
                      <Battery className="h-4 w-4" />
                      <span>{batteryLevel}%</span>
                    </>
                  )}
                  <Signal className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Smartphone className="h-12 w-12 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-red-600">Feuerwehr Mobile</CardTitle>
              <p className="text-gray-600 text-sm">{currentDomain}</p>
              {window.matchMedia("(display-mode: standalone)").matches && (
                <Badge variant="outline" className="mt-2">
                  📱 Als App installiert
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="username">Benutzername</Label>
                  <Input
                    id="username"
                    type="text"
                    value={loginForm.username}
                    onChange={(e) => setLoginForm((prev) => ({ ...prev, username: e.target.value }))}
                    placeholder="Benutzername"
                    required
                    autoComplete="username"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Passwort (optional)</Label>
                  <Input
                    id="password"
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="Passwort (optional für Mobile App)"
                    autoComplete="current-password"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={loginForm.rememberMe}
                    onChange={(e) => setLoginForm((prev) => ({ ...prev, rememberMe: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="rememberMe" className="text-sm">
                    Anmeldung merken
                  </Label>
                </div>
                {loginError && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{loginError}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full bg-red-600 hover:bg-red-700">
                  <User className="h-4 w-4 mr-2" />
                  Anmelden
                </Button>
              </form>

              {/* Native Features */}
              <div className="mt-6 space-y-3">
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">System-Features:</p>

                  {notificationPermission !== "granted" && (
                    <Button onClick={requestNotificationPermission} variant="outline" size="sm" className="w-full mb-2">
                      <Bell className="h-4 w-4 mr-2" />
                      Benachrichtigungen aktivieren
                    </Button>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={testVibration} variant="outline" size="sm">
                      <Vibrate className="h-4 w-4 mr-2" />
                      Vibration
                    </Button>
                    <Button onClick={testSound} variant="outline" size="sm">
                      <Volume2 className="h-4 w-4 mr-2" />
                      Sound
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-red-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6" />
            <div>
              <h1 className="font-bold">Feuerwehr Mobile</h1>
              <p className="text-sm opacity-90">{user?.station}</p>
              <div className="flex items-center gap-2 text-xs opacity-75">
                <span>{currentDomain}</span>
                {window.matchMedia("(display-mode: standalone)").matches && (
                  <Badge variant="secondary" className="text-xs">
                    📱 App
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Connection Status */}
            <div className="flex items-center gap-1">
              {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              {batteryLevel !== null && <span className="text-xs">{batteryLevel}%</span>}
            </div>

            {/* Sync Status */}
            <Badge
              variant={syncStatus === "synced" ? "secondary" : syncStatus === "syncing" ? "default" : "destructive"}
              className="text-xs"
            >
              {syncStatus === "synced" ? "✅" : syncStatus === "syncing" ? "🔄" : "❌"}
            </Badge>

            {/* Action Buttons */}
            <Button
              onClick={() => setShowSettings(!showSettings)}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-red-700"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button onClick={forceSync} variant="ghost" size="sm" className="text-white hover:bg-red-700">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={handleLogout} variant="ghost" size="sm" className="text-white hover:bg-red-700">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Sync Progress */}
        {syncStatus === "syncing" && (
          <div className="mt-2">
            <Progress value={syncProgress} className="h-1" />
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="m-4 bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Einstellungen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <span className="text-white text-sm">Sound</span>
                <Button
                  onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
                  variant="ghost"
                  size="sm"
                  className="text-white"
                >
                  {settings.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white text-sm">Vibration</span>
                <Button
                  onClick={() => updateSettings({ vibrationEnabled: !settings.vibrationEnabled })}
                  variant="ghost"
                  size="sm"
                  className="text-white"
                >
                  <Vibrate className={`h-4 w-4 ${settings.vibrationEnabled ? "text-green-400" : "text-gray-400"}`} />
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white text-sm">Auto-Sync</span>
                <Button
                  onClick={() => updateSettings({ autoSync: !settings.autoSync })}
                  variant="ghost"
                  size="sm"
                  className="text-white"
                >
                  <RefreshCw className={`h-4 w-4 ${settings.autoSync ? "text-green-400" : "text-gray-400"}`} />
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white text-sm">Screen Lock</span>
                <Button
                  onClick={() => {
                    if (isScreenLocked) {
                      releaseWakeLock()
                      setIsScreenLocked(false)
                    } else {
                      requestWakeLock()
                      setIsScreenLocked(true)
                    }
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-white"
                >
                  {isScreenLocked ? <Lock className="h-4 w-4 text-green-400" /> : <Unlock className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* System Info */}
            <div className="border-t border-gray-600 pt-4">
              <p className="text-white text-sm font-medium mb-2">System-Info:</p>
              <div className="text-xs text-gray-400 space-y-1">
                <div>
                  Benutzer: {user?.username} ({user?.role})
                </div>
                <div>Wache: {user?.station}</div>
                <div>Letzte Sync: {lastSync ? lastSync.toLocaleTimeString() : "Nie"}</div>
                <div>Verbindung: {connectionType}</div>
                {currentLocation && (
                  <div>
                    Position: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                  </div>
                )}
                <div>Benachrichtigungen: {notificationPermission}</div>
                <div>J-Sprech Anfragen: {jSprechRequests.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* J-Sprechaufforderungen Banner */}
      {jSprechRequests.length > 0 && (
        <div className="bg-yellow-500 text-black p-3 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 animate-bounce" />
              <div>
                <p className="font-bold">J-SPRECHAUFFORDERUNG</p>
                <p className="text-sm">Leitstelle fordert Sprechkontakt - {jSprechRequests.length} Anfrage(n)</p>
                <p className="text-xs">Letzte: {new Date(jSprechRequests[0].timestamp).toLocaleTimeString()}</p>
              </div>
            </div>
            <Button
              onClick={dismissJSprechRequest}
              variant="ghost"
              size="sm"
              className="text-black hover:bg-yellow-400"
            >
              <CheckCircle className="h-4 w-4" />
              Bestätigen
            </Button>
          </div>
        </div>
      )}

      <div className="p-4">
        {!selectedVehicle ? (
          // Fahrzeugauswahl
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Truck className="h-5 w-5" />
                Fahrzeug auswählen
                <Badge variant="outline" className="ml-auto border-gray-600 text-gray-300">
                  {vehicles.length} verfügbar
                </Badge>
              </CardTitle>
              <p className="text-sm text-gray-400">Wählen Sie das Fahrzeug aus, das Sie besetzen möchten</p>
              {lastSync && (
                <p className="text-xs text-gray-500">Letzte Aktualisierung: {lastSync.toLocaleTimeString()}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {vehicles.length > 0 ? (
                vehicles.map((vehicle) => (
                  <Button
                    key={vehicle.id}
                    onClick={() => selectVehicle(vehicle.id)}
                    variant="outline"
                    className="w-full justify-start h-auto p-4 bg-gray-700 border-gray-600 hover:bg-gray-600 text-white"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div
                        className={`w-4 h-4 rounded-full ${STATUS_COLORS[vehicle.status as keyof typeof STATUS_COLORS]}`}
                      />
                      <div className="text-left flex-1">
                        <div className="font-semibold">{vehicle.callSign}</div>
                        <div className="text-sm text-gray-300">{vehicle.type}</div>
                        <div className="text-xs text-gray-400">
                          Status {vehicle.status}: {STATUS_LABELS[vehicle.status as keyof typeof STATUS_LABELS]}
                        </div>
                        {vehicle.lastUpdate && (
                          <div className="text-xs text-gray-500">
                            Aktualisiert: {new Date(vehicle.lastUpdate).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </Button>
                ))
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Keine Fahrzeuge für Ihre Wache verfügbar</p>
                  <p className="text-xs mt-2">Wache: {user?.station}</p>
                  <Button onClick={forceSync} variant="outline" size="sm" className="mt-4">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Aktualisieren
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          // Hauptansicht mit Tabs
          <Tabs defaultValue="status" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 bg-gray-800 border-gray-700">
              <TabsTrigger value="status" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                Status
              </TabsTrigger>
              <TabsTrigger value="alarms" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                Alarme
              </TabsTrigger>
            </TabsList>

            <TabsContent value="status" className="space-y-4">
              {/* FMS-Style Display */}
              <Card className="bg-black border-2 border-gray-600">
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    {/* Fahrzeug-Display */}
                    <div className="text-6xl font-bold text-red-600">{selectedVehicle.status}</div>
                    <div className="text-sm text-gray-400">
                      {STATUS_LABELS[selectedVehicle.status as keyof typeof STATUS_LABELS]}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status Buttons */}
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((status) => (
                  <Button
                    key={status}
                    onClick={() => updateVehicleStatus(status)}
                    variant="secondary"
                    className={`h-14 flex flex-col justify-center items-center ${
                      selectedVehicle.status === status ? "bg-green-600 text-white" : "bg-gray-700 text-gray-300"
                    }`}
                  >
                    <span className="text-xs">{STATUS_SHORT_LABELS[status as keyof typeof STATUS_SHORT_LABELS]}</span>
                    <span className="text-xl font-bold">{status}</span>
                  </Button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="alarms">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Aktuelle Einsätze</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {emergencies.length > 0 ? (
                    emergencies.map((emergency) => (
                      <Card key={emergency.id} className="bg-gray-700 border-gray-600 text-white">
                        <CardHeader>
                          <CardTitle>{emergency.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm">{emergency.description}</p>
                          <p className="text-xs text-gray-400">
                            {emergency.location} - {emergency.priority}
                          </p>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center text-gray-400 py-8">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Keine aktiven Einsätze</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
