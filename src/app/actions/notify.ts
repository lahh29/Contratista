'use server'

import { sendFCM } from '@/lib/send-fcm'
import type { NotifyEvent } from '@/lib/send-fcm'

/**
 * Server Action — sends a push notification to all registered devices.
 * Non-blocking: caller does not need to await.
 */
export async function sendNotification(event: NotifyEvent): Promise<void> {
  try {
    const { sent } = await sendFCM(event)
    console.log(`[notify] ${event.type} → ${sent} device(s) notified`)
  } catch (err) {
    console.error('[notify] Failed to send notification:', err)
  }
}
