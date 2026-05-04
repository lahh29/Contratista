'use client'

import { motion, type Variants } from 'framer-motion'

// ── Role visual config ────────────────────────────────────────────────────────

export type RoleName = 'admin' | 'guard' | 'contractor' | 'seguridad' | 'logistica' | 'rys'

interface RoleTheme {
  label: string
  /** Tailwind bg class (light + dark) */
  bg: string
  /** Tailwind text/icon color class (light + dark) */
  text: string
  /** Tailwind ring class */
  ring: string
  /** SVG paths for the custom icon */
  paths: string[]
  /** viewBox for the SVG */
  viewBox: string
  /** Framer motion hover variant key */
  hoverAnimation: keyof typeof HOVER_VARIANTS
}

const ROLE_THEMES: Record<RoleName, RoleTheme> = {
  admin: {
    label: 'Administrador',
    bg: 'bg-sky-100 dark:bg-sky-900/40',
    text: 'text-sky-600 dark:text-sky-400',
    ring: 'ring-sky-200 dark:ring-sky-800',
    viewBox: '0 0 24 24',
    // Crown icon
    paths: [
      'M2 18h20v2H2v-2z',
      'M12 4l4 6 6-4-3 10H5L2 6l6 4 4-6z',
    ],
    hoverAnimation: 'float',
  },
  guard: {
    label: 'Guardia de Seguridad',
    bg: 'bg-emerald-100 dark:bg-emerald-900/40',
    text: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-200 dark:ring-emerald-800',
    viewBox: '0 0 24 24',
    // Shield with star
    paths: [
      'M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z',
      'M12 8l1.12 3.45H17l-2.94 2.13 1.12 3.45L12 14.9l-3.18 2.13 1.12-3.45L7 11.45h3.88L12 8z',
    ],
    hoverAnimation: 'pulse',
  },
  contractor: {
    label: 'Contratista',
    bg: 'bg-amber-100 dark:bg-amber-900/40',
    text: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-200 dark:ring-amber-800',
    viewBox: '0 0 24 24',
    // Wrench icon
    paths: [
      'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94L6.73 20.15a2.1 2.1 0 01-2.96-2.96l6.68-6.7A6 6 0 016.23 2.53l3.77 3.77z',
    ],
    hoverAnimation: 'rotate',
  },
  seguridad: {
    label: 'Seguridad e Higiene',
    bg: 'bg-yellow-100 dark:bg-yellow-900/40',
    text: 'text-yellow-600 dark:text-yellow-400',
    ring: 'ring-yellow-200 dark:ring-yellow-800',
    viewBox: '0 0 24 24',
    // Hard hat / safety helmet
    paths: [
      'M2 18h20v2H2v-2z',
      'M4 18v-2a8 8 0 0116 0v2',
      'M9 10V6a3 3 0 016 0v4',
    ],
    hoverAnimation: 'bounce',
  },
  logistica: {
    label: 'Logística',
    bg: 'bg-violet-100 dark:bg-violet-900/40',
    text: 'text-violet-600 dark:text-violet-400',
    ring: 'ring-violet-200 dark:ring-violet-800',
    viewBox: '0 0 24 24',
    // Truck icon
    paths: [
      'M1 3h15v13H1V3z',
      'M16 8h4l3 4v5h-7V8z',
      'M5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
      'M18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
    ],
    hoverAnimation: 'slide',
  },
  rys: {
    label: 'Reclutamiento',
    bg: 'bg-rose-100 dark:bg-rose-900/40',
    text: 'text-rose-600 dark:text-rose-400',
    ring: 'ring-rose-200 dark:ring-rose-800',
    viewBox: '0 0 24 24',
    // Person with plus
    paths: [
      'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2',
      'M9 11a4 4 0 100-8 4 4 0 000 8z',
      'M19 8v6',
      'M22 11h-6',
    ],
    hoverAnimation: 'pop',
  },
}

// ── Hover animation variants ──────────────────────────────────────────────────

const HOVER_VARIANTS: Record<string, Variants> = {
  float: {
    idle: { y: 0, rotate: 0 },
    hover: {
      y: [0, -3, 0],
      rotate: [0, -5, 5, 0],
      transition: { duration: 0.6, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.3 },
    },
  },
  pulse: {
    idle: { scale: 1 },
    hover: {
      scale: [1, 1.15, 1],
      transition: { duration: 0.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.4 },
    },
  },
  rotate: {
    idle: { rotate: 0 },
    hover: {
      rotate: [0, -20, 20, -10, 0],
      transition: { duration: 0.7, ease: 'easeInOut' },
    },
  },
  bounce: {
    idle: { y: 0 },
    hover: {
      y: [0, -4, 0, -2, 0],
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  },
  slide: {
    idle: { x: 0 },
    hover: {
      x: [0, 3, -2, 1, 0],
      transition: { duration: 0.5, ease: 'easeInOut' },
    },
  },
  pop: {
    idle: { scale: 1, rotate: 0 },
    hover: {
      scale: [1, 1.2, 0.95, 1.1, 1],
      rotate: [0, 10, -5, 0],
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  },
}

// ── Glow ring animation ───────────────────────────────────────────────────────

const glowVariants: Variants = {
  idle: { opacity: 0, scale: 0.8 },
  hover: {
    opacity: [0, 0.5, 0],
    scale: [0.8, 1.4, 1.6],
    transition: { duration: 1.2, ease: 'easeOut', repeat: Infinity },
  },
}

// ── Component ─────────────────────────────────────────────────────────────────

interface RoleIconProps {
  role: string
  /** Icon size in px (default 16) */
  size?: number
  /** Show background circle (default true) */
  showBg?: boolean
  /** Extra className on the wrapper */
  className?: string
}

export function RoleIcon({ role, size = 16, showBg = true, className = '' }: RoleIconProps) {
  const theme = ROLE_THEMES[role as RoleName] ?? ROLE_THEMES.admin
  const variants = HOVER_VARIANTS[theme.hoverAnimation]
  const containerSize = showBg ? size * 2 : size

  return (
    <motion.div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: containerSize, height: containerSize }}
      initial="idle"
      whileHover="hover"
      animate="idle"
    >
      {/* Glow ring on hover */}
      {showBg && (
        <motion.div
          className={`absolute inset-0 rounded-full ${theme.bg}`}
          variants={glowVariants}
        />
      )}

      {/* Background circle */}
      {showBg && (
        <div
          className={`absolute inset-0 rounded-full ${theme.bg} ring-2 ${theme.ring}`}
        />
      )}

      {/* Animated SVG icon */}
      <motion.svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={theme.viewBox}
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`relative z-10 ${theme.text}`}
        variants={variants}
      >
        {theme.paths.map((d, i) => (
          <motion.path
            key={i}
            d={d}
            initial={{ pathLength: 1, opacity: 1 }}
            whileHover={{
              pathLength: [0.3, 1],
              opacity: [0.6, 1],
              transition: { duration: 0.6, delay: i * 0.08 },
            }}
          />
        ))}
      </motion.svg>
    </motion.div>
  )
}

// ── Helpers for consumers ─────────────────────────────────────────────────────

export function getRoleTheme(role: string): RoleTheme {
  return ROLE_THEMES[role as RoleName] ?? ROLE_THEMES.admin
}

export function getRoleLabel(role: string): string {
  return (ROLE_THEMES[role as RoleName] ?? ROLE_THEMES.admin).label
}

export { ROLE_THEMES }
