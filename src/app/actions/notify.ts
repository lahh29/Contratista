'use server'

import { sendFCM, buildNotification } from '@/lib/send-fcm'
import type { NotifyEvent } from '@/lib/send-fcm'
import { getAdminApp } from '@/lib/firebase-admin'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

/**
 * Server Action — dispara notificación push y persiste en Firestore.
 *
 * IMPORTANTE: Esta función NUNCA debe lanzar una excepción hacia el cliente.
 * Cualquier fallo en el envío es secundario a la acción principal del usuario
 * (registrar salida / regreso). Los errores se loguean en el servidor.
 *
 * El trabajo se ejecuta con await para que el runtime serverless (Vercel)
 * NO congele/mate el Lambda antes de que termine el envío FCM.
 * Los callers ya usan `.catch(() => {})` sin await, así que la UI no se bloquea.
 */
export async function sendNotification(event: NotifyEvent): Promise<void> {
  try {
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY
    if (!clientEmail || !privateKey) {
      console.warn('[notify] Skipped — FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY not set in environment')
      return
    }

    const [{ sent }] = await Promise.all([
      sendFCM(event),
      persistNotification(event),
    ])
    console.log(`[notify] ${event.type} → ${sent} device(s) notified`)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[notify] Failed for event "${event.type}": ${message}`)
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
    case 'smoker_denied_meal':
      return ['admin', 'seguridad']
    case 'scheduled_visit_reminder':
      return ['admin', 'seguridad', 'guard']
    case 'over_capacity':
    case 'prolonged_visit':
    case 'new_contractor':
    case 'delete_contractor':
    case 'blocked_contractor':
    case 'unblocked_contractor':
    case 'sua_renewed':
    case 'sua_expiring':
    case 'daily_summary':
    default:
      return ['admin']
  }
}

async function persistNotification(event: NotifyEvent): Promise<void> {
  const { title, body, url } = buildNotification(event)
  const db = getFirestore(getAdminApp())
  await db.collection('notifications').add({
    type: event.type,
    title,
    body,
    url,
    roles: getRolesForEvent(event),
    createdAt: FieldValue.serverTimestamp(),
    readBy: [],
  })
}
