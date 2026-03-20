import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, FieldValue, type WriteResult } from 'firebase-admin/firestore'
import { getAdminApp } from '@/lib/firebase-admin'
import { sendFCM } from '@/lib/send-fcm'

// ── Timezone helpers ─────────────────────────────────────────────────────────

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

/**
 * Returns the number of calendar days between today and a YYYY-MM-DD date.
 * Negative = already expired.
 */
function daysUntilExpiry(validUntil: string, todayStr: string): number {
  const [ty, tm, td] = todayStr.split('-').map(Number)
  const [vy, vm, vd] = validUntil.split('-').map(Number)
  const today  = new Date(ty, tm - 1, td)
  const expiry = new Date(vy, vm - 1, vd)
  return Math.round((expiry.getTime() - today.getTime()) / 864e5)
}

/** Returns a date string as YYYY-MM-DD in Mexico City time from a Firestore Timestamp. */
function timestampToMXDate(ts: FirebaseFirestore.Timestamp): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ts.toDate())
}

// ── Notification thresholds (days before expiry) ─────────────────────────────
// Day 0 = expiry day itself
const NOTIFY_THRESHOLDS = new Set([15, 7, 3, 1, 0])

// ── Batch helper (Firestore batch max = 500 ops) ──────────────────────────────
async function commitInBatches(
  db: FirebaseFirestore.Firestore,
  ops: Array<{ ref: FirebaseFirestore.DocumentReference; data: Record<string, FirebaseFirestore.FieldValue | string | number | boolean | null> }>
): Promise<void> {
  const BATCH_SIZE = 499
  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const batch = db.batch()
    ops.slice(i, i + BATCH_SIZE).forEach(({ ref, data }) => batch.update(ref, data))
    await batch.commit()
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Security: Vercel automatically passes Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = getTodayMX()
  const db    = getFirestore(getAdminApp())

  const companiesSnap = await db.collection('companies').get()

  const pending: Array<{ ref: FirebaseFirestore.DocumentReference; data: Record<string, FirebaseFirestore.FieldValue | string | number | boolean | null> }> = []
  const results = { processed: 0, statusUpdated: 0, notified: 0, skipped: 0, errors: [] as string[] }

  for (const companyDoc of companiesSnap.docs) {
    results.processed++
    const company   = companyDoc.data()
    const validUntil: string | undefined = company.sua?.validUntil

    // Skip companies without a SUA expiry date
    if (!validUntil || !/^\d{4}-\d{2}-\d{2}$/.test(validUntil)) {
      results.skipped++
      continue
    }

    try {
      const days      = daysUntilExpiry(validUntil, today)
      const newStatus = days < 0 ? 'Expired' : 'Valid'
      const update: Record<string, FirebaseFirestore.FieldValue | string | number | boolean | null> = {}

      // 1. Auto-update SUA status when it changes
      if (company.sua?.status !== newStatus) {
        update['sua.status'] = newStatus
        results.statusUpdated++
      }

      // 2. Decide whether to send a notification today
      const lastNotifiedAt: FirebaseFirestore.Timestamp | undefined = company.sua?.lastNotifiedAt
      const lastNotifiedDate = lastNotifiedAt ? timestampToMXDate(lastNotifiedAt) : null
      const alreadyNotifiedToday = lastNotifiedDate === today

      const shouldNotify = !alreadyNotifiedToday && NOTIFY_THRESHOLDS.has(days)

      if (shouldNotify) {
        await sendFCM({
          type:        'sua_expiring',
          companyName: company.name as string,
          daysLeft:    Math.max(0, days),
        })
        update['sua.lastNotifiedAt'] = FieldValue.serverTimestamp()
        results.notified++
      }

      if (Object.keys(update).length > 0) {
        pending.push({ ref: companyDoc.ref, data: update })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      results.errors.push(`${company.name}: ${msg}`)
    }
  }

  // Commit all Firestore updates in batches
  if (pending.length > 0) {
    await commitInBatches(db, pending)
  }

  return NextResponse.json({
    ok:   true,
    date: today,
    tz:   TZ,
    ...results,
    ...(results.errors.length === 0 && { errors: undefined }),
  })
}
