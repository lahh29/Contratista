"use client"

import * as React from "react"
import { 
  Users, 
  UserCheck, 
  AlertTriangle, 
  MapPin, 
  ArrowUpRight,
  Clock,
  ExternalLink
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip,
  Cell,
  PieChart,
  Pie
} from "recharts"

const stats = [
  {
    title: "Active Contractors",
    value: "128",
    change: "+12% from yesterday",
    icon: Users,
    color: "bg-blue-500",
  },
  {
    title: "Currently On-site",
    value: "42",
    change: "Current occupancy",
    icon: UserCheck,
    color: "bg-green-500",
  },
  {
    title: "Pending Verifications",
    value: "7",
    change: "Requires action",
    icon: AlertTriangle,
    color: "bg-orange-500",
  },
  {
    title: "Total Areas Active",
    value: "12",
    change: "Coverage 100%",
    icon: MapPin,
    color: "bg-purple-500",
  },
]

const areaData = [
  { name: "Lobby", value: 5 },
  { name: "Floor 1", value: 12 },
  { name: "Floor 2", value: 8 },
  { name: "Warehouse", value: 15 },
  { name: "Parking", value: 2 },
]

const recentLogs = [
  { id: 1, name: "Carlos Mendoza", action: "ENTRY", area: "Warehouse", time: "10:24 AM", status: "VERIFIED" },
  { id: 2, name: "Ana Sofia Ruiz", action: "EXIT", area: "Lobby", time: "10:15 AM", status: "VERIFIED" },
  { id: 3, name: "Jorge Silva", action: "ENTRY", area: "Floor 2", time: "09:42 AM", status: "VERIFIED" },
  { id: 4, name: "Lucia Fernandez", action: "ENTRY", area: "Floor 1", time: "09:30 AM", status: "EXPIRED SUA" },
]

const COLORS = ['#235CB3', '#6E26D9', '#10B981', '#F59E0B', '#6366F1'];

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
          <p className="text-muted-foreground mt-1">Real-time monitoring of personnel access and compliance.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Clock className="w-4 h-4" /> Last 24h
          </Button>
          <Button size="sm" className="bg-primary text-white gap-2">
            <ExternalLink className="w-4 h-4" /> Export Report
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-none shadow-sm hover:shadow-md transition-shadow group">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                {stat.title}
              </CardTitle>
              <div className={`${stat.color} p-2 rounded-md bg-opacity-10 group-hover:scale-110 transition-transform`}>
                <stat.icon className={`w-4 h-4 ${stat.color.replace('bg-', 'text-')}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3 text-green-500" />
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 border-none shadow-sm">
          <CardHeader>
            <CardTitle>Personnel by Area</CardTitle>
            <CardDescription>Live distribution across controlled zones.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={areaData}>
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {areaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-none shadow-sm">
          <CardHeader>
            <CardTitle>Compliance Status</CardTitle>
            <CardDescription>Overall SUA verification health.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Active', value: 85 },
                    { name: 'Pending', value: 10 },
                    { name: 'Expired', value: 5 },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#10B981" />
                  <Cell fill="#F59E0B" />
                  <Cell fill="#EF4444" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Entry/Exit Logs</CardTitle>
            <CardDescription>Live timestamped activity across all access points.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">View All Logs</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-semibold">Contractor</TableHead>
                <TableHead className="font-semibold">Action</TableHead>
                <TableHead className="font-semibold">Area</TableHead>
                <TableHead className="font-semibold">Time</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="text-right font-semibold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLogs.map((log) => (
                <TableRow key={log.id} className="group cursor-pointer">
                  <TableCell className="font-medium">{log.name}</TableCell>
                  <TableCell>
                    <Badge variant={log.action === "ENTRY" ? "default" : "secondary"} className="rounded-md">
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{log.area}</TableCell>
                  <TableCell className="text-muted-foreground">{log.time}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${log.status === 'VERIFIED' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                      <span className="text-sm">{log.status}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      Details
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
