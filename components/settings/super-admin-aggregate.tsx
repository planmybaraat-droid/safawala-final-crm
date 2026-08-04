"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface Row {
  id: string
  franchise_id: string
  company_name: string
  email: string
  phone?: string
  franchise?: { id: string; name: string; code: string }
}

export function SuperAdminAggregate() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/settings/company/all', { credentials: 'include' })
        if (!res.ok) {
          setError('Failed to load aggregated company settings')
          return
        }
        const { data } = await res.json()
        setRows(data || [])
      } catch (e: any) {
        setError(e.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Franchises - Company Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 text-sm">{error}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Franchises - Company Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No settings found.</div>
        ) : (
          <div className="divide-y">
            {rows.map((r) => (
              <div key={r.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.company_name || '—'}</div>
                  <div className="text-xs text-muted-foreground">{r.email || '—'}</div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {r.franchise?.name} ({r.franchise?.code})
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
