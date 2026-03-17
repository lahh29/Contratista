importScripts('https://www.gstatic.com/firebasejs/11.9.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/11.9.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey:            "AIzaSyDCI86FTRzFLfUjg751KJD72OmiB7jxmN8",
  authDomain:        "contratistas-d30db.firebaseapp.com",
  projectId:         "contratistas-d30db",
  storageBucket:     "contratistas-d30db.firebasestorage.app",
  messagingSenderId: "830635750377",
  appId:             "1:830635750377:web:5f5a8d4ae1f5132b745178",
})

const messaging = firebase.messaging()

// Background messages (app closed or in another tab)
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', JSON.stringify(payload))
  const { title, body } = payload.notification ?? {}
  const type = payload.data?.type ?? 'notification'
  const url  = payload.data?.url  ?? '/dashboard'

  const options = {
    body:  body  ?? '',
    icon:  '/api/pwa-icon?size=192',
    badge: '/api/pwa-icon?size=96',
    tag:   type,
    data:  { url },
    vibrate: [200, 100, 200],
    requireInteraction: type === 'sua_expiring',
    actions: getActions(type),
  }

  self.registration.showNotification(
    title ?? 'Control Contratistas',
    options
  )
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
        { action: 'view',    title: 'Ver contratistas' },
        { action: 'dismiss', title: 'Ignorar' },
      ]
    case 'sua_renewed':
    case 'new_contractor':
    case 'delete_contractor':
    case 'blocked_contractor':
      return [{ action: 'view', title: 'Ver contratistas' }]
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
