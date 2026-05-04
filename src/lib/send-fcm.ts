import { getMessaging } from 'firebase-admin/messaging'
import { getFirestore } from 'firebase-admin/firestore'
import { getAdminApp } from './firebase-admin'

export type NotifyEvent =
  | { type: 'entry'; companyName: string; areaName: string; personnelCount: number; vehiclePlates?: string }
  | { type: 'exit'; companyName: string; areaName: string; personnelCount?: number }
  | { type: 'sua_expiring'; companyName: string; daysLeft: number; companyId?: string }
  | { type: 'new_contractor'; companyName: string }
  | { type: 'delete_contractor'; companyName: string }
  | { type: 'over_capacity'; companyName: string; areaName: string; authorized: number; actual: number }
  | { type: 'blocked_contractor'; companyName: string; companyId: string }
  | { type: 'sua_renewed'; companyName: string }
  | { type: 'prolonged_visit'; companyName: string; areaName: string; hoursOnSite: number }
  | { type: 'restricted_area'; companyName: string; areaName: string }
  | { type: 'baja_registered'; nombre: string; noEmpleado: string; fechaBaja: string }
  | { type: 'sua_renewal_request'; companyName: string; companyId: string }
  | { type: 'unblocked_contractor'; companyName: string }
  | { type: 'smoker_exit'; employeeName: string; employeeId: string; department: string; turno: string; mealSchedule?: string }
  | { type: 'smoker_return'; employeeName: string; employeeId: string; department: string; turno: string; duration: string; mealSchedule?: string }
  | { type: 'smoker_denied_meal'; employeeName: string; employeeId: string; department: string; area: string; turno: string; mealSchedule: string }
  | { type: 'scheduled_visit_reminder'; companyName: string; areaName: string; scheduledTime: string; personnelCount: number; companyId: string }
  | { type: 'daily_summary'; date: string; entries: number; exits: number; suaAlerts: number; blockedCount: number }

/**
 * Audience control:
 * - 'all'              → every registered device (admins + contractors)
 * - 'admins'           → only devices whose role === 'admin'
 * - { companyId }      → admins + the contractor whose companyId matches
 */
export type Audience =
  | 'all'
  | 'admins'
  | 'admins_guards'
  | 'admins_seguridad'
  /** admins + matching contractor only */
  | { companyId: string; includeStaff?: false }
  /** admins + guards + seguridad + matching contractor */
  | { companyId: string; includeStaff: true }

export function buildNotification(event: NotifyEvent): { title: string; body: string; url: string } {
  switch (event.type) {
    case 'entry':
      return {
        title: `Ingreso: ${event.companyName}`,
        body: `${event.personnelCount} persona${event.personnelCount !== 1 ? 's' : ''} en ${event.areaName}${event.vehiclePlates ? ` · Placas: ${event.vehiclePlates}` : ''}`,
        url: '/dashboard',
      }
    case 'exit':
      return {
        title: `Salida: ${event.companyName}`,
        body: `${event.personnelCount ? `${event.personnelCount} persona${event.personnelCount !== 1 ? 's' : ''} · ` : ''}Área: ${event.areaName}`,
        url: '/dashboard',
      }
    case 'sua_expiring':
      return {
        title: event.daysLeft === 0
          ? `SUA vencido hoy: ${event.companyName}`
          : `SUA por vencer: ${event.companyName}`,
        body: event.daysLeft === 0
          ? `El SUA de ${event.companyName} venció hoy. Requiere renovación inmediata.`
          : `Vence en ${event.daysLeft} día${event.daysLeft !== 1 ? 's' : ''}. Renueva antes de que expire.`,
        url: '/contractors',
      }
    case 'new_contractor':
      return {
        title: `Nueva empresa registrada`,
        body: `${event.companyName} fue agregada al sistema.`,
        url: '/contractors',
      }
    case 'delete_contractor':
      return {
        title: `Empresa eliminada`,
        body: `${event.companyName} fue eliminada del sistema.`,
        url: '/contractors',
      }
    case 'over_capacity':
      return {
        title: `Exceso de personal: ${event.companyName}`,
        body: `Ingresaron ${event.actual} personas en ${event.areaName}. Autorizado: ${event.authorized}.`,
        url: '/dashboard',
      }
    case 'blocked_contractor':
      return {
        title: `Acceso bloqueado: ${event.companyName}`,
        body: `La empresa ${event.companyName} ha sido bloqueada y no puede ingresar a planta.`,
        url: '/contractors',
      }
    case 'sua_renewed':
      return {
        title: `SUA renovado: ${event.companyName}`,
        body: `El SUA de ${event.companyName} fue actualizado correctamente.`,
        url: '/contractors',
      }
    case 'prolonged_visit':
      return {
        title: `Visita prolongada: ${event.companyName}`,
        body: `Llevan ${event.hoursOnSite} hora${event.hoursOnSite !== 1 ? 's' : ''} en ${event.areaName} sin registrar salida.`,
        url: '/dashboard',
      }
    case 'restricted_area':
      return {
        title: `Acceso a zona restringida: ${event.companyName}`,
        body: `${event.companyName} ingresó al área restringida: ${event.areaName}.`,
        url: '/dashboard',
      }
    case 'baja_registered':
      return {
        title: `Personal de Baja: ${event.nombre}`,
        body: `No. ${event.noEmpleado} · Fecha de baja: ${event.fechaBaja}`,
        url: '/bajas',
      }
    case 'sua_renewal_request':
      return {
        title: `Solicitud de renovación SUA: ${event.companyName}`,
        body: `${event.companyName} informa que su SUA ha sido renovado y requiere actualización.`,
        url: `/contractors`,
      }
    case 'unblocked_contractor':
      return {
        title: `Acceso restaurado: ${event.companyName}`,
        body: `La empresa ${event.companyName} fue desbloqueada y puede ingresar nuevamente.`,
        url: '/contractors',
      }
    case 'smoker_exit':
      return {
        title: `Salida a fumar`,
        body: `#${event.employeeId} · ${event.employeeName} · ${event.department} · T${event.turno}${event.mealSchedule ? ` · Comida: ${event.mealSchedule}` : ''}`,
        url: '/fumadores',
      }
    case 'smoker_return':
      return {
        title: `Regresó de fumar`,
        body: `#${event.employeeId} · ${event.employeeName} · ${event.department} · T${event.turno} · Tiempo: ${event.duration}`,
        url: '/fumadores',
      }
    case 'smoker_denied_meal':
      return {
        title: `Salida denegada`,
        body: `#${event.employeeId} · ${event.employeeName} · ${event.department} · T${event.turno} · Comida: ${event.mealSchedule}`,
        url: '/fumadores',
      }
    case 'scheduled_visit_reminder':
      return {
        title: `Visita programada: ${event.companyName}`,
        body: `${event.personnelCount} persona${event.personnelCount !== 1 ? 's' : ''} en ${event.areaName} a las ${event.scheduledTime}`,
        url: '/dashboard',
      }
    case 'daily_summary': {
      const parts: string[] = []
      if (event.entries > 0) parts.push(`${event.entries} ingreso${event.entries !== 1 ? 's' : ''}`)
      if (event.exits > 0) parts.push(`${event.exits} salida${event.exits !== 1 ? 's' : ''}`)
      if (event.suaAlerts > 0) parts.push(`${event.suaAlerts} alerta${event.suaAlerts !== 1 ? 's' : ''} SUA`)
      if (event.blockedCount > 0) parts.push(`${event.blockedCount} bloqueo${event.blockedCount !== 1 ? 's' : ''}`)
      return {
        title: `Resumen del día — ${event.date}`,
        body: parts.length > 0 ? parts.join(' · ') : 'Sin actividad registrada hoy.',
        url: '/dashboard',
      }
    }
  }
}

/** Default audience per event type. */
function defaultAudience(event: NotifyEvent): Audience {
  if (event.type === 'sua_expiring' && event.companyId) {
    return { companyId: event.companyId }
  }
  if (event.type === 'blocked_contractor') {
    return { companyId: event.companyId }
  }
  if (event.type === 'baja_registered') {
    return 'admins_guards'
  }
  if (event.type === 'exit' || event.type === 'entry') {
    return 'admins_seguridad'
  }
  if (event.type === 'sua_renewal_request') {
    return 'admins_seguridad'
  }
  if (event.type === 'unblocked_contractor') {
    return 'admins'
  }
  if (event.type === 'smoker_exit' || event.type === 'smoker_return' || event.type === 'smoker_denied_meal') {
    return 'admins_seguridad'
  }
  if (event.type === 'scheduled_visit_reminder') {
    return { companyId: event.companyId, includeStaff: true }
  }
  return 'admins'
}

function tokenMatchesAudience(
  data: FirebaseFirestore.DocumentData,
  audience: Audience,
): boolean {
  if (audience === 'all') return true
  if (audience === 'admins') return data.role === 'admin'
  if (audience === 'admins_guards') return data.role === 'admin' || data.role === 'guard'
  if (audience === 'admins_seguridad') return data.role === 'admin' || data.role === 'seguridad'
  // { companyId, includeStaff: true } → admin + guard + seguridad + matching contractor
  // { companyId }                     → admin + matching contractor
  const { companyId, includeStaff } = audience
  const isContractor = data.role === 'contractor' && data.companyId === companyId
  if (includeStaff) {
    return data.role === 'admin' || data.role === 'guard' || data.role === 'seguridad' || isContractor
  }
  return data.role === 'admin' || isContractor
}

/**
 * Sends an FCM push notification.
 * @param event   What happened
 * @param audience  Who should receive it (defaults based on event type)
 */
export async function sendFCM(
  event: NotifyEvent,
  audience: Audience = defaultAudience(event),
): Promise<{ sent: number }> {
  const { title, body, url } = buildNotification(event)

  const app = getAdminApp()
  const db = getFirestore(app)
  const messaging = getMessaging(app)

  const tokensSnap = await db.collectionGroup('fcmTokens').get()

  // Filter tokens by audience
  const eligible: Array<{ token: string; ref: FirebaseFirestore.DocumentReference }> = []
  tokensSnap.forEach(docSnap => {
    const data = docSnap.data()
    if (typeof data.token === 'string' && data.token.length > 0 && tokenMatchesAudience(data, audience)) {
      eligible.push({ token: data.token, ref: docSnap.ref })
    }
  })

  console.log(`[sendFCM] ${event.type}: ${tokensSnap.size} token(s) in DB, ${eligible.length} match audience "${JSON.stringify(audience)}"`)
  if (eligible.length === 0) return { sent: 0 }

  const tokens = eligible.map(e => e.token)
  const BATCH_SIZE = 500
  let sent = 0
  const staleRefs: FirebaseFirestore.DocumentReference[] = []

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const chunk = eligible.slice(i, i + BATCH_SIZE)
    const chunkTokens = chunk.map(e => e.token)

    const res = await messaging.sendEachForMulticast({
      tokens: chunkTokens,
      notification: { title, body },
      webpush: {
        notification: {
          title,
          body,
          icon: '/api/pwa-icon?size=192',
          badge: '/api/pwa-icon?size=96',
          vibrate: [200, 100, 200],
          requireInteraction: event.type === 'sua_expiring',
        },
        fcmOptions: { link: url },
      },
      data: { type: event.type, url },
    })

    sent += res.successCount

    // Collect stale/invalid tokens for cleanup
    res.responses.forEach((r, idx) => {
      if (!r.success) {
        const code = r.error?.code ?? ''
        console.warn(`[sendFCM] Token failed (${code}):`, r.error?.message)
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          staleRefs.push(chunk[idx].ref)
        }
      }
    })
  }

  // Auto-cleanup stale tokens
  if (staleRefs.length > 0) {
    const batch = db.batch()
    staleRefs.forEach(ref => batch.delete(ref))
    await batch.commit().catch(err => console.warn('[sendFCM] Failed to cleanup stale tokens:', err))
  }

  return { sent }
}
