import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getAdminApp } from '@/lib/firebase-admin'
import { sendFCM } from '@/lib/send-fcm'

/** Visits active longer than this many hours trigger a notification. */
const PROLONGED_HOURS = 8

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getFirestore(getAdminApp())
  const thresholdMs = PROLONGED_HOURS * 60 * 60 * 1000
  const now = Date.now()

  const activeSnap = await db
    .collection('visits')
    .where('status', '==', 'Activa')
    .get()

  const results = { checked: 0, notified: 0, errors: [] as string[] }

  for (const visitDoc of activeSnap.docs) {
    results.checked++
    const visit = visitDoc.data()

    // Skip if already notified for prolonged stay
    if (visit.prolongedNotifiedAt) continue

    const entryTime: FirebaseFirestore.Timestamp | undefined = visit.entryTime
    if (!entryTime) continue

    const elapsedMs = now - entryTime.toMillis()
    if (elapsedMs < thresholdMs) continue

    const hoursOnSite = Math.floor(elapsedMs / (60 * 60 * 1000))

    try {
      await sendFCM({
        type:        'prolonged_visit',
        companyName: visit.companyName ?? 'Empresa desconocida',
        areaName:    visit.areaName    ?? '—',
        hoursOnSite,
      })
      await visitDoc.ref.update({ prolongedNotifiedAt: FieldValue.serverTimestamp() })
      results.notified++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.errors.push(`${visit.companyName}: ${msg}`)
    }
  }

  return NextResponse.json({
    ok: true,
    prolongedHours: PROLONGED_HOURS,
    ...results,
    ...(results.errors.length === 0 && { errors: undefined }),
  })
}
