import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getAdminApp } from '@/lib/firebase-admin'

/** Delete notifications older than this many days. */
const RETENTION_DAYS = 30

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getFirestore(getAdminApp())

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS)

  const snap = await db
    .collection('notifications')
    .where('createdAt', '<', Timestamp.fromDate(cutoff))
    .get()

  if (snap.empty) {
    console.log('[cleanup-notifications] Nothing to delete.')
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

  console.log(`[cleanup-notifications] Deleted ${deleted} notifications older than ${RETENTION_DAYS} days.`)
  return NextResponse.json({ deleted })
}
