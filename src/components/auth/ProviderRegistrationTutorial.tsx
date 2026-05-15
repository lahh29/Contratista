"use client"

import * as React from "react"
import Image from "next/image"
import { AnimatePresence, motion, type Transition } from "framer-motion"
import {
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Sparkles,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/**
 * Cada paso del tutorial.
 * `image` es opcional — si no se define se muestra un placeholder.
 * Para agregar una imagen, colócala en `/public/imagenes-login/`
 * y referencia la ruta con `image: "/imagenes-login/imagen-1.png"`.
 */
export type TutorialStep = {
  title: string
  description: string
  image?: string
  imageAlt?: string
}

const DEFAULT_STEPS: TutorialStep[] = [
  {
    title: "Abre el registro",
    description:
      "Desde la pantalla de inicio de sesión, toca el botón “Registrarse como proveedor”.",
    image: "/imagenes-login/imagen-1.png",
    imageAlt: "Botón de registro en la pantalla de login",
  },
  {
    title: "Ingresa tu correo",
    description:
      "Usa el correo corporativo de tu empresa proveedora. Verificaremos que esté autorizada.",
    image: "/imagenes-login/imagen-2.png",
    imageAlt: "Campo de correo del registro",
  },
  {
    title: "Crea tu contraseña",
    description:
      "Mínimo 6 caracteres. Confírmala para evitar errores de tipeo.",
    image: "/imagenes-login/imagen-3.png",
    imageAlt: "Formulario de contraseña",
  },
  {
    title: "Finaliza el registro",
    description:
      "Al confirmar, tu cuenta queda lista para acceder al portal y gestionar a tu personal.",
    image: "/imagenes-login/imagen-5.png",
    imageAlt: "Pantalla de éxito al registrarse",
  },

]

const transition: Transition = { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }

const HINT_STORAGE_KEY = "provider-tutorial-hint-dismissed"

/* ────────────────────────────────────────────────────────────── */
/* Tipos imperativos                                              */
/* ────────────────────────────────────────────────────────────── */

export type ProviderRegistrationTutorialHandle = {
  open: () => void
  close: () => void
  toggle: () => void
}

interface ProviderRegistrationTutorialProps {
  /** Pasos del tutorial. Si se omite, se usan los pasos por defecto. */
  steps?: TutorialStep[]
  /** Clase opcional para reposicionar el FAB. */
  className?: string
  /** Texto visible junto al ícono en desktop. */
  label?: string
  /** Texto del hint flotante (tooltip) que aparece la primera vez. */
  hintText?: string
}

/* ────────────────────────────────────────────────────────────── */
/* Componente principal: FAB pill + hint + diálogo                */
/* ────────────────────────────────────────────────────────────── */

export const ProviderRegistrationTutorial = React.forwardRef<
  ProviderRegistrationTutorialHandle,
  ProviderRegistrationTutorialProps
>(function ProviderRegistrationTutorial(
  {
    steps = DEFAULT_STEPS,
    className,
    label = "!Hey! Click aquí",
    hintText = "¿Primera vez? Mira la guía",
  },
  ref
) {
  const [open, setOpen] = React.useState(false)
  const [index, setIndex] = React.useState(0)
  const [hintVisible, setHintVisible] = React.useState(false)

  // Exponer API imperativa
  React.useImperativeHandle(
    ref,
    () => ({
      open: () => setOpen(true),
      close: () => setOpen(false),
      toggle: () => setOpen(v => !v),
    }),
    []
  )

  // Mostrar hint la primera vez (sessionStorage)
  React.useEffect(() => {
    if (typeof window === "undefined") return
    const dismissed = window.sessionStorage.getItem(HINT_STORAGE_KEY)
    if (dismissed) return
    const t = window.setTimeout(() => setHintVisible(true), 1400)
    return () => window.clearTimeout(t)
  }, [])

  // Auto-ocultar hint tras unos segundos
  React.useEffect(() => {
    if (!hintVisible) return
    const t = window.setTimeout(() => dismissHint(), 7000)
    return () => window.clearTimeout(t)
  }, [hintVisible])

  function dismissHint() {
    setHintVisible(false)
    try {
      window.sessionStorage.setItem(HINT_STORAGE_KEY, "1")
    } catch {
      // ignore
    }
  }

  // Reinicia el paso al cerrar para que la próxima apertura empiece de cero.
  React.useEffect(() => {
    if (!open) {
      const t = setTimeout(() => setIndex(0), 200)
      return () => clearTimeout(t)
    }
  }, [open])

  const total = steps.length
  const step = steps[index]
  const isFirst = index === 0
  const isLast = index === total - 1

  const goNext = React.useCallback(() => {
    setIndex(i => Math.min(i + 1, total - 1))
  }, [total])

  const goPrev = React.useCallback(() => {
    setIndex(i => Math.max(i - 1, 0))
  }, [])

  function handleFabClick() {
    dismissHint()
    setOpen(true)
  }

  return (
    <>
      {/* ── FAB pill + hint ──────────────────────────────────── */}
      <div
        className={cn(
          "fixed z-40 bottom-4 right-4 sm:bottom-6 sm:right-6 flex flex-col items-end gap-2",
          className
        )}
      >
        {/* Hint (B) */}
        <AnimatePresence>
          {hintVisible && !open && (
            <motion.div
              key="hint"
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="relative"
            >
              <motion.div
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full bg-foreground text-background shadow-md shadow-foreground/20 text-xs font-medium"
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{hintText}</span>
                <button
                  type="button"
                  onClick={dismissHint}
                  aria-label="Cerrar sugerencia"
                  className="ml-1 rounded-full p-0.5 hover:bg-background/20 transition-colors focus:outline-none focus:ring-2 focus:ring-background/40"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              </motion.div>
              {/* Punta del bubble */}
              <span
                aria-hidden="true"
                className="absolute -bottom-1 right-6 w-2 h-2 rotate-45 bg-foreground"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* FAB */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 220, damping: 18 }}
          className="relative"
        >
          {/* Glow ring pulsante (B) */}
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-foreground/15"
            animate={{ scale: [1, 1.25, 1], opacity: [0.55, 0, 0.55] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.button
            type="button"
            onClick={handleFabClick}
            aria-label="Ver tutorial de registro de proveedor"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            animate={open ? {} : { y: [0, -2.5, 0] }}
            transition={{
              y: { duration: 3.6, repeat: Infinity, ease: "easeInOut" },
            }}
            className={cn(
              "relative inline-flex items-center justify-center gap-2",
              "h-12 sm:h-12 rounded-full",
              "px-3 sm:px-5",
              "bg-foreground text-background",
              "shadow-lg shadow-foreground/25",
              "text-xs sm:text-sm font-medium tracking-wide",
              "transition-colors focus:outline-none",
              "focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            )}
          >
            <HelpCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline whitespace-nowrap">{label}</span>
            <span className="sr-only sm:hidden">{label}</span>
          </motion.button>
        </motion.div>
      </div>

      {/* ── Dialog ───────────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[92vw] sm:max-w-xl p-0 overflow-hidden gap-0">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="text-base font-semibold text-foreground">
              Cómo registrarte como proveedor
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Sigue estos pasos para crear tu cuenta y acceder al portal.
            </DialogDescription>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            {/* Imagen */}
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted/40 border border-border">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`img-${index}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={transition}
                  className="absolute inset-0"
                >
                  {step.image ? (
                    <Image
                      src={step.image}
                      alt={step.imageAlt ?? step.title}
                      fill
                      sizes="(max-width: 640px) 92vw, 576px"
                      className="object-contain"
                      priority={index === 0}
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground/60">
                      <ImageIcon className="w-7 h-7" aria-hidden="true" />
                      <p className="text-xs tracking-wide">
                        Imagen del paso {index + 1}
                      </p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Texto del paso */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`txt-${index}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={transition}
                className="space-y-1.5"
              >
                <p className="text-[11px] font-medium tracking-[0.08em] uppercase text-muted-foreground">
                  Paso {index + 1} de {total}
                </p>
                <p className="text-base font-medium text-foreground">
                  {step.title}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-6 pb-5 pt-1 flex items-center justify-between gap-3">
            {/* Dots */}
            <div className="flex items-center gap-1.5" role="tablist" aria-label="Pasos del tutorial">
              {steps.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Ir al paso ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === index
                      ? "w-5 bg-foreground"
                      : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  )}
                />
              ))}
            </div>

            {/* Nav */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-lg text-sm"
                onClick={goPrev}
                disabled={isFirst}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Atrás
              </Button>
              {isLast ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-9 rounded-lg text-sm"
                  onClick={() => setOpen(false)}
                >
                  Listo
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className="h-9 rounded-lg text-sm"
                  onClick={goNext}
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
})

/* ────────────────────────────────────────────────────────────── */
/* Link inline reutilizable (C)                                   */
/* ────────────────────────────────────────────────────────────── */

interface ProviderTutorialLinkProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onOpen: () => void
  children?: React.ReactNode
}

export function ProviderTutorialLink({
  onOpen,
  className,
  children = "Guia para proveedores <-",
  ...props
}: ProviderTutorialLinkProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onOpen}
      className={cn("text-xs text-muted-foreground gap-1.5", className)}
      {...props}
    >
      <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
      {children}
    </Button>
  )
}
