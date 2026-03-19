'use server'

import { getAdminApp } from '@/lib/firebase-admin'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

export async function verifyAuditPassword(password: string): Promise<boolean> {
  return password === process.env.AUDIT_PASSWORD
}

export async function recordLogin(uid: string, email: string): Promise<void> {
  try {
    const db  = getFirestore(getAdminApp())
    const now = FieldValue.serverTimestamp()
    // Fetch name + role from users collection
    const userSnap = await db.collection('users').doc(uid).get()
    const userData = userSnap.data() ?? {}
    const name = userData.name ?? userData.displayName ?? email
    const role = userData.role ?? 'unknown'
    await Promise.all([
      db.collection('users').doc(uid).set({ lastLoginAt: now }, { merge: true }),
      db.collection('auditLog').add({
        action:     'user.login',
        actorUid:   uid,
        actorName:  name,
        actorRole:  role,
        targetType: 'user',
        targetId:   uid,
        targetName: name,
        timestamp:  now,
      }),
    ])
  } catch (err) {
    console.error('[audit] Failed to record login:', err)
  }
}

export async function logAudit(entry: {
  action: string
  actorUid: string
  actorName: string
  actorRole: string
  targetType: string
  targetId: string
  targetName?: string
  details?: Record<string, unknown>
}): Promise<void> {
  try {
    const db = getFirestore(getAdminApp())
    await db.collection('auditLog').add({
      ...entry,
      timestamp: FieldValue.serverTimestamp(),
    })
  } catch (err) {
    console.error('[audit] Failed to log entry:', err)
  }
}
