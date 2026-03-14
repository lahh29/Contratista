import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'
import { getFirestore } from 'firebase-admin/firestore'

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0]

  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey  = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const projectId   = 'contratistas-d30db'

  if (!clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin credentials in environment variables')
  }

  return initializeApp({ credential: cert({ clientEmail, privateKey, projectId }) }, 'admin')
}

// ── Notification payloads by event type ──────────────────────────────────────

type NotifyEvent =
  | { type: 'entry';      companyName: string; areaName: string; personnelCount: number; vehiclePlates?: string }
  | { type: 'exit';       companyName: string; areaName: string }
  | { type: 'sua_expiring'; companyName: string; daysLeft: number }
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
        title: `⚠️ SUA por vencer: ${event.companyName}`,
        body:  `El SUA vence en ${event.daysLeft} día${event.daysLeft !== 1 ? 's' : ''}. Renueva antes de que expire.`,
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

export async function POST(req: NextRequest) {
  try {
    const event: NotifyEvent = await req.json()
    const { title, body, url } = buildNotification(event)

    const adminApp = getAdminApp()
    const db       = getFirestore(adminApp)
    const messaging = getMessaging(adminApp)

    // Collect all FCM tokens from all users
    const tokensSnap = await db.collectionGroup('fcmTokens').get()
    const tokens: string[] = []
    tokensSnap.forEach(doc => {
      const t = doc.data().token
      if (t) tokens.push(t)
    })

    if (tokens.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No tokens registered' })
    }

    // Send in batches of 500 (FCM limit)
    const BATCH = 500
    let sent = 0
    for (let i = 0; i < tokens.length; i += BATCH) {
      const batch = tokens.slice(i, i + BATCH)
      const res = await messaging.sendEachForMulticast({
        tokens: batch,
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

    return NextResponse.json({ sent })
  } catch (err: any) {
    console.error('[notify]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
