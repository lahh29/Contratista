"use client"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, ShieldAlert, Phone, User, Calendar, Hash, Building2, FileText, MapPin, StickyNote } from "lucide-react"

interface CompanyDetailSheetProps {
  company: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium mt-0.5">{value}</p>
      </div>
    </div>
  )
}

export function CompanyDetailSheet({ company, open, onOpenChange }: CompanyDetailSheetProps) {
  if (!company) return null

  const today = new Date().toISOString().split('T')[0]
  const effectiveStatus = company.sua?.validUntil
    ? (company.sua.validUntil < today ? 'Expired' : 'Valid')
    : (company.sua?.status ?? 'Pending')
  const isValid   = effectiveStatus === 'Valid'
  const isExpired = effectiveStatus === 'Expired'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-md overflow-y-auto"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
              {company.name?.[0]}
            </div>
            <div>
              <SheetTitle className="text-left">{company.name}</SheetTitle>
              <SheetDescription className="text-left">ID: {company.id?.slice(0, 12)}…</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* SUA Status Banner */}
        <div className={`rounded-xl p-4 mb-6 flex items-center justify-between ${isValid ? 'bg-green-50' : isExpired ? 'bg-red-50' : 'bg-orange-50'}`}>
          <div>
            <p className={`text-xs font-bold uppercase ${isValid ? 'text-green-700' : isExpired ? 'text-red-700' : 'text-orange-700'}`}>
              Estado SUA
            </p>
            <p className={`text-lg font-black mt-0.5 ${isValid ? 'text-green-800' : isExpired ? 'text-red-800' : 'text-orange-800'}`}>
              {isValid ? 'Vigente' : isExpired ? 'Vencido' : 'Pendiente'}
            </p>
          </div>
          <Badge
            variant={isValid ? 'default' : isExpired ? 'destructive' : 'secondary'}
            className="rounded-lg px-3 py-1.5 text-sm"
          >
            {isValid ? <ShieldCheck className="w-4 h-4 mr-1.5" /> : <ShieldAlert className="w-4 h-4 mr-1.5" />}
            {company.sua?.status || 'N/A'}
          </Badge>
        </div>

        {/* Details */}
        <div className="space-y-0 rounded-xl border overflow-hidden px-1">
          <InfoRow icon={Building2} label="Razón Social" value={company.name} />
          <InfoRow icon={User} label="Contacto Principal" value={company.contact} />
          <InfoRow icon={Phone} label="Teléfono" value={company.phone} />
          <InfoRow icon={FileText} label="RFC" value={company.rfc} />
          <InfoRow icon={MapPin} label="Dirección" value={company.address} />
          <InfoRow icon={Hash} label="N° de Póliza / SUA" value={company.sua?.number} />
          <InfoRow icon={Calendar} label="Vencimiento SUA" value={company.sua?.validUntil} />
          <InfoRow
            icon={Calendar}
            label="Fecha de Registro"
            value={company.createdAt?.toDate ? company.createdAt.toDate().toLocaleDateString('es-MX') : undefined}
          />
        </div>

        {/* Notas internas — solo si existen */}
        {company.notes && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-4 py-3 flex gap-3">
            <StickyNote className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">Notas internas</p>
              <p className="text-sm text-amber-900 dark:text-amber-300 whitespace-pre-wrap leading-relaxed">{company.notes}</p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
