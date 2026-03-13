"use client"

import * as React from "react"
import { 
  FileDown, 
  Calendar as CalendarIcon, 
  Filter, 
  BarChart3, 
  Download,
  FileText,
  FileSpreadsheet
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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

const reportData = [
  { date: "2024-05-15", name: "Carlos Mendoza", action: "ENTRY", area: "Warehouse", compliance: "Pass" },
  { date: "2024-05-15", name: "Ana Sofia Ruiz", action: "ENTRY", area: "Floor 1", compliance: "Pass" },
  { date: "2024-05-15", name: "Jorge Silva", action: "ENTRY", area: "Parking", compliance: "Pass" },
  { date: "2024-05-14", name: "Lucia Fernandez", action: "EXIT", area: "Lobby", compliance: "Pass" },
  { date: "2024-05-14", name: "Roberto Garcia", action: "ENTRY", area: "Server Room", compliance: "Fail" },
]

export default function ReportsPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports & Analytics</h2>
          <p className="text-muted-foreground mt-1">Generate comprehensive access and compliance audit trails.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" /> Custom Filters
          </Button>
          <Button className="bg-primary text-white gap-2">
            <Download className="w-4 h-4" /> Download All
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-green-600" /> Excel Export
            </CardTitle>
            <CardDescription>Detailed logs in .xlsx format for data analysis.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="w-full">Generate XLSX</Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-600" /> PDF Audit
            </CardTitle>
            <CardDescription>Formal compliance reports with digital signatures.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="w-full">Generate PDF</Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-accent" /> Monthly Summary
            </CardTitle>
            <CardDescription>Visual trends and occupancy statistics.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="w-full">View Summary</Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Recent Audit Trail</CardTitle>
          <CardDescription>Last 30 days of activity and compliance status.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Contractor</TableHead>
                <TableHead className="font-semibold">Action</TableHead>
                <TableHead className="font-semibold">Area</TableHead>
                <TableHead className="font-semibold">Compliance</TableHead>
                <TableHead className="text-right font-semibold">Report</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{row.date}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-md uppercase text-[10px] tracking-wider">
                      {row.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.area}</TableCell>
                  <TableCell>
                    <Badge 
                      className={`rounded-md ${row.compliance === 'Pass' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-red-100 text-red-700 hover:bg-red-100'}`}
                    >
                      {row.compliance}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon">
                      <FileDown className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}