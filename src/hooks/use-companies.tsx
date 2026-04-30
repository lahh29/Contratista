'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { collection, getDocs, query, limit } from 'firebase/firestore'
import { useFirestore } from '@/firebase'
import { useAppUser } from '@/hooks/use-app-user'
import type { DocumentData } from 'firebase/firestore'

interface CompaniesContextValue {
  companies: DocumentData[] | null
  loading: boolean
  refresh: () => Promise<void>
}

const CompaniesContext = createContext<CompaniesContextValue>({
  companies: null,
  loading: true,
  refresh: async () => {},
})

const MAX_COMPANIES = 500

const ROLES_WITH_COMPANIES_ACCESS = new Set(['admin', 'guard', 'seguridad', 'logistica', 'contractor'])

export function CompaniesProvider({ children }: { children: ReactNode }) {
  const db = useFirestore()
  const { appUser, loading: userLoading } = useAppUser()
  const [companies, setCompanies] = useState<DocumentData[] | null>(null)
  const [loading, setLoading] = useState(true)

  const canAccess = appUser ? ROLES_WITH_COMPANIES_ACCESS.has(appUser.role) : false

  const refresh = useCallback(async () => {
    if (!db || userLoading) return
    if (!canAccess) {
      setCompanies([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const snap = await getDocs(
        query(collection(db, 'companies'), limit(MAX_COMPANIES))
      )
      setCompanies(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch {
      setCompanies([])
    } finally {
      setLoading(false)
    }
  }, [db, canAccess, userLoading])

  useEffect(() => { refresh() }, [refresh])

  return (
    <CompaniesContext.Provider value={{ companies, loading, refresh }}>
      {children}
    </CompaniesContext.Provider>
  )
}

export function useCompanies() {
  return useContext(CompaniesContext)
}
