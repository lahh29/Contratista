import { ContractorForm } from "@/components/contractors/ContractorForm"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NewContractorPage() {
  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="rounded-full shrink-0">
          <Link href="/contractors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Nueva Empresa</h2>
          <p className="text-muted-foreground mt-0.5 text-sm md:text-base">Registra la empresa y verifica sus documentos de cumplimiento.</p>
        </div>
      </div>
      
      <ContractorForm />
    </div>
  )
}