"use client"

import * as React from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  Mail,
  Lock,
  UserPlus,
  Eye,
  EyeOff,
  MousePointer2,
  CheckCircle2,
  Sparkles,
} from "lucide-react"

import { cn } from "@/lib/utils"

/* ────────────────────────────────────────────────────────────── */
/* Shared types                                                   */
/* ────────────────────────────────────────────────────────────── */

export interface SceneProps {
  /** Sólo anima cuando el paso está visible. */
  active?: boolean
  className?: string
}

/* ────────────────────────────────────────────────────────────── */
/* Helpers                                                        */
/* ────────────────────────────────────────────────────────────── */

const SceneShell: React.FC<React.PropsWithChildren<{ className?: string }>> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      "absolute inset-0 flex items-center justify-center p-4 sm:p-6",
      "bg-gradient-to-b from-muted/20 to-muted/40",
      className
    )}
  >
    {children}
  </div>
)

/** Pequeño "input" mock cohesivo con el design system. */
const MockInput: React.FC<
  React.PropsWithChildren<{
    icon?: React.ReactNode
    trailing?: React.ReactNode
    className?: string
  }>
> = ({ icon, trailing, children, className }) => (
  <div
    className={cn(
      "relative w-full h-7 sm:h-8 rounded-md border border-border bg-background",
      "flex items-center text-[10px] sm:text-xs text-muted-foreground",
      "pl-7 pr-7",
      className
    )}
  >
    {icon && (
      <span
        aria-hidden="true"
        className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
      >
        {icon}
      </span>
    )}
    <div className="flex-1 truncate">{children}</div>
    {trailing && (
      <span
        aria-hidden="true"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
      >
        {trailing}
      </span>
    )}
  </div>
)

/* ────────────────────────────────────────────────────────────── */
/* Scene 1 — Abre el registro                                     */
/* Cursor se desplaza al CTA "Registrarse" y hace tap con ripple. */
/* ────────────────────────────────────────────────────────────── */

export const OpenRegisterScene: React.FC<SceneProps> = ({ active = true, className }) => {
  const reduce = useReducedMotion()

  return (
    <SceneShell className={className}>
      {/* Mock card */}
      <div className="relative w-full max-w-[280px] sm:max-w-xs rounded-lg border border-border bg-background shadow-sm p-3 sm:p-4 space-y-2.5">
        <div className="space-y-1">
          <div className="h-2 w-16 rounded-full bg-muted" />
          <div className="h-1.5 w-24 rounded-full bg-muted/60" />
        </div>
        <MockInput icon={<Mail className="w-3 h-3" />}>correo</MockInput>
        <MockInput icon={<Lock className="w-3 h-3" />}>••••••</MockInput>

        {/* CTA Registrarse */}
        <div className="relative pt-1">
          <motion.div
            initial={false}
            animate={
              active && !reduce
                ? { boxShadow: ["0 0 0 0 hsl(var(--foreground) / 0)", "0 0 0 6px hsl(var(--foreground) / 0.12)", "0 0 0 0 hsl(var(--foreground) / 0)"] }
                : { boxShadow: "0 0 0 0 hsl(var(--foreground) / 0)" }
            }
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", times: [0, 0.5, 1] }}
            className="flex items-center justify-center gap-1.5 h-7 sm:h-8 rounded-md border border-border bg-muted/40 text-[10px] sm:text-xs text-foreground"
          >
            <UserPlus className="w-3 h-3" />
            <span>Registrarse como proveedor</span>
          </motion.div>

          {/* Ripple */}
          {active && !reduce && (
            <motion.span
              aria-hidden="true"
              className="absolute inset-x-3 top-1 bottom-0 rounded-md border border-foreground/40 pointer-events-none"
              animate={{ scale: [0.95, 1.06], opacity: [0, 0.7, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeOut", times: [0.45, 0.55, 0.85] }}
            />
          )}
        </div>
      </div>

      {/* Cursor */}
      {active && !reduce && (
        <motion.div
          aria-hidden="true"
          className="absolute text-foreground"
          initial={{ x: -40, y: -30, opacity: 0 }}
          animate={{
            x: [-40, -40, 12, 12, -40],
            y: [-30, -30, 38, 38, -30],
            opacity: [0, 1, 1, 1, 0],
            scale: [1, 1, 1, 0.88, 1],
          }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", times: [0, 0.08, 0.5, 0.6, 1] }}
          style={{ left: "50%", top: "50%" }}
        >
          <MousePointer2 className="w-4 h-4 drop-shadow-sm" />
        </motion.div>
      )}
    </SceneShell>
  )
}

/* ────────────────────────────────────────────────────────────── */
/* Scene 2 — Ingresa tu correo                                    */
/* Tipeo letra-a-letra con clip horizontal + caret + check final. */
/* ────────────────────────────────────────────────────────────── */

const EMAIL_SAMPLE = "correo@empresa.com"

export const EmailTypingScene: React.FC<SceneProps> = ({ active = true, className }) => {
  const reduce = useReducedMotion()

  return (
    <SceneShell className={className}>
      <div className="relative w-full max-w-[280px] sm:max-w-xs space-y-2">
        <p className="text-[10px] font-medium tracking-[0.08em] uppercase text-muted-foreground">
          Correo
        </p>

        <div className="relative w-full h-9 sm:h-10 rounded-md border border-border bg-background flex items-center pl-8 pr-9 text-xs sm:text-sm text-foreground overflow-hidden">
          <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />

          {/* Texto tipeado */}
          <div className="relative inline-flex items-center font-mono">
            <motion.span
              className="inline-block overflow-hidden whitespace-nowrap"
              initial={{ width: 0 }}
              animate={active && !reduce ? { width: ["0ch", `${EMAIL_SAMPLE.length}ch`, `${EMAIL_SAMPLE.length}ch`, "0ch"] } : { width: `${EMAIL_SAMPLE.length}ch` }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", times: [0, 0.55, 0.88, 1] }}
            >
              {EMAIL_SAMPLE}
            </motion.span>

            {/* Caret */}
            {!reduce && (
              <motion.span
                aria-hidden="true"
                className="inline-block ml-0.5 w-[1.5px] h-3.5 bg-foreground/80"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
              />
            )}
          </div>

          {/* Check final */}
          <motion.span
            aria-hidden="true"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={active && !reduce ? { opacity: [0, 0, 1, 1, 0], scale: [0.6, 0.6, 1, 1, 0.6] } : { opacity: 0 }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", times: [0, 0.55, 0.7, 0.88, 1] }}
          >
            <CheckCircle2 className="w-4 h-4" />
          </motion.span>
        </div>

        <p className="text-[10px] text-muted-foreground/80">
          Verificaremos que esté autorizada.
        </p>
      </div>
    </SceneShell>
  )
}

/* ────────────────────────────────────────────────────────────── */
/* Scene 3 — Crea tu contraseña                                   */
/* Bullets cascada + toggle del ojo.                              */
/* ────────────────────────────────────────────────────────────── */

const PWD_LEN = 8

export const PasswordScene: React.FC<SceneProps> = ({ active = true, className }) => {
  const reduce = useReducedMotion()
  const bullets = React.useMemo(() => Array.from({ length: PWD_LEN }), [])

  // ciclo: 0=tipear, 1=eye on, 2=tipear confirm, 3=reset
  const CYCLE = 5.4

  return (
    <SceneShell className={className}>
      <div className="w-full max-w-[280px] sm:max-w-xs space-y-2.5">
        {/* Password */}
        <div className="space-y-1">
          <p className="text-[10px] font-medium tracking-[0.08em] uppercase text-muted-foreground">
            Contraseña
          </p>
          <PwdRow bullets={bullets} active={active} reduce={!!reduce} cycle={CYCLE} offset={0} />
        </div>

        {/* Confirm */}
        <div className="space-y-1">
          <p className="text-[10px] font-medium tracking-[0.08em] uppercase text-muted-foreground">
            Confirmar
          </p>
          <PwdRow bullets={bullets} active={active} reduce={!!reduce} cycle={CYCLE} offset={0.4} />
        </div>
      </div>
    </SceneShell>
  )
}

const PwdRow: React.FC<{
  bullets: readonly unknown[]
  active: boolean
  reduce: boolean
  cycle: number
  offset: number
}> = ({ bullets, active, reduce, cycle, offset }) => {
  const stagger = 0.18

  return (
    <div className="relative w-full h-9 rounded-md border border-border bg-background flex items-center pl-8 pr-9 text-foreground overflow-hidden">
      <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />

      <div className="flex items-center gap-[3px]">
        {bullets.map((_, i) => (
          <motion.span
            key={i}
            aria-hidden="true"
            className="inline-block w-1.5 h-1.5 rounded-full bg-foreground"
            initial={{ opacity: 0, scale: 0.4 }}
            animate={
              active && !reduce
                ? { opacity: [0, 0, 1, 1, 0], scale: [0.4, 0.4, 1, 1, 0.4] }
                : { opacity: 1, scale: 1 }
            }
            transition={{
              duration: cycle,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, Math.min(0.1 + offset + i * stagger * 0.05, 0.4), Math.min(0.15 + offset + i * stagger * 0.05, 0.5), 0.88, 1],
              delay: offset + i * (stagger * 0.6),
            }}
          />
        ))}
      </div>

      {/* Eye toggle */}
      <span aria-hidden="true" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
        <motion.span
          className="block"
          animate={
            active && !reduce
              ? { rotate: [0, 0, 12, 0], opacity: [1, 1, 1, 1] }
              : { rotate: 0 }
          }
          transition={{ duration: cycle, repeat: Infinity, ease: "easeInOut", times: [0, 0.5, 0.55, 1] }}
        >
          <motion.span
            className="block"
            animate={active && !reduce ? { opacity: [1, 1, 0, 1] } : { opacity: 1 }}
            transition={{ duration: cycle, repeat: Infinity, ease: "linear", times: [0, 0.5, 0.55, 1] }}
          >
            <Eye className="w-3.5 h-3.5" />
          </motion.span>
          <motion.span
            className="absolute inset-0 block"
            animate={active && !reduce ? { opacity: [0, 0, 1, 0] } : { opacity: 0 }}
            transition={{ duration: cycle, repeat: Infinity, ease: "linear", times: [0, 0.5, 0.55, 1] }}
          >
            <EyeOff className="w-3.5 h-3.5" />
          </motion.span>
        </motion.span>
      </span>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────── */
/* Scene 4 — Finaliza el registro                                 */
/* Check verde con spring + sparkles radiando + chip.             */
/* ────────────────────────────────────────────────────────────── */

const SPARKLES = [
  { x: -42, y: -28, delay: 0.15 },
  { x: 44, y: -32, delay: 0.25 },
  { x: -50, y: 18, delay: 0.35 },
  { x: 48, y: 22, delay: 0.45 },
  { x: 0, y: -52, delay: 0.55 },
  { x: 0, y: 50, delay: 0.65 },
]

export const FinalizeScene: React.FC<SceneProps> = ({ active = true, className }) => {
  const reduce = useReducedMotion()
  const CYCLE = 3.6

  return (
    <SceneShell className={className}>
      <div className="relative flex flex-col items-center gap-3">
        {/* Sparkles */}
        {!reduce && active &&
          SPARKLES.map((s, i) => (
            <motion.span
              key={i}
              aria-hidden="true"
              className="absolute text-foreground/70"
              style={{ left: "50%", top: "50%" }}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
              animate={{
                x: [0, s.x, s.x],
                y: [0, s.y, s.y],
                opacity: [0, 1, 0],
                scale: [0.4, 1, 0.6],
              }}
              transition={{
                duration: CYCLE,
                repeat: Infinity,
                ease: "easeOut",
                times: [0, 0.35, 0.7],
                delay: s.delay,
              }}
            >
              <Sparkles className="w-3 h-3" />
            </motion.span>
          ))}

        {/* Check */}
        <motion.div
          className="relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-50 dark:bg-emerald-950 border border-emerald-200/60 dark:border-emerald-900/60"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={
            active && !reduce
              ? { scale: [0.6, 1.08, 1, 1, 0.96], opacity: [0, 1, 1, 1, 1] }
              : { scale: 1, opacity: 1 }
          }
          transition={{ duration: CYCLE, repeat: Infinity, ease: "easeInOut", times: [0, 0.25, 0.4, 0.85, 1] }}
        >
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 rounded-full border border-emerald-400/30"
            animate={
              active && !reduce
                ? { scale: [1, 1.4, 1.4], opacity: [0.6, 0, 0] }
                : { scale: 1, opacity: 0 }
            }
            transition={{ duration: CYCLE, repeat: Infinity, ease: "easeOut", times: [0.2, 0.6, 1] }}
          />
          <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600 dark:text-emerald-400" />
        </motion.div>

        {/* Chip */}
        <motion.div
          className="px-2.5 py-1 rounded-full bg-foreground text-background text-[10px] sm:text-xs font-medium"
          initial={{ y: 6, opacity: 0 }}
          animate={
            active && !reduce
              ? { y: [6, 0, 0, 0, 6], opacity: [0, 1, 1, 1, 0] }
              : { y: 0, opacity: 1 }
          }
          transition={{ duration: CYCLE, repeat: Infinity, ease: "easeInOut", times: [0, 0.3, 0.5, 0.85, 1] }}
        >
          Cuenta creada
        </motion.div>
      </div>
    </SceneShell>
  )
}
