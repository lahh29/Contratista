"use client"

import * as React from "react"

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)")
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    
    // Set initial state
    setIsMobile(mq.matches)
    
    // Add listener for changes
    mq.addEventListener("change", handler)
    
    // Cleanup on unmount
    return () => mq.removeEventListener("change", handler)
  }, [])
  return isMobile
}
