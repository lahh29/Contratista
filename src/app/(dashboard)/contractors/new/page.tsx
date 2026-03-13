import { ContractorForm } from "@/components/contractors/ContractorForm"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NewContractorPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/contractors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">New Contractor</h2>
          <p className="text-muted-foreground mt-1">Register personnel and verify compliance documents.</p>
        </div>
      </div>
      
      <ContractorForm />
    </div>
  )
}