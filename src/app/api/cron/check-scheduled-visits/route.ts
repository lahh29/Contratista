import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getAdminApp } from '@/lib/firebase-admin'
import { sendFCM } from '@/lib/send-fcm'

const TZ = 'America/Mexico_City'

/** Returns today's date string as YYYY-MM-DD in Mexico City time. */
function getTodayMX(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

// ── Route handler ─────────────────────────────────────────────────────────────
// Runs once per day at 07:00 MX (13:00 UTC). Sends reminders for every
// visit with status 'Programada' scheduled for today that hasn't been notified yet.

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db       = getFirestore(getAdminApp())
  const todayStr = getTodayMX()

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

    try {
      await sendFCM({
        type:           'scheduled_visit_reminder',
        companyName:    visit.companyName    ?? 'Empresa desconocida',
        areaName:       visit.areaName       ?? '—',
        scheduledTime:  visit.scheduledTime  ?? '',
        personnelCount: visit.personnelCount ?? 1,
        companyId:      visit.companyId      ?? '',
      })
      await visitDoc.ref.update({ reminderNotifiedAt: FieldValue.serverTimestamp() })
      results.notified++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.errors.push(`${visit.companyName}: ${msg}`)
    }
  }

  return NextResponse.json({
    ok:      true,
    date:    todayStr,
    tz:      TZ,
    ...results,
    ...(results.errors.length === 0 && { errors: undefined }),
  })
}
