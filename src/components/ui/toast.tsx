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

const toastVariants = cva(
  cn(
    "group pointer-events-auto relative w-full overflow-hidden",
    "rounded-2xl px-4 py-3 shadow-2xl",
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
        default: cn(
          // Colores invertidos: oscuro en light, claro en dark — máximo contraste en ambos temas
          "bg-foreground/95 text-background",
          "border border-foreground/10",
          "backdrop-blur-sm",
        ),
        destructive: cn(
          "bg-destructive text-destructive-foreground",
          "border border-destructive/20",
        ),
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
      "inline-flex h-7 shrink-0 items-center justify-center rounded-lg border border-background/20",
      "bg-transparent px-3 text-xs font-medium transition-colors",
      "hover:bg-background/10 focus:outline-none focus:ring-1 focus:ring-background/30",
      "disabled:pointer-events-none disabled:opacity-50",
      "group-[.destructive]:border-white/20 group-[.destructive]:hover:bg-white/10",
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
      "shrink-0 rounded-full p-1 opacity-60 transition-opacity",
      "hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-background/30",
      "text-background group-[.destructive]:text-white",
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
    className={cn("text-sm font-semibold leading-snug", className)}
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
    className={cn("text-xs opacity-80 leading-snug mt-0.5", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>
type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
