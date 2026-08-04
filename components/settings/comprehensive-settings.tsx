"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { 
  Building2, 
  Palette, 
  Zap, 
  UserCog,
  Lock,
  Settings,
  Loader2,
  ArrowLeft,
  MessageSquare
} from 'lucide-react'

// Import our new section components
import { CompanyInfoSection } from './company-info-section'
import { BrandingSection } from './branding-section-new'
import { BankingSection } from './banking-section-new'
import { ProfileSection } from './profile-section'
import { ChangePasswordSection } from './change-password-section'
import { WhatsAppSection } from './whatsapp-section'

interface ComprehensiveSettingsProps {
  franchiseId?: string
  userRole?: string
}

export default function ComprehensiveSettings({ franchiseId, userRole }: ComprehensiveSettingsProps) {
  const isFranchiseAdmin = userRole === 'franchise_admin'

  const getInitialTab = () => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '')
      if (['company', 'branding', 'banking', 'whatsapp', 'profile', 'security'].includes(hash)) {
        if (!isFranchiseAdmin && ['company', 'branding', 'banking', 'whatsapp'].includes(hash)) {
          return 'profile'
        }
        return hash
      }
    }
    return isFranchiseAdmin ? 'company' : 'profile'
  }

  const [activeTab, setActiveTab] = useState(getInitialTab())
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (userRole && !isFranchiseAdmin && ['company', 'branding', 'banking', 'whatsapp'].includes(activeTab)) {
      setActiveTab('profile')
    }
  }, [userRole, activeTab, isFranchiseAdmin])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${activeTab}`)
    }
  }, [activeTab])

  const handleBack = () => {
    router.back()
  }

  if (isFranchiseAdmin && !franchiseId) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Franchise settings unavailable</CardTitle>
            <CardDescription>
              Your account does not have an associated franchise. Please contact support or a Super Admin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleBack}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Settings className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-gray-600">Manage your profile, preferences and security settings</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={cn("grid w-full bg-gray-100", isFranchiseAdmin ? "grid-cols-3 lg:grid-cols-6" : "grid-cols-2 max-w-md")}>
          {isFranchiseAdmin && (
            <>
              <TabsTrigger value="company" className="flex items-center gap-2 data-[state=active]:bg-white">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Company</span>
              </TabsTrigger>
              <TabsTrigger value="branding" className="flex items-center gap-2 data-[state=active]:bg-white">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Branding & Design</span>
              </TabsTrigger>
              <TabsTrigger value="banking" className="flex items-center gap-2 data-[state=active]:bg-white">
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Banking Details</span>
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="flex items-center gap-2 data-[state=active]:bg-white">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="profile" className="flex items-center gap-2 data-[state=active]:bg-white">
            <UserCog className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2 data-[state=active]:bg-white">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        {isFranchiseAdmin && (
          <>
            <TabsContent value="company" className="space-y-6">
              <CompanyInfoSection franchiseId={franchiseId} />
            </TabsContent>

            <TabsContent value="branding" className="space-y-6">
              <BrandingSection franchiseId={franchiseId} />
            </TabsContent>

            <TabsContent value="banking" className="space-y-6">
              <BankingSection franchiseId={franchiseId} />
            </TabsContent>

            <TabsContent value="whatsapp" className="space-y-6">
              <WhatsAppSection franchiseId={franchiseId} />
            </TabsContent>
          </>
        )}

        <TabsContent value="profile" className="space-y-6">
          <ProfileSection franchiseId={franchiseId} />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <ChangePasswordSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}
