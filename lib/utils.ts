import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow, isValid, parseISO } from "date-fns"
import { de } from "date-fns/locale"
import type { User, Vehicle, VehicleStatus, EmergencyPriority, Coordinates, FilterOptions, SortOptions } from "./types"

// Tailwind CSS Klassen zusammenführen
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Datum formatieren
export function formatDate(date: string | Date, formatStr = "dd.MM.yyyy HH:mm"): string {
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date
    if (!isValid(dateObj)) return "Ungültiges Datum"
    return format(dateObj, formatStr, { locale: de })
  } catch {
    return "Ungültiges Datum"
  }
}

// Relative Zeit formatieren
export function formatRelativeTime(date: string | Date): string {
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date
    if (!isValid(dateObj)) return "Unbekannt"
    return formatDistanceToNow(dateObj, { addSuffix: true, locale: de })
  } catch {
    return "Unbekannt"
  }
}

// Dauer formatieren (in Millisekunden)
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

// Entfernung zwischen zwei Koordinaten berechnen (Haversine-Formel)
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371 // Erdradius in km
  const dLat = toRad(coord2.lat - coord1.lat)
  const dLon = toRad(coord2.lng - coord1.lng)
  const lat1 = toRad(coord1.lat)
  const lat2 = toRad(coord2.lat)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

function toRad(value: number): number {
  return (value * Math.PI) / 180
}

// Fahrzeugstatus validieren
export function isValidVehicleStatus(status: number): status is VehicleStatus {
  return status >= 0 && status <= 9 && Number.isInteger(status)
}

// Benutzer-Berechtigungen prüfen
export function hasPermission(user: User, resource: string, action: string): boolean {
  if (user.role === "administrator") return true

  return user.permissions.some((permission) => permission.resource === resource && permission.action === action)
}

// Fahrzeug-Verfügbarkeit prüfen
export function isVehicleAvailable(vehicle: Vehicle): boolean {
  return (
    vehicle.isOperational &&
    vehicle.status === 2 && // Frei auf Wache
    vehicle.crew.length > 0
  )
}

// Einsatz-Priorität zu Farbe
export function getPriorityColor(priority: EmergencyPriority): string {
  const colors = {
    low: "text-green-600 bg-green-50 border-green-200",
    medium: "text-yellow-600 bg-yellow-50 border-yellow-200",
    high: "text-orange-600 bg-orange-50 border-orange-200",
    critical: "text-red-600 bg-red-50 border-red-200",
  }
  return colors[priority] || colors.medium
}

// Status-Farbe für Fahrzeuge
export function getStatusColor(status: VehicleStatus): string {
  const colors = {
    0: "bg-red-600 text-white",
    1: "bg-green-500 text-white",
    2: "bg-green-600 text-white",
    3: "bg-blue-500 text-white",
    4: "bg-red-500 text-white",
    5: "bg-purple-500 text-white",
    6: "bg-gray-500 text-white",
    7: "bg-orange-500 text-white",
    8: "bg-cyan-500 text-white",
    9: "bg-gray-400 text-white",
  }
  return colors[status] || colors[2]
}

// Daten filtern
export function filterData<T>(data: T[], filters: FilterOptions, searchFields: (keyof T)[]): T[] {
  return data.filter((item) => {
    // Suchfilter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const matchesSearch = searchFields.some((field) => {
        const value = item[field]
        return typeof value === "string" && value.toLowerCase().includes(searchLower)
      })
      if (!matchesSearch) return false
    }

    // Status-Filter
    if (filters.status && filters.status.length > 0) {
      const itemStatus = (item as any).status
      if (!filters.status.includes(itemStatus)) return false
    }

    // Datum-Filter
    if (filters.dateFrom || filters.dateTo) {
      const itemDate = (item as any).createdAt || (item as any).timestamp
      if (itemDate) {
        const date = new Date(itemDate)
        if (filters.dateFrom && date < new Date(filters.dateFrom)) return false
        if (filters.dateTo && date > new Date(filters.dateTo)) return false
      }
    }

    return true
  })
}

// Daten sortieren
export function sortData<T>(data: T[], sort: SortOptions): T[] {
  return [...data].sort((a, b) => {
    const aValue = (a as any)[sort.field]
    const bValue = (b as any)[sort.field]

    if (aValue === bValue) return 0

    let comparison = 0
    if (typeof aValue === "string" && typeof bValue === "string") {
      comparison = aValue.localeCompare(bValue, "de")
    } else if (typeof aValue === "number" && typeof bValue === "number") {
      comparison = aValue - bValue
    } else if (aValue instanceof Date && bValue instanceof Date) {
      comparison = aValue.getTime() - bValue.getTime()
    } else {
      comparison = String(aValue).localeCompare(String(bValue), "de")
    }

    return sort.direction === "desc" ? -comparison : comparison
  })
}

// Paginierung
export function paginateData<T>(
  data: T[],
  page: number,
  limit: number,
): {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
} {
  const total = data.length
  const totalPages = Math.ceil(total / limit)
  const offset = (page - 1) * limit
  const paginatedData = data.slice(offset, offset + limit)

  return {
    data: paginatedData,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  }
}

// Eindeutige ID generieren
export function generateId(prefix = ""): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substr(2, 9)
  return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`
}

// Datei-Größe formatieren
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

// Telefonnummer formatieren
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "")

  if (cleaned.length === 11 && cleaned.startsWith("49")) {
    // Deutsche Nummer mit Ländercode
    return `+49 ${cleaned.substr(2, 3)} ${cleaned.substr(5, 3)} ${cleaned.substr(8)}`
  } else if (cleaned.length === 10) {
    // Deutsche Nummer ohne Ländercode
    return `${cleaned.substr(0, 3)} ${cleaned.substr(3, 3)} ${cleaned.substr(6)}`
  }

  return phone
}

// E-Mail validieren
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Passwort-Stärke prüfen
export function checkPasswordStrength(password: string): {
  score: number
  feedback: string[]
} {
  const feedback: string[] = []
  let score = 0

  if (password.length >= 8) score += 1
  else feedback.push("Mindestens 8 Zeichen")

  if (/[a-z]/.test(password)) score += 1
  else feedback.push("Kleinbuchstaben")

  if (/[A-Z]/.test(password)) score += 1
  else feedback.push("Großbuchstaben")

  if (/\d/.test(password)) score += 1
  else feedback.push("Zahlen")

  if (/[^a-zA-Z\d]/.test(password)) score += 1
  else feedback.push("Sonderzeichen")

  return { score, feedback }
}

// Debounce-Funktion
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Throttle-Funktion
export function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void {
  let inThrottle: boolean

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// Deep Clone
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as any
  if (obj instanceof Array) return obj.map((item) => deepClone(item)) as any
  if (typeof obj === "object") {
    const clonedObj = {} as any
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }
  return obj
}

// Objekte vergleichen
export function isEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true
  if (obj1 == null || obj2 == null) return false
  if (typeof obj1 !== typeof obj2) return false

  if (typeof obj1 === "object") {
    const keys1 = Object.keys(obj1)
    const keys2 = Object.keys(obj2)

    if (keys1.length !== keys2.length) return false

    for (const key of keys1) {
      if (!keys2.includes(key)) return false
      if (!isEqual(obj1[key], obj2[key])) return false
    }

    return true
  }

  return false
}

// Lokale Speicherung mit Fehlerbehandlung
export const storage = {
  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue || null
    } catch {
      return defaultValue || null
    }
  },

  set(key: string, value: any): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch {
      return false
    }
  },

  remove(key: string): boolean {
    try {
      localStorage.removeItem(key)
      return true
    } catch {
      return false
    }
  },

  clear(): boolean {
    try {
      localStorage.clear()
      return true
    } catch {
      return false
    }
  },
}

// Session Storage
export const sessionStorage = {
  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = window.sessionStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue || null
    } catch {
      return defaultValue || null
    }
  },

  set(key: string, value: any): boolean {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value))
      return true
    } catch {
      return false
    }
  },

  remove(key: string): boolean {
    try {
      window.sessionStorage.removeItem(key)
      return true
    } catch {
      return false
    }
  },
}

// Browser-Funktionen prüfen
export const browserSupport = {
  localStorage: typeof Storage !== "undefined",
  sessionStorage: typeof Storage !== "undefined",
  geolocation: "geolocation" in navigator,
  notifications: "Notification" in window,
  serviceWorker: "serviceWorker" in navigator,
  webRTC: "RTCPeerConnection" in window,
  webSockets: "WebSocket" in window,
  vibration: "vibrate" in navigator,
  wakeLock: "wakeLock" in navigator,
  share: "share" in navigator,
}

// Fehler-Logger
export function logError(error: Error, context?: string): void {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
  }

  console.error("Application Error:", errorInfo)

  // In Produktion: An Error-Tracking-Service senden
  if (process.env.NODE_ENV === "production") {
    // Hier würde normalerweise ein Service wie Sentry verwendet
    // sendToErrorTracking(errorInfo)
  }
}

// Performance-Messung
export function measurePerformance<T>(name: string, fn: () => T): T {
  const start = performance.now()
  const result = fn()
  const end = performance.now()

  console.log(`Performance [${name}]: ${(end - start).toFixed(2)}ms`)

  return result
}

// Async Performance-Messung
export async function measureAsyncPerformance<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now()
  const result = await fn()
  const end = performance.now()

  console.log(`Async Performance [${name}]: ${(end - start).toFixed(2)}ms`)

  return result
}
