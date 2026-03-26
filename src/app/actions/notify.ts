'use server'

import { sendFCM, buildNotification } from '@/lib/send-fcm'
import type { NotifyEvent } from '@/lib/send-fcm'
import { getAdminApp } from '@/lib/firebase-admin'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

/**
 * Server Action — sends a push notification and persists it to Firestore.
 * Non-blocking: caller does not need to await.
 */
export async function sendNotification(event: NotifyEvent): Promise<void> {
  try {
    const [{ sent }] = await Promise.all([
      sendFCM(event),
      persistNotification(event),
    ])
    console.log(`[notify] ${event.type} → ${sent} device(s) notified`)
  } catch (err) {
    console.error('[notify] Failed to send notification:', err)
  }
}

function getRolesForEvent(event: NotifyEvent): string[] {
  switch (event.type) {
    case 'entry':
    case 'exit':
    case 'restricted_area':
      return ['admin', 'seguridad']
    case 'sua_renewal_request':
      return ['admin', 'seguridad']
    case 'baja_registered':
      return ['admin', 'guard']
    case 'smoker_exit':
    case 'smoker_return':
      return ['admin', 'seguridad']
    case 'over_capacity':
    case 'prolonged_visit':
    case 'new_contractor':
    case 'delete_contractor':
    case 'blocked_contractor':
    case 'unblocked_contractor':
    case 'sua_renewed':
    case 'sua_expiring':
    default:
      return ['admin']
  }
}

async function persistNotification(event: NotifyEvent): Promise<void> {
  const { title, body, url } = buildNotification(event)
  const db = getFirestore(getAdminApp())
  await db.collection('notifications').add({
    type:      event.type,
    title,
    body,
    url,
    roles:     getRolesForEvent(event),
    createdAt: FieldValue.serverTimestamp(),
    readBy:    [],
  })
}
