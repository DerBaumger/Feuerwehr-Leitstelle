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
  AlertTriangle,
  LogOut,
  Smartphone,
  RefreshCw,
  Wifi,
  WifiOff,
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
  const [isClient, setIsClient] = useState(false)

  // Refs
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const wakeLockRef = useRef<any>(null)

  // Client-side only flag
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Device Information
  useEffect(() => {
    if (!isClient) return

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
  }, [isClient])

  // Geolocation
  useEffect(() => {
    if (!isClient || !("geolocation" in navigator) || !settings.autoSync) return

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
  }, [settings.autoSync, isClient])

  // Screen Wake Lock
  const requestWakeLock = async () => {
    if (!isClient) return

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
    if (!isClient) return

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
  }, [isClient])

  // Service Worker Registration
  useEffect(() => {
    if (!isClient || !("serviceWorker" in navigator)) return

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
  }, [isClient])

  // Settings Management
  useEffect(() => {
    if (!isClient) return

    const savedSettings = localStorage.getItem("app-settings")
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setSettings({ ...DEFAULT_SETTINGS, ...parsed })
      } catch (error) {
        console.error("Failed to parse settings:", error)
      }
    }
  }, [isClient])

  useEffect(() => {
    if (!isClient) return
    localStorage.setItem("app-settings", JSON.stringify(settings))
  }, [settings, isClient])

  // Notification Permission
  useEffect(() => {
    if (!isClient || !("Notification" in window)) return
    setNotificationPermission(Notification.permission)
  }, [isClient])

  // Online/Offline Detection
  useEffect(() => {
    if (!isClient) return

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
  }, [settings.autoSync, isClient])

  // Auto Sync
  useEffect(() => {
    if (!isClient || !settings.autoSync || !isLoggedIn || !user || !isOnline) return

    syncIntervalRef.current = setInterval(() => {
      syncData()
    }, settings.syncInterval)

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
    }
  }, [settings.autoSync, settings.syncInterval, isLoggedIn, user, isOnline, isClient])

  // Domain Info
  useEffect(() => {
    if (!isClient) return
    setCurrentDomain(window.location.origin)
  }, [isClient])

  // Initial Data Load
  useEffect(() => {
    if (!isClient) return

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
  }, [selectedVehicle, processedJSprechIds, isClient])

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
    if (!isClient || !("Notification" in window)) return

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

  const testVibration = () => {
    if (!isClient || !("vibrate" in navigator) || !settings.vibrationEnabled) return
    navigator.vibrate([200, 100, 200, 100, 200])
  }

  const testSound = () => {
    if (settings.soundEnabled) {
      playAlertSound()
    }
  }

  const playAlertSound = () => {
    if (!isClient) return

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
    if (!isClient) return

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
  }, [isClient])

  const syncData = useCallback(() => {
    if (!isClient || !user || !isOnline) return

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
  }, [user, isOnline, vehicles, emergencies, selectedVehicle, isClient])

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
        if (isClient && notificationPermission === "granted") {
          new Notification("📞 J-Sprechaufforderung", {
            body: `Leitstelle fordert Sprechkontakt für ${selectedVehicle.callSign}`,
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            requireInteraction: true,
            tag: "j-sprech-request",
          })

          // Vibration separat handhaben
          if (settings.vibrationEnabled && "vibrate" in navigator) {
            navigator.vibrate([200, 100, 200, 100, 200])
          }
        }

        // Sound und Vibration
        if (settings.soundEnabled) {
          playAlertSound()
        }
        if (isClient && settings.vibrationEnabled && "vibrate" in navigator) {
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

    if (!isClient) return

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
    if (!isClient) return

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
    if (isClient) {
      localStorage.removeItem("remembered-user")
    }
  }

  const selectVehicle = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId)
    if (vehicle) {
      setSelectedVehicle(vehicle)
      setJSprechRequests([])

      if (!isClient) return

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
    if (!selectedVehicle || !user || !isClient) return

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
    if (!isClient || isLoggedIn) return

    const rememberedUser = localStorage.getItem("remembered-user")
    if (rememberedUser) {
      setLoginForm((prev) => ({ ...prev, username: rememberedUser, rememberMe: true }))
    }
  }, [isLoggedIn, isClient])

  // Render nothing on server-side
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-red-600" />
          <p>Lade Anwendung...</p>
        </div>
      </div>
    )
  }

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
        <Card className="m-4 bg-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-orange-600 animate-pulse" />
                <div>
                  <p className="font-medium text-orange-900">J-Sprechaufforderung</p>
                  <p className="text-sm text-orange-700">
                    Leitstelle fordert Sprechkontakt für {selectedVehicle?.callSign}
                  </p>
                </div>
              </div>
              <Button onClick={dismissJSprechRequest} size="sm" variant="outline">
                Verstanden
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {/* Vehicle Selection */}
        <Tabs defaultValue={selectedVehicle ? selectedVehicle.id : "none"} className="w-full">
          <TabsList className="bg-gray-800 text-gray-300 rounded-md">
            <TabsTrigger value="none" className="data-[state=active]:bg-gray-700">
              Übersicht
            </TabsTrigger>
            {vehicles.map((vehicle) => (
              <TabsTrigger
                key={vehicle.id}
                value={vehicle.id}
                className="data-[state=active]:bg-gray-700"
                onClick={() => selectVehicle(vehicle.id)}
              >
                {vehicle.callSign}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="none" className="pt-4">
            <Card className="bg-gray-800 border-gray-700 text-white">
              <CardHeader>
                <CardTitle>Fahrzeugübersicht</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-none space-y-2">
                  {vehicles.map((vehicle) => (
                    <li key={vehicle.id} className="flex items-center justify-between">
                      <span>{vehicle.callSign}</span>
                      <Badge className={STATUS_COLORS[vehicle.status as keyof typeof STATUS_COLORS]}>
                        {STATUS_SHORT_LABELS[vehicle.status as keyof typeof STATUS_SHORT_LABELS]}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {emergencies.length > 0 && (
              <Card className="bg-gray-800 border-gray-700 text-white mt-4">
                <CardHeader>
                  <CardTitle>Aktive Einsätze</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-none space-y-2">
                    {emergencies.map((emergency) => (
                      <li key={emergency.id} className="flex items-center justify-between">
                        <span>{emergency.title}</span>
                        <Badge variant="secondary">{emergency.priority}</Badge>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Vehicle Details */}
          {selectedVehicle && (
            <TabsContent value={selectedVehicle.id} className="pt-4">
              <Card className="bg-gray-800 border-gray-700 text-white">
                <CardHeader>
                  <CardTitle>{selectedVehicle.callSign}</CardTitle>
                  <p className="text-sm text-gray-400">{selectedVehicle.type}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Status</p>
                      <Badge className={STATUS_COLORS[selectedVehicle.status as keyof typeof STATUS_COLORS]}>
                        {STATUS_LABELS[selectedVehicle.status as keyof typeof STATUS_LABELS]}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Letzte Änderung</p>
                      <p className="text-right">
                        {selectedVehicle.lastUpdate ? new Date(selectedVehicle.lastUpdate).toLocaleTimeString() : "Nie"}
                      </p>
                    </div>
                  </div>

                  {/* Status Update Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 6].map((status) => (
                      <Button
                        key={status}
                        variant="secondary"
                        className="w-full"
                        onClick={() => updateVehicleStatus(status)}
                      >
                        {STATUS_SHORT_LABELS[status as keyof typeof STATUS_SHORT_LABELS]}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}
