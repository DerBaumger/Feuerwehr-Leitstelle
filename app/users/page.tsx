"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Users, Plus, Edit, Trash2, Shield, UserCheck } from "lucide-react"
import Navigation from "@/components/navigation"
import { useRouter } from "next/navigation"

interface User {
  id: string
  username: string
  email: string
  role: "administrator" | "dispatcher" | "firefighter"
  station: string
  authorizedVehicles: string[]
  active: boolean
}

export default function UsersPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [users, setUsers] = useState<User[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<{
    username: string
    email: string
    role: "administrator" | "dispatcher" | "firefighter"
    station: string
    password: string
  }>({
    username: "",
    email: "",
    role: "firefighter",
    station: "",
    password: "",
  })

  const [availableStations, setAvailableStations] = useState<any[]>([])

  useEffect(() => {
    // Wachen für Dropdowns laden
    const savedStations = localStorage.getItem("stations")
    if (savedStations) {
      setAvailableStations(JSON.parse(savedStations))
    }
  }, [])

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/")
      return
    }
    const user = JSON.parse(userData)
    setCurrentUser(user)

    if (user.role !== "administrator") {
      router.push("/dashboard")
      return
    }

    // Daten aus localStorage laden oder Standard-Admin erstellen
    const savedUsers = localStorage.getItem("users")
    if (savedUsers) {
      setUsers(JSON.parse(savedUsers))
    } else {
      // Standard-Admin-Benutzer erstellen
      const defaultAdmin: User = {
        id: "1",
        username: "admin",
        email: "admin@feuerwehr.de",
        role: "administrator",
        station: "Hauptwache",
        authorizedVehicles: [],
        active: true,
      }
      setUsers([defaultAdmin])
      localStorage.setItem("users", JSON.stringify([defaultAdmin]))
    }
  }, [router])

  // Users in localStorage speichern wenn sie sich ändern
  useEffect(() => {
    if (users.length > 0) {
      localStorage.setItem("users", JSON.stringify(users))
    }
  }, [users])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingUser) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                username: formData.username,
                email: formData.email,
                role: formData.role,
                station: formData.station,
              }
            : u,
        ),
      )
    } else {
      const newUser: User = {
        id: Date.now().toString(),
        username: formData.username,
        email: formData.email,
        role: formData.role,
        station: formData.station,
        authorizedVehicles: [],
        active: true,
      }
      setUsers((prev) => [...prev, newUser])
    }

    setIsDialogOpen(false)
    setEditingUser(null)
    setFormData({ username: "", email: "", role: "firefighter", station: "", password: "" })
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      role: user.role,
      station: user.station,
      password: "",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId))
  }

  const toggleUserActive = (userId: string) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, active: !u.active } : u)))
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "administrator":
        return "Administrator"
      case "dispatcher":
        return "Disponent"
      case "firefighter":
        return "Feuerwehrmann"
      default:
        return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "administrator":
        return "bg-red-100 text-red-800"
      case "dispatcher":
        return "bg-blue-100 text-blue-800"
      case "firefighter":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (!currentUser || currentUser.role !== "administrator") return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={currentUser} />

      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Benutzerverwaltung</h1>
            <p className="text-gray-600">Verwalten Sie Benutzer und deren Berechtigungen</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700">
                <Plus className="h-4 w-4 mr-2" />
                Benutzer hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-white border border-gray-200 shadow-xl">
              <DialogHeader className="pb-4 border-b border-gray-100">
                <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-red-600" />
                  {editingUser ? "Benutzer bearbeiten" : "Neuer Benutzer"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                    Benutzername
                  </Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                    placeholder="Benutzername"
                    className="w-full border-gray-300 focus:border-red-500 focus:ring-red-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    E-Mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="benutzer@feuerwehr.de"
                    className="w-full border-gray-300 focus:border-red-500 focus:ring-red-500"
                    required
                  />
                </div>

                {!editingUser && (
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      Passwort
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder="Passwort"
                      className="w-full border-gray-300 focus:border-red-500 focus:ring-red-500"
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium text-gray-700">
                    Rolle
                  </Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: any) => setFormData((prev) => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger className="w-full border-gray-300 focus:border-red-500 focus:ring-red-500">
                      <SelectValue placeholder="Rolle wählen" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg">
                      <SelectItem value="administrator" className="hover:bg-gray-50">
                        Administrator
                      </SelectItem>
                      <SelectItem value="dispatcher" className="hover:bg-gray-50">
                        Disponent
                      </SelectItem>
                      <SelectItem value="firefighter" className="hover:bg-gray-50">
                        Feuerwehrmann
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Wache nur für Feuerwehrmänner anzeigen */}
                {formData.role === "firefighter" && (
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
                        {availableStations.map((station) => (
                          <SelectItem key={station.id} value={station.name} className="hover:bg-gray-50">
                            {station.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Hinweis für Administratoren und Disponenten */}
                {(formData.role === "administrator" || formData.role === "dispatcher") && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>Hinweis:</strong> {getRoleLabel(formData.role)} haben Zugriff auf alle Wachen und
                      Fahrzeuge.
                    </p>
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
                    {editingUser ? "Aktualisieren" : "Hinzufügen"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6">
          {users.map((user) => (
            <Card key={user.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {user.username}
                      {!user.active && <Badge variant="secondary">Inaktiv</Badge>}
                    </CardTitle>
                    <p className="text-gray-600">{user.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => toggleUserActive(user.id)}
                      variant="outline"
                      size="sm"
                      className={user.active ? "text-orange-600" : "text-green-600"}
                    >
                      <UserCheck className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => handleEdit(user)} variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(user.id)}
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
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4" />
                  <Badge className={getRoleColor(user.role)}>{getRoleLabel(user.role)}</Badge>
                </div>
                {user.role === "firefighter" && (
                  <p>
                    <strong>Wache:</strong> {user.station || "Keine Wache zugewiesen"}
                  </p>
                )}
                {(user.role === "administrator" || user.role === "dispatcher") && (
                  <p className="text-sm text-gray-600">Zugriff auf alle Wachen und Fahrzeuge</p>
                )}
                <p>
                  <strong>Status:</strong> {user.active ? "Aktiv" : "Inaktiv"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
