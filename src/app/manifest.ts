import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Control Contratistas — ViñoPlastic',
    short_name: 'ViñoPlastic',
    description: 'Sistema de control de acceso y cumplimiento para contratistas y proveedores',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#2166AB',
    categories: ['business', 'productivity', 'security'],
    icons: [
      {
        src: '/api/pwa-icon?size=192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/api/pwa-icon?size=512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/api/pwa-icon?size=512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Escanear QR',
        short_name: 'Escáner',
        description: 'Abrir escáner de acceso',
        url: '/scanner',
        icons: [{ src: '/api/pwa-icon?size=96', sizes: '96x96' }],
      },
      {
        name: 'Contratistas',
        short_name: 'Contratistas',
        description: 'Ver lista de empresas',
        url: '/contractors',
        icons: [{ src: '/api/pwa-icon?size=96', sizes: '96x96' }],
      },
    ],
  }
}
