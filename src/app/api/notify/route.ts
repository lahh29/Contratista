import { NextRequest, NextResponse } from 'next/server'
import { sendFCM, type NotifyEvent } from '@/lib/send-fcm'

export async function POST(req: NextRequest) {
  try {
    const event: NotifyEvent = await req.json()
    const { sent } = await sendFCM(event)
    return NextResponse.json({ sent })
  } catch (err: any) {
    console.error('[notify]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
