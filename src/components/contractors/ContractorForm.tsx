"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { 
  ShieldCheck, 
  UploadCloud, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
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
import { ScrollArea } from "@/components/ui/scroll-area"

const contractorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  company: z.string().min(2, "Company must be at least 2 characters"),
  suaExpiration: z.string().optional(),
  policyNumber: z.string().optional(),
})

export function ContractorForm() {
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [analysisResult, setAnalysisResult] = React.useState<any>(null)
  const { toast } = useToast()
  
  const form = useForm<z.infer<typeof contractorSchema>>({
    resolver: zodResolver(contractorSchema),
    defaultValues: {
      name: "",
      company: "",
      suaExpiration: "",
      policyNumber: "",
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
            documentDescription: "Contractor SUA Insurance document"
          })
          
          setAnalysisResult(result)
          
          // Autofill form if data found
          if (result.contractorName) form.setValue("name", result.contractorName)
          if (result.companyName) form.setValue("company", result.companyName)
          if (result.suaExpirationDate) form.setValue("suaExpiration", result.suaExpirationDate)
          if (result.policyNumber) form.setValue("policyNumber", result.policyNumber)

          toast({
            title: "Verification Complete",
            description: "Document data has been extracted and verified by AI.",
          })
        } catch (error) {
          console.error("AI Error:", error)
          toast({
            variant: "destructive",
            title: "Analysis Failed",
            description: "Could not extract data from the document. Please enter manually.",
          })
        } finally {
          setIsAnalyzing(false)
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error("File Error:", error)
      setIsAnalyzing(false)
    }
  }

  function onSubmit(values: z.infer<typeof contractorSchema>) {
    toast({
      title: "Contractor Registered",
      description: `Successfully added ${values.name} to the system.`,
    })
    // In a real app, send to database
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>AI Document Verification</CardTitle>
          <CardDescription>
            Upload the SUA (Seguro de Vida) document to automatically verify status and extract details.
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
                <p className="font-medium">AI is analyzing document...</p>
                <p className="text-xs text-muted-foreground">Reading text, dates and policy info</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Drop document here or click to upload</p>
                  <p className="text-sm text-muted-foreground mt-1">Supports images of insurance policies or SUA certificates</p>
                </div>
              </div>
            )}
          </div>

          {analysisResult && (
            <div className="bg-muted/30 rounded-lg p-4 space-y-3 animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                  AI Analysis Summary
                </h4>
                <Badge variant={analysisResult.suaStatus === 'Active' ? 'default' : 'destructive'}>
                  {analysisResult.suaStatus || "N/A"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {analysisResult.verificationNotes}
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="text-[10px] uppercase text-muted-foreground font-bold">Policy #</div>
                <div className="text-[10px] uppercase text-muted-foreground font-bold">Expiration</div>
                <div className="text-xs font-mono">{analysisResult.policyNumber || "Not found"}</div>
                <div className="text-xs font-mono">{analysisResult.suaExpirationDate || "Not found"}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
          <CardDescription>Confirm contractor information and registration details.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
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
                    <FormLabel>Company / Provider</FormLabel>
                    <FormControl>
                      <Input placeholder="ABC Solutions Ltd." {...field} />
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
                      <FormLabel>Policy Number</FormLabel>
                      <FormControl>
                        <Input placeholder="P-12345678" {...field} />
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
                      <FormLabel>SUA Expiration</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-6">
                Complete Registration
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}