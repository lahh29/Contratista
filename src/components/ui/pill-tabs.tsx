"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

// ── Types ────────────────────────────────────────────────────────────────────

export interface PillTab {
  value: string
  label: string
  icon?: React.ReactNode
  badge?: React.ReactNode
}

interface PillTabsBarProps {
  tabs: readonly PillTab[]
  value: string
  onValueChange: (value: string) => void
  layoutId: string
  className?: string
}

interface PillTabsContentProps {
  value: string
  children: React.ReactNode
  className?: string
}

// ── PillTabsBar ──────────────────────────────────────────────────────────────

export function PillTabsBar({
  tabs,
  value,
  onValueChange,
  layoutId,
  className,
}: PillTabsBarProps) {
  return (
    <div className={cn("border-b border-border/40", className)}>
      <div className="flex flex-wrap gap-1.5 py-2" role="tablist">
        {tabs.map((tab) => {
          const isActive = tab.value === value
          return (
            <button
              key={tab.value}
              role="tab"
              aria-selected={isActive}
              onClick={() => onValueChange(tab.value)}
              className="relative shrink-0 px-3.5 py-1.5 text-xs font-medium rounded-full outline-none transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId={layoutId}
                  className="absolute inset-0 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <span
                className={cn(
                  "relative z-10 flex items-center gap-1.5 transition-colors duration-150",
                  isActive ? "text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {tab.icon}
                {tab.label}
                {tab.badge}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── PillTabsContent ──────────────────────────────────────────────────────────

export function PillTabsContent({ value, children, className }: PillTabsContentProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={value}
        role="tabpanel"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
