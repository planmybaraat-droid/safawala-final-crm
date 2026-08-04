"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function NewCustomerPageRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/customers?add=true")
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-slate-800 mx-auto mb-4"></div>
        <p className="text-slate-500 font-medium text-xs">Redirecting to customer list...</p>
      </div>
    </div>
  )
}
