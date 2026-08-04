"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
export default function DashboardBookings() {
  const router = useRouter()
  useEffect(() => { router.replace("/bookings") }, [router])
  return null
}
