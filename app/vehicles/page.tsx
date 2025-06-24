"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Truck, Plus, Edit, Trash2 } from "lucide-react"
import Navigation from "@/components/navigation"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Vehicle {
  id: string
  callSign: string
  speechCallSign: string
  type: string
  station: string
  status: number
  location: string
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

const statusColors = {
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
}

export default function VehiclesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [formData, setFormData] = useState({
    callSign: "",
    speechCallSign: "",
    type: "",
    station: "",
  })
  const [stations, setStations] = useState<any[]>([])
  const [isClient, setIsClient] = useState(false)

  // Client-side only flag
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return

    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/")
      return
    }
    setUser(JSON.parse(userData))

    // Daten aus localStorage laden - keine Mock-Daten mehr
    const savedVehicles = localStorage.getItem("vehicles")
    if (savedVehicles) {
      setVehicles(JSON.parse(savedVehicles))
    } else {
      setVehicles([])
      localStorage.setItem("vehicles", JSON.stringify([]))
    }
  }, [router, isClient])

  useEffect(() => {
    if (!isClient) return

    // Wachen für Dropdown laden
    const savedStations = localStorage.getItem("stations")
    if (savedStations) {
      setStations(JSON.parse(savedStations))
    }
  }, [isClient])

  // Vehicles in localStorage speichern wenn sie sich ändern
  useEffect(() => {
    if (!isClient || vehicles.length === 0) return
    localStorage.setItem("vehicles", JSON.stringify(vehicles))
  }, [vehicles, isClient])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingVehicle) {
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === editingVehicle.id
            ? {
                ...v,
                callSign: formData.callSign,
                speechCallSign: formData.speechCallSign || formData.callSign, // Fallback auf callSign
                type: formData.type,
                station: formData.station,
                location: formData.station,
              }
            : v,
        ),
      )
    } else {
      const newVehicle: Vehicle = {
        id: Date.now().toString(),
        callSign: formData.callSign,
        speechCallSign: formData.speechCallSign || formData.callSign, // Fallback auf callSign
        type: formData.type,
        station: formData.station,
        status: 2, // Standard: Frei auf Wache
        location: formData.station,
      }
      setVehicles((prev) => [...prev, newVehicle])
    }

    setIsDialogOpen(false)
    setEditingVehicle(null)
    setFormData({ callSign: "", speechCallSign: "", type: "", station: "" })
  }

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle)
    setFormData({
      callSign: vehicle.callSign,
      speechCallSign: vehicle.speechCallSign || vehicle.callSign, // Fallback für bestehende Fahrzeuge
      type: vehicle.type,
      station: vehicle.station,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (vehicleId: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== vehicleId))
  }

  // Render nothing on server-side
  if (!isClient || !user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />

      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Fahrzeugverwaltung</h1>
            <p className="text-gray-600">Verwalten Sie Ihre Einsatzfahrzeuge</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700">
                <Plus className="h-4 w-4 mr-2" />
                Fahrzeug hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-white border border-gray-200 shadow-xl">
              <DialogHeader className="pb-4 border-b border-gray-100">
                <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Truck className="h-5 w-5 text-red-600" />
                  {editingVehicle ? "Fahrzeug bearbeiten" : "Neues Fahrzeug"}
                </DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="basic" className="pt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic">Grunddaten</TabsTrigger>
                  <TabsTrigger value="speech">Text-to-Speech</TabsTrigger>
                </TabsList>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <TabsContent value="basic" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="callSign" className="text-sm font-medium text-gray-700">
                        Funkrufname (Anzeige)
                      </Label>
                      <Input
                        id="callSign"
                        value={formData.callSign}
                        onChange={(e) => setFormData((prev) => ({ ...prev, callSign: e.target.value }))}
                        placeholder="z.B. HLF 1"
                        className="w-full border-gray-300 focus:border-red-500 focus:ring-red-500"
                        required
                      />
                      <p className="text-xs text-gray-500">Wird in der Anwendung angezeigt</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="type" className="text-sm font-medium text-gray-700">
                        Fahrzeugtyp
                      </Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger className="w-full border-gray-300 focus:border-red-500 focus:ring-red-500">
                          <SelectValue placeholder="Fahrzeugtyp wählen" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200 shadow-lg max-h-48 overflow-y-auto">
                          <SelectItem value="Hilfeleistungslöschfahrzeug" className="hover:bg-gray-50">
                            Hilfeleistungslöschfahrzeug
                          </SelectItem>
                          <SelectItem value="Löschfahrzeug" className="hover:bg-gray-50">
                            Löschfahrzeug
                          </SelectItem>
                          <SelectItem value="Drehleiter" className="hover:bg-gray-50">
                            Drehleiter
                          </SelectItem>
                          <SelectItem value="Rettungswagen" className="hover:bg-gray-50">
                            Rettungswagen
                          </SelectItem>
                          <SelectItem value="Einsatzleitwagen" className="hover:bg-gray-50">
                            Einsatzleitwagen
                          </SelectItem>
                          <SelectItem value="Tanklöschfahrzeug" className="hover:bg-gray-50">
                            Tanklöschfahrzeug
                          </SelectItem>
                          <SelectItem value="Rüstwagen" className="hover:bg-gray-50">
                            Rüstwagen
                          </SelectItem>
                          <SelectItem value="Gerätewagen" className="hover:bg-gray-50">
                            Gerätewagen
                          </SelectItem>
                          <SelectItem value="Kommandowagen" className="hover:bg-gray-50">
                            Kommandowagen
                          </SelectItem>
                          <SelectItem value="Mannschaftstransportwagen" className="hover:bg-gray-50">
                            Mannschaftstransportwagen
                          </SelectItem>
                          <SelectItem value="Schlauchwagen" className="hover:bg-gray-50">
                            Schlauchwagen
                          </SelectItem>
                          <SelectItem value="Wechselladerfahrzeug" className="hover:bg-gray-50">
                            Wechselladerfahrzeug
                          </SelectItem>
                          <SelectItem value="Notarztwagen" className="hover:bg-gray-50">
                            Notarztwagen
                          </SelectItem>
                          <SelectItem value="Krankentransportwagen" className="hover:bg-gray-50">
                            Krankentransportwagen
                          </SelectItem>
                          <SelectItem value="Mehrzweckfahrzeug" className="hover:bg-gray-50">
                            Mehrzweckfahrzeug
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="station" className="text-sm font-medium text-gray-700">
                        Wache
                      </Label>
                      <Select
                        value={formData.station}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, station: value }))}
                      >
                        <SelectTrigger className="w-full border-gray-300 focus:border-red-500 focus:ring-red-500">
                          <SelectValue placeholder="Wache wählen" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200 shadow-lg">
                          {stations.map((station) => (
                            <SelectItem key={station.id} value={station.name} className="hover:bg-gray-50">
                              {station.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>

                  <TabsContent value="speech" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="speechCallSign" className="text-sm font-medium text-gray-700">
                        Funkrufname (Text-to-Speech)
                      </Label>
                      <Input
                        id="speechCallSign"
                        value={formData.speechCallSign}
                        onChange={(e) => setFormData((prev) => ({ ...prev, speechCallSign: e.target.value }))}
                        placeholder="z.B. H-L-F Eins oder Hilfs-Leistungs-Lösch-Fahrzeug Eins"
                        className="w-full border-gray-300 focus:border-red-500 focus:ring-red-500"
                      />
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs text-blue-800 font-medium mb-2">💡 Tipps für bessere Aussprache:</p>
                        <ul className="text-xs text-blue-700 space-y-1">
                          <li>• Verwenden Sie Bindestriche für Abkürzungen: "H-L-F" statt "HLF"</li>
                          <li>• Schreiben Sie Zahlen aus: "Eins" statt "1"</li>
                          <li>• Nutzen Sie Leerzeichen für Pausen: "Lösch Zug Nord"</li>
                          <li>• Bei Problemen: Vollständige Wörter verwenden</li>
                        </ul>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <p className="text-xs text-gray-600 font-medium mb-1">Beispiele:</p>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>
                            <strong>HLF 1</strong> → "H-L-F Eins" oder "Hilfs-Leistungs-Lösch-Fahrzeug Eins"
                          </div>
                          <div>
                            <strong>DLK 23</strong> → "D-L-K Zwei-Drei" oder "Dreh-Leiter Zwei-Drei"
                          </div>
                          <div>
                            <strong>LF 8/6</strong> → "L-F Acht Sechs" oder "Lösch-Fahrzeug Acht Sechs"
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

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
                      {editingVehicle ? "Aktualisieren" : "Hinzufügen"}
                    </Button>
                  </div>
                </form>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6">
          {vehicles.map((vehicle) => (
            <Card key={vehicle.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      {vehicle.callSign}
                      <div
                        className={`w-3 h-3 rounded-full ${statusColors[vehicle.status as keyof typeof statusColors]}`}
                      ></div>
                    </CardTitle>
                    <p className="text-gray-600">{vehicle.type}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleEdit(vehicle)} variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(vehicle.id)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div>
                  <p>
                    <strong>Wache:</strong> {vehicle.station}
                  </p>
                  <p>
                    <strong>Status:</strong> {vehicle.status} -{" "}
                    {statusLabels[vehicle.status as keyof typeof statusLabels]}
                  </p>
                  <p>
                    <strong>Standort:</strong> {vehicle.location}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
