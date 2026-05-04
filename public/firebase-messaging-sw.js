importScripts('https://www.gstatic.com/firebasejs/11.9.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/11.9.0/firebase-messaging-compat.js')

// ── Ciclo de vida del SW ──────────────────────────────────────────────────────
// skipWaiting garantiza que una nueva versión del SW se active
// inmediatamente sin esperar a que el usuario cierre todas las pestañas.
self.addEventListener('install', () => {
  console.log('[FCM-SW] Installed — calling skipWaiting')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[FCM-SW] Activated')
  // Tomar control de todos los clientes abiertos inmediatamente
  event.waitUntil(self.clients.claim())
})

// Escuchar mensaje SKIP_WAITING enviado desde PWASetup.tsx
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[FCM-SW] SKIP_WAITING received')
    self.skipWaiting()
  }
})

firebase.initializeApp({
  apiKey: "AIzaSyDCI86FTRzFLfUjg751KJD72OmiB7jxmN8",
  authDomain: "contratistas-d30db.firebaseapp.com",
  projectId: "contratistas-d30db",
  storageBucket: "contratistas-d30db.firebasestorage.app",
  messagingSenderId: "830635750377",
  appId: "1:830635750377:web:5f5a8d4ae1f5132b745178",
})

const messaging = firebase.messaging()

// Mensajes en background (app cerrada o en otra pestaña).
// payload.notification puede llegar vacío cuando el mensaje solo trae
// webpush.notification — en ese caso FCM ya mostró la notificación
// de forma nativa. Si llega con datos propios los mostramos nosotros
// para tener control total sobre icon, badge y acciones.
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', JSON.stringify(payload))

  const type = payload.data?.type ?? 'notification'
  const url = payload.data?.url ?? '/dashboard'

  // webpush.notification ya fue procesado por FCM antes de llegar aquí;
  // payload.notification contiene el mismo título/body que enviamos.
  const title = payload.notification?.title ?? payload.data?.title ?? 'VinoPlastic'
  const body = payload.notification?.body ?? payload.data?.body ?? ''

  // Si FCM ya mostró la notificación nativa (cuando hay webpush.notification),
  // este handler igualmente se ejecuta — usamos el mismo tag para que el
  // sistema operativo reemplace en lugar de duplicar.
  const options = {
    body,
    icon: '/api/pwa-icon?size=192',
    badge: '/api/pwa-icon?size=96',
    tag: type,
    renotify: true,
    data: { url },
    vibrate: [200, 100, 200],
    requireInteraction: type === 'sua_expiring',
    actions: getActions(type),
  }

  return self.registration.showNotification(title, options)
})

function getActions(type) {
  switch (type) {
    case 'entry':
    case 'exit':
    case 'over_capacity':
    case 'prolonged_visit':
    case 'restricted_area':
      return [{ action: 'view', title: 'Ver dashboard' }]
    case 'sua_expiring':
      return [
        { action: 'view', title: 'Ver contratistas' },
        { action: 'dismiss', title: 'Ignorar' },
      ]
    case 'sua_renewed':
    case 'new_contractor':
    case 'delete_contractor':
    case 'blocked_contractor':
      return [{ action: 'view', title: 'Ver contratistas' }]
    case 'scheduled_visit_reminder':
      return [
        { action: 'view', title: 'Ver dashboard' },
        { action: 'dismiss', title: 'OK' },
      ]
    case 'daily_summary':
      return [
        { action: 'view', title: 'Ver dashboard' },
        { action: 'dismiss', title: 'Ignorar' },
      ]
    default:
      return []
  }
}

// Route notification clicks to the right page
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return

  const url = event.notification.data?.url ?? '/dashboard'
  const fullUrl = self.location.origin + url

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(fullUrl)
          return
        }
      }
      // Otherwise open new tab
      if (clients.openWindow) {
        return clients.openWindow(fullUrl)
      }
    })
  )
})
