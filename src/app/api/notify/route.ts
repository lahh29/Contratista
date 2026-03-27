import { NextRequest, NextResponse } from 'next/server'
import { sendFCM, type NotifyEvent } from '@/lib/send-fcm'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const event: NotifyEvent = await req.json()
    const { sent } = await sendFCM(event)
    return NextResponse.json({ sent })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[notify]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
