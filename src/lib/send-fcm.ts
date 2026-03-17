import { getMessaging } from 'firebase-admin/messaging'
import { getFirestore } from 'firebase-admin/firestore'
import { getAdminApp } from './firebase-admin'

export type NotifyEvent =
  | { type: 'entry';          companyName: string; areaName: string; personnelCount: number; vehiclePlates?: string }
  | { type: 'exit';           companyName: string; areaName: string }
  | { type: 'sua_expiring';   companyName: string; daysLeft: number; companyId?: string }
  | { type: 'new_contractor'; companyName: string }

/**
 * Audience control:
 * - 'all'              → every registered device (admins + contractors)
 * - 'admins'           → only devices whose role === 'admin'
 * - { companyId }      → admins + the contractor whose companyId matches
 */
export type Audience =
  | 'all'
  | 'admins'
  | { companyId: string }

function buildNotification(event: NotifyEvent): { title: string; body: string; url: string } {
  switch (event.type) {
    case 'entry':
      return {
        title: `🏢 Ingreso: ${event.companyName}`,
        body:  `${event.personnelCount} persona${event.personnelCount !== 1 ? 's' : ''} → ${event.areaName}${event.vehiclePlates ? ` · Placas: ${event.vehiclePlates}` : ''}`,
        url:   '/dashboard',
      }
    case 'exit':
      return {
        title: `✅ Salida: ${event.companyName}`,
        body:  `Ha salido del área: ${event.areaName}`,
        url:   '/dashboard',
      }
    case 'sua_expiring':
      return {
        title: event.daysLeft === 0
          ? `🚨 SUA vencido hoy: ${event.companyName}`
          : `⚠️ SUA por vencer: ${event.companyName}`,
        body: event.daysLeft === 0
          ? `El SUA de ${event.companyName} venció hoy. Requiere renovación inmediata.`
          : `Vence en ${event.daysLeft} día${event.daysLeft !== 1 ? 's' : ''}. Renueva antes de que expire.`,
        url:   '/contractors',
      }
    case 'new_contractor':
      return {
        title: `➕ Nueva empresa registrada`,
        body:  `${event.companyName} fue agregada al sistema.`,
        url:   '/contractors',
      }
  }
}

/** Default audience per event type. */
function defaultAudience(event: NotifyEvent): Audience {
  if (event.type === 'sua_expiring' && event.companyId) {
    return { companyId: event.companyId }
  }
  // entry/exit/new_contractor → only admins (contractors don't need ops alerts)
  return 'admins'
}

function tokenMatchesAudience(
  data: FirebaseFirestore.DocumentData,
  audience: Audience,
): boolean {
  if (audience === 'all') return true
  if (audience === 'admins') return data.role === 'admin'
  // { companyId } → admin OR matching contractor
  return data.role === 'admin' || (data.role === 'contractor' && data.companyId === audience.companyId)
}

/**
 * Sends an FCM push notification.
 * @param event   What happened
 * @param audience  Who should receive it (defaults based on event type)
 */
export async function sendFCM(
  event:    NotifyEvent,
  audience: Audience = defaultAudience(event),
): Promise<{ sent: number }> {
  const { title, body, url } = buildNotification(event)

  const app       = getAdminApp()
  const db        = getFirestore(app)
  const messaging = getMessaging(app)

  const tokensSnap = await db.collectionGroup('fcmTokens').get()

  // Filter tokens by audience
  const eligible: Array<{ token: string; ref: FirebaseFirestore.DocumentReference }> = []
  tokensSnap.forEach(docSnap => {
    const data = docSnap.data()
    if (typeof data.token === 'string' && data.token.length > 0 && tokenMatchesAudience(data, audience)) {
      eligible.push({ token: data.token, ref: docSnap.ref })
    }
  })

  console.log(`[sendFCM] ${event.type}: ${tokensSnap.size} token(s) in DB, ${eligible.length} match audience "${JSON.stringify(audience)}"`)
  if (eligible.length === 0) return { sent: 0 }

  const tokens    = eligible.map(e => e.token)
  const BATCH_SIZE = 500
  let sent = 0
  const staleRefs: FirebaseFirestore.DocumentReference[] = []

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const chunk      = eligible.slice(i, i + BATCH_SIZE)
    const chunkTokens = chunk.map(e => e.token)

    const res = await messaging.sendEachForMulticast({
      tokens: chunkTokens,
      notification: { title, body },
      webpush: {
        notification: {
          title,
          body,
          icon:               '/api/pwa-icon?size=192',
          badge:              '/api/pwa-icon?size=96',
          vibrate:            [200, 100, 200],
          requireInteraction: event.type === 'sua_expiring',
        },
        fcmOptions: { link: url },
      },
      data: { type: event.type, url },
    })

    sent += res.successCount

    // Collect stale/invalid tokens for cleanup
    res.responses.forEach((r, idx) => {
      if (!r.success) {
        const code = r.error?.code ?? ''
        console.warn(`[sendFCM] Token failed (${code}):`, r.error?.message)
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          staleRefs.push(chunk[idx].ref)
        }
      }
    })
  }

  // Auto-cleanup stale tokens
  if (staleRefs.length > 0) {
    const batch = db.batch()
    staleRefs.forEach(ref => batch.delete(ref))
    await batch.commit().catch(() => {/* non-critical */})
  }

  return { sent }
}
