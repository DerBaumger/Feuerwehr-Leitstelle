"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertTriangle, Edit, Trash2, Clock, MapPin, CheckCircle, Siren, Radio, Check, FileText, X } from "lucide-react"
import Navigation from "@/components/navigation"
import { useRouter } from "next/navigation"

interface Emergency {
  id: string
  title: string
  description: string
  location: string
  priority: "low" | "medium" | "high"
  status: "active" | "completed" | "cancelled"
  createdAt: string
  completedAt?: string
  cancelledAt?: string
  assignedVehicles: string[]
  coordinates: { lat: number; lng: number }
  updateHistory: Array<{
    id: string
    timestamp: string
    user: string
    field: string
    oldValue: string
    newValue: string
  }>
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
  jSprechSent?: boolean // Neues Feld für J-Sprechaufforderung
}

const statusLabels = {
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
}

export default function EmergenciesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [emergencies, setEmergencies] = useState<Emergency[]>([])
  const [statusLog, setStatusLog] = useState<StatusLogEntry[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingEmergency, setEditingEmergency] = useState<Emergency | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    assignedVehicles: [] as string[],
  })

  const [availableVehicles, setAvailableVehicles] = useState<any[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Audio Context initialisieren
    if (typeof window !== "undefined") {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  useEffect(() => {
    // Fahrzeuge für Dropdown laden
    const savedVehicles = localStorage.getItem("vehicles")
    if (savedVehicles) {
      setAvailableVehicles(JSON.parse(savedVehicles))
    }
  }, [])

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/")
      return
    }
    setUser(JSON.parse(userData))

    // Daten aus localStorage laden
    const savedEmergencies = localStorage.getItem("emergencies")
    if (savedEmergencies) {
      const loadedEmergencies = JSON.parse(savedEmergencies)
      // Sicherstellen, dass updateHistory existiert
      const emergenciesWithHistory = loadedEmergencies.map((emergency: any) => ({
        ...emergency,
        updateHistory: emergency.updateHistory || [],
      }))
      setEmergencies(emergenciesWithHistory)
    } else {
      setEmergencies([])
      localStorage.setItem("emergencies", JSON.stringify([]))
    }

    // Status-Log laden
    const savedStatusLog = localStorage.getItem("statusLog")
    if (savedStatusLog) {
      setStatusLog(JSON.parse(savedStatusLog))
    } else {
      setStatusLog([])
      localStorage.setItem("statusLog", JSON.stringify([]))
    }
  }, [router])

  // Status-Log in localStorage speichern
  useEffect(() => {
    if (statusLog.length >= 0) {
      localStorage.setItem("statusLog", JSON.stringify(statusLog))
    }
  }, [statusLog])

  // Emergencies in localStorage speichern
  useEffect(() => {
    if (emergencies.length > 0) {
      localStorage.setItem("emergencies", JSON.stringify(emergencies))
    }
  }, [emergencies])

  // Überwachung von Fahrzeugstatus-Änderungen
  useEffect(() => {
    const checkVehicleStatusChanges = () => {
      const savedVehicles = localStorage.getItem("vehicles")
      if (savedVehicles) {
        const currentVehicles = JSON.parse(savedVehicles)

        currentVehicles.forEach((vehicle: any) => {
          // Für Feuerwehrmänner nur Fahrzeuge der eigenen Wache überwachen
          if (user && user.role === "firefighter" && vehicle.station !== user.station) {
            return
          }

          // Prüfen ob sich Status geändert hat
          const lastLogEntry = statusLog
            .filter((entry) => entry.vehicleId === vehicle.id)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]

          const lastKnownStatus = lastLogEntry ? lastLogEntry.newStatus : 2 // Default: Frei auf Wache

          if (vehicle.status !== lastKnownStatus) {
            // Status-Änderung erkannt
            console.log(
              `🚨 WEB-APP: Status-Änderung erkannt für ${vehicle.callSign}: ${lastKnownStatus} -> ${vehicle.status}`,
            )

            const newLogEntry: StatusLogEntry = {
              id: Date.now().toString() + Math.random(),
              vehicleId: vehicle.id,
              vehicleCallSign: vehicle.callSign,
              oldStatus: lastKnownStatus,
              newStatus: vehicle.status,
              timestamp: new Date().toISOString(),
              confirmed: false,
              previousStatus: lastKnownStatus,
              jSprechSent: false,
            }

            setStatusLog((prev) => {
              const updated = [newLogEntry, ...prev]
              console.log("📋 WEB-APP: Status-Log aktualisiert:", updated.length, "Einträge")
              return updated
            })

            // Gong-Ton abspielen für Status 0 und 5
            if (vehicle.status === 0 || vehicle.status === 5) {
              console.log(`🔔 WEB-APP: Spiele Gong für Status ${vehicle.status}`)
              playGongAlert(vehicle.status)
            }
          }
        })
      }
    }

    const interval = setInterval(checkVehicleStatusChanges, 1000)
    return () => clearInterval(interval)
  }, [statusLog, user])

  const createGongTone = (frequency: number, duration: number, volume = 0.3) => {
    if (!audioContextRef.current) return

    const oscillator = audioContextRef.current.createOscillator()
    const gainNode = audioContextRef.current.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContextRef.current.destination)

    oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime)
    oscillator.type = "sine"

    // Envelope für Gong-Effekt
    gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime)
    gainNode.gain.linearRampToValueAtTime(volume, audioContextRef.current.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration)

    oscillator.start(audioContextRef.current.currentTime)
    oscillator.stop(audioContextRef.current.currentTime + duration)
  }

  const playAlarmGong = () => {
    return new Promise<void>((resolve) => {
      if (!audioContextRef.current) {
        resolve()
        return
      }

      // Alarmgong-Sequenz: Drei aufsteigende Töne
      createGongTone(400, 0.8, 0.4) // Tiefer Ton
      setTimeout(() => createGongTone(600, 0.6, 0.4), 200) // Mittlerer Ton
      setTimeout(() => createGongTone(800, 0.4, 0.4), 400) // Hoher Ton

      // Nach dem Gong ist die Sequenz beendet
      setTimeout(() => resolve(), 1200)
    })
  }

  const playGongAlert = (status: number) => {
    // Bestehende Töne stoppen
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current)
    }

    const playGong = () => {
      if (status === 0) {
        // Priorisierter Sprechwunsch - penetranterer Gong
        createGongTone(800, 0.5, 0.5) // Höhere Frequenz, lauter
        setTimeout(() => createGongTone(600, 0.3, 0.4), 100)
      } else if (status === 5) {
        // Sprechwunsch - normaler Gong
        createGongTone(400, 0.8, 0.3) // Tiefere Frequenz, sanfter
      }
    }

    // Sofort abspielen
    playGong()

    // Wiederkehrend abspielen
    const interval = status === 0 ? 1000 : 2000 // Status 0 penetranter (jede Sekunde)
    audioIntervalRef.current = setInterval(playGong, interval)
  }

  const confirmStatusAlert = (logEntryId: string) => {
    const logEntry = statusLog.find((entry) => entry.id === logEntryId)
    if (!logEntry) {
      console.error("❌ WEB-APP: Log-Eintrag nicht gefunden:", logEntryId)
      return
    }

    console.log("🔔 WEB-APP: Bestätige Status-Alert:", logEntry)

    // Gong-Ton stoppen
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current)
      audioIntervalRef.current = null
    }

    // 1. Log-Eintrag als bestätigt markieren UND J-Sprech als gesendet markieren
    const updatedStatusLog = statusLog.map((entry) =>
      entry.id === logEntryId ? { ...entry, confirmed: true, jSprechSent: true } : entry,
    )

    console.log(
      "📋 WEB-APP: Status-Log nach Bestätigung:",
      updatedStatusLog.find((e) => e.id === logEntryId),
    )
    setStatusLog(updatedStatusLog)

    // 2. Fahrzeugstatus auf vorherigen Status zurücksetzen
    const savedVehicles = localStorage.getItem("vehicles")
    if (savedVehicles && logEntry.previousStatus !== undefined) {
      const vehicles = JSON.parse(savedVehicles)
      const updatedVehicles = vehicles.map((vehicle: any) =>
        vehicle.id === logEntry.vehicleId ? { ...vehicle, status: logEntry.previousStatus } : vehicle,
      )

      console.log(
        `🔄 WEB-APP: Setze ${logEntry.vehicleCallSign} Status zurück: ${logEntry.newStatus} -> ${logEntry.previousStatus}`,
      )

      // Fahrzeuge speichern
      localStorage.setItem("vehicles", JSON.stringify(updatedVehicles))
      setAvailableVehicles(updatedVehicles)

      // 3. Storage Event für Mobile App triggern - WICHTIG!
      setTimeout(() => {
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "vehicles",
            newValue: JSON.stringify(updatedVehicles),
            oldValue: savedVehicles,
          }),
        )
        console.log("📡 WEB-APP: Storage Event für vehicles getriggert")
      }, 100)
    }

    // 4. StatusLog speichern und Storage Event triggern - WICHTIG!
    setTimeout(() => {
      localStorage.setItem("statusLog", JSON.stringify(updatedStatusLog))
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "statusLog",
          newValue: JSON.stringify(updatedStatusLog),
          oldValue: JSON.stringify(statusLog),
        }),
      )
      console.log("📡 WEB-APP: Storage Event für statusLog getriggert")
    }, 200)

    // 5. J-Sprechaufforderung senden (Text-to-Speech)
    const vehicle = availableVehicles.find((v) => v.id === logEntry.vehicleId)
    const speechName = vehicle ? vehicle.speechCallSign || vehicle.callSign : logEntry.vehicleCallSign
    speakAlert(`J-Sprechaufforderung an ${speechName}`, false)

    console.log("✅ WEB-APP: J-Sprechaufforderung komplett abgeschlossen")
  }

  const addUpdateHistoryEntry = (emergencyId: string, field: string, oldValue: string, newValue: string) => {
    if (!user) return

    const historyEntry = {
      id: Date.now().toString() + Math.random(),
      timestamp: new Date().toISOString(),
      user: user.username,
      field: field,
      oldValue: oldValue,
      newValue: newValue,
    }

    setEmergencies((prev) =>
      prev.map((emergency) =>
        emergency.id === emergencyId
          ? { ...emergency, updateHistory: [historyEntry, ...emergency.updateHistory] }
          : emergency,
      ),
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingEmergency) {
      // Änderungen verfolgen
      const changes: Array<{ field: string; oldValue: string; newValue: string }> = []

      if (formData.title !== editingEmergency.title) {
        changes.push({
          field: "Titel",
          oldValue: editingEmergency.title,
          newValue: formData.title,
        })
      }

      if (formData.description !== editingEmergency.description) {
        changes.push({
          field: "Beschreibung",
          oldValue: editingEmergency.description,
          newValue: formData.description,
        })
      }

      if (formData.location !== editingEmergency.location) {
        changes.push({
          field: "Einsatzort",
          oldValue: editingEmergency.location,
          newValue: formData.location,
        })
      }

      // Emergency aktualisieren
      setEmergencies((prev) =>
        prev.map((em) =>
          em.id === editingEmergency.id
            ? {
                ...em,
                title: formData.title,
                description: formData.description,
                location: formData.location,
              }
            : em,
        ),
      )

      // Änderungen zur Historie hinzufügen
      changes.forEach((change) => {
        addUpdateHistoryEntry(editingEmergency.id, change.field, change.oldValue, change.newValue)
      })
    } else {
      const newEmergency: Emergency = {
        id: Date.now().toString(),
        title: formData.title,
        description: formData.description,
        location: formData.location,
        priority: "medium", // Standard-Priorität setzen
        status: "active",
        createdAt: new Date().toISOString(),
        assignedVehicles: formData.assignedVehicles,
        coordinates: { lat: 52.52 + Math.random() * 0.01, lng: 13.405 + Math.random() * 0.01 },
        updateHistory: [],
      }
      setEmergencies((prev) => [newEmergency, ...prev])

      // Text-to-Speech nur ausgeben wenn Fahrzeuge der eigenen Wache alarmiert werden
      const shouldPlayAlert = checkIfUserStationVehiclesAlarmed(formData.assignedVehicles)

      if (shouldPlayAlert) {
        const userStationVehicles = getVehicleCallSignsForUserStation(formData.assignedVehicles)
        const alertText = `Alarmierung: ${formData.title} in ${formData.location}. Zugewiesene Fahrzeuge: ${userStationVehicles.join(", ")}`
        speakAlert(alertText, true) // Mit Alarmgong
      }
    }

    setIsDialogOpen(false)
    setEditingEmergency(null)
    setFormData({ title: "", description: "", location: "", assignedVehicles: [] })
  }

  const checkIfUserStationVehiclesAlarmed = (vehicleIds: string[]) => {
    if (!user) return false

    // Administratoren und Disponenten hören alle Alarmierungen
    if (user.role === "administrator" || user.role === "dispatcher") {
      return vehicleIds.length > 0
    }

    // Feuerwehrmänner hören nur Alarmierungen ihrer eigenen Wache
    if (user.role === "firefighter") {
      const userStationVehicles = availableVehicles.filter(
        (vehicle) => vehicleIds.includes(vehicle.id) && vehicle.station === user.station,
      )
      return userStationVehicles.length > 0
    }

    return false
  }

  const getVehicleCallSignsForUserStation = (vehicleIds: string[]) => {
    if (!user) return []

    if (user.role === "administrator" || user.role === "dispatcher") {
      return availableVehicles
        .filter((vehicle) => vehicleIds.includes(vehicle.id))
        .map((vehicle) => vehicle.speechCallSign || vehicle.callSign) // Für TTS
    }

    if (user.role === "firefighter") {
      return availableVehicles
        .filter((vehicle) => vehicleIds.includes(vehicle.id) && vehicle.station === user.station)
        .map((vehicle) => vehicle.speechCallSign || vehicle.callSign) // Für TTS
    }

    return []
  }

  const getVehicleCallSigns = (vehicleIds: string[]) => {
    return availableVehicles
      .filter((vehicle) => vehicleIds.includes(vehicle.id))
      .map((vehicle) => vehicle.speechCallSign || vehicle.callSign) // Für TTS
  }

  const improveTextForSpeech = (text: string) => {
    // Verbesserungen für bessere Aussprache
    const improvedText = text
      // Häufige Ortsnamen und schwer aussprechbare Wörter
      .replace(/Mupperg/gi, "Mup-perg")
      .replace(/Str\./gi, "Straße")
      .replace(/PLZ/gi, "Postleitzahl")
      .replace(/Nr\./gi, "Nummer")
      .replace(/z\.B\./gi, "zum Beispiel")
      .replace(/u\.a\./gi, "unter anderem")
      .replace(/bzw\./gi, "beziehungsweise")
      .replace(/ca\./gi, "circa")
      .replace(/etc\./gi, "et cetera")
      // Fahrzeugtypen
      .replace(/HLF/gi, "Hilfeleistungslöschfahrzeug")
      .replace(/LF/gi, "Löschfahrzeug")
      .replace(/DLK/gi, "Drehleiter")
      .replace(/RTW/gi, "Rettungswagen")
      .replace(/ELW/gi, "Einsatzleitwagen")
      .replace(/TLF/gi, "Tanklöschfahrzeug")
      // Zahlen und Abkürzungen
      .replace(/(\d{7,})/g, (match) => {
        // Nur sehr lange Zahlen in Gruppen aufteilen
        return match.replace(/(\d{3})/g, "$1 ").trim()
      })
      // Postleitzahlen und kurze Zahlen normal lassen
      // Telefonnummern mit Bindestrichen trennen
      .replace(/(\d{3,4})-(\d{3,4})-?(\d{0,4})/g, "$1 $2 $3")

    return improvedText
  }

  const speakAlert = async (text: string, withAlarmGong = false) => {
    if ("speechSynthesis" in window) {
      // Zuerst Alarmgong abspielen wenn gewünscht
      if (withAlarmGong) {
        await playAlarmGong()
        // Kurze Pause nach dem Gong
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      // Text für bessere Aussprache optimieren
      const improvedText = improveTextForSpeech(text)

      const utterance = new SpeechSynthesisUtterance(improvedText)

      // Verbesserte Spracheinstellungen
      utterance.lang = "de-DE"
      utterance.rate = 0.7 // Langsamer für bessere Verständlichkeit
      utterance.pitch = 1.0 // Normale Tonhöhe
      utterance.volume = 0.9 // Etwas lauter

      // Versuche eine deutsche Stimme zu finden
      const voices = speechSynthesis.getVoices()
      const germanVoice =
        voices.find((voice) => voice.lang.startsWith("de") && voice.localService) ||
        voices.find((voice) => voice.lang.startsWith("de"))

      if (germanVoice) {
        utterance.voice = germanVoice
      }

      // Fehlerbehandlung
      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event)
      }

      speechSynthesis.speak(utterance)
    }
  }

  const handleEdit = (emergency: Emergency) => {
    setEditingEmergency(emergency)
    setFormData({
      title: emergency.title,
      description: emergency.description,
      location: emergency.location,
      assignedVehicles: emergency.assignedVehicles,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (emergencyId: string) => {
    setEmergencies((prev) => prev.filter((em) => em.id !== emergencyId))
  }

  const handleStatusChange = (emergencyId: string, newStatus: Emergency["status"]) => {
    const currentTime = new Date().toISOString()

    setEmergencies((prev) =>
      prev.map((em) => {
        if (em.id === emergencyId) {
          const updatedEmergency = { ...em, status: newStatus }

          // Zeitstempel für Abschluss oder Abbruch setzen
          if (newStatus === "completed") {
            updatedEmergency.completedAt = currentTime
          } else if (newStatus === "cancelled") {
            updatedEmergency.cancelledAt = currentTime
          }

          return updatedEmergency
        }
        return em
      }),
    )

    // Status-Änderung zur Historie hinzufügen
    if (user) {
      const statusLabels = { active: "Aktiv", completed: "Abgeschlossen", cancelled: "Abgebrochen" }
      const emergency = emergencies.find((em) => em.id === emergencyId)
      if (emergency) {
        addUpdateHistoryEntry(emergencyId, "Status", statusLabels[emergency.status], statusLabels[newStatus])
      }
    }
  }

  const toggleVehicleAssignment = (emergencyId: string, vehicleId: string) => {
    setEmergencies((prev) =>
      prev.map((em) => {
        if (em.id === emergencyId) {
          const assigned = em.assignedVehicles.includes(vehicleId)
          return {
            ...em,
            assignedVehicles: assigned
              ? em.assignedVehicles.filter((v) => v !== vehicleId)
              : [...em.assignedVehicles, vehicleId],
          }
        }
        return em
      }),
    )
  }

  const toggleVehicleInForm = (vehicleId: string) => {
    setFormData((prev) => {
      const assigned = prev.assignedVehicles.includes(vehicleId)
      return {
        ...prev,
        assignedVehicles: assigned
          ? prev.assignedVehicles.filter((v) => v !== vehicleId)
          : [...prev.assignedVehicles, vehicleId],
      }
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-red-100 text-red-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getLogEntryStyle = (entry: StatusLogEntry) => {
    if (entry.jSprechSent) {
      return "bg-green-50 border-green-200"
    }

    if (entry.confirmed) {
      return "bg-blue-50 border-blue-200"
    }

    if (entry.newStatus === 0) {
      return "bg-red-200 border-red-500 border-2 animate-pulse"
    }

    if (entry.newStatus === 5) {
      return "bg-yellow-200 border-yellow-500 border-2"
    }

    return "bg-white border-gray-200"
  }

  // Für Feuerwehrmänner nur Status-Log ihrer eigenen Wache anzeigen
  const getFilteredStatusLog = () => {
    if (!user) return statusLog

    if (user.role === "firefighter") {
      return statusLog.filter((entry) => {
        const vehicle = availableVehicles.find((v) => v.id === entry.vehicleId)
        return vehicle && vehicle.station === user.station
      })
    }

    return statusLog
  }

  const getEinsatzDauer = (emergency: Emergency) => {
    const start = new Date(emergency.createdAt)
    const end = emergency.completedAt
      ? new Date(emergency.completedAt)
      : emergency.cancelledAt
        ? new Date(emergency.cancelledAt)
        : new Date()

    const durationMs = end.getTime() - start.getTime()
    const hours = Math.floor(durationMs / (1000 * 60 * 60))
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />

      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Einsatzverwaltung</h1>
            <p className="text-gray-600">
              Verwalten Sie aktuelle und vergangene Einsätze
              {user.role === "firefighter" && (
                <span className="text-sm text-blue-600 ml-2">(Wache: {user.station})</span>
              )}
            </p>
          </div>

          {(user.role === "administrator" || user.role === "dispatcher") && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-red-600 hover:bg-red-700">
                  <Siren className="h-4 w-4 mr-2" />
                  Einsatz alarmieren
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl bg-white border border-gray-200 shadow-xl">
                <DialogHeader className="pb-4 border-b border-gray-100">
                  <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Siren className="h-5 w-5 text-red-600" />
                    {editingEmergency ? "Einsatz bearbeiten" : "Neuen Einsatz alarmieren"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                      Einsatztitel
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="z.B. Wohnungsbrand"
                      className="w-full border-gray-300 focus:border-red-500 focus:ring-red-500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-sm font-medium text-gray-700">
                      Einsatzort
                    </Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                      placeholder="Straße, PLZ Ort"
                      className="w-full border-gray-300 focus:border-red-500 focus:ring-red-500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                      Beschreibung
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Detaillierte Beschreibung des Einsatzes"
                      className="w-full border-gray-300 focus:border-red-500 focus:ring-red-500 min-h-[80px]"
                      required
                    />
                  </div>

                  {!editingEmergency && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">Fahrzeuge zuweisen</Label>
                      <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 max-h-48 overflow-y-auto">
                        {availableVehicles.length > 0 ? (
                          <div className="space-y-3">
                            {availableVehicles.map((vehicle) => (
                              <div key={vehicle.id} className="flex items-center space-x-3 p-2 bg-white rounded border">
                                <Checkbox
                                  id={`form-${vehicle.id}`}
                                  checked={formData.assignedVehicles.includes(vehicle.id)}
                                  onCheckedChange={() => toggleVehicleInForm(vehicle.id)}
                                  className="border-gray-300"
                                />
                                <Label htmlFor={`form-${vehicle.id}`} className="flex-1 cursor-pointer">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <span className="font-medium text-gray-900">{vehicle.callSign}</span>
                                      <span className="text-sm text-gray-600 ml-2">- {vehicle.type}</span>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      {vehicle.station}
                                    </Badge>
                                  </div>
                                </Label>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-sm text-gray-500">
                              Keine Fahrzeuge verfügbar. Erstellen Sie zuerst Fahrzeuge.
                            </p>
                          </div>
                        )}
                      </div>
                      {formData.assignedVehicles.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm font-medium text-blue-900 mb-1">Ausgewählte Fahrzeuge:</p>
                          <p className="text-sm text-blue-700">
                            {getVehicleCallSigns(formData.assignedVehicles).join(", ")}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Abbrechen
                    </Button>
                    <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                      <Siren className="h-4 w-4 mr-2" />
                      {editingEmergency ? "Aktualisieren" : "Alarmierung auslösen"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Status-Log */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5" />
              Status-Log
              {user.role === "firefighter" && (
                <Badge variant="outline" className="ml-2">
                  {user.station}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {getFilteredStatusLog().length > 0 ? (
                getFilteredStatusLog().map((entry) => (
                  <div key={entry.id} className={`p-3 rounded-lg border ${getLogEntryStyle(entry)}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{entry.vehicleCallSign}</span>
                          <span className="text-sm text-gray-600">
                            {statusLabels[entry.oldStatus as keyof typeof statusLabels]} →{" "}
                            {statusLabels[entry.newStatus as keyof typeof statusLabels]}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                          {entry.jSprechSent && (
                            <Badge variant="outline" className="text-xs bg-green-100 text-green-800">
                              ✅ J-Sprech gesendet
                            </Badge>
                          )}
                          {entry.confirmed && !entry.jSprechSent && (
                            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">
                              Bestätigt
                            </Badge>
                          )}
                        </div>
                      </div>
                      {(entry.newStatus === 0 || entry.newStatus === 5) && !entry.jSprechSent && (
                        <Button
                          onClick={() => confirmStatusAlert(entry.id)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          J-Sprech senden
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  {user.role === "firefighter"
                    ? `Keine Status-Änderungen für Wache "${user.station}" vorhanden`
                    : "Keine Status-Änderungen vorhanden"}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Einsätze */}
        <div className="grid gap-6">
          {emergencies.map((emergency) => (
            <Card key={emergency.id} className="border-l-4 border-l-red-500">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      {emergency.title}
                      <Badge className={getStatusColor(emergency.status)}>
                        {emergency.status === "active"
                          ? "Aktiv"
                          : emergency.status === "completed"
                            ? "Abgeschlossen"
                            : "Abgebrochen"}
                      </Badge>
                    </CardTitle>
                    <p className="text-gray-600">{emergency.description}</p>
                  </div>
                  <div className="flex gap-2">
                    {emergency.status === "active" && (user.role === "administrator" || user.role === "dispatcher") && (
                      <Button
                        onClick={() => handleStatusChange(emergency.id, "completed")}
                        variant="outline"
                        size="sm"
                        className="text-green-600"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    {(user.role === "administrator" || user.role === "dispatcher") && (
                      <>
                        <Button onClick={() => handleEdit(emergency)} variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(emergency.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
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
                      <span>Alarmiert: {new Date(emergency.createdAt).toLocaleString()}</span>
                    </div>
                    {emergency.completedAt && (
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-green-700">
                          Abgeschlossen: {new Date(emergency.completedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {emergency.cancelledAt && (
                      <div className="flex items-center gap-2 mb-2">
                        <X className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-700">
                          Abgebrochen: {new Date(emergency.cancelledAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {(emergency.completedAt || emergency.cancelledAt) && (
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span className="text-blue-700 font-medium">Einsatzdauer: {getEinsatzDauer(emergency)}</span>
                      </div>
                    )}
                    <div className="flex gap-2 mt-4">
                      {emergency.status === "active" &&
                        (user.role === "administrator" || user.role === "dispatcher") && (
                          <>
                            <Button
                              onClick={() => handleStatusChange(emergency.id, "completed")}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Abschließen
                            </Button>
                            <Button
                              onClick={() => handleStatusChange(emergency.id, "cancelled")}
                              variant="outline"
                              size="sm"
                            >
                              Abbrechen
                            </Button>
                          </>
                        )}
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold mb-2">Zugewiesene Fahrzeuge:</p>
                    <div className="space-y-2">
                      {availableVehicles.map((vehicle) => (
                        <div key={vehicle.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${emergency.id}-${vehicle.id}`}
                            checked={emergency.assignedVehicles.includes(vehicle.id)}
                            onCheckedChange={() => toggleVehicleAssignment(emergency.id, vehicle.id)}
                            disabled={emergency.status !== "active" || user.role === "firefighter"}
                          />
                          <Label htmlFor={`${emergency.id}-${vehicle.id}`} className="text-sm">
                            {vehicle.callSign}
                            {user.role === "firefighter" && vehicle.station === user.station && (
                              <Badge variant="outline" className="ml-1 text-xs">
                                Eigene Wache
                              </Badge>
                            )}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Update-Historie anzeigen */}
                {emergency.updateHistory && emergency.updateHistory.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="font-semibold text-sm">Änderungshistorie</span>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {emergency.updateHistory.map((update) => (
                        <div key={update.id} className="text-xs bg-gray-50 p-2 rounded border">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-blue-600">{update.field} geändert</span>
                            <span className="text-gray-500">
                              {new Date(update.timestamp).toLocaleString()} - {update.user}
                            </span>
                          </div>
                          <div className="text-gray-600">
                            <span className="line-through text-red-600">{update.oldValue}</span>
                            {" → "}
                            <span className="text-green-600">{update.newValue}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
