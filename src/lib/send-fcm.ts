import { getMessaging } from 'firebase-admin/messaging'
import { getFirestore } from 'firebase-admin/firestore'
import { getAdminApp } from './firebase-admin'

export type NotifyEvent =
  | { type: 'entry';          companyName: string; areaName: string; personnelCount: number; vehiclePlates?: string }
  | { type: 'exit';           companyName: string; areaName: string }
  | { type: 'sua_expiring';   companyName: string; daysLeft: number }
  | { type: 'new_contractor'; companyName: string }

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

/**
 * Sends an FCM push notification to all registered devices.
 * Fire-and-forget: errors are logged but not thrown.
 */
export async function sendFCM(event: NotifyEvent): Promise<{ sent: number }> {
  const { title, body, url } = buildNotification(event)

  const app       = getAdminApp()
  const db        = getFirestore(app)
  const messaging = getMessaging(app)

  const tokensSnap = await db.collectionGroup('fcmTokens').get()
  const tokens: string[] = []
  tokensSnap.forEach(doc => {
    const t = doc.data().token
    if (typeof t === 'string' && t.length > 0) tokens.push(t)
  })

  if (tokens.length === 0) return { sent: 0 }

  const BATCH_SIZE = 500 // FCM multicast limit
  let sent = 0

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const res = await messaging.sendEachForMulticast({
      tokens: tokens.slice(i, i + BATCH_SIZE),
      notification: { title, body },
      webpush: {
        notification: {
          title,
          body,
          icon:  '/api/pwa-icon?size=192',
          badge: '/api/pwa-icon?size=96',
          vibrate: [200, 100, 200],
          requireInteraction: event.type === 'sua_expiring',
        },
        fcmOptions: { link: url },
      },
      data: { type: event.type, url },
    })
    sent += res.successCount
  }

  return { sent }
}
