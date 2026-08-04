"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ComprehensiveSettings from "@/components/settings/comprehensive-settings"
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SettingsPage() {
  const [franchiseId, setFranchiseId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const getUserFranchiseId = async () => {
      try {
        // Get user's franchise from auth API
        const response = await fetch('/api/auth/user', {
          credentials: 'include',
        })
        
        if (response.ok) {
          const userData = await response.json()
          setUserRole(userData.role)
          
          if (userData.franchise_id) {
            setFranchiseId(userData.franchise_id)
          } else if (userData.role === 'super_admin') {
            router.replace('/admin/settings')
            return
          } else {
            setError('No franchise associated with your account')
          }
        } else {
          setError('Authentication required. Please login.')
          setTimeout(() => router.push('/auth/login'), 1200)
        }
      } catch {
        setError('Failed to load user data')
      } finally {
        setLoading(false)
      }
    }

    getUserFranchiseId()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-lg font-medium">Loading Settings...</p>
            <p className="text-sm text-gray-600 text-center">
              Authenticating user and preparing settings interface
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <p className="text-lg font-medium text-red-800">Settings Error</p>
            <p className="text-sm text-gray-600 text-center">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Don't render if no franchise ID
  if (!franchiseId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <AlertCircle className="h-8 w-8 text-yellow-600" />
            <p className="text-lg font-medium">Franchise Required</p>
            <p className="text-sm text-gray-600 text-center">
              No franchise is associated with your account. Please contact support.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render comprehensive settings wrapper
  return <ComprehensiveSettings franchiseId={franchiseId} userRole={userRole || undefined} />
}
