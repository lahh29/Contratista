import type { Metadata, Viewport } from 'next'
import './globals.css'
import { FirebaseClientProvider } from '@/firebase'
import { Toaster } from '@/components/ui/toaster'
import { PWASetup } from '@/components/PWASetup'
import { ThemeProvider } from '@/components/ThemeProvider'

export const metadata: Metadata = {
  title: 'Control Contratistas — ViñoPlastic',
  description: 'Sistema de control de acceso y cumplimiento para contratistas y proveedores',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ViñoPlastic',
    startupImage: ['/api/pwa-icon?size=512'],
  },
  formatDetection: { telephone: false },
  other: {
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#2166AB',
    'msapplication-tap-highlight': 'no',
  },
}

export const viewport: Viewport = {
  themeColor: '#2166AB',
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        {/* PWA icons for all platforms */}
        <link rel="apple-touch-icon" sizes="180x180" href="/api/pwa-icon?size=192" />
        <link rel="apple-touch-icon" sizes="152x152" href="/api/pwa-icon?size=152" />
        <link rel="apple-touch-icon" sizes="120x120" href="/api/pwa-icon?size=120" />
        <link rel="icon" type="image/png" sizes="32x32"  href="/api/pwa-icon?size=32" />
        <link rel="icon" type="image/png" sizes="192x192" href="/api/pwa-icon?size=192" />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider>
          <FirebaseClientProvider>
            <PWASetup />
            {children}
            <Toaster />
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
