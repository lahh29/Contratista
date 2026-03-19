
"use client"

import * as React from "react"
import {
  Search,
  MoreVertical,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Building2,
  QrCode,
  Phone,
  Calendar,
  Trash2,
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
import { useFirestore, useCollection } from "@/firebase"
import { collection, query, orderBy, limit, doc, updateDoc, deleteDoc } from "firebase/firestore"
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
import type { Company } from "@/types"
import { Plus } from "lucide-react"

type ActiveDialog = 'qr' | 'detail' | 'visits' | 'edit' | 'block' | 'delete' | null

function effectiveSuaStatus(sua?: { status?: string; validUntil?: string }): 'Valid' | 'Expired' | 'Pending' {
  if (sua?.validUntil) {
    const today = new Date().toISOString().slice(0, 10)
    if (sua.validUntil < today) return 'Expired'
    return 'Valid'
  }
  if (sua?.status === 'Valid' || sua?.status === 'Expired') return sua.status
  return 'Pending'
}

function SuaBadge({ sua }: { sua?: { status?: string; validUntil?: string } }) {
  const status = effectiveSuaStatus(sua)
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

function CompanyActions({ onAction }: { onAction: (type: ActiveDialog) => void }) {
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
            className="text-orange-600 focus:text-orange-600"
            onClick={() => onAction('block')}
          >
            Bloquear Acceso
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
  const [selectedCompany, setSelectedCompany] = React.useState<Company | null>(null)
  const [activeDialog, setActiveDialog] = React.useState<ActiveDialog>(null)
  const db = useFirestore()
  const { toast } = useToast()
  const { appUser } = useAppUser()

  const companiesQuery = React.useMemo(() => {
    if (!db) return null
    return query(collection(db, "companies"), orderBy("createdAt", "desc"), limit(500))
  }, [db])

  const { data: companies, loading } = useCollection(companiesQuery)

  const filteredCompanies = React.useMemo(() => {
    if (!companies) return []
    return companies.filter(c =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contact?.toLowerCase().includes(searchTerm.toLowerCase())
    ) as Company[]
  }, [companies, searchTerm])

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
    const updateData = { status: "Blocked" }
    try {
      await updateDoc(companyRef, updateData)
      toast({
        title: "Acceso bloqueado",
        description: `${selectedCompany.name} ha sido bloqueada y no podrá ingresar.`,
        variant: "destructive",
      })
      logAudit({
        action: 'company.blocked',
        actorUid:  appUser?.uid   ?? '',
        actorName: appUser?.name  ?? appUser?.email ?? 'Admin',
        actorRole: appUser?.role  ?? 'admin',
        targetType: 'company',
        targetId:   selectedCompany.id,
        targetName: selectedCompany.name,
      })
      sendNotification({ type: 'blocked_contractor', companyName: selectedCompany.name, companyId: selectedCompany.id })
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
      toast({
        title: "Empresa eliminada",
        description: `${selectedCompany.name} ha sido eliminada del sistema.`,
      })
      logAudit({
        action: 'company.deleted',
        actorUid:  appUser?.uid   ?? '',
        actorName: appUser?.name  ?? appUser?.email ?? 'Admin',
        actorRole: appUser?.role  ?? 'admin',
        targetType: 'company',
        targetId:   selectedCompany.id,
        targetName: selectedCompany.name,
      })
      sendNotification({ type: 'delete_contractor', companyName: selectedCompany.name })
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
            <Button asChild size="sm" className="bg-primary text-white shrink-0 h-10 w-10 p-0">
              <Link href="/contractors/new">
                <Plus className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 md:px-6 md:pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
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
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{company.name}</span>
                        <SuaBadge sua={company.sua} />
                      </div>
                    </div>
                    <CompanyActions onAction={(type) => openAction(company, type)} />
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
                        <TableCell>
                          <SuaBadge sua={company.sua} />
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">
                          {company.sua?.validUntil || 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <CompanyActions onAction={(type) => openAction(company, type)} />
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
              <AlertDialogTitle>¿Bloquear acceso?</AlertDialogTitle>
              <AlertDialogDescription>
                La empresa <strong>{selectedCompany.name}</strong> será marcada como bloqueada y no podrá
                registrar nuevas visitas. Esta acción se puede revertir editando la empresa.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-orange-600 text-white hover:bg-orange-700"
                onClick={handleBlock}
              >
                Sí, bloquear
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
