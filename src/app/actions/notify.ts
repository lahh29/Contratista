'use server'

import { sendFCM, type NotifyEvent } from '@/lib/send-fcm'

export type { NotifyEvent }

/**
 * Server Action — sends a push notification to all registered devices.
 * Non-blocking: caller does not need to await.
 */
export async function sendNotification(event: NotifyEvent): Promise<void> {
  try {
    await sendFCM(event)
  } catch {
    // Notifications are non-critical — failures are silently ignored
  }
}
