"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
export default function DashboardRevenue() {
  const router = useRouter()
  useEffect(() => { router.replace("/financials") }, [router])
  return null
}
