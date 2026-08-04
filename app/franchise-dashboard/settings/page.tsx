'use client'
import { useState, useEffect } from 'react'
import { useSafeData } from '@/lib/franchise/hooks'
import { PageHeader } from '@/components/franchise/shared/page-header'
import { ErrorCard } from '@/components/franchise/shared/error-card'
import { Settings, User, Building2, Bell, Shield, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const SETTING_GROUPS = [
  {
    title: 'Account',
    icon: User,
    items: [
      { label: 'Profile & Photo', desc: 'Update your name, photo and contact', href: '/settings/profile' },
      { label: 'Change Password', desc: 'Update your login password', href: '/settings/security' },
    ],
  },
  {
    title: 'Franchise',
    icon: Building2,
    items: [
      { label: 'Franchise Details', desc: 'Name, address, GST and business info', href: '/settings/franchise' },
      { label: 'Logo & Branding', desc: 'Upload your franchise logo', href: '/settings/branding' },
    ],
  },
  {
    title: 'Notifications',
    icon: Bell,
    items: [
      { label: 'Notification Preferences', desc: 'Choose what alerts you receive', href: '/settings/notifications' },
    ],
  },
  {
    title: 'Security',
    icon: Shield,
    items: [
      { label: 'Active Sessions', desc: 'View and manage logged-in devices', href: '/settings/sessions' },
      { label: 'Audit Log', desc: 'Track all actions in your account', href: '/settings/audit' },
    ],
  },
]

export default function FranchiseSettingsPage() {
  const [user, setUser] = useState<any>(null)
  const { data: profileData, error: profileError } = useSafeData<any>('/api/auth/user')

  useEffect(() => {
    try {
      const raw = localStorage.getItem('safawala_user')
      if (raw) setUser(JSON.parse(raw))
    } catch {
      // non-critical — user display only
    }
  }, [])

  const displayUser = profileData || user

  return (
    <div className="p-5 lg:p-7 max-w-4xl mx-auto">
      <PageHeader title="Settings" subtitle="Manage your account and franchise preferences"
        icon={Settings}
        breadcrumbs={[{ label: 'Dashboard', href: '/franchise-dashboard' }, { label: 'Settings' }]} />

      {/* Profile card */}
      {displayUser && (
        <div className="bg-white rounded-xl border border-[#e4e7ef] p-5 mb-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#d4a017] flex items-center justify-center text-white text-xl font-bold shrink-0">
            {(displayUser.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-[#0f1117]">{displayUser.name || '—'}</p>
            <p className="text-sm text-[#9ca3af]">{displayUser.email || '—'}</p>
            <span className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#fef9ee] text-[#d4a017] border border-[#f5e0a0] capitalize">
              {(displayUser.role || 'franchise_admin').replace(/_/g,' ')}
            </span>
          </div>
        </div>
      )}

      {/* Settings groups */}
      <div className="space-y-4">
        {SETTING_GROUPS.map(group => (
          <div key={group.title} className="bg-white rounded-xl border border-[#e4e7ef] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#f1f3f7] bg-[#f8f9fc]">
              <group.icon className="h-4 w-4 text-[#9ca3af]" />
              <h3 className="text-xs font-semibold text-[#0f1117] uppercase tracking-wide">{group.title}</h3>
            </div>
            {group.items.map((item, i) => (
              <Link key={item.href} href={item.href}
                className={cn('flex items-center gap-4 px-4 py-4 hover:bg-[#f8f9fc] transition-colors group',
                  i < group.items.length - 1 ? 'border-b border-[#f1f3f7]' : '')}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0f1117]">{item.label}</p>
                  <p className="text-xs text-[#9ca3af] mt-0.5">{item.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-[#d1d5e0] group-hover:text-[#9ca3af] shrink-0" />
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
