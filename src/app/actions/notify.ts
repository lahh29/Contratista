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

async function persistNotification(event: NotifyEvent): Promise<void> {
  const { title, body, url } = buildNotification(event)
  const db = getFirestore(getAdminApp())
  await db.collection('notifications').add({
    type:      event.type,
    title,
    body,
    url,
    createdAt: FieldValue.serverTimestamp(),
    readBy:    [],
  })
}
