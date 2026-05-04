'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// ── Blueprint images from public/imagenes-login ───────────────────────────────

const SLIDES = [
  { src: '/imagenes-login/imagen-1.png', alt: 'ViñoPlastic Industrial Facility — plano arquitectónico' },
  { src: '/imagenes-login/imagen-2.png', alt: 'Técnico de Mantenimiento — inspección y limpieza' },
  { src: '/imagenes-login/imagen-3.png', alt: 'Sumitomo Demag Systec 1450 — máquina de inyección' },
  { src: '/imagenes-login/imagen-4.png', alt: 'Máquina de Medición por Coordenadas — Innovalia' },
  { src: '/imagenes-login/imagen-5.png', alt: 'Técnico de Inspección — inspección visual' },
  { src: '/imagenes-login/imagen-6.png', alt: 'Faro Delantero Tesla — plano técnico' },
]

const INTERVAL_MS = 6000

// Ken Burns — each slide gets a different origin for variety
const KEN_BURNS_ORIGINS = [
  'center center',
  'top left',
  'bottom right',
  'top right',
  'center left',
  'bottom center',
]

interface Props {
  className?: string
}

export function BlueprintCarousel({ className = '' }: Props) {
  const [index, setIndex] = useState(0)

  const advance = useCallback(() => {
    setIndex((prev) => (prev + 1) % SLIDES.length)
  }, [])

  useEffect(() => {
    const timer = setInterval(advance, INTERVAL_MS)
    return () => clearInterval(timer)
  }, [advance])

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Imágenes de la planta"
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="absolute inset-0"
          aria-live="polite"
        >
          <div
            className="absolute inset-0 animate-ken-burns"
            style={{ transformOrigin: KEN_BURNS_ORIGINS[index % KEN_BURNS_ORIGINS.length] }}
          >
            <Image
              src={SLIDES[index].src}
              alt={SLIDES[index].alt}
              fill
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover"
              priority={index === 0}
            />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dark gradient overlay for text readability */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          background: `linear-gradient(to top, hsl(var(--carousel-overlay-from)), hsl(var(--carousel-overlay-via)), hsl(var(--carousel-overlay-to)))`,
        }}
      />

      {/* Scan line effect */}
      <div
        className="absolute inset-0 pointer-events-none z-[2]"
        style={{
          background: `repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--carousel-scanline)) 2px, hsl(var(--carousel-scanline)) 4px)`,
        }}
      />

      {/* Progress dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Imagen ${i + 1} de ${SLIDES.length}`}
            className="relative w-8 h-1 rounded-full overflow-hidden transition-colors"
            style={{ backgroundColor: `hsl(var(--carousel-dot-bg))` }}
          >
            {i === index && (
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ backgroundColor: `hsl(var(--carousel-dot-active))` }}
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: INTERVAL_MS / 1000, ease: 'linear' }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
