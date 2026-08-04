"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

interface CompanySettings {
  company_name?: string
  logo_url?: string | null
}

export default function CompanyHeaderSimple() {
  const [settings, setSettings] = useState<CompanySettings>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCompanySettings()
  }, [])

  const loadCompanySettings = async () => {
    try {
      const response = await fetch('/api/company-settings-simple')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-200 animate-pulse rounded-lg" />
        <div className="h-6 w-32 bg-gray-200 animate-pulse rounded" />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {settings.logo_url && (
        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-white shadow-sm">
          <Image
            src={settings.logo_url}
            alt={settings.company_name || "Company Logo"}
            fill
            className="object-cover"
          />
        </div>
      )}
      
      <div className="font-bold text-lg text-foreground">
        {settings.company_name || "Your Company"}
      </div>
    </div>
  )
}
