
"use client"

import * as React from "react"
import {
  Search,
  MoreVertical,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Building2,
  QrCode,
  Phone,
  Calendar,
  Trash2,
  RefreshCw,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import Link from "next/link"
import { useFirestore } from "@/firebase"
import { doc, updateDoc, deleteDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { ContractorQRDialog } from "@/components/contractors/ContractorQRDialog"
import { CompanyDetailSheet } from "@/components/contractors/CompanyDetailSheet"
import { CompanyVisitsSheet } from "@/components/contractors/CompanyVisitsSheet"
import { EditCompanySheet } from "@/components/contractors/EditCompanySheet"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { sendNotification } from "@/app/actions/notify"
import { logAudit } from "@/app/actions/audit"
import { useAppUser } from "@/hooks/use-app-user"
import { useCompanies } from "@/hooks/use-companies"
import type { Company } from "@/types"
import { Plus } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { getSuaStatus } from "@/lib/utils"
import { SkeletonTable, SkeletonRows } from "@/components/ui/skeletons"
import { toastWithUndo } from "@/lib/toast-helpers"

type ActiveDialog = 'qr' | 'detail' | 'visits' | 'edit' | 'block' | 'delete' | null

function SuaBadge({ sua }: { sua?: { status?: string; validUntil?: string } }) {
  const status = getSuaStatus(sua)
  const isValid = status === 'Valid'
  const isExpired = status === 'Expired'
  return (
    <Badge
      variant={isValid ? 'default' : isExpired ? 'destructive' : 'secondary'}
      className="rounded-md px-2 py-0.5 flex items-center gap-1 w-fit"
    >
      {isValid ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
      {isValid ? 'Válido' : isExpired ? 'Vencido' : 'Pendiente'}
    </Badge>
  )
}

function CompanyActions({ company, onAction }: { company: Company; onAction: (type: ActiveDialog) => void }) {
  const isBlocked = company.status === 'Blocked'
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-primary hover:bg-primary/10"
        onClick={() => onAction('qr')}
        title="Ver QR de acceso"
      >
        <QrCode className="h-4 w-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Gestión</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onAction('qr')}>
            <QrCode className="w-4 h-4 mr-2" /> Ver QR de Acceso
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAction('detail')}>
            <Building2 className="w-4 h-4 mr-2" /> Ver Expediente
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAction('visits')}>
            <Calendar className="w-4 h-4 mr-2" /> Historial de Visitas
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAction('edit')}>
            <Search className="w-4 h-4 mr-2" /> Editar Datos
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className={isBlocked ? "text-green-600 focus:text-green-600" : "text-orange-600 focus:text-orange-600"}
            onClick={() => onAction('block')}
          >
            {isBlocked ? <ShieldOff className="w-4 h-4 mr-2" /> : null}
            {isBlocked ? 'Desbloquear Acceso' : 'Bloquear Acceso'}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onAction('delete')}
          >
            <Trash2 className="w-4 h-4 mr-2" /> Eliminar Empresa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default function ContractorsPage() {
  const [searchTerm, setSearchTerm] = React.useState("")
  const debouncedSearch = useDebounce(searchTerm, 250)
  const [selectedCompany, setSelectedCompany] = React.useState<Company | null>(null)
  const [activeDialog, setActiveDialog] = React.useState<ActiveDialog>(null)
  const db = useFirestore()
  const { toast } = useToast()
  const { appUser } = useAppUser()

  const { companies, loading, refresh: fetchCompanies } = useCompanies()

  const filteredCompanies = React.useMemo(() => {
    if (!companies) return []
    let list = companies
    if (appUser?.role === 'logistica') {
      list = list.filter(c => c.type === 'cliente')
    }
    const q = debouncedSearch.toLowerCase()
    return list.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.contact?.toLowerCase().includes(q)
    ) as Company[]
  }, [companies, debouncedSearch, appUser?.role])

  function openAction(company: Company, type: ActiveDialog) {
    setSelectedCompany(company)
    // Delay lets the DropdownMenu fully close its portal + focus trap
    // before mounting a Sheet/Dialog, preventing Radix UI focus conflicts
    setTimeout(() => setActiveDialog(type), 100)
  }

  function closeDialog() {
    setActiveDialog(null)
    setTimeout(() => setSelectedCompany(null), 300)
  }

  async function handleBlock() {
    if (!db || !selectedCompany) return
    const companyRef = doc(db, "companies", selectedCompany.id)
    const isBlocked = selectedCompany.status === 'Blocked'
    const newStatus = isBlocked ? 'Active' : 'Blocked'
    const updateData = { status: newStatus }
    try {
      await updateDoc(companyRef, updateData)
      const undoStatus = isBlocked ? 'Blocked' : 'Active'
      toastWithUndo(
        isBlocked ? "Acceso desbloqueado" : "Acceso bloqueado",
        async () => {
          await updateDoc(companyRef, { status: undoStatus })
          if (isBlocked) {
            sendNotification({ type: 'blocked_contractor', companyName: selectedCompany.name, companyId: selectedCompany.id }).catch(() => { })
          } else {
            sendNotification({ type: 'unblocked_contractor', companyName: selectedCompany.name }).catch(() => { })
          }
          fetchCompanies()
        },
        isBlocked
          ? `${selectedCompany.name} ha sido desbloqueada.`
          : `${selectedCompany.name} ha sido bloqueada.`,
      )
      logAudit({
        action: isBlocked ? 'company.unblocked' : 'company.blocked',
        actorUid: appUser?.uid ?? '',
        actorName: appUser?.name ?? appUser?.email ?? 'Admin',
        actorRole: appUser?.role ?? 'admin',
        targetType: 'company',
        targetId: selectedCompany.id,
        targetName: selectedCompany.name,
      })
      if (isBlocked) {
        sendNotification({ type: 'unblocked_contractor', companyName: selectedCompany.name }).catch(() => { })
      } else {
        sendNotification({ type: 'blocked_contractor', companyName: selectedCompany.name, companyId: selectedCompany.id }).catch(() => { })
      }
      fetchCompanies()
    } catch {
      const permissionError = new FirestorePermissionError({
        path: companyRef.path,
        operation: 'update',
        requestResourceData: updateData,
      })
      errorEmitter.emit('permission-error', permissionError)
    } finally {
      closeDialog()
    }
  }

  async function handleDelete() {
    if (!db || !selectedCompany) return
    const companyRef = doc(db, "companies", selectedCompany.id)
    try {
      await deleteDoc(companyRef)
      toast({ title: "Empresa eliminada", description: `${selectedCompany.name} ha sido eliminada del sistema.` })
      logAudit({
        action: 'company.deleted',
        actorUid: appUser?.uid ?? '',
        actorName: appUser?.name ?? appUser?.email ?? 'Admin',
        actorRole: appUser?.role ?? 'admin',
        targetType: 'company',
        targetId: selectedCompany.id,
        targetName: selectedCompany.name,
      })
      sendNotification({ type: 'delete_contractor', companyName: selectedCompany.name }).catch(() => { })
      fetchCompanies()
    } catch {
      const permissionError = new FirestorePermissionError({
        path: companyRef.path,
        operation: 'delete',
      })
      errorEmitter.emit('permission-error', permissionError)
    } finally {
      closeDialog()
    }
  }

  return (
    <div className="space-y-5 md:space-y-6 animate-in fade-in duration-500">
      {/* Search + Table */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4 md:px-6">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:max-w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar empresa o contacto..."
                className="pl-10 h-10 bg-muted/30 border-none focus-visible:ring-1"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={fetchCompanies} disabled={loading} title="Actualizar lista">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button asChild size="sm" className="bg-primary text-primary-foreground shrink-0 h-10 w-10 p-0">
              <Link href="/contractors/new">
                <Plus className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 md:px-6 md:pb-6">
          {loading ? (
            <>
              <div className="md:hidden"><SkeletonRows rows={6} /></div>
              <div className="hidden md:block"><SkeletonTable rows={6} cols={4} /></div>
            </>
          ) : filteredCompanies.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm px-4">
              No se encontraron empresas registradas.
            </div>
          ) : (
            <>
              {/* Mobile: compact rows */}
              <div className="flex flex-col divide-y md:hidden">
                {filteredCompanies.map((company) => (
                  <div key={company.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 active:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-sm truncate block">{company.name}</span>
                      <div className="mt-1">
                        <SuaBadge sua={company.sua} />
                      </div>
                    </div>
                    <CompanyActions company={company} onAction={(type) => openAction(company, type)} />
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="font-semibold py-4">Empresa</TableHead>
                      <TableHead className="font-semibold py-4">Contacto Principal</TableHead>
                      {appUser?.role === 'admin' && (
                        <TableHead className="font-semibold py-4">Tipo</TableHead>
                      )}
                      <TableHead className="font-semibold py-4">Estado SUA</TableHead>
                      <TableHead className="font-semibold py-4">Vencimiento</TableHead>
                      <TableHead className="text-right font-semibold py-4">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompanies.map((company) => (
                      <TableRow key={company.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                              {company.name?.[0]}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold">{company.name}</span>
                              <span className="text-xs text-muted-foreground">ID: {company.id.slice(0, 8)}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{company.contact}</span>
                            <span className="text-xs text-muted-foreground">{company.phone}</span>
                          </div>
                        </TableCell>
                        {appUser?.role === 'admin' && (
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${company.type === 'cliente'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                                : 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400'
                              }`}>
                              {company.type === 'cliente' ? 'Cliente' : 'Proveedor'}
                            </span>
                          </TableCell>
                        )}
                        <TableCell>
                          <SuaBadge sua={company.sua} />
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">
                          {company.sua?.validUntil || 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <CompanyActions company={company} onAction={(type) => openAction(company, type)} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs / Sheets — rendered only when active to avoid stuck focus traps */}
      {activeDialog === 'qr' && selectedCompany && (
        <ContractorQRDialog
          company={selectedCompany}
          open
          onOpenChange={(open) => { if (!open) closeDialog() }}
        />
      )}
      {activeDialog === 'detail' && selectedCompany && (
        <CompanyDetailSheet
          company={selectedCompany}
          open
          onOpenChange={(open) => { if (!open) closeDialog() }}
        />
      )}
      {activeDialog === 'visits' && selectedCompany && (
        <CompanyVisitsSheet
          company={selectedCompany}
          open
          onOpenChange={(open) => { if (!open) closeDialog() }}
        />
      )}
      {activeDialog === 'edit' && selectedCompany && (
        <EditCompanySheet
          company={selectedCompany}
          open
          onOpenChange={(open) => { if (!open) closeDialog() }}
        />
      )}
      {activeDialog === 'block' && selectedCompany && (
        <AlertDialog open onOpenChange={(open) => { if (!open) closeDialog() }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {selectedCompany.status === 'Blocked' ? '¿Desbloquear acceso?' : '¿Bloquear acceso?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {selectedCompany.status === 'Blocked' ? (
                  <>La empresa <strong>{selectedCompany.name}</strong> será desbloqueada y podrá registrar visitas nuevamente.</>
                ) : (
                  <>La empresa <strong>{selectedCompany.name}</strong> será marcada como bloqueada y no podrá registrar nuevas visitas. Esta acción se puede revertir.</>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className={selectedCompany.status === 'Blocked'
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-orange-600 text-white hover:bg-orange-700"
                }
                onClick={handleBlock}
              >
                {selectedCompany.status === 'Blocked' ? 'Sí, desbloquear' : 'Sí, bloquear'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {activeDialog === 'delete' && selectedCompany && (
        <AlertDialog open onOpenChange={(open) => { if (!open) closeDialog() }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar empresa definitivamente?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará a <strong>{selectedCompany.name}</strong> y todos sus datos maestros.
                Esta acción no se puede deshacer. Las visitas históricas permanecerán pero sin vínculo a la empresa.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDelete}
              >
                Eliminar para siempre
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
