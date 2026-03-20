'use client'

import { useState, useEffect, useRef } from 'react'
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, limit, getDoc } from 'firebase/firestore'
import { useFirestore, useUser } from '@/firebase'
import type { AppUser } from '@/types'

/**
 * Returns the authenticated user enriched with their Firestore profile
 * (role + companyId). Uses onSnapshot so role changes reflect immediately
 * without a page reload. On first login, creates an 'admin' profile.
 */
export function useAppUser() {
  const { user, loading: authLoading } = useUser()
  const db = useFirestore()
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const loginRecorded = useRef(
    typeof sessionStorage !== 'undefined' && sessionStorage.getItem('vp_login_recorded') === '1'
  )

  useEffect(() => {
    if (authLoading) return
    if (!user || !db) {
      setAppUser(null)
      setLoading(false)
      return
    }

    const ref = doc(db, 'users', user.uid)

    const unsubscribe = onSnapshot(
      ref,
      async (snap) => {
        if (snap.exists()) {
          // Registrar lastLoginAt una sola vez por sesión
          if (!loginRecorded.current) {
            loginRecorded.current = true
            sessionStorage.setItem('vp_login_recorded', '1')
            updateDoc(ref, { lastLoginAt: serverTimestamp() }).catch(() => {})
          }
          const data = snap.data()
          const role: AppUser['role'] =
            data.role === 'contractor' ? 'contractor' :
            data.role === 'guard'      ? 'guard'      :
            data.role === 'seguridad'  ? 'seguridad'  :
            data.role === 'logistica'  ? 'logistica'  : 'admin'
          let companyId: string | undefined = data.companyId ?? undefined

          // If contractor has no companyId yet, try to auto-link by email
          if (role === 'contractor' && !companyId && user.email) {
            try {
              const q = query(
                collection(db, 'companies'),
                where('email', '==', user.email.toLowerCase().trim()),
                limit(1),
              )
              const companySnap = await getDocs(q)
              if (!companySnap.empty) {
                companyId = companySnap.docs[0].id
                await updateDoc(ref, { companyId })
              }
            } catch (e) {
              console.error('[auto-link] failed:', e)
            }
          }

          setAppUser({
            uid:         user.uid,
            email:       user.email,
            role,
            companyId,
            displayName: data.displayName ?? undefined,
            name:        data.name       ?? undefined,
            position:    data.position   ?? undefined,
          })
        } else {
          // First login — try to auto-link by email to an existing company
          let companyId: string | undefined
          if (user.email) {
            try {
              const q = query(
                collection(db, 'companies'),
                where('email', '==', user.email.toLowerCase().trim()),
                limit(1),
              )
              const snap = await getDocs(q)
              if (!snap.empty) companyId = snap.docs[0].id
            } catch (e) {
              console.error('[auto-link first login] failed:', e)
            }
          }
          const profile = {
            email:       user.email,
            role:        'contractor' as const,
            displayName: user.displayName ?? undefined,
            ...(companyId ? { companyId } : {}),
          }
          try {
            await setDoc(ref, profile)
          } catch {
            // ignore
          }
          setAppUser({ uid: user.uid, ...profile })
        }
        setLoading(false)
      },
      () => {
        // Firestore unavailable — fallback to admin to not lock out the user
        setAppUser({ uid: user.uid, email: user.email, role: 'admin' })
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [user, db, authLoading])

  return { appUser, loading }
}
