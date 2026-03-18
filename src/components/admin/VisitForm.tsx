"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, Users, Building2, MapPin, UserCog, Truck } from "lucide-react"

const visitSchema = z.object({
  companyId:      z.string().min(1, "Empresa requerida"),
  areaId:         z.string().min(1, "Área requerida"),
  supervisorId:   z.string().min(1, "Encargado requerido"),
  personnelCount: z.coerce.number().min(1, "Mínimo 1 persona"),
  activity:       z.string().min(1, "Actividad requerida"),
  vehicle:        z.string().optional(),
})

interface VisitFormProps {
  companies:   any[] | null
  areas:       any[] | null
  supervisors: any[] | null
  onSubmit:    (values: z.infer<typeof visitSchema>) => void
  onClose?:    () => void
  isSubmitting?: boolean
}

export function VisitForm({ companies, areas, supervisors, onSubmit, onClose, isSubmitting }: VisitFormProps) {
  const form = useForm<z.infer<typeof visitSchema>>({
    resolver: zodResolver(visitSchema),
    defaultValues: { companyId: "", areaId: "", supervisorId: "", personnelCount: 1, activity: "", vehicle: "" },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

        {/* Empresa */}
        <FormField
          control={form.control}
          name="companyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Building2 className="w-3.5 h-3.5" /> Contratista
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Selecciona empresa registrada" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="rounded-xl">
                  {companies?.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{c.name}</span>
                        <Badge variant="outline" className="text-[10px] rounded-md">{c.sua?.status || 'Sin SUA'}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Área + Encargado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="areaId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" /> Área Destino
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Selecciona área" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-xl">
                    {areas?.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    {!areas?.length && <p className="text-sm text-muted-foreground text-center py-3 px-2">Sin áreas. Agrega en Configuración.</p>}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="supervisorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <UserCog className="w-3.5 h-3.5" /> Encargado
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Selecciona encargado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-xl">
                    {supervisors?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    {!supervisors?.length && <p className="text-sm text-muted-foreground text-center py-3 px-2">Sin encargados. Agrega en Configuración.</p>}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Personal + Placas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="personnelCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Users className="w-3.5 h-3.5" /> Personas
                </FormLabel>
                <FormControl>
                  <Input type="number" className="h-11 rounded-xl" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="vehicle"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Truck className="w-3.5 h-3.5" /> Placa Vehículo
                </FormLabel>
                <FormControl>
                  <Input placeholder="Opcional" className="h-11 rounded-xl uppercase" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Actividad */}
        <FormField
          control={form.control}
          name="activity"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Actividad
              </FormLabel>
              <FormControl>
                <Textarea placeholder="Describe el trabajo a realizar..." className="rounded-xl resize-none" rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {onClose && (
            <Button type="button" variant="outline" className="flex-1 h-11 rounded-xl" onClick={onClose}>
              Cancelar
            </Button>
          )}
          <Button type="submit" className="flex-1 h-11 rounded-xl font-bold gap-2" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Activar Acceso"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
