"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      // Centrado inferior, respeta safe-area en PWA
      "fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 z-[100]",
      "-translate-x-1/2 flex flex-col-reverse gap-2 items-center",
      "w-[calc(100%-2rem)] max-w-[420px] outline-none",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

/**
 * Variantes alineadas al diseño del login:
 * — card limpia (bg-background), borde sutil, jerarquía tipográfica del login
 * — el "tono" de la variante se expresa solo en el ícono (lado izquierdo),
 *   no en todo el fondo (excepto destructive que conserva fondo rojizo suave).
 */
const toastVariants = cva(
  cn(
    "group pointer-events-auto relative w-full overflow-hidden",
    "rounded-xl border shadow-sm",
    "px-3.5 py-3",
    "transition-all",
    // Animaciones desde abajo
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[state=closed]:fade-out-80 data-[state=open]:fade-in-0",
    "data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:slide-in-from-bottom-4",
    // Swipe hacia abajo para descartar
    "data-[swipe=cancel]:translate-y-0",
    "data-[swipe=end]:translate-y-[var(--radix-toast-swipe-end-y)]",
    "data-[swipe=move]:translate-y-[var(--radix-toast-swipe-move-y)]",
    "data-[swipe=move]:transition-none",
  ),
  {
    variants: {
      variant: {
        default: "bg-background border-border text-foreground",
        success: "bg-background border-border text-foreground",
        destructive: cn(
          "bg-destructive/5 border-destructive/20 text-foreground",
        ),
        warning: "bg-background border-border text-foreground",
        info: "bg-background border-border text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => (
  <ToastPrimitives.Root
    ref={ref}
    className={cn(toastVariants({ variant }), className)}
    {...props}
  />
))
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-7 shrink-0 items-center justify-center rounded-lg border border-border",
      "bg-transparent px-3 text-xs font-medium text-foreground transition-colors",
      "hover:bg-muted/60 focus:outline-none focus:ring-1 focus:ring-ring",
      "disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "shrink-0 rounded-full p-1 text-muted-foreground opacity-60 transition-opacity",
      "hover:opacity-100 hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-3.5 w-3.5" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-medium leading-snug", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-xs text-muted-foreground leading-snug mt-0.5", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>
type ToastActionElement = React.ReactElement<typeof ToastAction>
type ToastVariant = NonNullable<VariantProps<typeof toastVariants>["variant"]>

export {
  type ToastProps,
  type ToastActionElement,
  type ToastVariant,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
