import { Suspense } from "react"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { QuoteForm } from "@/components/quotes/quote-form"
import { customerService } from "@/lib/services/customer-service"
import { productService } from "@/lib/services/product-service"
import { categoryService } from "@/lib/services/category-service"

export const dynamic = "force-dynamic"

async function NewQuotePage() {
  const userRes = await fetch("/api/auth/user", { cache: "no-store" })
  const currentUser = userRes.ok ? await userRes.json() : null
  const franchiseId = currentUser?.franchise_id

  const [customers, products, categories] = await Promise.all([
    customerService.getAll(franchiseId),
    productService.getAvailable(franchiseId),
    categoryService.getAll(franchiseId),
  ])

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" size="icon" asChild>
          <Link href="/quotes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Generate Quote</h1>
          <p className="text-muted-foreground">Create a new quote for rental or direct sale</p>
        </div>
      </div>

      <div className="mb-6 rounded-lg border bg-muted/30 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">Need a package-based quote?</p>
          <p className="text-sm text-muted-foreground">
            Package quotes use the dedicated package builder with variants, inclusions, and package pricing.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/book-package">Open Package Quote Builder</Link>
        </Button>
      </div>

      <QuoteForm customers={customers || []} products={products || []} categories={categories || []} />
    </div>
  )
}

export default function NewQuotePageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewQuotePage />
    </Suspense>
  )
}
