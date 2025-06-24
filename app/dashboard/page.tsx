"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Truck,
  MapPin,
  Clock,
  AlertTriangle,
  Volume2,
  FileText,
  CheckCircle,
  Activity,
  Radio,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  RefreshCw,
  Download,
} from "lucide-react"
import Navigation from "@/components/navigation"
import { useRouter } from "next/navigation"
import type { User, Vehicle, Emergency, StatusLogEntry, Statistics, DashboardWidget } from "@/lib/types"
import { formatRelativeTime, hasPermission, storage, measurePerformance } from "@/lib/utils"

interface DashboardState {
  vehicles: Vehicle[]
  emergencies: Emergency[]
  statusLog: StatusLogEntry[]
  statistics: Statistics | null
  widgets: DashboardWidget[]
  isFullscreen: boolean
  autoRefresh: boolean
  refreshInterval: number
  soundEnabled: boolean
  showInactive: boolean
}

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

export default function ProfessionalDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [state, setState] = useState<DashboardState>({
    vehicles: [],
    emergencies: [],
    statusLog: [],
    statistics: null,
    widgets: [],
    isFullscreen: false,
    autoRefresh: true,
    refreshInterval: 5000,
    soundEnabled: true,
    showInactive: false,
  })

  const audioContextRef = useRef<AudioContext | null>(null)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastUpdateRef = useRef<Date>(new Date())

  // Audio Context initialisieren
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  // Benutzer-Authentifizierung
  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/")
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      loadDashboardData(parsedUser)
    } catch (error) {
      console.error("Fehler beim Laden der Benutzerdaten:", error)
      router.push("/")
    }
  }, [router])

  // Auto-Refresh
  useEffect(() => {
    if (state.autoRefresh && user) {
      refreshIntervalRef.current = setInterval(() => {
        loadDashboardData(user)
      }, state.refreshInterval)

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current)
        }
      }
    }
  }, [state.autoRefresh, state.refreshInterval, user])

  // Storage Event Listener
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "vehicles" || e.key === "emergencies" || e.key === "statusLog" || e.key === "stations") {
        if (user) {
          loadDashboardData(user)
        }
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [user])

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "r":
            e.preventDefault()
            if (user) loadDashboardData(user)
            break
          case "f":
            e.preventDefault()
            toggleFullscreen()
            break
          case "m":
            e.preventDefault()
            toggleSound()
            break
        }
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [user])

  const loadDashboardData = useCallback((currentUser: User) => {
    measurePerformance("Dashboard Data Load", () => {
      try {
        // Fahrzeuge laden
        const savedVehicles = storage.get<Vehicle[]>("vehicles", [])
        let userVehicles = savedVehicles

        // Für Feuerwehrleute nur Fahrzeuge der eigenen Wache
        if (currentUser.role === "firefighter") {
          userVehicles = savedVehicles.filter((v) => v.station === currentUser.station)
        }

        // Einsätze laden
        const savedEmergencies = storage.get<Emergency[]>("emergencies", [])
        const activeEmergencies = savedEmergencies.filter((e) => e.status === "active")

        // Status-Log laden
        const savedStatusLog = storage.get<StatusLogEntry[]>("statusLog", [])
        let userStatusLog = savedStatusLog

        // Für Feuerwehrleute nur Status-Log der eigenen Wache
        if (currentUser.role === "firefighter") {
          const userVehicleIds = userVehicles.map((v) => v.id)
          userStatusLog = savedStatusLog.filter((entry) => userVehicleIds.includes(entry.vehicleId))
        }

        // Statistiken berechnen
        const statistics = calculateStatistics(userVehicles, activeEmergencies, userStatusLog)

        setState((prev) => ({
          ...prev,
          vehicles: userVehicles,
          emergencies: activeEmergencies,
          statusLog: userStatusLog.slice(0, 50), // Nur die letzten 50 Einträge
          statistics,
        }))

        lastUpdateRef.current = new Date()
      } catch (error) {
        console.error("Fehler beim Laden der Dashboard-Daten:", error)
      }
    })
  }, [])

  const calculateStatistics = (
    vehicles: Vehicle[],
    emergencies: Emergency[],
    statusLog: StatusLogEntry[],
  ): Statistics => {
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Fahrzeug-Statistiken
    const vehicleStats = {
      total: vehicles.length,
      available: vehicles.filter((v) => v.status === 2 && v.isOperational).length,
      inUse: vehicles.filter((v) => [3, 4, 7, 8].includes(v.status)).length,
      outOfService: vehicles.filter((v) => !v.isOperational || v.status === 6).length,
      byType: vehicles.reduce(
        (acc, v) => {
          acc[v.type.name] = (acc[v.type.name] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ),
    }

    // Einsatz-Statistiken
    const emergencyStats = {
      total: emergencies.length,
      byPriority: emergencies.reduce(
        (acc, e) => {
          acc[e.priority] = (acc[e.priority] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ),
      byCategory: emergencies.reduce(
        (acc, e) => {
          acc[e.category.name] = (acc[e.category.name] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ),
      byStatus: emergencies.reduce(
        (acc, e) => {
          acc[e.status] = (acc[e.status] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ),
      averageResponseTime: 0, // TODO: Berechnen basierend auf historischen Daten
      averageDuration: 0, // TODO: Berechnen basierend auf historischen Daten
    }

    return {
      period: {
        start: last24h.toISOString(),
        end: now.toISOString(),
      },
      emergencies: emergencyStats,
      vehicles: vehicleStats,
      personnel: {
        total: 0, // TODO: Aus Benutzerdaten berechnen
        onDuty: 0,
        available: 0,
        inTraining: 0,
      },
      performance: {
        responseTimeCompliance: 95, // TODO: Echte Berechnung
        equipmentReadiness: Math.round((vehicleStats.available / vehicleStats.total) * 100),
        personnelReadiness: 90, // TODO: Echte Berechnung
      },
    }
  }

  const createGongTone = (frequency: number, duration: number, volume = 0.3) => {
    if (!audioContextRef.current || !state.soundEnabled) return

    const oscillator = audioContextRef.current.createOscillator()
    const gainNode = audioContextRef.current.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContextRef.current.destination)

    oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime)
    oscillator.type = "sine"

    gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime)
    gainNode.gain.linearRampToValueAtTime(volume, audioContextRef.current.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration)

    oscillator.start(audioContextRef.current.currentTime)
    oscillator.stop(audioContextRef.current.currentTime + duration)
  }

  const playAlarmGong = async () => {
    if (!state.soundEnabled) return

    return new Promise<void>((resolve) => {
      if (!audioContextRef.current) {
        resolve()
        return
      }

      // Alarmgong-Sequenz
      createGongTone(400, 0.8, 0.4)
      setTimeout(() => createGongTone(600, 0.6, 0.4), 200)
      setTimeout(() => createGongTone(800, 0.4, 0.4), 400)

      setTimeout(() => resolve(), 1200)
    })
  }

  const speakAlert = async (text: string, withAlarmGong = false) => {
    if ("speechSynthesis" in window) {
      if (withAlarmGong) {
        await playAlarmGong()
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = "de-DE"
      utterance.rate = 0.7
      utterance.pitch = 1.0
      utterance.volume = 0.9

      const voices = speechSynthesis.getVoices()
      const germanVoice = voices.find((voice) => voice.lang.startsWith("de"))
      if (germanVoice) {
        utterance.voice = germanVoice
      }

      speechSynthesis.speak(utterance)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setState((prev) => ({ ...prev, isFullscreen: true }))
    } else {
      document.exitFullscreen()
      setState((prev) => ({ ...prev, isFullscreen: false }))
    }
  }

  const toggleSound = () => {
    setState((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }))
  }

  const toggleAutoRefresh = () => {
    setState((prev) => ({ ...prev, autoRefresh: !prev.autoRefresh }))
  }

  const exportData = () => {
    const exportData = {
      vehicles: state.vehicles,
      emergencies: state.emergencies,
      statusLog: state.statusLog,
      statistics: state.statistics,
      timestamp: new Date().toISOString(),
      user: user?.username,
    }

    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `dashboard-export-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const getVehiclesByStatus = () => {
    const statusGroups = state.vehicles.reduce(
      (acc, vehicle) => {
        if (!acc[vehicle.status]) {
          acc[vehicle.status] = []
        }
        acc[vehicle.status].push(vehicle)
        return acc
      },
      {} as Record<number, Vehicle[]>,
    )

    return statusGroups
  }

  const getActiveEmergenciesWithVehicles = () => {
    return state.emergencies.map((emergency) => ({
      ...emergency,
      assignedVehicleDetails: state.vehicles.filter((v) => emergency.assignedVehicles.includes(v.id)),
    }))
  }

  const getRecentStatusChanges = () => {
    return state.statusLog
      .filter((entry) => {
        const entryTime = new Date(entry.timestamp)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
        return entryTime > oneHourAgo
      })
      .slice(0, 10)
  }

  if (!user) return null

  const vehiclesByStatus = getVehiclesByStatus()
  const emergenciesWithVehicles = getActiveEmergenciesWithVehicles()
  const recentStatusChanges = getRecentStatusChanges()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />

      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Alarmmonitor</h1>
            <p className="text-gray-600">
              Aktuelle Einsätze und Fahrzeugstatus
              {user.role === "firefighter" && (
                <span className="text-sm text-blue-600 ml-2">(Wache: {user.station})</span>
              )}
            </p>
            <p className="text-xs text-gray-500">Letzte Aktualisierung: {formatRelativeTime(lastUpdateRef.current)}</p>
          </div>

          {/* Dashboard Controls */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setState((prev) => ({ ...prev, showInactive: !prev.showInactive }))}
              variant="outline"
              size="sm"
            >
              {state.showInactive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>

            <Button onClick={toggleSound} variant="outline" size="sm">
              <Volume2 className={`h-4 w-4 ${state.soundEnabled ? "text-green-600" : "text-gray-400"}`} />
            </Button>

            <Button onClick={toggleAutoRefresh} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 ${state.autoRefresh ? "text-green-600 animate-spin" : "text-gray-400"}`} />
            </Button>

            <Button onClick={exportData} variant="outline" size="sm">
              <Download className="h-4 w-4" />
            </Button>

            <Button onClick={toggleFullscreen} variant="outline" size="sm">
              {state.isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>

            <Button onClick={() => user && loadDashboardData(user)} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        {state.statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aktive Einsätze</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{state.statistics.emergencies.total}</div>
                <p className="text-xs text-muted-foreground">
                  {state.statistics.emergencies.byPriority.critical || 0} kritisch
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Verfügbare Fahrzeuge</CardTitle>
                <Truck className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {state.statistics.vehicles.available}/{state.statistics.vehicles.total}
                </div>
                <Progress
                  value={(state.statistics.vehicles.available / state.statistics.vehicles.total) * 100}
                  className="mt-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Einsatzbereitschaft</CardTitle>
                <Activity className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{state.statistics.performance.equipmentReadiness}%</div>
                <p className="text-xs text-muted-foreground">{state.statistics.vehicles.outOfService} außer Betrieb</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Status-Änderungen</CardTitle>
                <Radio className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{recentStatusChanges.length}</div>
                <p className="text-xs text-muted-foreground">Letzte Stunde</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="emergencies" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="emergencies">Aktive Einsätze ({state.emergencies.length})</TabsTrigger>
            <TabsTrigger value="vehicles">Fahrzeugstatus ({state.vehicles.length})</TabsTrigger>
            <TabsTrigger value="status-log">Status-Log ({recentStatusChanges.length})</TabsTrigger>
          </TabsList>

          {/* Aktive Einsätze */}
          <TabsContent value="emergencies" className="space-y-6">
            {emergenciesWithVehicles.length > 0 ? (
              emergenciesWithVehicles.map((emergency) => (
                <Card key={emergency.id} className="border-l-4 border-l-red-500">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        {emergency.title}
                        <Badge variant={emergency.priority === "critical" ? "destructive" : "secondary"}>
                          {emergency.priority.toUpperCase()}
                        </Badge>
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => speakAlert(`Einsatz ${emergency.title} in ${emergency.location}`, true)}
                          variant="outline"
                          size="sm"
                        >
                          <Volume2 className="h-4 w-4" />
                        </Button>
                        {hasPermission(user, "emergencies", "write") && (
                          <Button asChild variant="outline" size="sm">
                            <a href={`/emergencies/${emergency.id}`}>
                              <FileText className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-600 mt-2">{emergency.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span>{emergency.location}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span>Alarmiert: {formatRelativeTime(emergency.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Truck className="h-4 w-4 text-gray-500" />
                          <span>
                            Fahrzeuge ({emergency.assignedVehicleDetails.length}):{" "}
                            {emergency.assignedVehicleDetails.length > 0
                              ? emergency.assignedVehicleDetails.map((v) => v.callSign).join(", ")
                              : "Keine zugewiesen"}
                          </span>
                        </div>
                      </div>

                      {/* Einsatzort-Karte */}
                      <div className="bg-gray-100 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">Einsatzort</h4>
                        <div className="bg-slate-200 h-32 rounded border-2 border-gray-300 relative overflow-hidden">
                          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                            {/* Straßennetz */}
                            <line x1="0" y1="25" x2="100" y2="25" stroke="#6b7280" strokeWidth="1" />
                            <line x1="0" y1="50" x2="100" y2="50" stroke="#6b7280" strokeWidth="1.5" />
                            <line x1="0" y1="75" x2="100" y2="75" stroke="#6b7280" strokeWidth="1" />
                            <line x1="25" y1="0" x2="25" y2="100" stroke="#6b7280" strokeWidth="1" />
                            <line x1="50" y1="0" x2="50" y2="100" stroke="#6b7280" strokeWidth="1.5" />
                            <line x1="75" y1="0" x2="75" y2="100" stroke="#6b7280" strokeWidth="1" />

                            {/* Gebäude */}
                            <rect x="10" y="10" width="12" height="12" fill="#9ca3af" rx="1" />
                            <rect x="65" y="15" width="15" height="8" fill="#9ca3af" rx="1" />
                            <rect x="15" y="60" width="10" height="10" fill="#9ca3af" rx="1" />
                            <rect x="80" y="80" width="12" height="8" fill="#9ca3af" rx="1" />
                          </svg>

                          {/* Einsatzort-Marker */}
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                            <div className="relative animate-pulse">
                              <div className="absolute -top-2 -left-2 w-8 h-8 bg-red-500 rounded-full opacity-30 animate-ping"></div>
                              <MapPin className="h-6 w-6 text-red-600 relative z-10" fill="currentColor" />
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500 space-y-1">
                          <p>
                            📍 Koordinaten: {emergency.coordinates.lat.toFixed(4)},{" "}
                            {emergency.coordinates.lng.toFixed(4)}
                          </p>
                          <p>🗺️ Interaktive Karte verfügbar</p>
                        </div>
                      </div>
                    </div>

                    {/* Zugewiesene Fahrzeuge Status */}
                    {emergency.assignedVehicleDetails.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="font-semibold mb-3">Fahrzeugstatus</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {emergency.assignedVehicleDetails.map((vehicle) => (
                            <div key={vehicle.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <div
                                className={`w-3 h-3 rounded-full ${STATUS_COLORS[vehicle.status as keyof typeof STATUS_COLORS]}`}
                              />
                              <div className="flex-1">
                                <div className="font-medium">{vehicle.callSign}</div>
                                <div className="text-sm text-gray-600">
                                  {STATUS_LABELS[vehicle.status as keyof typeof STATUS_LABELS]}
                                </div>
                                {vehicle.lastUpdate && (
                                  <div className="text-xs text-gray-500">{formatRelativeTime(vehicle.lastUpdate)}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-6">
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Keine aktiven Einsätze</h3>
                    <p className="text-gray-600">
                      Derzeit sind keine Einsätze aktiv. Alle Fahrzeuge sind einsatzbereit.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Fahrzeugstatus */}
          <TabsContent value="vehicles" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Fahrzeugstatus - {user.role === "firefighter" ? user.station : "Alle Wachen"}
                  {user.role === "firefighter" && (
                    <Badge variant="outline" className="ml-2">
                      Nur eigene Wache
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Status-Übersicht */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  {Object.entries(vehiclesByStatus).map(([status, vehicles]) => (
                    <div key={status} className="text-center">
                      <div
                        className={`w-4 h-4 rounded-full mx-auto mb-2 ${STATUS_COLORS[Number.parseInt(status) as keyof typeof STATUS_COLORS]}`}
                      />
                      <div className="text-2xl font-bold">{vehicles.length}</div>
                      <div className="text-xs text-gray-600">Status {status}</div>
                    </div>
                  ))}
                </div>

                {/* Fahrzeug-Liste */}
                <div className="space-y-4">
                  {state.vehicles
                    .filter((vehicle) => state.showInactive || vehicle.isOperational)
                    .map((vehicle) => (
                      <div
                        key={vehicle.id}
                        className={`flex items-center justify-between p-4 border rounded-lg ${
                          !vehicle.isOperational ? "bg-gray-50 opacity-75" : ""
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-4 h-4 rounded-full ${STATUS_COLORS[vehicle.status as keyof typeof STATUS_COLORS]}`}
                          />
                          <div>
                            <h3 className="font-semibold flex items-center gap-2">
                              {vehicle.callSign}
                              {!vehicle.isOperational && (
                                <Badge variant="destructive" className="text-xs">
                                  Außer Betrieb
                                </Badge>
                              )}
                            </h3>
                            <p className="text-sm text-gray-600">{vehicle.type.name}</p>
                            <p className="text-sm text-gray-500">{vehicle.station}</p>
                            {vehicle.crew.length > 0 && (
                              <p className="text-xs text-blue-600">
                                Besatzung: {vehicle.crew.map((c) => c.username).join(", ")}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <Badge variant="outline" className="mb-2">
                            Status {vehicle.status}: {STATUS_LABELS[vehicle.status as keyof typeof STATUS_LABELS]}
                          </Badge>
                          <p className="text-sm text-gray-500">{vehicle.location}</p>
                          {vehicle.lastUpdate && (
                            <p className="text-xs text-gray-400">
                              Aktualisiert: {formatRelativeTime(vehicle.lastUpdate)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Status-Log */}
          <TabsContent value="status-log" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="h-5 w-5" />
                  Status-Log - Letzte Änderungen
                  {user.role === "firefighter" && (
                    <Badge variant="outline" className="ml-2">
                      {user.station}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentStatusChanges.length > 0 ? (
                    recentStatusChanges.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-3 h-3 rounded-full ${STATUS_COLORS[entry.oldStatus as keyof typeof STATUS_COLORS]}`}
                            />
                            <span>→</span>
                            <div
                              className={`w-3 h-3 rounded-full ${STATUS_COLORS[entry.newStatus as keyof typeof STATUS_COLORS]}`}
                            />
                          </div>
                          <div>
                            <div className="font-medium">{entry.vehicleCallSign}</div>
                            <div className="text-sm text-gray-600">
                              {STATUS_LABELS[entry.oldStatus as keyof typeof STATUS_LABELS]} →{" "}
                              {STATUS_LABELS[entry.newStatus as keyof typeof STATUS_LABELS]}
                            </div>
                            {entry.userId && <div className="text-xs text-blue-600">Benutzer: {entry.userId}</div>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">{formatRelativeTime(entry.timestamp)}</div>
                          {entry.confirmed && (
                            <Badge variant="outline" className="text-xs mt-1">
                              Bestätigt
                            </Badge>
                          )}
                          {entry.jSprechSent && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              J-Sprech gesendet
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Radio className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Keine Status-Änderungen in der letzten Stunde</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
