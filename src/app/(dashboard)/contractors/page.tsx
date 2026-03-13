"use client"

import * as React from "react"
import { 
  Search, 
  MoreVertical, 
  UserPlus, 
  ShieldCheck, 
  ShieldAlert,
  Download,
  Loader2
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
import Link from "next/link"
import { useFirestore, useCollection } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"

export default function ContractorsPage() {
  const [searchTerm, setSearchTerm] = React.useState("")
  const db = useFirestore()

  const contractorsQuery = React.useMemo(() => {
    if (!db) return null
    return query(collection(db, "contractors"), orderBy("createdAt", "desc"))
  }, [db])

  const { data: contractors, loading } = useCollection(contractorsQuery)

  const filteredContractors = React.useMemo(() => {
    if (!contractors) return []
    return contractors.filter(c => 
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.company?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [contractors, searchTerm])

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Contratistas</h2>
          <p className="text-muted-foreground mt-1">Gestión de personal y cumplimiento de documentos.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Exportar
          </Button>
          <Button asChild className="bg-primary text-white gap-2">
            <Link href="/contractors/new">
              <UserPlus className="w-4 h-4" /> Nuevo Contratista
            </Link>
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nombre o empresa..." 
                className="pl-10 h-10 bg-muted/30 border-none focus-visible:ring-1"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-semibold py-4">Nombre</TableHead>
                  <TableHead className="font-semibold py-4">Empresa</TableHead>
                  <TableHead className="font-semibold py-4">Estado SUA</TableHead>
                  <TableHead className="font-semibold py-4">Vencimiento</TableHead>
                  <TableHead className="text-right font-semibold py-4">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContractors.length > 0 ? (
                  filteredContractors.map((contractor) => (
                    <TableRow key={contractor.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold text-xs uppercase">
                            {contractor.name?.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">{contractor.name}</span>
                            <span className="text-xs text-muted-foreground">{contractor.phone}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{contractor.company}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={contractor.suaStatus === 'Active' ? 'default' : contractor.suaStatus === 'Expired' ? 'destructive' : 'secondary'}
                          className="rounded-md px-2 py-0.5"
                        >
                          {contractor.suaStatus === 'Active' ? <ShieldCheck className="w-3 h-3 mr-1" /> : <ShieldAlert className="w-3 h-3 mr-1" />}
                          {contractor.suaStatus === 'Active' ? 'Activo' : contractor.suaStatus === 'Expired' ? 'Vencido' : 'Pendiente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{contractor.suaExpiration}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem>Ver Perfil</DropdownMenuItem>
                            <DropdownMenuItem>Editar</DropdownMenuItem>
                            <DropdownMenuItem>Generar QR</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">Eliminar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      No se encontraron contratistas.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
