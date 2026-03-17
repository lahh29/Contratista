'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Bell,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  UserPlus,
  UserMinus,
  Users,
  Info,
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useCollection } from '@/firebase/firestore/use-collection'
import { useFirestore, useUser } from '@/firebase'
import {
  collection,
  query,
  orderBy,
  limit,
  writeBatch,
  doc,
  arrayUnion,
} from 'firebase/firestore'
import type { AppNotification } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import type { LucideProps } from 'lucide-react'

type IconComponent = React.ComponentType<LucideProps>

const TYPE_ICONS: Record<string, IconComponent> = {
  entry:             ArrowDownToLine,
  exit:              ArrowUpFromLine,
  sua_expiring:      AlertTriangle,
  new_contractor:    UserPlus,
  delete_contractor: UserMinus,
  over_capacity:     Users,
}

function getIcon(type: string): IconComponent {
  return TYPE_ICONS[type] ?? Info
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const db              = useFirestore()
  const { user }        = useUser()

  const notificationsQuery = useMemo(() => {
    if (!db) return null
    return query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(20),
    )
  }, [db])

  const { data: rawNotifications } = useCollection(notificationsQuery)
  const notifications = rawNotifications as AppNotification[] | null

  const unreadCount = useMemo(
    () => notifications?.filter(n => !n.readBy?.includes(user?.uid ?? '')).length ?? 0,
    [notifications, user?.uid],
  )

  const markAllRead = useCallback(async () => {
    if (!db || !user || !notifications) return
    const unread = notifications.filter(n => !n.readBy?.includes(user.uid))
    if (unread.length === 0) return

    const batch = writeBatch(db)
    unread.forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { readBy: arrayUnion(user.uid) })
    })
    await batch.commit().catch(() => {})
  }, [db, user, notifications])

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) markAllRead()
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="text-sm font-semibold">Notificaciones</h4>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">{unreadCount} sin leer</span>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {!notifications || notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
              <Bell className="h-6 w-6 opacity-40" />
              <p className="text-sm">Sin notificaciones</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(n => {
                const isUnread  = !n.readBy?.includes(user?.uid ?? '')
                const Icon      = getIcon(n.type)
                const createdAt = n.createdAt?.toDate?.()

                return (
                  <div
                    key={n.id}
                    className={cn(
                      'flex gap-3 px-4 py-3 transition-colors',
                      isUnread ? 'bg-accent/5' : 'hover:bg-muted/40',
                    )}
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('text-sm leading-snug', isUnread && 'font-medium')}>
                          {n.title}
                        </p>
                        {isUnread && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {n.body}
                      </p>
                      {createdAt && (
                        <p className="text-[11px] text-muted-foreground/60 mt-1">
                          {formatDistanceToNow(createdAt, { addSuffix: true, locale: es })}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
