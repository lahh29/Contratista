import type { Timestamp } from 'firebase/firestore'

export interface AppUser {
  uid: string
  email: string | null
  role: 'admin' | 'contractor' | 'guard'
  companyId?: string   // Only for contractors — links to companies/{companyId}
  displayName?: string
  name?: string
  position?: string
}

export interface Company {
  id: string
  name: string
  contact?: string
  phone?: string
  email?: string   // Email del contratista — usado para auto-vincular su cuenta al portal
  status?: 'Active' | 'Blocked'
  personnelCount?: number
  vehicle?: string
  sua?: {
    status?: 'Valid' | 'Expired' | 'Pending'
    validUntil?: string
    number?: string
  }
  qrCode?: string
  createdAt?: Timestamp
  defaultAreaId?: string
  defaultSupervisorId?: string
}

export interface Visit {
  id: string
  companyId?: string
  companyName?: string
  areaId?: string
  areaName?: string
  supervisorId?: string
  supervisorName?: string
  personnelCount?: number
  vehiclePlates?: string
  safetyEquipment?: { shoes: boolean; vest: boolean }
  status: 'Active' | 'Completed'
  entryTime?: Timestamp
  exitTime?: Timestamp
  createdAt?: Timestamp
  qrCode?: string
}

export interface Area {
  id: string
  name: string
  restricted?: boolean
  supervisorId?: string   // Encargado por defecto del área
}

export interface Supervisor {
  id: string
  name: string
}

export interface AuditEntry {
  id: string
  action: string
  actorUid: string
  actorName: string
  actorRole: string
  targetType: string
  targetId: string
  targetName?: string
  details?: Record<string, unknown>
  timestamp: Timestamp
}

export interface AppNotification {
  id: string
  type: string
  title: string
  body: string
  url: string
  createdAt: Timestamp
  readBy: string[]
}
