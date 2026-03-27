import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getAdminApp } from '@/lib/firebase-admin'

/** Delete FCM tokens that haven't been refreshed in this many days. */
const STALE_DAYS = 90

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getFirestore(getAdminApp())

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - STALE_DAYS)

  const snap = await db
    .collectionGroup('fcmTokens')
    .where('createdAt', '<', Timestamp.fromDate(cutoff))
    .get()

  if (snap.empty) {
    console.log('[cleanup-fcm-tokens] Nothing to delete.')
    return NextResponse.json({ deleted: 0 })
  }

  const BATCH_SIZE = 499
  let deleted = 0

  for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
    const batch = db.batch()
    snap.docs.slice(i, i + BATCH_SIZE).forEach(d => batch.delete(d.ref))
    await batch.commit()
    deleted += Math.min(BATCH_SIZE, snap.docs.length - i)
  }

  console.log(`[cleanup-fcm-tokens] Deleted ${deleted} tokens older than ${STALE_DAYS} days.`)
  return NextResponse.json({ deleted })
}
