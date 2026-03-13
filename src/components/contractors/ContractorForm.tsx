
"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { 
  ShieldCheck, 
  UploadCloud, 
  Loader2, 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { extractDocumentData } from "@/ai/flows/automated-document-data-extraction"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { useFirestore } from "@/firebase"
import { useRouter } from "next/navigation"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'

const contractorSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  company: z.string().min(2, "La empresa debe tener al menos 2 caracteres"),
  suaExpiration: z.string().min(1, "La fecha de expiración es requerida"),
  policyNumber: z.string().min(1, "El número de póliza es requerido"),
  phone: z.string().optional(),
})

export function ContractorForm() {
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [analysisResult, setAnalysisResult] = React.useState<any>(null)
  const { toast } = useToast()
  const db = useFirestore()
  const router = useRouter()
  
  const form = useForm<z.infer<typeof contractorSchema>>({
    resolver: zodResolver(contractorSchema),
    defaultValues: {
      name: "",
      company: "",
      suaExpiration: "",
      policyNumber: "",
      phone: "",
    },
  })

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsAnalyzing(true)
    setAnalysisResult(null)

    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64String = reader.result as string
        
        try {
          const result = await extractDocumentData({
            documentDataUri: base64String,
            documentDescription: "Documento de Seguro SUA de contratista"
          })
          
          setAnalysisResult(result)
          
          if (result.contractorName) form.setValue("name", result.contractorName)
          if (result.companyName) form.setValue("company", result.companyName)
          if (result.suaExpirationDate) form.setValue("suaExpiration", result.suaExpirationDate)
          if (result.policyNumber) form.setValue("policyNumber", result.policyNumber)

          toast({
            title: "Verificación Completada",
            description: "Los datos del documento han sido extraídos por la IA.",
          })
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Error de Análisis",
            description: "No se pudo extraer la información. Por favor, ingrésela manualmente.",
          })
        } finally {
          setIsAnalyzing(false)
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      setIsAnalyzing(false)
    }
  }

  async function onSubmit(values: z.infer<typeof contractorSchema>) {
    if (!db) return

    // Mapeo de datos para cumplir con el esquema 'Company' definido en backend.json
    const companyData = {
      name: values.company,
      contact: values.name,
      phone: values.phone || "",
      status: "Active",
      sua: {
        number: values.policyNumber,
        validUntil: values.suaExpiration,
        status: "Valid"
      },
      createdAt: serverTimestamp(),
    }

    const companiesRef = collection(db, "companies")
    
    addDoc(companiesRef, companyData)
      .then(() => {
        toast({
          title: "Registro Exitoso",
          description: `La empresa ${values.company} ha sido registrada correctamente.`,
        })
        router.push("/contractors")
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: companiesRef.path,
          operation: 'create',
          requestResourceData: companyData,
        })
        errorEmitter.emit('permission-error', permissionError)
      })
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Verificación de Documentos con IA</CardTitle>
          <CardDescription>
            Sube el certificado SUA para verificar automáticamente el cumplimiento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="border-2 border-dashed border-muted rounded-xl p-8 text-center hover:bg-muted/20 transition-colors group cursor-pointer relative">
            <input 
              type="file" 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              onChange={handleFileUpload}
              accept="image/*"
              disabled={isAnalyzing}
            />
            {isAnalyzing ? (
              <div className="space-y-4">
                <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
                <p className="font-medium">La IA está analizando el documento...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Suelte el documento aquí o haga clic</p>
                  <p className="text-sm text-muted-foreground mt-1">Imágenes de pólizas o certificados SUA</p>
                </div>
              </div>
            )}
          </div>

          {analysisResult && (
            <div className="bg-muted/30 rounded-lg p-4 space-y-3 animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                  Resumen de Análisis IA
                </h4>
                <Badge variant={analysisResult.suaStatus === 'Active' ? 'default' : 'destructive'}>
                  {analysisResult.suaStatus || "N/A"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {analysisResult.verificationNotes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Detalles del Perfil</CardTitle>
          <CardDescription>Confirme la información antes de completar el registro.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Completo (Responsable)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Juan Pérez" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Constructora ABC" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono de Contacto</FormLabel>
                    <FormControl>
                      <Input placeholder="+54 11..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="policyNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nº de Póliza / SUA</FormLabel>
                      <FormControl>
                        <Input placeholder="P-123456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="suaExpiration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vencimiento SUA</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-6 h-auto">
                Completar Registro
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
