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
 */
export async function sendNotification(event: NotifyEvent): Promise<void> {
  // Ejecutar de forma completamente asíncrona y silenciosa.
  // Usamos void + Promise para que Next.js no espere la resolución
  // y el Server Action del llamador regrese de inmediato.
  void (async () => {
    try {
      // Verificar credenciales antes de intentar cualquier operación
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
      // Loguear con contexto pero nunca relanzar
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[notify] Failed for event "${event.type}": ${message}`)
    }
  })()
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
