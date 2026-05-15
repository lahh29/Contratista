"use client"

import * as React from "react"
import Image from "next/image"
import { AnimatePresence, motion, type Transition } from "framer-motion"
import { HelpCircle, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react"

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
    title: "Confirma tu empresa",
    description:
      "Verás el nombre de la empresa asociada a tu correo. Revisa que sea correcto antes de continuar.",
    image: "/imagenes-login/imagen-4.png",
    imageAlt: "Confirmación de empresa proveedora",
  },
  {
    title: "Finaliza el registro",
    description:
      "Al confirmar, tu cuenta queda lista para acceder al portal y gestionar a tu personal.",
    image: "/imagenes-login/imagen-5.png",
    imageAlt: "Pantalla de éxito al registrarse",
  },
  {
    title: "Inicia sesión",
    description:
      "Vuelve al login con tu correo y contraseña recién creados.",
    image: "/imagenes-login/imagen-6.png",
    imageAlt: "Login después del registro",
  },
]

const transition: Transition = { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }

interface ProviderRegistrationTutorialProps {
  /** Pasos del tutorial. Si se omite, se usan los pasos por defecto. */
  steps?: TutorialStep[]
  /** Clase opcional para reposicionar el FAB. */
  className?: string
}

export function ProviderRegistrationTutorial({
  steps = DEFAULT_STEPS,
  className,
}: ProviderRegistrationTutorialProps) {
  const [open, setOpen] = React.useState(false)
  const [index, setIndex] = React.useState(0)

  const total = steps.length
  const step = steps[index]
  const isFirst = index === 0
  const isLast = index === total - 1

  // Reinicia el paso al cerrar para que la próxima apertura empiece de cero.
  React.useEffect(() => {
    if (!open) {
      const t = setTimeout(() => setIndex(0), 200)
      return () => clearTimeout(t)
    }
  }, [open])

  const goNext = React.useCallback(() => {
    setIndex(i => Math.min(i + 1, total - 1))
  }, [total])

  const goPrev = React.useCallback(() => {
    setIndex(i => Math.max(i - 1, 0))
  }, [])

  return (
    <>
      {/* ── Floating Action Button ──────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ver tutorial de registro de proveedor"
        className={cn(
          "fixed z-40 bottom-4 right-4 sm:bottom-6 sm:right-6",
          "h-12 w-12 sm:h-14 sm:w-14 rounded-full",
          "bg-foreground text-background",
          "shadow-lg shadow-foreground/20",
          "flex items-center justify-center",
          "transition-transform hover:scale-105 active:scale-95",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
          className
        )}
      >
        <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
        <span className="sr-only">Tutorial de registro</span>
      </button>

      {/* ── Dialog ───────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[92vw] sm:max-w-lg p-0 overflow-hidden gap-0">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="text-sm font-medium text-foreground">
              Cómo registrarte como proveedor
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
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
                      sizes="(max-width: 640px) 92vw, 512px"
                      className="object-contain"
                      priority={index === 0}
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground/60">
                      <ImageIcon className="w-6 h-6" aria-hidden="true" />
                      <p className="text-[11px] tracking-wide">
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
                className="space-y-1"
              >
                <p className="text-[11px] font-medium tracking-[0.08em] uppercase text-muted-foreground">
                  Paso {index + 1} de {total}
                </p>
                <p className="text-sm font-medium text-foreground">
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
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
                className="h-8 rounded-lg text-xs"
                onClick={goPrev}
                disabled={isFirst}
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Atrás
              </Button>
              {isLast ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-8 rounded-lg text-xs"
                  onClick={() => setOpen(false)}
                >
                  Listo
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className="h-8 rounded-lg text-xs"
                  onClick={goNext}
                >
                  Siguiente
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
