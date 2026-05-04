'use client'

import { motion } from 'framer-motion'
import { BlueprintCarousel } from '@/components/auth/BlueprintCarousel'
import { TrustBadgeCarousel } from '@/components/auth/TrustBadgeCarousel'
import { PWAInstallBanner } from '@/components/PWAInstallBanner'

interface Props {
  children: React.ReactNode
}

export function AuthLayout({ children }: Props) {
  return (
    <div
      className="relative min-h-dvh flex overflow-hidden"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <PWAInstallBanner />

      {/* ── Left: Blueprint carousel (desktop only) ────────────── */}
      <div className="hidden lg:block lg:w-[60%] relative">
        <BlueprintCarousel className="absolute inset-0" />

        {/* Brand watermark over carousel */}
        <div className="absolute bottom-8 left-8 z-10">
          <motion.p
            initial={{ opacity: 0, letterSpacing: '0.5em' }}
            animate={{ opacity: 1, letterSpacing: '0.25em' }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-white/60 text-xs font-bold uppercase tracking-[0.25em]"
          >
            ViñoPlastic
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-white/30 text-[10px] mt-0.5"
          >
            Inyección de Plásticos de Ingeniería
          </motion.p>
        </div>
      </div>

      {/* ── Mobile: Background carousel ────────────────────────── */}
      <div className="lg:hidden absolute inset-0">
        <BlueprintCarousel className="absolute inset-0" />
      </div>

      {/* ── Right: Form panel ──────────────────────────────────── */}
      <div className="relative z-10 w-full lg:w-[40%] flex flex-col items-center justify-center px-5 lg:px-10">
        {/* Desktop: blur fade from carousel → solid bg */}
        <div
          className="hidden lg:block absolute inset-y-0 -left-32 w-32 backdrop-blur-xl pointer-events-none"
          style={{
            maskImage: 'linear-gradient(to right, transparent, black)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black)',
          }}
        />
        <div className="hidden lg:block absolute inset-y-0 -left-8 right-0 bg-gradient-to-r from-background/0 via-background/80 via-[12%] to-background to-[28%] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative z-10 w-full max-w-[380px] -mt-10"
        >
          {children}
        </motion.div>
      </div>

      {/* Trust badges marquee */}
      <div 
        className="absolute bottom-10 right-0 left-0 lg:left-auto lg:right-0 lg:w-[40%] z-10 overflow-hidden pointer-events-none"
        style={{
          maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
        }}
      >
        <TrustBadgeCarousel />
      </div>

      {/* Footer */}
      <p className="absolute bottom-3 right-0 left-0 lg:left-auto lg:right-0 lg:w-[40%] text-center text-[11px] text-foreground/25 lg:text-foreground/25
        ">
        <a
          href="https://vinoplasticqro.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground/50 transition-colors"
        >
          Vertx System Add-on
        </a>
      </p>
    </div>
  )
}
