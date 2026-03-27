import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getAdminApp } from '@/lib/firebase-admin'
import { sendFCM } from '@/lib/send-fcm'

const TZ = 'America/Mexico_City'

/** How many minutes before the scheduled time to send the reminder. */
const LEAD_MINUTES = 30

// ── Timezone helpers ──────────────────────────────────────────────────────────

/** Returns today's date string as YYYY-MM-DD in Mexico City time. */
function getTodayMX(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/**
 * Returns the current time as minutes elapsed since midnight in Mexico City.
 * e.g. 14:35 → 875
 */
function getCurrentMinuteMX(): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())

  const hour   = Number(parts.find(p => p.type === 'hour')?.value   ?? 0)
  const minute = Number(parts.find(p => p.type === 'minute')?.value ?? 0)
  return hour * 60 + minute
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db          = getFirestore(getAdminApp())
  const todayStr    = getTodayMX()
  const currentMin  = getCurrentMinuteMX()
  const windowStart = currentMin
  const windowEnd   = currentMin + LEAD_MINUTES

  const snap = await db
    .collection('visits')
    .where('status',        '==', 'Programada')
    .where('scheduledDate', '==', todayStr)
    .get()

  const results = { checked: 0, notified: 0, skipped: 0, errors: [] as string[] }

  for (const visitDoc of snap.docs) {
    results.checked++
    const visit = visitDoc.data()

    // Skip visits already reminded
    if (visit.reminderNotifiedAt) {
      results.skipped++
      continue
    }

    // Skip visits without a specific time (date-only bookings)
    const scheduledTime: string | undefined = visit.scheduledTime
    if (!scheduledTime || !/^\d{2}:\d{2}$/.test(scheduledTime)) {
      results.skipped++
      continue
    }

    const [hh, mm]      = scheduledTime.split(':').map(Number)
    const visitMinute   = hh * 60 + mm
    const minutesUntil  = visitMinute - windowStart

    // Only notify if the visit falls within the look-ahead window
    if (minutesUntil < 0 || minutesUntil > windowEnd - windowStart) {
      results.skipped++
      continue
    }

    try {
      await sendFCM({
        type:          'scheduled_visit_reminder',
        companyName:   visit.companyName   ?? 'Empresa desconocida',
        areaName:      visit.areaName      ?? '—',
        scheduledTime,
        personnelCount: visit.personnelCount ?? 1,
        companyId:     visit.companyId     ?? '',
      })
      await visitDoc.ref.update({ reminderNotifiedAt: FieldValue.serverTimestamp() })
      results.notified++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.errors.push(`${visit.companyName}: ${msg}`)
    }
  }

  return NextResponse.json({
    ok:          true,
    date:        todayStr,
    tz:          TZ,
    windowStart: `${String(Math.floor(windowStart / 60)).padStart(2, '0')}:${String(windowStart % 60).padStart(2, '0')}`,
    windowEnd:   `${String(Math.floor(windowEnd   / 60)).padStart(2, '0')}:${String(windowEnd   % 60).padStart(2, '0')}`,
    ...results,
    ...(results.errors.length === 0 && { errors: undefined }),
  })
}
