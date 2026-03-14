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
  SelectValue 
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  Save, 
  Users, 
  Building2, 
  MapPin, 
  UserCog,
  Truck
} from "lucide-react"

const visitSchema = z.object({
  companyId: z.string().min(1, "Empresa requerida"),
  areaId: z.string().min(1, "Área requerida"),
  supervisorId: z.string().min(1, "Encargado requerido"),
  personnelCount: z.coerce.number().min(1, "Mínimo 1 persona"),
  activity: z.string().min(1, "Actividad requerida"),
  vehicle: z.string().optional(),
})

interface VisitFormProps {
  companies: any[] | null;
  areas: any[] | null;
  supervisors: any[] | null;
  onSubmit: (values: z.infer<typeof visitSchema>) => void;
  isSubmitting?: boolean;
}

export function VisitForm({ companies, areas, supervisors, onSubmit, isSubmitting }: VisitFormProps) {
  const form = useForm<z.infer<typeof visitSchema>>({
    resolver: zodResolver(visitSchema),
    defaultValues: {
      companyId: "",
      areaId: "",
      supervisorId: "",
      personnelCount: 1,
      activity: "",
      vehicle: "",
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6">
          <FormField
            control={form.control}
            name="companyId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Empresa Contratista
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Seleccione empresa autorizada" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {companies?.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                           <span className="font-semibold">{c.name}</span>
                           <Badge variant="outline" className="text-[10px]">{c.sua?.status || 'Sin SUA'}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="areaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Área Destino
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Área" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {areas?.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                      {!areas?.length && (
                        <p className="text-sm text-muted-foreground text-center py-3 px-2">
                          Sin áreas. Agrega en Configuración.
                        </p>
                      )}
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
                  <FormLabel className="flex items-center gap-2">
                    <UserCog className="w-4 h-4" /> Supervisor Interno
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Encargado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {supervisors?.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                      {!supervisors?.length && (
                        <p className="text-sm text-muted-foreground text-center py-3 px-2">
                          Sin supervisores. Agrega en Configuración.
                        </p>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="personnelCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Users className="w-4 h-4" /> Dotación
                  </FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
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
                  <FormLabel className="flex items-center gap-2">
                    <Truck className="w-4 h-4" /> Patente / Placa
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Opcional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="activity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Actividad Específica</FormLabel>
                <FormControl>
                  <Textarea placeholder="Describa el trabajo a realizar..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button type="submit" className="flex-1 bg-primary text-white h-12 gap-2 font-bold" disabled={isSubmitting}>
            {isSubmitting ? "GUARDANDO..." : <><Save className="w-4 h-4" /> ACTIVAR ACCESO</>}
          </Button>
        </div>
      </form>
    </Form>
  )
}
