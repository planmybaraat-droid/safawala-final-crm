'use client'
import { LucideIcon, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface Crumb { label: string; href?: string }

interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  breadcrumbs?: Crumb[]
  action?: React.ReactNode
}

export function PageHeader({ title, subtitle, icon: Icon, breadcrumbs, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-[#9ca3af] mb-1.5">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-[#0f1117] transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-[#4b5563]">{crumb.label}</span>
                )}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="w-8 h-8 rounded-lg bg-[#fef9ee] border border-[#f5e0a0] flex items-center justify-center">
              <Icon className="w-4 h-4 text-[#d4a017]" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-[#0f1117]">{title}</h1>
            {subtitle && <p className="text-xs text-[#9ca3af] mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
