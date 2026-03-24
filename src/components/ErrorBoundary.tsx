"use client"

/**
 * React class-based Error Boundary.
 *
 * Catches unhandled JS errors in the component subtree and renders a
 * graceful fallback UI instead of crashing the whole page.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <YourComponent />
 *   </ErrorBoundary>
 *
 *   // Custom fallback:
 *   <ErrorBoundary fallback={<p>Custom error UI</p>}>
 *     <YourComponent />
 *   </ErrorBoundary>
 */

import * as React from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  children: React.ReactNode
  /** Override the default error UI */
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console in dev; swap for a real monitoring service (Sentry etc.) in prod
    console.error("[ErrorBoundary]", error.message, info.componentStack)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) return this.props.fallback

    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-5 p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-destructive" aria-hidden="true" />
        </div>
        <div className="space-y-1 max-w-xs">
          <p className="font-bold text-base">Algo salió mal</p>
          <p className="text-sm text-muted-foreground">
            Ocurrió un error inesperado. Puedes intentar recargar esta sección o refrescar la página.
          </p>
        </div>
        <Button variant="outline" className="rounded-xl" onClick={this.handleReset}>
          <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
          Reintentar
        </Button>
      </div>
    )
  }
}
