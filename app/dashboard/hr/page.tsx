"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
export default function DashboardHR() {
  const router = useRouter()
  useEffect(() => { router.replace("/staff") }, [router])
  return null
}
