
"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
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
import { useFirestore, useCollection } from "@/firebase"
import { collection, addDoc, serverTimestamp, query, where } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { 
  QrCode, 
  MessageCircle, 
  Save, 
  Users, 
  Building2, 
  MapPin, 
  UserCog,
  ShieldCheck,
  Truck,
  ClipboardCheck,
  Loader2
} from "lucide-react"

const visitSchema = z.object({
  companyId: z.string().min(1, "Empresa requerida"),
  areaId: z.string().min(1, "Área requerida"),
  supervisorId: z.string().min(1, "Encargado requerido"),
  personnelCount: z.coerce.number().min(1, "Mínimo 1 persona"),
  activity: z.string().min(1, "Actividad requerida"),
  vehicle: z.string().optional(),
})

export function NewVisitModal({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const { toast } = useToast()
  const db = useFirestore()

  // Fetch companies and areas for selects
  const companiesQuery = React.useMemo(() => db ? collection(db, "companies") : null, [db])
  const areasQuery = React.useMemo(() => db ? collection(db, "areas") : null, [db])
  
  const { data: companies } = useCollection(companiesQuery)
  const { data: areas } = useCollection(areasQuery)

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

  const onSubmit = async (values: z.infer<typeof visitSchema>) => {
    if (!db) return

    const selectedCompany = companies?.find(c => c.id === values.companyId)
    const selectedArea = areas?.find(a => a.id === values.areaId)

    const visitData = {
      ...values,
      companyName: selectedCompany?.name || "Empresa Desconocida",
      areaName: selectedArea?.name || "Área Desconocida",
      status: "Active",
      entryTime: serverTimestamp(),
      createdAt: serverTimestamp(),
      qrCode: `VIS-${Math.random().toString(36).substring(7).toUpperCase()}`
    }

    try {
      await addDoc(collection(db, "visits"), visitData)

      toast({
        title: "Visita Activada",
        description: `${visitData.companyName} ha ingresado a ${visitData.areaName}.`,
      })
      setOpen(false)
      form.reset()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar la visita.",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto border-none shadow-2xl">
        <DialogHeader>
          <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
             <ClipboardCheck className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold">Registro de Visita</DialogTitle>
          <DialogDescription>
            Configure el acceso en tiempo real según la arquitectura de seguridad.
          </DialogDescription>
        </DialogHeader>

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
                          <SelectItem value="Mantenimiento">Mantenimiento Central</SelectItem>
                          <SelectItem value="ServerRoom">Sala de Servidores</SelectItem>
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
                          <SelectItem value="IngLopez">Ing. López</SelectItem>
                          <SelectItem value="LicMaza">Lic. Maza</SelectItem>
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
              <Button type="submit" className="flex-1 bg-primary text-white h-12 gap-2 font-bold">
                <Save className="w-4 h-4" /> ACTIVAR ACCESO
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
