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
import { useFirestore } from "@/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
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
  ClipboardCheck
} from "lucide-react"

const visitSchema = z.object({
  company: z.string().min(1, "Empresa requerida"),
  responsible: z.string().min(1, "Responsable requerido"),
  phone: z.string().min(1, "Teléfono requerido"),
  suaCode: z.string().min(1, "Código SUA requerido"),
  personnelCount: z.coerce.number().min(1, "Mínimo 1 persona"),
  personnelList: z.string().optional(),
  area: z.string().min(1, "Área requerida"),
  manager: z.string().min(1, "Encargado requerido"),
  activity: z.string().min(1, "Actividad requerida"),
  vehicle: z.string().optional(),
})

export function NewVisitModal({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const { toast } = useToast()
  const db = useFirestore()

  const form = useForm<z.infer<typeof visitSchema>>({
    resolver: zodResolver(visitSchema),
    defaultValues: {
      company: "",
      responsible: "",
      phone: "",
      suaCode: "",
      personnelCount: 1,
      personnelList: "",
      area: "",
      manager: "",
      activity: "",
      vehicle: "",
    },
  })

  const onSubmit = async (values: z.infer<typeof visitSchema>) => {
    if (!db) return

    try {
      await addDoc(collection(db, "visits"), {
        ...values,
        status: "Active",
        entryTime: serverTimestamp(),
      })

      toast({
        title: "Registro Exitoso",
        description: `Visita de ${values.company} registrada correctamente.`,
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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
             <ClipboardCheck className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold">Registro de Nueva Visita</DialogTitle>
          <DialogDescription>
            Complete los detalles del personal y el área de trabajo para generar el acceso.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sección Empresa y Responsable */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" /> Empresa
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. ABC Construcciones" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="responsible"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Responsable / Capataz</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre completo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input placeholder="555-1234" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="suaCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-green-600" /> SUA
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="SUA-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Sección Personal y Vehículo */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="personnelCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Users className="w-4 h-4" /> Cantidad de Personal
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
                  name="personnelList"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lista de Personal (Nombres)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="1. Pedro López\n2. Ana Torres..." 
                          className="h-[110px] resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ubicación y Gestión */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> Área de Trabajo
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione área" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                          <SelectItem value="Eléctrico">Eléctrico</SelectItem>
                          <SelectItem value="Almacén">Almacén</SelectItem>
                          <SelectItem value="Oficinas">Oficinas</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="manager"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <UserCog className="w-4 h-4" /> Encargado Interno
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Quién autoriza" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Ing. López">Ing. López</SelectItem>
                          <SelectItem value="Ing. Ruiz">Ing. Ruiz</SelectItem>
                          <SelectItem value="Lic. Maza">Lic. Maza</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Actividad y Vehículo */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="activity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Actividad a realizar</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. Revisión HVAC" {...field} />
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
                        <Truck className="w-4 h-4" /> Vehículo (Opcional)
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Patente / Placa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <Button type="button" variant="outline" className="flex-1 gap-2 border-green-200 text-green-700 hover:bg-green-50">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </Button>
              <Button type="button" variant="outline" className="flex-1 gap-2 border-accent/20 text-accent hover:bg-accent/5">
                <QrCode className="w-4 h-4" /> Generar QR
              </Button>
              <Button type="submit" className="flex-1 bg-primary text-white gap-2">
                <Save className="w-4 h-4" /> Guardar Visita
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
