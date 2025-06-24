"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Building, Plus, Edit, Trash2, MapPin, Truck } from "lucide-react"
import Navigation from "@/components/navigation"
import { useRouter } from "next/navigation"

interface Station {
  id: string
  name: string
  address: string
  description: string
}

export default function StationsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [stations, setStations] = useState<Station[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingStation, setEditingStation] = useState<Station | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    description: "",
  })

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/")
      return
    }
    setUser(JSON.parse(userData))

    // Daten aus localStorage laden - keine Mock-Daten mehr
    const savedStations = localStorage.getItem("stations")
    if (savedStations) {
      setStations(JSON.parse(savedStations))
    } else {
      setStations([])
      localStorage.setItem("stations", JSON.stringify([]))
    }

    // Fahrzeuge laden für Zuordnung
    const savedVehicles = localStorage.getItem("vehicles")
    if (savedVehicles) {
      setVehicles(JSON.parse(savedVehicles))
    }
  }, [router])

  // Stations in localStorage speichern wenn sie sich ändern
  useEffect(() => {
    if (stations.length > 0) {
      localStorage.setItem("stations", JSON.stringify(stations))
    }
  }, [stations])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingStation) {
      setStations((prev) =>
        prev.map((s) =>
          s.id === editingStation.id
            ? {
                ...s,
                name: formData.name,
                address: formData.address,
                description: formData.description,
              }
            : s,
        ),
      )
    } else {
      const newStation: Station = {
        id: Date.now().toString(),
        name: formData.name,
        address: formData.address,
        description: formData.description,
      }
      setStations((prev) => [...prev, newStation])
    }

    setIsDialogOpen(false)
    setEditingStation(null)
    setFormData({ name: "", address: "", description: "" })
  }

  const handleEdit = (station: Station) => {
    setEditingStation(station)
    setFormData({
      name: station.name,
      address: station.address,
      description: station.description,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (stationId: string) => {
    setStations((prev) => prev.filter((s) => s.id !== stationId))
  }

  // Fahrzeuge für eine bestimmte Wache finden
  const getVehiclesForStation = (stationName: string) => {
    return vehicles.filter((vehicle) => vehicle.station === stationName)
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />

      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Wachenverwaltung</h1>
            <p className="text-gray-600">Verwalten Sie Ihre Feuerwachen</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700">
                <Plus className="h-4 w-4 mr-2" />
                Wache hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-white border border-gray-200 shadow-xl">
              <DialogHeader className="pb-4 border-b border-gray-100">
                <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Building className="h-5 w-5 text-red-600" />
                  {editingStation ? "Wache bearbeiten" : "Neue Wache"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                    Name der Wache
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="z.B. Hauptwache"
                    className="w-full border-gray-300 focus:border-red-500 focus:ring-red-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                    Adresse
                  </Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
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
                    placeholder="Beschreibung der Wache"
                    className="w-full border-gray-300 focus:border-red-500 focus:ring-red-500 min-h-[80px]"
                  />
                </div>

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
                    {editingStation ? "Aktualisieren" : "Hinzufügen"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stations.map((station) => {
            const stationVehicles = getVehiclesForStation(station.name)
            return (
              <Card key={station.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      {station.name}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button onClick={() => handleEdit(station)} variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(station.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                    <span className="text-sm">{station.address}</span>
                  </div>

                  {/* Zugewiesene Fahrzeuge anzeigen */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Fahrzeuge ({stationVehicles.length})</span>
                    </div>
                    {stationVehicles.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {stationVehicles.map((vehicle) => (
                          <Badge key={vehicle.id} variant="secondary" className="text-xs">
                            {vehicle.callSign}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">Keine Fahrzeuge zugewiesen</p>
                    )}
                  </div>

                  {station.description && <p className="text-sm text-gray-600">{station.description}</p>}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
