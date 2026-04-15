'use client'

import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'
import { type ReactNode, useEffect } from 'react'

const THEME_COLORS = { light: '#f5f5f7', dark: '#000000' } as const

function ThemeColorSync() {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const color = resolvedTheme === 'dark' ? THEME_COLORS.dark : THEME_COLORS.light
    document
      .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
      .forEach((meta) => { meta.content = color })
  }, [resolvedTheme])

  return null
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      <ThemeColorSync />
      {children}
    </NextThemesProvider>
  )
}
