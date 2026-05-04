'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Bell, ArrowDownToLine, ArrowUpFromLine, AlertTriangle,
  UserPlus, UserMinus, Users, Info, Check,
  ShieldAlert, ShieldCheck, CheckCircle2, FileText, Clock,
  Cigarette, CornerDownLeft, Ban,
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useCollection } from '@/firebase/firestore/use-collection'
import { useFirestore, useUser } from '@/firebase'
import {
  collection, query, orderBy, limit,
  writeBatch, doc, arrayUnion,
} from 'firebase/firestore'
import type { AppNotification } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import type { LucideProps } from 'lucide-react'
import { useAppUser } from '@/hooks/use-app-user'
import { useRouter } from 'next/navigation'

type IconComponent = React.ComponentType<LucideProps>

// ── Configuración visual por tipo ─────────────────────────────────────────────
// ── Parser para notificaciones de tipo smoker ────────────────────────────────
// El body tiene formato: "#ID · Nombre · Depto · Turno · [Tiempo: X | Comida: X]"
function parseSmokerBody(body: string) {
  const parts = body.split(' · ').map(s => s.trim())
  const id = parts[0]?.startsWith('#') ? parts[0] : null
  const name = parts[1] ?? null
  const dept = parts[2] ?? null
  const turno = parts[3] ?? null
  const extra = parts[4] ?? null   // "Comida: HH:mm–HH:mm" | "Tiempo: Xm"
  return { id, name, dept, turno, extra }
}

const SMOKER_TYPES = new Set(['smoker_exit', 'smoker_return', 'smoker_denied_meal'])

const TYPE_CONFIG: Record<string, {
  icon: IconComponent
  bg: string
  text: string
  ring: string
}> = {
  entry: {
    icon: ArrowDownToLine,
    bg: 'bg-emerald-100 dark:bg-emerald-950/60',
    text: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-200 dark:ring-emerald-800',
  },
  exit: {
    icon: ArrowUpFromLine,
    bg: 'bg-blue-100 dark:bg-blue-950/60',
    text: 'text-blue-600 dark:text-blue-400',
    ring: 'ring-blue-200 dark:ring-blue-800',
  },
  sua_expiring: {
    icon: AlertTriangle,
    bg: 'bg-amber-100 dark:bg-amber-950/60',
    text: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-200 dark:ring-amber-800',
  },
  sua_renewed: {
    icon: CheckCircle2,
    bg: 'bg-emerald-100 dark:bg-emerald-950/60',
    text: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-200 dark:ring-emerald-800',
  },
  sua_renewal_request: {
    icon: FileText,
    bg: 'bg-amber-100 dark:bg-amber-950/60',
    text: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-200 dark:ring-amber-800',
  },
  new_contractor: {
    icon: UserPlus,
    bg: 'bg-violet-100 dark:bg-violet-950/60',
    text: 'text-violet-600 dark:text-violet-400',
    ring: 'ring-violet-200 dark:ring-violet-800',
  },
  delete_contractor: {
    icon: UserMinus,
    bg: 'bg-red-100 dark:bg-red-950/60',
    text: 'text-red-600 dark:text-red-400',
    ring: 'ring-red-200 dark:ring-red-800',
  },
  blocked_contractor: {
    icon: ShieldAlert,
    bg: 'bg-red-100 dark:bg-red-950/60',
    text: 'text-red-600 dark:text-red-400',
    ring: 'ring-red-200 dark:ring-red-800',
  },
  unblocked_contractor: {
    icon: ShieldCheck,
    bg: 'bg-emerald-100 dark:bg-emerald-950/60',
    text: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-200 dark:ring-emerald-800',
  },
  over_capacity: {
    icon: Users,
    bg: 'bg-orange-100 dark:bg-orange-950/60',
    text: 'text-orange-600 dark:text-orange-400',
    ring: 'ring-orange-200 dark:ring-orange-800',
  },
  prolonged_visit: {
    icon: Clock,
    bg: 'bg-orange-100 dark:bg-orange-950/60',
    text: 'text-orange-600 dark:text-orange-400',
    ring: 'ring-orange-200 dark:ring-orange-800',
  },
  restricted_area: {
    icon: ShieldAlert,
    bg: 'bg-red-100 dark:bg-red-950/60',
    text: 'text-red-600 dark:text-red-400',
    ring: 'ring-red-200 dark:ring-red-800',
  },
  baja_registered: {
    icon: UserMinus,
    bg: 'bg-red-100 dark:bg-red-950/60',
    text: 'text-red-600 dark:text-red-400',
    ring: 'ring-red-200 dark:ring-red-800',
  },
  smoker_exit: {
    icon: Cigarette,
    bg: 'bg-amber-100 dark:bg-amber-950/60',
    text: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-200 dark:ring-amber-800',
  },
  smoker_return: {
    icon: CornerDownLeft,
    bg: 'bg-emerald-100 dark:bg-emerald-950/60',
    text: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-200 dark:ring-emerald-800',
  },
  smoker_denied_meal: {
    icon: Ban,
    bg: 'bg-red-100 dark:bg-red-950/60',
    text: 'text-red-600 dark:text-red-400',
    ring: 'ring-red-200 dark:ring-red-800',
  },
}

const DEFAULT_CONFIG = {
  icon: Info,
  bg: 'bg-muted',
  text: 'text-muted-foreground',
  ring: 'ring-border',
}

function getConfig(type: string) {
  return TYPE_CONFIG[type] ?? DEFAULT_CONFIG
}

// ── Componente principal ──────────────────────────────────────────────────────
export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const db = useFirestore()
  const { user } = useUser()
  const { appUser } = useAppUser()
  const router = useRouter()

  const notificationsQuery = useMemo(() => {
    if (!db) return null
    return query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(50))
  }, [db])

  const { data: rawNotifications } = useCollection(notificationsQuery)
  const allNotifications = rawNotifications as AppNotification[] | null

  // Filtrar por rol del usuario actual
  const notifications = useMemo(() => {
    if (!allNotifications || !appUser) return allNotifications
    if (appUser.role === 'admin') return allNotifications
    return allNotifications.filter(n =>
      n.roles ? n.roles.includes(appUser.role) : false,
    )
  }, [allNotifications, appUser])

  const unreadCount = useMemo(
    () => notifications?.filter(n => !n.readBy?.includes(user?.uid ?? '')).length ?? 0,
    [notifications, user?.uid],
  )

  const markAllRead = useCallback(async () => {
    if (!db || !user || !notifications) return
    const unread = notifications.filter(n => !n.readBy?.includes(user.uid))
    if (unread.length === 0) return
    const batch = writeBatch(db)
    unread.forEach(n => batch.update(doc(db, 'notifications', n.id), { readBy: arrayUnion(user.uid) }))
    await batch.commit().catch(() => { })
  }, [db, user, notifications])

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) markAllRead()
  }

  const handleNotificationClick = (n: AppNotification) => {
    setOpen(false)
    if (n.url) router.push(n.url)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-muted transition-colors rounded-xl">
          <Bell className="h-4 w-4" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                key="badge"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center leading-none"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[min(24rem,calc(100vw-2rem))] p-0 shadow-xl rounded-2xl overflow-hidden" align="end" sideOffset={10}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <h4 className="text-sm font-bold">Notificaciones</h4>
            {unreadCount > 0 && (
              <span className="text-[11px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                {unreadCount} nuevas
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <Check className="w-3 h-3" />
              Marcar leídas
            </button>
          )}
        </div>

        {/* Lista */}
        <ScrollArea className="h-[min(440px,60vh)]">
          {!notifications || notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                <Bell className="h-5 w-5 opacity-40" />
              </div>
              <p className="text-sm">Sin notificaciones</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              <AnimatePresence initial={false}>
                {notifications.map((n, i) => {
                  const isUnread = !n.readBy?.includes(user?.uid ?? '')
                  const cfg = getConfig(n.type)
                  const Icon = cfg.icon
                  const createdAt = n.createdAt?.toDate?.()
                  const isSmoker = SMOKER_TYPES.has(n.type)
                  const smoker = isSmoker ? parseSmokerBody(n.body) : null

                  return (
                    <motion.button
                      key={n.id}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.2 }}
                      onClick={() => handleNotificationClick(n)}
                      className={cn(
                        'w-full text-left flex gap-3 p-3 rounded-xl transition-colors cursor-pointer',
                        isUnread
                          ? 'bg-card shadow-sm ring-1 ring-border/60 hover:bg-muted/40'
                          : 'bg-muted/30 hover:bg-muted/60',
                      )}
                    >
                      {/* Ícono */}
                      <div className={cn(
                        'h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ring-1 mt-0.5',
                        cfg.bg, cfg.text, cfg.ring,
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Contenido */}
                      <div className="flex-1 min-w-0 space-y-1.5">

                        {/* Título + punto de no leído */}
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            'text-xs leading-snug',
                            isUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground/70',
                          )}>
                            {n.title}
                          </p>
                          {isUnread && (
                            <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                          )}
                        </div>

                        {/* Chips para notificaciones de fumadores */}
                        {isSmoker && smoker ? (
                          <div className="space-y-1.5">
                            {/* Fila 1: ID + nombre */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {smoker.id && (
                                <span className="text-[11px] font-mono font-medium bg-muted px-1.5 py-0.5 rounded text-foreground/80">
                                  {smoker.id}
                                </span>
                              )}
                              {smoker.name && (
                                <span className="text-[11px] font-medium text-foreground/90 truncate">
                                  {smoker.name}
                                </span>
                              )}
                            </div>
                            {/* Fila 2: Depto + Turno */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {smoker.dept && (
                                <span className="text-[11px] text-muted-foreground">
                                  {smoker.dept}
                                </span>
                              )}
                              {smoker.turno && (
                                <span className="text-[11px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-medium">
                                  {smoker.turno}
                                </span>
                              )}
                            </div>
                            {/* Fila 3: Comida / Tiempo */}
                            {smoker.extra && (
                              <span className="text-[11px] text-muted-foreground">
                                {smoker.extra}
                              </span>
                            )}
                          </div>
                        ) : (
                          /* Body genérico para otros tipos */
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {n.body}
                          </p>
                        )}

                        {/* Tiempo relativo */}
                        {createdAt && (
                          <p className="text-[11px] text-muted-foreground/50">
                            {formatDistanceToNow(createdAt, { addSuffix: true, locale: es })}
                          </p>
                        )}
                      </div>
                    </motion.button>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
