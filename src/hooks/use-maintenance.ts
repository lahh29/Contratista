import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { useFirestore } from '@/firebase'

/**
 * Returns the list of page paths currently in maintenance mode.
 * Updates in real-time via Firestore snapshot.
 */
export function useMaintenance(): string[] {
  const db = useFirestore()
  const [disabled, setDisabled] = useState<string[]>([])

  useEffect(() => {
    if (!db) return
    const ref = doc(db, 'config', 'maintenance')
    const unsub = onSnapshot(ref, (snap) => {
      setDisabled(snap.exists() ? (snap.data().pages ?? []) : [])
    })
    return unsub
  }, [db])

  return disabled
}
