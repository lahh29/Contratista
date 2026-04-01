import type { NextConfig } from 'next'
import withPWAInit from '@ducanh2912/next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts-cache',
          expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'gstatic-fonts-cache',
          expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
        },
      },
    ],
  },
})

const nextConfig: NextConfig = {
  typescript:  { ignoreBuildErrors: true },
  eslint:      { ignoreDuringBuilds: true },
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:9002',
        '*.app.github.dev',
        '*.github.dev',
      ],
    },
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@opentelemetry/exporter-jaeger': false,
      '@genkit-ai/firebase':            false,
    }
    return config
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co',        pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'picsum.photos',       pathname: '/**' },
    ],
  },
}

// Aplicar withPWA solo en producción (build).
// En desarrollo se usa Turbopack, que no soporta plugins de Webpack.
const isDev = process.env.NODE_ENV === 'development'

export default isDev ? nextConfig : withPWA(nextConfig)
