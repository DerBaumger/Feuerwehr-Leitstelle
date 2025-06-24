"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useRouter } from "next/navigation"
import { Shield, Info } from "lucide-react"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [debugInfo, setDebugInfo] = useState("")
  const [stats, setStats] = useState({ users: 0, vehicles: 0, stations: 0, emergencies: 0 })
  const [isClient, setIsClient] = useState(false)
  const router = useRouter()

  // Client-side only
  useEffect(() => {
    setIsClient(true)
    updateStats()
  }, [])

  const updateStats = () => {
    if (typeof window === "undefined") return

    const users = localStorage.getItem("users")
    const vehicles = localStorage.getItem("vehicles")
    const stations = localStorage.getItem("stations")
    const emergencies = localStorage.getItem("emergencies")

    setStats({
      users: users ? JSON.parse(users).length : 0,
      vehicles: vehicles ? JSON.parse(vehicles).length : 0,
      stations: stations ? JSON.parse(stations).length : 0,
      emergencies: emergencies ? JSON.parse(emergencies).length : 0,
    })
  }

  const resetAllData = () => {
    if (confirm("⚠️ ACHTUNG: Alle Daten (Benutzer, Fahrzeuge, Einsätze) werden gelöscht! Fortfahren?")) {
      localStorage.clear()
      sessionStorage.clear()
      setDebugInfo("✅ Alle Daten gelöscht! Seite wird neu geladen...")
      updateStats()
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    }
  }

  const showAllUsers = () => {
    const users = localStorage.getItem("users")
    if (users) {
      const userList = JSON.parse(users)
      let info = `=== ALLE BENUTZER (${userList.length}) ===\n\n`
      userList.forEach((u: any, i: number) => {
        info += `${i + 1}. ${u.username}\n`
        info += `   Rolle: ${u.role}\n`
        info += `   Wache: ${u.station}\n`
        info += `   Aktiv: ${u.active ? "✅" : "❌"}\n`
        info += `   ID: ${u.id}\n\n`
      })
      alert(info)
    } else {
      alert("Keine Benutzer gefunden!")
    }
  }

  const createFreshAdmin = () => {
    // Komplett neue Daten erstellen
    const freshUsers = [
      {
        id: "admin-fresh-" + Date.now(),
        username: "admin",
        email: "admin@feuerwehr.de",
        role: "administrator",
        station: "Hauptwache",
        authorizedVehicles: [],
        active: true,
      },
    ]

    const freshStations = [
      {
        id: "station-fresh-" + Date.now(),
        name: "Hauptwache",
        address: "Hauptstraße 1, 12345 Musterstadt",
        description: "Hauptwache der Freiwilligen Feuerwehr",
      },
    ]

    // Alte Daten löschen und neue setzen
    localStorage.removeItem("users")
    localStorage.removeItem("vehicles")
    localStorage.removeItem("stations")
    localStorage.removeItem("emergencies")
    localStorage.removeItem("statusLog")

    localStorage.setItem("users", JSON.stringify(freshUsers))
    localStorage.setItem("stations", JSON.stringify(freshStations))
    localStorage.setItem("vehicles", JSON.stringify([]))
    localStorage.setItem("emergencies", JSON.stringify([]))
    localStorage.setItem("statusLog", JSON.stringify([]))

    setDebugInfo("✅ Frische Admin-Daten erstellt! Nur Admin-Benutzer vorhanden.")
    updateStats()
    console.log("✅ Frische Daten erstellt:", freshUsers)
  }

  const generateSampleData = () => {
    if (confirm("Beispieldaten generieren? (Überschreibt vorhandene Daten)")) {
      // Wachen erstellen
      const stations = [
        {
          id: "station-1",
          name: "Hauptwache",
          address: "Hauptstraße 1, 12345 Musterstadt",
          description: "Hauptwache der Freiwilligen Feuerwehr",
        },
        {
          id: "station-2",
          name: "Löschzug Nord",
          address: "Nordstraße 15, 12345 Musterstadt",
          description: "Löschzug Nord",
        },
        {
          id: "station-3",
          name: "Löschzug Süd",
          address: "Südring 8, 12345 Musterstadt",
          description: "Löschzug Süd",
        },
      ]

      // Benutzer erstellen
      const users = [
        {
          id: "user-admin",
          username: "admin",
          email: "admin@feuerwehr.de",
          role: "administrator",
          station: "Hauptwache",
          authorizedVehicles: [],
          active: true,
        },
        {
          id: "user-disp1",
          username: "disponent1",
          email: "disp1@feuerwehr.de",
          role: "dispatcher",
          station: "Hauptwache",
          authorizedVehicles: [],
          active: true,
        },
        {
          id: "user-ff1",
          username: "mueller",
          email: "mueller@feuerwehr.de",
          role: "firefighter",
          station: "Hauptwache",
          authorizedVehicles: [],
          active: true,
        },
        {
          id: "user-ff2",
          username: "schmidt",
          email: "schmidt@feuerwehr.de",
          role: "firefighter",
          station: "Löschzug Nord",
          authorizedVehicles: [],
          active: true,
        },
        {
          id: "user-ff3",
          username: "weber",
          email: "weber@feuerwehr.de",
          role: "firefighter",
          station: "Löschzug Süd",
          authorizedVehicles: [],
          active: true,
        },
      ]

      // Fahrzeuge erstellen
      const vehicles = [
        {
          id: "vehicle-1",
          callSign: "HLF 1",
          type: "Hilfeleistungslöschfahrzeug",
          station: "Hauptwache",
          status: 2,
          location: "Hauptwache",
        },
        {
          id: "vehicle-2",
          callSign: "DLK 1",
          type: "Drehleiter",
          station: "Hauptwache",
          status: 2,
          location: "Hauptwache",
        },
        {
          id: "vehicle-3",
          callSign: "LF 2",
          type: "Löschfahrzeug",
          station: "Löschzug Nord",
          status: 2,
          location: "Löschzug Nord",
        },
        {
          id: "vehicle-4",
          callSign: "TLF 3",
          type: "Tanklöschfahrzeug",
          station: "Löschzug Süd",
          status: 2,
          location: "Löschzug Süd",
        },
        {
          id: "vehicle-5",
          callSign: "ELW 1",
          type: "Einsatzleitwagen",
          station: "Hauptwache",
          status: 2,
          location: "Hauptwache",
        },
      ]

      // Beispiel-Einsatz erstellen
      const emergencies = [
        {
          id: "emergency-1",
          title: "Wohnungsbrand",
          description: "Rauchentwicklung im 2. OG eines Mehrfamilienhauses",
          location: "Musterstraße 42, 12345 Musterstadt",
          priority: "high",
          status: "active",
          createdAt: new Date().toISOString(),
          assignedVehicles: ["vehicle-1", "vehicle-2"],
          coordinates: { lat: 52.52, lng: 13.405 },
          updateHistory: [],
        },
      ]

      // Daten speichern
      localStorage.setItem("stations", JSON.stringify(stations))
      localStorage.setItem("users", JSON.stringify(users))
      localStorage.setItem("vehicles", JSON.stringify(vehicles))
      localStorage.setItem("emergencies", JSON.stringify(emergencies))
      localStorage.setItem("statusLog", JSON.stringify([]))

      setDebugInfo(
        `✅ Beispieldaten generiert!\n- ${stations.length} Wachen\n- ${users.length} Benutzer\n- ${vehicles.length} Fahrzeuge\n- ${emergencies.length} Einsatz`,
      )
      updateStats()
    }
  }

  const exportData = () => {
    const dataExport = {
      users: localStorage.getItem("users"),
      vehicles: localStorage.getItem("vehicles"),
      stations: localStorage.getItem("stations"),
      emergencies: localStorage.getItem("emergencies"),
      statusLog: localStorage.getItem("statusLog"),
      timestamp: new Date().toISOString(),
      source: window.location.origin,
    }

    const dataStr = JSON.stringify(dataExport, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `feuerwehr-daten-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)

    setDebugInfo("✅ Daten exportiert!")
  }

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string)

        if (importedData.users) localStorage.setItem("users", importedData.users)
        if (importedData.vehicles) localStorage.setItem("vehicles", importedData.vehicles)
        if (importedData.stations) localStorage.setItem("stations", importedData.stations)
        if (importedData.emergencies) localStorage.setItem("emergencies", importedData.emergencies)
        if (importedData.statusLog) localStorage.setItem("statusLog", importedData.statusLog)

        setDebugInfo(`✅ Daten importiert von ${importedData.source}`)
        updateStats()
      } catch (error) {
        setDebugInfo("❌ Fehler beim Importieren der Daten!")
        console.error(error)
      }
    }
    reader.readAsText(file)

    // Input zurücksetzen
    event.target.value = ""
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setDebugInfo("")

    console.log("=== LOGIN VERSUCH ===")
    console.log("Benutzername:", username)

    if (!username || !password) {
      setError("Bitte geben Sie Benutzername und Passwort ein.")
      return
    }

    // Admin-Passwort prüfen
    if (username === "admin" && password !== "admin") {
      setError("Falsches Passwort für Administrator. Verwenden Sie: admin")
      return
    }

    // Benutzer aus localStorage laden
    const savedUsers = localStorage.getItem("users")
    console.log("Gespeicherte Benutzer:", savedUsers)

    if (!savedUsers) {
      // Keine Benutzer vorhanden - frische Admin-Daten erstellen
      createFreshAdmin()

      if (username === "admin") {
        localStorage.setItem(
          "user",
          JSON.stringify({
            username: "admin",
            role: "administrator",
            id: "admin-fresh-" + Date.now(),
            email: "admin@feuerwehr.de",
            station: "Hauptwache",
          }),
        )
        router.push("/dashboard")
        return
      } else {
        setError("Keine Benutzer gefunden. Melden Sie sich zuerst als 'admin' an.")
        return
      }
    }

    try {
      const users = JSON.parse(savedUsers)
      console.log("Benutzer-Array:", users)

      const user = users.find((u: any) => u.username === username && u.active)
      console.log("Gefundener Benutzer:", user)

      if (user) {
        console.log("✅ Login erfolgreich")
        localStorage.setItem(
          "user",
          JSON.stringify({
            username: user.username,
            role: user.role,
            id: user.id,
            email: user.email,
            station: user.station,
          }),
        )
        router.push("/dashboard")
      } else {
        setError(`Benutzer "${username}" nicht gefunden oder inaktiv.`)
      }
    } catch (error) {
      console.error("Fehler beim Parsen der Benutzer:", error)
      setError("Fehler beim Laden der Benutzerdaten.")
    }
  }

  // Render nur wenn Client-side
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <p>Lade Anwendung...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
      <div className="w-full max-w-md space-y-4">
        {debugInfo && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="whitespace-pre-line">{debugInfo}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Shield className="h-12 w-12 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-red-600">Feuerwehr Leitstelle</CardTitle>
            <CardDescription>Melden Sie sich an, um fortzufahren</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Benutzername</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Passwort</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="admin"
                  required
                />
              </div>
              {error && <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>}
              <Button type="submit" className="w-full bg-red-600 hover:bg-red-700">
                Anmelden
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
