"use client"

import { 
  MapPin, 
  Clock, 
  Users, 
  Phone, 
  LogOut 
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface ContractorDashboardProps {
  contractor: any;
  onExit: () => void;
}

export function ContractorDashboard({ contractor, onExit }: ContractorDashboardProps) {
  return (
    <div className="max-w-md mx-auto space-y-8 animate-in zoom-in-95 duration-500">
      <div className="text-center space-y-4">
        <div className="w-24 h-24 rounded-full bg-accent mx-auto flex items-center justify-center text-white text-4xl font-black border-4 border-white shadow-xl ring-4 ring-accent/20">
          {contractor?.name?.[0]}
        </div>
        <div>
          <h2 className="text-3xl font-black tracking-tight">¡Bienvenido, {contractor?.name?.split(' ')[0]}!</h2>
          <Badge variant="secondary" className="mt-2 bg-green-100 text-green-700 hover:bg-green-100 px-4 py-1 text-xs font-bold">
            EN SITIO TRABAJANDO
          </Badge>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-start justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Área Asignada</p>
                <p className="font-bold text-slate-800">{contractor?.areaName || '—'}</p>
              </div>
            </div>
            <div className="text-right">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Encargado</p>
               <p className="font-bold text-slate-800">{contractor?.supervisorName || '—'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-2">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-accent" />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Entrada</p>
                <p className="font-bold">
                  {contractor?.entryTime
                    ? new Date(contractor.entryTime.toDate()).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-accent" />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Personal</p>
                <p className="font-bold">{contractor?.personnelCount ?? '—'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button variant="outline" className="h-16 rounded-2xl border-2 gap-2 font-bold text-blue-600 hover:bg-blue-50 hover:text-blue-700">
            <Phone className="w-5 h-5" /> Llamar
          </Button>
          <Button 
            variant="ghost" 
            className="h-16 rounded-2xl border-2 border-red-100 text-red-600 hover:bg-red-50 gap-2 font-bold"
            onClick={onExit}
          >
            <LogOut className="w-5 h-5" /> Salir
          </Button>
        </div>
      </div>
    </div>
  )
}
