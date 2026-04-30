'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore'
import { useFirestore } from '@/firebase'
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

export function CompaniesProvider({ children }: { children: ReactNode }) {
  const db = useFirestore()
  const [companies, setCompanies] = useState<DocumentData[] | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!db) return
    setLoading(true)
    try {
      const snap = await getDocs(
        query(collection(db, 'companies'), orderBy('createdAt', 'desc'), limit(MAX_COMPANIES))
      )
      setCompanies(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch {
      setCompanies([])
    } finally {
      setLoading(false)
    }
  }, [db])

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
