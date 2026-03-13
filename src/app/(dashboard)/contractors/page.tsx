
"use client"

import * as React from "react"
import { 
  Search, 
  MoreVertical, 
  UserPlus, 
  ShieldCheck, 
  ShieldAlert,
  Download,
  Loader2,
  Building2
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

  const companiesQuery = React.useMemo(() => {
    if (!db) return null
    return query(collection(db, "companies"), orderBy("createdAt", "desc"))
  }, [db])

  const { data: companies, loading } = useCollection(companiesQuery)

  const filteredCompanies = React.useMemo(() => {
    if (!companies) return []
    return companies.filter(c => 
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.contact?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [companies, searchTerm])

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Empresas Contratistas</h2>
          <p className="text-muted-foreground mt-1">Gestión de cumplimiento y registros maestros de empresas.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Exportar
          </Button>
          <Button asChild className="bg-primary text-white gap-2">
            <Link href="/contractors/new">
              <Building2 className="w-4 h-4" /> Nueva Empresa
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
                placeholder="Buscar por empresa o contacto..." 
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
                  <TableHead className="font-semibold py-4">Empresa</TableHead>
                  <TableHead className="font-semibold py-4">Contacto Principal</TableHead>
                  <TableHead className="font-semibold py-4">Estado SUA</TableHead>
                  <TableHead className="font-semibold py-4">Vencimiento</TableHead>
                  <TableHead className="text-right font-semibold py-4">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.length > 0 ? (
                  filteredCompanies.map((company) => (
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
                        <Badge 
                          variant={company.sua?.status === 'Valid' ? 'default' : company.sua?.status === 'Expired' ? 'destructive' : 'secondary'}
                          className="rounded-md px-2 py-0.5"
                        >
                          {company.sua?.status === 'Valid' ? <ShieldCheck className="w-3 h-3 mr-1" /> : <ShieldAlert className="w-3 h-3 mr-1" />}
                          {company.sua?.status === 'Valid' ? 'Válido' : company.sua?.status === 'Expired' ? 'Vencido' : 'Pendiente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {company.sua?.validUntil || 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Gestión</DropdownMenuLabel>
                            <DropdownMenuItem>Ver Expediente</DropdownMenuItem>
                            <DropdownMenuItem>Historial de Visitas</DropdownMenuItem>
                            <DropdownMenuItem>Editar Datos</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">Bloquear Acceso</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      No se encontraron empresas registradas.
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
