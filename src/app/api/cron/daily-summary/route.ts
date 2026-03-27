import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getAdminApp } from '@/lib/firebase-admin'
import { sendFCM } from '@/lib/send-fcm'

const TZ = 'America/Mexico_City'

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
 * Returns Firestore Timestamps for the start and end of today in Mexico City.
 * Used to scope all queries to the current day.
 */
function getTodayBoundsMX(): { start: Timestamp; end: Timestamp } {
  const todayStr    = getTodayMX()
  const tomorrowStr = (() => {
    const d = new Date(todayStr + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  })()

  // Interpret the date strings as midnight MX time by using the TZ offset
  const toMXMidnight = (dateStr: string): Date => {
    // Create a date at noon UTC, then shift to MX midnight using Intl
    // Simpler: parse as UTC midnight and let Firestore handle storage
    // We use 'T06:00:00Z' as a proxy for midnight MX (UTC-6 in winter)
    // but the safest approach is to use an explicit offset-aware string.
    // Mexico City is UTC-6 (CST) / UTC-5 (CDT). We use the Intl formatter
    // to get the actual offset for today.
    const utcDate = new Date(`${dateStr}T00:00:00`)
    const mxDateStr = new Intl.DateTimeFormat('sv-SE', {
      timeZone: TZ,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(utcDate)
    // mxDateStr is like "2026-03-27 18:00:00" (UTC-6 shift)
    // We want midnight MX, so we subtract that offset from UTC midnight:
    // offset = (UTC midnight as MX time) → tell us how far off we are
    const offsetMs = utcDate.getTime() - new Date(mxDateStr.replace(' ', 'T') + 'Z').getTime()
    return new Date(new Date(`${dateStr}T00:00:00Z`).getTime() + offsetMs)
  }

  return {
    start: Timestamp.fromDate(toMXMidnight(todayStr)),
    end:   Timestamp.fromDate(toMXMidnight(tomorrowStr)),
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db      = getFirestore(getAdminApp())
  const today   = getTodayMX()
  const { start, end } = getTodayBoundsMX()

  // Run all four counts in parallel
  const [entriesSnap, exitsSnap, suaSnap, blockedSnap] = await Promise.all([
    db.collection('visits')
      .where('entryTime', '>=', start)
      .where('entryTime', '<',  end)
      .count()
      .get(),

    db.collection('visits')
      .where('exitTime', '>=', start)
      .where('exitTime', '<',  end)
      .count()
      .get(),

    db.collection('notifications')
      .where('type',      '==', 'sua_expiring')
      .where('createdAt', '>=', start)
      .where('createdAt', '<',  end)
      .count()
      .get(),

    db.collection('notifications')
      .where('type',      '==', 'blocked_contractor')
      .where('createdAt', '>=', start)
      .where('createdAt', '<',  end)
      .count()
      .get(),
  ])

  const entries      = entriesSnap.data().count
  const exits        = exitsSnap.data().count
  const suaAlerts    = suaSnap.data().count
  const blockedCount = blockedSnap.data().count

  await sendFCM({ type: 'daily_summary', date: today, entries, exits, suaAlerts, blockedCount })

  return NextResponse.json({ ok: true, date: today, entries, exits, suaAlerts, blockedCount })
}
