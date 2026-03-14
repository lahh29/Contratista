import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'

const PROJECT_ID = 'contratistas-d30db'

export function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0]

  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey  = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase Admin credentials: FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY are required.'
    )
  }

  return initializeApp(
    { credential: cert({ clientEmail, privateKey, projectId: PROJECT_ID }) },
    'admin'
  )
}
