"use client"

import * as React from "react"
import { 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  UserPlus, 
  ShieldCheck, 
  ShieldAlert,
  Download
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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

const contractors = [
  { id: "CON-001", name: "Carlos Mendoza", company: "BuildCorp Solutions", suaStatus: "Active", expiration: "2024-12-15", phone: "+1 234 567 890" },
  { id: "CON-002", name: "Ana Sofia Ruiz", company: "Secure Facilities", suaStatus: "Active", expiration: "2025-01-20", phone: "+1 234 567 891" },
  { id: "CON-003", name: "Jorge Silva", company: "Logistics Pro", suaStatus: "Expired", expiration: "2023-11-01", phone: "+1 234 567 892" },
  { id: "CON-004", name: "Lucia Fernandez", company: "BuildCorp Solutions", suaStatus: "Active", expiration: "2024-10-30", phone: "+1 234 567 893" },
  { id: "CON-005", name: "Roberto Garcia", company: "MaintenX", suaStatus: "Pending", expiration: "2024-05-12", phone: "+1 234 567 894" },
]

export default function ContractorsPage() {
  const [searchTerm, setSearchTerm] = React.useState("")

  const filteredContractors = contractors.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.company.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Contractors</h2>
          <p className="text-muted-foreground mt-1">Manage personnel profiles and document compliance.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button asChild className="bg-primary text-white gap-2">
            <Link href="/contractors/new">
              <UserPlus className="w-4 h-4" /> Add Contractor
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
                placeholder="Search contractors or companies..." 
                className="pl-10 h-10 bg-muted/30 border-none focus-visible:ring-1"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" /> Filters
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-semibold py-4">ID</TableHead>
                <TableHead className="font-semibold py-4">Contractor Name</TableHead>
                <TableHead className="font-semibold py-4">Company</TableHead>
                <TableHead className="font-semibold py-4">SUA Status</TableHead>
                <TableHead className="font-semibold py-4">Expiration</TableHead>
                <TableHead className="text-right font-semibold py-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContractors.length > 0 ? (
                filteredContractors.map((contractor) => (
                  <TableRow key={contractor.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="font-mono text-xs text-muted-foreground">{contractor.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold text-xs uppercase">
                          {contractor.name.split(' ').map(n => n[0]).join('')}
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
                        {contractor.suaStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{contractor.expiration}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>View Profile</DropdownMenuItem>
                          <DropdownMenuItem>Edit Details</DropdownMenuItem>
                          <DropdownMenuItem>Generate QR</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No contractors found matching your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}