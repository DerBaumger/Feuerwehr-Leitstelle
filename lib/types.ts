// Basis-Typen
export type UserRole = "administrator" | "dispatcher" | "firefighter" | "chief" | "observer"
export type EmergencyPriority = "low" | "medium" | "high" | "critical"
export type EmergencyStatus = "active" | "completed" | "cancelled" | "pending"
export type VehicleStatus = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
export type NotificationLevel = "info" | "warning" | "error" | "success"

// Benutzer-Interface
export interface User {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  station: string
  authorizedVehicles: string[]
  permissions: Permission[]
  active: boolean
  lastLogin?: string
  createdAt: string
  updatedAt: string
  profileImage?: string
  phoneNumber?: string
  emergencyContact?: string
  certifications: Certification[]
  preferences: UserPreferences
}

// Berechtigungen
export interface Permission {
  id: string
  name: string
  description: string
  resource: string
  action: string
}

// Zertifizierungen
export interface Certification {
  id: string
  name: string
  issuedBy: string
  issuedDate: string
  expiryDate?: string
  certificateNumber: string
  isValid: boolean
}

// Benutzer-Einstellungen
export interface UserPreferences {
  theme: "light" | "dark" | "auto"
  language: "de" | "en"
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
    sound: boolean
  }
  dashboard: {
    layout: string
    widgets: string[]
  }
}

// Fahrzeug-Interface
export interface Vehicle {
  id: string
  callSign: string
  speechCallSign?: string
  type: VehicleType
  station: string
  status: VehicleStatus
  location: string
  coordinates?: Coordinates
  crew: CrewMember[]
  equipment: Equipment[]
  lastUpdate: string
  lastMaintenance?: string
  nextMaintenance?: string
  fuelLevel?: number
  mileage?: number
  isOperational: boolean
  notes?: string
  images?: string[]
}

// Fahrzeugtyp
export interface VehicleType {
  id: string
  name: string
  category: "fire" | "rescue" | "medical" | "support" | "command"
  description: string
  standardEquipment: string[]
  requiredCertifications: string[]
  capacity: {
    crew: number
    water?: number
    foam?: number
    equipment?: number
  }
}

// Besatzungsmitglied
export interface CrewMember {
  userId: string
  username: string
  role: "driver" | "commander" | "firefighter" | "medic"
  joinedAt: string
  certifications: string[]
}

// Ausrüstung
export interface Equipment {
  id: string
  name: string
  type: string
  status: "available" | "in-use" | "maintenance" | "defective"
  lastChecked?: string
  nextCheck?: string
  serialNumber?: string
  notes?: string
}

// Einsatz-Interface
export interface Emergency {
  id: string
  incidentNumber: string
  title: string
  description: string
  location: string
  coordinates: Coordinates
  priority: EmergencyPriority
  status: EmergencyStatus
  category: EmergencyCategory
  createdAt: string
  updatedAt: string
  completedAt?: string
  cancelledAt?: string
  assignedVehicles: string[]
  assignedPersonnel: string[]
  reportedBy: ContactInfo
  estimatedDuration?: number
  actualDuration?: number
  resources: ResourceRequirement[]
  timeline: TimelineEntry[]
  documents: Document[]
  images: string[]
  weather?: WeatherInfo
  hazards: Hazard[]
  casualties?: CasualtyInfo[]
  damageAssessment?: DamageAssessment
  afterActionReport?: string
}

// Einsatzkategorie
export interface EmergencyCategory {
  id: string
  name: string
  code: string
  description: string
  defaultPriority: EmergencyPriority
  requiredVehicleTypes: string[]
  standardProcedures: string[]
  estimatedResponseTime: number
}

// Koordinaten
export interface Coordinates {
  lat: number
  lng: number
  accuracy?: number
  altitude?: number
}

// Kontaktinformationen
export interface ContactInfo {
  name?: string
  phone?: string
  email?: string
  address?: string
}

// Ressourcenanforderung
export interface ResourceRequirement {
  type: "vehicle" | "personnel" | "equipment" | "external"
  description: string
  quantity: number
  priority: "low" | "medium" | "high"
  status: "requested" | "assigned" | "en-route" | "on-scene" | "completed"
  requestedAt: string
  assignedAt?: string
  arrivedAt?: string
}

// Timeline-Eintrag
export interface TimelineEntry {
  id: string
  timestamp: string
  type: "status-change" | "resource-assignment" | "communication" | "action" | "note"
  description: string
  user: string
  data?: any
}

// Dokument
export interface Document {
  id: string
  name: string
  type: string
  url: string
  uploadedBy: string
  uploadedAt: string
  size: number
  description?: string
}

// Wetter-Information
export interface WeatherInfo {
  temperature: number
  humidity: number
  windSpeed: number
  windDirection: number
  visibility: number
  conditions: string
  timestamp: string
}

// Gefahr
export interface Hazard {
  id: string
  type: string
  description: string
  severity: "low" | "medium" | "high" | "critical"
  location?: string
  mitigationActions: string[]
  status: "identified" | "mitigated" | "resolved"
}

// Verletzte/Betroffene
export interface CasualtyInfo {
  count: number
  severity: {
    minor: number
    moderate: number
    severe: number
    fatal: number
  }
  transported: number
  treatedOnScene: number
}

// Schadensbewertung
export interface DamageAssessment {
  structuralDamage: "none" | "minor" | "moderate" | "severe" | "total"
  estimatedCost?: number
  affectedArea?: number
  description: string
  images: string[]
}

// Wache-Interface
export interface Station {
  id: string
  name: string
  code: string
  address: string
  coordinates: Coordinates
  description: string
  type: "main" | "volunteer" | "professional" | "combined"
  capacity: {
    vehicles: number
    personnel: number
  }
  facilities: Facility[]
  contactInfo: ContactInfo
  operatingHours: OperatingHours
  coverage: CoverageArea
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Einrichtung
export interface Facility {
  type: string
  description: string
  capacity?: number
  isAvailable: boolean
}

// Betriebszeiten
export interface OperatingHours {
  monday: TimeSlot[]
  tuesday: TimeSlot[]
  wednesday: TimeSlot[]
  thursday: TimeSlot[]
  friday: TimeSlot[]
  saturday: TimeSlot[]
  sunday: TimeSlot[]
  holidays: TimeSlot[]
}

export interface TimeSlot {
  start: string
  end: string
  type: "regular" | "standby" | "emergency-only"
}

// Einsatzgebiet
export interface CoverageArea {
  primary: GeoArea[]
  secondary: GeoArea[]
  mutual_aid: GeoArea[]
}

export interface GeoArea {
  name: string
  coordinates: Coordinates[]
  population?: number
  riskLevel: "low" | "medium" | "high"
}

// Status-Log
export interface StatusLogEntry {
  id: string
  vehicleId: string
  vehicleCallSign: string
  oldStatus: VehicleStatus
  newStatus: VehicleStatus
  timestamp: string
  userId: string
  location?: Coordinates
  confirmed: boolean
  confirmationMethod?: "manual" | "automatic" | "gps"
  previousStatus?: VehicleStatus
  jSprechSent?: boolean
  duration?: number
  notes?: string
}

// Kommunikation
export interface CommunicationLog {
  id: string
  type: "radio" | "phone" | "digital" | "face-to-face"
  from: string
  to: string
  message: string
  timestamp: string
  emergencyId?: string
  priority: "routine" | "urgent" | "emergency"
  channel?: string
  acknowledged: boolean
  acknowledgedAt?: string
  acknowledgedBy?: string
}

// Benachrichtigung
export interface Notification {
  id: string
  type: "emergency" | "status" | "system" | "maintenance" | "training"
  title: string
  message: string
  level: NotificationLevel
  timestamp: string
  userId?: string
  emergencyId?: string
  read: boolean
  readAt?: string
  actions?: NotificationAction[]
  expiresAt?: string
}

export interface NotificationAction {
  id: string
  label: string
  action: string
  style: "primary" | "secondary" | "danger"
}

// System-Konfiguration
export interface SystemConfig {
  id: string
  category: string
  key: string
  value: any
  description: string
  type: "string" | "number" | "boolean" | "object" | "array"
  isPublic: boolean
  updatedBy: string
  updatedAt: string
}

// Audit-Log
export interface AuditLog {
  id: string
  action: string
  resource: string
  resourceId: string
  userId: string
  timestamp: string
  ipAddress: string
  userAgent: string
  changes?: {
    before: any
    after: any
  }
  metadata?: any
}

// Backup-Information
export interface BackupInfo {
  id: string
  filename: string
  size: number
  createdAt: string
  createdBy: string
  type: "manual" | "automatic" | "scheduled"
  status: "creating" | "completed" | "failed"
  description?: string
  checksum: string
}

// API Response Typen
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
  requestId: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Filter und Sortierung
export interface FilterOptions {
  search?: string
  status?: string[]
  dateFrom?: string
  dateTo?: string
  station?: string[]
  priority?: string[]
  category?: string[]
}

export interface SortOptions {
  field: string
  direction: "asc" | "desc"
}

// Dashboard-Widgets
export interface DashboardWidget {
  id: string
  type: string
  title: string
  position: {
    x: number
    y: number
    width: number
    height: number
  }
  config: any
  isVisible: boolean
}

// Statistiken
export interface Statistics {
  period: {
    start: string
    end: string
  }
  emergencies: {
    total: number
    byPriority: Record<EmergencyPriority, number>
    byCategory: Record<string, number>
    byStatus: Record<EmergencyStatus, number>
    averageResponseTime: number
    averageDuration: number
  }
  vehicles: {
    total: number
    available: number
    inUse: number
    outOfService: number
    byType: Record<string, number>
  }
  personnel: {
    total: number
    onDuty: number
    available: number
    inTraining: number
  }
  performance: {
    responseTimeCompliance: number
    equipmentReadiness: number
    personnelReadiness: number
  }
}

// Konstanten
export const STATUS_LABELS: Record<VehicleStatus, string> = {
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

export const STATUS_COLORS: Record<VehicleStatus, string> = {
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

export const EMERGENCY_PRIORITY_COLORS: Record<EmergencyPriority, string> = {
  low: "bg-green-100 text-green-800 border-green-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  critical: "bg-red-100 text-red-800 border-red-200",
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  administrator: "Administrator",
  dispatcher: "Disponent",
  firefighter: "Feuerwehrmann",
  chief: "Wehrführer",
  observer: "Beobachter",
}
