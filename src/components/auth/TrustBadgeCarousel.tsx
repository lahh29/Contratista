'use client'

import { ShieldCheck, Lock, Headphones, Eye, BadgeCheck } from 'lucide-react'

const BADGES = [
  { icon: ShieldCheck, label: '3D Security', desc: 'End-to-end encryption' },
  { icon: Lock, label: 'Protected DB', desc: 'Encrypted data' },
  { icon: Headphones, label: 'Support', desc: '442 394 6331' },
  { icon: Eye, label: 'No Tracking', desc: 'Full privacy' },
  { icon: BadgeCheck, label: 'Certified', desc: 'ISO 27001' },
]

/** Duplicate for seamless infinite loop */
const ITEMS = [...BADGES, ...BADGES]

export function TrustBadgeCarousel() {
  return (
    <div className="w-full overflow-hidden" aria-label="Security features">
      <div className="flex animate-marquee w-max gap-5 pr-5">
        {ITEMS.map((badge, i) => {
          const Icon = badge.icon
          return (
            <div
              key={i}
              className="trust-badge group"
            >
              {/* Icon circle with gradient */}
              <div className="trust-badge-icon">
                <Icon className="w-3.5 h-3.5 text-primary-foreground" />
              </div>

              {/* Text */}
              <div className="flex flex-col leading-none">
                <span className="text-[10px] font-bold text-foreground/90 whitespace-nowrap tracking-wide">
                  {badge.label}
                </span>
                {badge.desc && (
                  <span className="text-[9px] text-muted-foreground whitespace-nowrap mt-0.5">
                    {badge.desc}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}