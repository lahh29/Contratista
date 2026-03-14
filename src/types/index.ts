import type { Timestamp } from 'firebase/firestore'

export interface Company {
  id: string
  name: string
  contact?: string
  phone?: string
  status?: 'Active' | 'Blocked'
  personnelCount?: number
  sua?: {
    status?: 'Valid' | 'Expired' | 'Pending'
    validUntil?: string
  }
  qrCode?: string
  createdAt?: Timestamp
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
  status: 'Active' | 'Completed'
  entryTime?: Timestamp
  exitTime?: Timestamp
  createdAt?: Timestamp
  qrCode?: string
}

export interface Area {
  id: string
  name: string
}

export interface Supervisor {
  id: string
  name: string
}
